import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getAuthUrl, getGmailClient, getUserOAuth2Client } from '@/lib/google'
import { extractFlightsFromTextLLM } from '@/lib/llm-extract'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function decodeBase64Url(data?: string | null): string {
  if (!data) return ''
  const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  return buff.toString('utf8')
}

function extractPlainText(payload: any): string {
  if (!payload) return ''
  const mimeType = payload.mimeType
  if (mimeType === 'text/plain') return decodeBase64Url(payload.body?.data)
  if (mimeType === 'text/html') return decodeBase64Url(payload.body?.data).replace(/<[^>]+>/g, ' ')
  if (payload.parts && Array.isArray(payload.parts)) {
    const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (plain) return extractPlainText(plain)
    for (const p of payload.parts) {
      const text = extractPlainText(p)
      if (text) return text
    }
  }
  return ''
}

export async function POST(req: Request) {
  try {
    // Ensure user session
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Ensure Gmail connection
    const { client, hasToken } = await getUserOAuth2Client()
    if (!hasToken) {
      const url = getAuthUrl()
      return NextResponse.json({ error: 'not_connected', authUrl: url }, { status: 401 })
    }
    const gmail = getGmailClient(client)

    // Parse optional body
    let requestedIds: string[] | undefined
    let start: string | undefined
    let end: string | undefined
    let purchasedDate: string | undefined // YYYY-MM-DD to filter by email received date (purchase date)
    try {
      const json = await req.json().catch(() => null)
      if (json && Array.isArray(json.ids)) {
        requestedIds = (json.ids as any[]).map(String)
      }
      if (json && typeof json.start === 'string') start = json.start
      if (json && typeof json.end === 'string') end = json.end
      if (json && typeof json.purchasedDate === 'string') purchasedDate = json.purchasedDate
    } catch {}

    // Build Gmail query by received date window when ids not provided
    let query = 'from:itinerary@ryanair.com'
    const formatForGmail = (d: Date) => {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${y}/${m}/${day}`
    }
    // If a specific purchasedDate is provided, narrow to that day (ignores start/end)
    if (purchasedDate) {
      const d = new Date(purchasedDate + 'T00:00:00Z')
      const before = new Date(d); before.setUTCDate(before.getUTCDate() + 1)
      const after = new Date(d); after.setUTCDate(after.getUTCDate() - 1)
      query += ` after:${formatForGmail(after)} before:${formatForGmail(before)}`
    } else if (start) {
      const sd = new Date(start + 'T00:00:00Z')
      const sdMinus = new Date(sd)
      sdMinus.setUTCDate(sdMinus.getUTCDate() - 1)
      query += ` after:${formatForGmail(sdMinus)}`
    }
    if (!purchasedDate && end) {
      const ed = new Date(end + 'T00:00:00Z')
      const edPlus = new Date(ed)
      edPlus.setUTCDate(edPlus.getUTCDate() + 1)
      query += ` before:${formatForGmail(edPlus)}`
    }

    // Fetch existing flights to dedupe
    const { data: existingFlights } = await supabase
      .from('vidmaflights')
      .select('id, reservation_number, flight_number, departure_date')
      .eq('owner_id', user.id)

    const existingKeys = new Set(
      (existingFlights ?? []).map((f: any) => `${(f.flight_number || '').trim()}|${(f.reservation_number || '').trim()}|${new Date(f.departure_date).toISOString().slice(0,10)}`)
    )

    let pageToken: string | undefined = undefined
    const maxToProcess = 50
    const parsedResults: any[] = []
    const insertRows: any[] = []
    const errors: { id?: string; reason: string }[] = []

    if (requestedIds && requestedIds.length) {
      for (const id of requestedIds) {
        if (parsedResults.length + errors.length >= maxToProcess) break
        try {
          const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
          const headers = (msg.data.payload?.headers as Array<{ name?: string | null; value?: string | null }> | undefined) || []
          const subject = (headers.find((h) => (h.name ?? '').toLowerCase() === 'subject')?.value as string | undefined) || ''
          const dateHeader = (headers.find((h) => (h.name ?? '').toLowerCase() === 'date')?.value as string | undefined) || ''
          const bodyText = extractPlainText(msg.data.payload)
          const combined = `${subject}\n\n${bodyText}`
          const flights = await extractFlightsFromTextLLM(combined, { subject, receivedAt: dateHeader })
          const parsed = flights.find(f => f.booking_type === 'OUTBOUND') || flights[0]
          if (!parsed) {
            errors.push({ id, reason: 'parse_failed' })
            continue
          }

          // Basic validation to insert
          const depDate = parsed.departure_date ? new Date(parsed.departure_date) : null
          const depISO = depDate ? depDate.toISOString().slice(0,10) : null
          const key = `${(parsed.flight_number || '').trim()}|${(parsed.reservation_number || '').trim()}|${depISO || ''}`
          if (!parsed.flight_number || !parsed.reservation_number || !depISO) {
            errors.push({ id, reason: 'missing_required_fields' })
            continue
          }
          if (existingKeys.has(key)) {
            // skip duplicates
            continue
          }

          parsedResults.push({ id, parsed })

          // Build DB row with safe fallbacks
          const row = {
            owner_id: user.id,
            passenger_name: (parsed as any).passenger_name || user.user_metadata?.full_name || user.email,
            reservation_number: (parsed as any).reservation_number,
            flight_number: (parsed as any).flight_number,
            departure_airport: (parsed as any).departure_airport || (parsed as any).departure_iata || 'Unknown',
            arrival_airport: (parsed as any).arrival_airport || (parsed as any).arrival_iata || 'Unknown',
            departure_date: depISO,
            arrival_date: ((parsed as any).arrival_date ? new Date((parsed as any).arrival_date).toISOString().slice(0,10) : depISO),
            departure_time: (parsed as any).departure_time || '00:00',
            arrival_time: (parsed as any).arrival_time || '00:00',
            total_receipt: (parsed as any).total_receipt || '0',
            purchased_date: (parsed as any).purchased_date || depISO,
            purchase_time: (parsed as any).purchase_time || '00:00',
            airline: (parsed as any).airline || 'Ryanair',
            arrival_country: (parsed as any).arrival_country || null,
            arrival_iata: (parsed as any).arrival_iata || null,
            departure_iata: (parsed as any).departure_iata || null,
            seat: (parsed as any).seat || null,
            notes: (parsed as any).notes || `Imported from Gmail message ${id}`,
          }
          insertRows.push(row)
        } catch (e: any) {
          errors.push({ id, reason: e?.message || 'fetch_error' })
        }
      }
    } else {
      while (parsedResults.length + errors.length < maxToProcess) {
        const listResp: any = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 50, pageToken })
        const ids = (listResp.data.messages as Array<{ id?: string | null }> | undefined)?.map((m) => m.id as string).filter(Boolean) as string[] || []
        pageToken = (listResp.data.nextPageToken as string | undefined) || undefined
        if (!ids.length) break

        for (const id of ids) {
          if (parsedResults.length + errors.length >= maxToProcess) break
          try {
            const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
            const headers = (msg.data.payload?.headers as Array<{ name?: string | null; value?: string | null }> | undefined) || []
            const subject = (headers.find((h) => (h.name ?? '').toLowerCase() === 'subject')?.value as string | undefined) || ''
            const dateHeader = (headers.find((h) => (h.name ?? '').toLowerCase() === 'date')?.value as string | undefined) || ''
            const bodyText = extractPlainText(msg.data.payload)
            const combined = `${subject}\n\n${bodyText}`
            const flights = await extractFlightsFromTextLLM(combined, { subject, receivedAt: dateHeader })
            const parsed = flights.find(f => f.booking_type === 'OUTBOUND') || flights[0]
            if (!parsed) {
              errors.push({ id, reason: 'parse_failed' })
              continue
            }

            // Basic validation to insert
            const depDate = parsed.departure_date ? new Date(parsed.departure_date) : null
            const depISO = depDate ? depDate.toISOString().slice(0,10) : null
            const key = `${(parsed.flight_number || '').trim()}|${(parsed.reservation_number || '').trim()}|${depISO || ''}`
            if (!parsed.flight_number || !parsed.reservation_number || !depISO) {
              errors.push({ id, reason: 'missing_required_fields' })
              continue
            }
            if (existingKeys.has(key)) {
              // skip duplicates
              continue
            }

            parsedResults.push({ id, parsed })

            // Build DB row with safe fallbacks
            const row = {
              owner_id: user.id,
              passenger_name: (parsed as any).passenger_name || user.user_metadata?.full_name || user.email,
              reservation_number: (parsed as any).reservation_number,
              flight_number: (parsed as any).flight_number,
              departure_airport: (parsed as any).departure_airport || (parsed as any).departure_iata || 'Unknown',
              arrival_airport: (parsed as any).arrival_airport || (parsed as any).arrival_iata || 'Unknown',
              departure_date: depISO,
              arrival_date: ((parsed as any).arrival_date ? new Date((parsed as any).arrival_date).toISOString().slice(0,10) : depISO),
              departure_time: (parsed as any).departure_time || '00:00',
              arrival_time: (parsed as any).arrival_time || '00:00',
              total_receipt: (parsed as any).total_receipt || '0',
              purchased_date: (parsed as any).purchased_date || depISO,
              purchase_time: (parsed as any).purchase_time || '00:00',
              airline: (parsed as any).airline || 'Ryanair',
              arrival_country: (parsed as any).arrival_country || null,
              arrival_iata: (parsed as any).arrival_iata || null,
              departure_iata: (parsed as any).departure_iata || null,
              seat: (parsed as any).seat || null,
              notes: (parsed as any).notes || `Imported from Gmail message ${id}`,
            }
            insertRows.push(row)
          } catch (e: any) {
            errors.push({ id, reason: e?.message || 'fetch_error' })
          }
        }

        if (!pageToken) break
      }
    }

    let inserted = [] as any[]
    if (insertRows.length) {
      const { data, error } = await supabase
        .from('vidmaflights')
        .insert(insertRows)
        .select()
      if (error) {
        return NextResponse.json({ error: 'db_insert_failed', details: error.message }, { status: 500 })
      }
      inserted = data || []
    }

    return NextResponse.json({
      found: parsedResults.length,
      inserted: inserted.length,
      skipped_duplicates: parsedResults.length - inserted.length,
      errors,
    })
  } catch (e: any) {
    const message = e?.message || 'Unknown error'
    if (message.includes('invalid_grant') || message.includes('unauthorized_client')) {
      return NextResponse.json({ error: 'reauthorize', authUrl: getAuthUrl() }, { status: 401 })
    }
    return NextResponse.json({ error: 'server_error', message }, { status: 500 })
  }
}
