import { createSupabaseServer } from '@/lib/supabase-server'
import { flightKey, flightParseProblem } from '@/lib/flight-validity'
import { getAuthUrl, getGmailClient, getUserOAuth2Client } from '@/lib/google'
import { FLIGHT_EMAIL_QUERY, readFlightEmail } from './index'
import { openRow, planLegs, type PlannedLeg, type ReadEmail } from './plan'

// Server-only: the Gmail search and the save, shared by the chat assistant
// and the flights page so both give the same guarantees.

export type Unreadable = { subject: string; receivedAt: string; reason: string }

export type GmailScanResult =
  | { ok: true; legs: PlannedLeg[]; unreadable: Unreadable[]; emailsRead: number; truncated: boolean }
  | { ok: false; reason: 'gmail_not_connected'; authUrl: string }
  | { ok: false; reason: 'bad_dates' | 'scan_failed'; detail: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_EMAILS = 300
// Flights are usually booked weeks to months ahead, so the emails for a
// departure range arrive up to a year before it.
const BOOKED_AHEAD_DAYS = 400

const gmailDate = (d: Date) => `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}`

function decode(data?: string | null): string {
  return data ? Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8') : ''
}

/** The email's HTML when it has any (every supported airline sends it), else its plain text. */
function bodyOf(payload: any): string {
  const html: string[] = []
  const plain: string[] = []
  const walk = (p: any) => {
    if (!p) return
    if (p.mimeType === 'text/html') html.push(decode(p.body?.data))
    else if (p.mimeType === 'text/plain') plain.push(decode(p.body?.data))
    for (const c of p.parts ?? []) walk(c)
  }
  walk(payload)
  return (html.length ? html : plain).join('\n')
}

export async function scanGmailForFlights(ownerId: string, start: string, end: string): Promise<GmailScanResult> {
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
    return { ok: false, reason: 'bad_dates', detail: `start and end must be YYYY-MM-DD with start <= end (got ${start || '?'} to ${end || '?'})` }
  }

  const { client, hasToken } = await getUserOAuth2Client()
  if (!hasToken) return { ok: false, reason: 'gmail_not_connected', authUrl: await getAuthUrl() }
  const gmail = getGmailClient(client)

  const after = new Date(`${start}T00:00:00Z`)
  after.setUTCDate(after.getUTCDate() - BOOKED_AHEAD_DAYS)
  const before = new Date(`${end}T00:00:00Z`)
  before.setUTCDate(before.getUTCDate() + 1)
  const q = `(${FLIGHT_EMAIL_QUERY}) after:${gmailDate(after)} before:${gmailDate(before)}`

  try {
    const ids: string[] = []
    let pageToken: string | undefined
    do {
      const list: any = await gmail.users.messages.list({ userId: 'me', q, maxResults: 100, pageToken })
      for (const m of list.data.messages ?? []) if (m.id) ids.push(m.id)
      pageToken = list.data.nextPageToken || undefined
    } while (pageToken && ids.length < MAX_EMAILS)
    const truncated = ids.length > MAX_EMAILS || !!pageToken
    ids.splice(MAX_EMAILS)

    const reads: ReadEmail[] = []
    const unreadable: Unreadable[] = []
    for (let i = 0; i < ids.length; i += 5) {
      const chunk = await Promise.all(ids.slice(i, i + 5).map((id) => gmail.users.messages.get({ userId: 'me', id, format: 'full' })))
      for (const msg of chunk) {
        const headers: Array<{ name?: string | null; value?: string | null }> = msg.data.payload?.headers ?? []
        const header = (n: string) => headers.find((h) => (h.name ?? '').toLowerCase() === n)?.value ?? ''
        const subject = header('subject')
        const receivedAt = msg.data.internalDate ? new Date(Number(msg.data.internalDate)).toISOString() : header('date')
        const booking = readFlightEmail(header('from'), subject, bodyOf(msg.data.payload))
        if (booking) reads.push({ emailId: String(msg.data.id), subject, receivedAt, booking })
        else unreadable.push({ subject, receivedAt, reason: 'not in a layout the reader knows' })
      }
    }

    const supabase = createSupabaseServer()
    const { data: log, error } = await supabase
      .from('vidmaflights')
      .select('departure_date, flight_number, reservation_number, departure_iata, arrival_iata')
      .eq('owner_id', ownerId)
    if (error) return { ok: false, reason: 'scan_failed', detail: `could not read the log: ${error.message}` }

    return { ok: true, legs: planLegs(ownerId, reads, log ?? [], start, end), unreadable, emailsRead: ids.length, truncated }
  } catch (e: any) {
    const message = e?.message || String(e)
    if (/invalid_grant|unauthorized_client/.test(message)) return { ok: false, reason: 'gmail_not_connected', authUrl: await getAuthUrl() }
    return { ok: false, reason: 'scan_failed', detail: message }
  }
}

export type CommitResult = {
  added: { date: string; flightNumber: string; from: string; to: string }[]
  skipped: { flight: string; reason: string }[]
}

/**
 * Saves exactly the rows the user confirmed. Each token is checked to belong to
 * this user and to be recent, each row is checked again, and the log is read
 * again so a flight added in the meantime is not added twice.
 */
export async function commitFlights(ownerId: string, tokens: string[]): Promise<CommitResult> {
  const supabase = createSupabaseServer()
  const { data: log, error } = await supabase
    .from('vidmaflights')
    .select('departure_date, flight_number')
    .eq('owner_id', ownerId)
  if (error) throw new Error(`could not read the log: ${error.message}`)

  const taken = new Set((log ?? []).map((f) => flightKey(f.departure_date, f.flight_number)))
  const rows = []
  const skipped: CommitResult['skipped'] = []
  for (const token of tokens) {
    const row = openRow(token, ownerId)
    if (!row) {
      skipped.push({ flight: '?', reason: 'this list is out of date or not yours; scan again' })
      continue
    }
    const label = `${row.departure_date} ${row.flight_number} ${row.departure_iata}-${row.arrival_iata}`
    const problem = flightParseProblem(row)
    if (problem) {
      skipped.push({ flight: label, reason: problem })
      continue
    }
    const key = flightKey(row.departure_date, row.flight_number)
    if (taken.has(key)) {
      skipped.push({ flight: label, reason: 'already in your log' })
      continue
    }
    taken.add(key)
    rows.push(row)
  }

  if (rows.length) {
    const { error: insertError } = await supabase.from('vidmaflights').insert(rows)
    if (insertError) throw new Error(`could not save: ${insertError.message}`)
  }
  return {
    added: rows.map((r) => ({ date: r.departure_date, flightNumber: r.flight_number, from: r.departure_iata, to: r.arrival_iata })),
    skipped,
  }
}
