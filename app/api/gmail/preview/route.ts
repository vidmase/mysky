import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { getAuthUrl, getGmailClient, getUserOAuth2Client } from '@/lib/google'
import { extractFlightsFromTextLLM } from '@/lib/llm-extract'
import { parseEmail } from '@/lib/gmail-parser'

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
  if (mimeType === 'text/html') {
    const html = decodeBase64Url(payload.body?.data)
    // Preserve structure: convert common HTML separators to newlines/spaces
    const withBreaks = html
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/p\s*>/gi, '\n')
      .replace(/<\s*p\b[^>]*>/gi, '')
      .replace(/<\s*\/(tr|div|li|h\d)\s*>/gi, '\n')
      .replace(/<\s*(td|th)\b[^>]*>/gi, '\t')
      .replace(/<\s*\/(td|th)\s*>/gi, '\t')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&middot;/gi, '·')
    const text = withBreaks.replace(/<[^>]+>/g, ' ')
    return text
      .replace(/[\t ]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim()
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    // Prefer text/plain, else text/html, else recurse
    const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (plain) return extractPlainText(plain)
    const html = payload.parts.find((p: any) => p.mimeType === 'text/html')
    if (html) return extractPlainText(html)
    for (const p of payload.parts) {
      const text = extractPlainText(p)
      if (text) return text
    }
  }
  return ''
}

function formatForGmail(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

function isValidFlightNumber(flightNum: string | undefined, isRyanair: boolean): boolean {
  if (!flightNum) return false
  const normalized = flightNum.replace(/\s+/g, '').toUpperCase()

  // For Ryanair, must be FR followed by 3-5 digits
  if (isRyanair) {
    return /^FR\d{3,5}$/.test(normalized)
  }

  // For other airlines, must be 2 uppercase letters followed by 3-5 digits
  // Also check it's not a random hex-like string (e.g., 'SF17', 'ef89')
  if (!/^[A-Z]{2}\d{3,5}$/.test(normalized)) return false

  // Reject patterns that look like hex or random IDs (lowercase in original)
  if (/^[a-f0-9]{4,}$/i.test(flightNum)) return false

  return true
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const forceLLM = /^(1|true)$/i.test(searchParams.get('forceLLM') || '')
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const dbUserId = await resolveSupabaseUserId()
    if (!dbUserId) return NextResponse.json({ error: 'no profile found' }, { status: 401 })
    const supabase = createSupabaseServer()

    const { client, hasToken } = await getUserOAuth2Client()
    if (!hasToken) {
      const url = getAuthUrl()
      return NextResponse.json({ error: 'not_connected', authUrl: url }, { status: 401 })
    }
    const gmail = getGmailClient(client)

    const url = new URL(req.url)
    const start = url.searchParams.get('start') // YYYY-MM-DD
    const end = url.searchParams.get('end')     // YYYY-MM-DD

    // For future flights (departure date after today), we need to search for emails 
    // received in the PAST that contain flight dates in the FUTURE.
    // So we DON'T filter by email received date for future flight searches.
    const today = new Date()
    const todayISO = today.toISOString().slice(0, 10)
    const isFutureFlightSearch = start && start >= todayISO

    console.log(`\n=== Gmail Import Configuration ===`)
    console.log(`Requested FLIGHT DEPARTURE date range: ${start || 'unlimited'} to ${end || 'unlimited'}`)
    console.log(`Today: ${todayISO}`)
    console.log(`Is future flight search (departure >= today): ${isFutureFlightSearch}`)
    console.log(`NOTE: For future flights, we search ALL emails and filter by departure date`)

    // Build a broad search query - don't restrict by email date for future flights
    // because booking emails for future flights were received in the past
    let query = 'from:itinerary@ryanair.com'

    // Only add date filters to Gmail search for PAST flight searches
    // For future flights, we search ALL Ryanair emails and filter by departure date later
    if (!isFutureFlightSearch) {
      if (start) {
        const sd = new Date(start + 'T00:00:00Z')
        // Gmail after: is exclusive at midnight in account TZ; shift back 1 day to include the selected start date across TZs
        const sdMinus = new Date(sd)
        sdMinus.setUTCDate(sdMinus.getUTCDate() - 1)
        query += ` after:${formatForGmail(sdMinus)}`
      }
      if (end) {
        const ed = new Date(end + 'T00:00:00Z')
        // Gmail before: non-inclusive; bump by 1 day to include end date
        const edPlus = new Date(ed)
        edPlus.setUTCDate(edPlus.getUTCDate() + 1)
        query += ` before:${formatForGmail(edPlus)}`
      }
    }

    // Fallback query is always broad to catch all Ryanair-related emails
    let fallbackQuery = `(from:itinerary@ryanair.com OR from:ryanair.com OR from:noreply@ryanair.com OR from:bookings@ryanair.com OR subject:"Ryanair" OR subject:"Travel Itinerary" OR subject:"Flight Confirmation" OR subject:"booking confirmation")`

    // Only add date filters for past flight searches
    if (!isFutureFlightSearch) {
      if (start) {
        const sd = new Date(start + 'T00:00:00Z')
        const sdMinus = new Date(sd)
        sdMinus.setUTCDate(sdMinus.getUTCDate() - 1)
        fallbackQuery += ` after:${formatForGmail(sdMinus)}`
      }
      if (end) {
        const ed = new Date(end + 'T00:00:00Z')
        const edPlus = new Date(ed)
        edPlus.setUTCDate(edPlus.getUTCDate() + 1)
        fallbackQuery += ` before:${formatForGmail(edPlus)}`
      }
    }

    const { data: existingFlights } = await supabase
      .from('vidmaflights')
      .select('reservation_number, flight_number, departure_date')
      .eq('owner_id', dbUserId)

    const existingKeys = new Set(
      (existingFlights ?? []).map((f: any) => `${(f.flight_number || '').trim()}|${(f.reservation_number || '').trim()}|${new Date(f.departure_date).toISOString().slice(0, 10)}`)
    )

    // 1) Collect all matching message IDs across pages (up to a higher cap)
    let pageToken: string | undefined = undefined
    const maxToProcess = 1000 // Increased to 1000 for more comprehensive search
    const allIds: string[] = []
    let totalFetched = 0

    console.log(`=== Gmail Search Session ===`)
    console.log(`Date range: ${start || 'no start'} to ${end || 'no end'}`)
    console.log(`Max messages to process: ${maxToProcess}`)

    // Use a single, comprehensive search query for consistency
    // Include various Ryanair email patterns and common flight-related keywords
    const comprehensiveQuery = `(from:itinerary@ryanair.com OR from:ryanair.com OR from:noreply@ryanair.com OR from:bookings@ryanair.com OR subject:"Ryanair" OR subject:"Travel Itinerary" OR subject:"Flight Confirmation" OR subject:"booking confirmation" OR subject:"Your trip")`
    const searchQueries = [comprehensiveQuery]

    const seenIds = new Set<string>()

    for (const searchQuery of searchQueries) {
      if (allIds.length >= maxToProcess) break

      // Apply date filter to Gmail search ONLY for past flight searches
      // For future flights, we want to search ALL emails and filter by departure date later
      let finalQuery = searchQuery
      if (!isFutureFlightSearch && (start || end)) {
        const dateFilter = `${start ? `after:${formatForGmail(new Date(start + 'T00:00:00Z'))}` : ''} ${end ? `before:${formatForGmail(new Date(end + 'T23:59:59Z'))}` : ''}`.trim()
        finalQuery = `${searchQuery} ${dateFilter}`
      }

      console.log(`\n=== Executing Gmail Search ===`)
      console.log(`Search query: ${finalQuery}`)
      console.log(`Is future flight search: ${isFutureFlightSearch}`)
      pageToken = undefined

      while (allIds.length < maxToProcess) {
        const listResp: any = await gmail.users.messages.list({
          userId: 'me',
          q: finalQuery,
          maxResults: 100, // Increased from 50 to 100
          pageToken
        })

        const ids = (listResp.data.messages as Array<{ id?: string | null }> | undefined)?.map((m) => m.id as string).filter(Boolean) as string[] || []
        pageToken = (listResp.data.nextPageToken as string | undefined) || undefined

        console.log(`Fetched ${ids.length} messages (page ${Math.floor(totalFetched / 100) + 1}), total so far: ${allIds.length}`)

        if (!ids.length) break

        let newIds = 0
        for (const id of ids) {
          if (allIds.length >= maxToProcess) break
          if (!seenIds.has(id)) {
            allIds.push(id)
            seenIds.add(id)
            newIds++
          }
        }

        totalFetched += ids.length
        console.log(`Added ${newIds} new unique messages, total unique: ${allIds.length}`)

        if (!pageToken) {
          console.log(`No more pages available for this query. Total messages found: ${totalFetched}, unique messages: ${allIds.length}`)
          break
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`=== Search Complete ===`)
    console.log(`Final message count to process: ${allIds.length}`)
    console.log(`Total messages fetched: ${totalFetched}`)
    console.log(`Unique messages after deduplication: ${allIds.length}`)

    // 2) Fetch and parse messages with limited concurrency and deterministic fallback
    const previews: any[] = []
    const concurrency = 5
    for (let i = 0; i < allIds.length; i += concurrency) {
      const chunk = allIds.slice(i, i + concurrency)
      const results = await Promise.allSettled(chunk.map(async (id) => {
        const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
        const headers = (msg.data.payload?.headers as Array<{ name?: string | null; value?: string | null }> | undefined) || []
        const subject = (headers.find((h) => (h.name ?? '').toLowerCase() === 'subject')?.value as string | undefined) || ''
        const dateHeader = (headers.find((h) => (h.name ?? '').toLowerCase() === 'date')?.value as string | undefined) || ''
        const bodyText = extractPlainText(msg.data.payload)
        const combined = `${subject}\n\n${bodyText}`

        // Choose extraction strategy
        let chosen: any = null
        if (!forceLLM) {
          chosen = parseEmail(subject, combined)
        }
        if (!chosen) {
          const flights = await extractFlightsFromTextLLM(combined, { subject, receivedAt: dateHeader })
          chosen = flights.find(f => f.booking_type === 'OUTBOUND') || flights[0] || null as any
        }
        if (!chosen) return null

        // If critical fields are missing, try to补完 with LLM output by merging
        if (!chosen.departure_date || !chosen.departure_time || !chosen.arrival_time) {
          try {
            const llm = await extractFlightsFromTextLLM(combined, { subject, receivedAt: dateHeader })
            if (llm && llm.length) {
              // choose best by matching reservation or flight_number
              const byKey = (a: any, b: any) => Number(!!a) - Number(!!b)
              let best = llm.find(f => (
                (chosen.reservation_number && f.reservation_number && f.reservation_number === chosen.reservation_number) ||
                (chosen.flight_number && f.flight_number && f.flight_number === chosen.flight_number)
              )) || llm[0]
              const mergeField = (k: string) => {
                if (!chosen[k] && (best as any)[k]) (chosen as any)[k] = (best as any)[k]
              }
                ;['departure_date', 'departure_time', 'arrival_time', 'arrival_date', 'airline', 'departure_iata', 'arrival_iata', 'departure_airport', 'arrival_airport', 'total_receipt', 'purchased_date', 'purchase_time'].forEach(mergeField)
            }
          } catch { }
        }

        // Normalize a few common gaps
        if (!chosen.airline && /ryanair/i.test(subject + ' ' + combined)) {
          chosen.airline = 'Ryanair'
        }

        // Backfill reservation number from subject/body patterns if missing
        if (!chosen.reservation_number) {
          const pnr = /\b([A-Z0-9]{5,8})\b/.exec(subject) || /\b([A-Z0-9]{5,8})\b/.exec(combined)
          if (pnr) chosen.reservation_number = pnr[1]
        }

        // If IATAs exist but airport names are missing, set to IATA to avoid blanks
        if (chosen.departure_iata && !chosen.departure_airport) chosen.departure_airport = chosen.departure_iata
        if (chosen.arrival_iata && !chosen.arrival_airport) chosen.arrival_airport = chosen.arrival_iata

        // If purchase timestamp missing, use received header - BUT NEVER override departure_date
        if (dateHeader) {
          const d = new Date(dateHeader)
          if (!isNaN(d.getTime())) {
            if (!chosen.purchased_date) chosen.purchased_date = d.toISOString().slice(0, 10)
            if (!chosen.purchase_time) chosen.purchase_time = d.toISOString().slice(11, 16)
            // CRITICAL: Never set departure_date to email received date here
            // departure_date should only come from actual flight parsing
          }
        }

        // DEBUG: Log what we have before enrichment
        console.log(`BEFORE enrichment - Flight ${chosen.flight_number}: departure_date=${chosen.departure_date}, purchased_date=${chosen.purchased_date}`)

        // Compute duration if both times exist but duration missing
        if (!chosen.flight_duration && chosen.departure_time && chosen.arrival_time) {
          const toMinutes = (t: string) => {
            const m = /^(\d{1,2}):(\d{2})$/.exec(t)
            if (!m) return NaN
            const hh = parseInt(m[1], 10), mm = parseInt(m[2], 10)
            if (hh > 23 || mm > 59) return NaN
            return hh * 60 + mm
          }
          const depM = toMinutes(chosen.departure_time)
          const arrM = toMinutes(chosen.arrival_time)
          if (!isNaN(depM) && !isNaN(arrM)) {
            let diff = arrM - depM
            // If arrival_date exists and differs from departure_date, adjust by day count
            if (chosen.departure_date && chosen.arrival_date) {
              try {
                const d1 = new Date(chosen.departure_date)
                const d2 = new Date(chosen.arrival_date)
                const days = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
                diff += Math.max(0, days) * 24 * 60
              } catch { }
            } else if (diff < 0) {
              // assume overnight
              diff += 24 * 60
            }
            if (diff >= 0 && diff <= 24 * 60 * 2) { // ignore absurd durations (> 48h)
              const h = Math.floor(diff / 60), m = diff % 60
              chosen.flight_duration = `${h}h ${m}m`
            }
          }
        }

        // Final enrichment pass using additional regexes
        const enrichParsed = (p: any, subj: string, text: string) => {
          const find = (re: RegExp) => re.exec(text) || re.exec(subj)
          const lines = (subj + '\n' + text).split(/\n+/).map(s => s.trim())
          const hhmm = /\b([01]?\d|2[0-3]):([0-5]\d)\b/

          const pickTimeNear = (keywords: RegExp[]): string | undefined => {
            for (const [i, line] of lines.entries()) {
              if (keywords.some(re => re.test(line))) {
                // check same line first
                const mSame = line.match(hhmm)
                if (mSame) return mSame[0]
                // look ahead a couple of lines
                for (let j = 1; j <= 2 && i + j < lines.length; j++) {
                  const m = lines[i + j].match(hhmm)
                  if (m) return m[0]
                }
              }
            }
            return undefined
          }
          // Flight number - STRICT validation for Ryanair
          const isRyanair = /ryanair/i.test(subj + ' ' + text)

          if (!p.flight_number || !isValidFlightNumber(p.flight_number, isRyanair)) {
            // For Ryanair emails, ONLY accept FR followed by 3-5 digits
            if (isRyanair) {
              const mFR = find(/\bFR\s?\d{3,5}\b/i)
              p.flight_number = mFR ? mFR[0].replace(/\s+/g, '').toUpperCase() : ''
            } else {
              // For other airlines, accept standard 2-letter code + 3-5 digits
              const m = find(/\b([A-Z]{2})\s?(\d{3,5})\b/)
              if (m) {
                const code = m[1].toUpperCase()
                const num = m[2]
                // Validate it looks like a real airline code (not random letters)
                const validAirlineCodes = ['BA', 'EJ', 'EZY', 'U2', 'W6', 'W9', 'LH', 'AF', 'KL', 'AA', 'UA', 'DL', 'FR']
                if (validAirlineCodes.includes(code) || /^[A-Z]{2}$/.test(code)) {
                  p.flight_number = `${code}${num}`
                }
              }
            }
          }

          // Double-check: If airline is Ryanair but flight number doesn't look like FR+digits, clear it
          if (isRyanair && p.flight_number && !/^FR\d{3,5}$/i.test(p.flight_number)) {
            const mFR = find(/\bFR\s?\d{3,5}\b/i)
            p.flight_number = mFR ? mFR[0].replace(/\s+/g, '').toUpperCase() : ''
          }
          // PNR / reservation
          if (!p.reservation_number) {
            const m = find(/\b(PNR|Booking|Reservation)\s*(Code|Number)?\s*[:#-]?\s*([A-Z0-9]{5,8})\b/i)
            if (m) p.reservation_number = m[3]
          }
          // Dates - CRITICAL: Only extract if departure_date is missing
          if (!p.departure_date) {
            console.log(`ENRICHMENT: No departure_date found, attempting to extract from text`)
            const monthMap: Record<string, number> = {
              jan: 0, january: 0,
              feb: 1, february: 1,
              mar: 2, march: 2,
              apr: 3, april: 3,
              may: 4,
              jun: 5, june: 5,
              jul: 6, july: 6,
              aug: 7, august: 7,
              sep: 8, sept: 8, september: 8,
              oct: 9, october: 9,
              nov: 10, november: 10,
              dec: 11, december: 11,
            }

            const lines = (subj + '\n' + text).split(/\n+/).map(s => s.trim())

            const parseDaynameFormat = (s: string): Date | null => {
              // Thu, 31 Jul 2025 or Mon 31 July 2025
              const m = s.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/i)
              if (!m) return null
              const day = parseInt(m[1], 10)
              const mon = monthMap[m[2].toLowerCase()]
              const year = parseInt(m[3], 10)
              if (mon == null) return null
              const d = new Date(Date.UTC(year, mon, day))
              return isNaN(d.getTime()) ? null : d
            }

            const parseEuropeanDmyText = (s: string): Date | null => {
              // 31 Jul 2025
              const m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b/)
              if (!m) return null
              const day = parseInt(m[1], 10)
              const mon = monthMap[m[2].toLowerCase()]
              const year = parseInt(m[3], 10)
              if (mon == null) return null
              const d = new Date(Date.UTC(year, mon, day))
              return isNaN(d.getTime()) ? null : d
            }

            const parseYmd = (s: string): Date | null => {
              const m = s.match(/\b(20\d{2})[-\/](0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])\b/)
              if (!m) return null
              const d = new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)))
              return isNaN(d.getTime()) ? null : d
            }

            const parseDmy = (s: string): Date | null => {
              // 31/07/2025 or 31.07.2025
              const m = s.match(/\b(\d{1,2})[\/.](0[1-9]|1[0-2])[\/.](20\d{2})\b/)
              if (!m) return null
              const d = new Date(Date.UTC(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10)))
              return isNaN(d.getTime()) ? null : d
            }

            const tryParseLoose = (s: string): Date | null => {
              // Jul 31, 2025 OR Jul 31 OR 31 Jul
              const withYearComma = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),\s*(20\d{2})\b/)
              if (withYearComma) {
                const mon = monthMap[withYearComma[1].toLowerCase()]
                const day = parseInt(withYearComma[2], 10)
                const year = parseInt(withYearComma[3], 10)
                if (mon != null) {
                  const d = new Date(Date.UTC(year, mon, day))
                  return isNaN(d.getTime()) ? null : d
                }
              }
              const dayMonYear = parseEuropeanDmyText(s)
              if (dayMonYear) return dayMonYear
              const monDay = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\b/)
              const dayMon = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\b/)
              const rec = dateHeader ? new Date(dateHeader) : new Date()
              const baseYear = !isNaN(rec.getTime()) ? rec.getUTCFullYear() : new Date().getUTCFullYear()
              if (monDay) {
                const mon = monthMap[monDay[1].toLowerCase()]
                const day = parseInt(monDay[2], 10)
                if (mon != null) {
                  let d = new Date(Date.UTC(baseYear, mon, day))
                  if (!isNaN(rec.getTime())) {
                    const diffMs = d.getTime() - rec.getTime()
                    const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6
                    if (diffMs > sixMonthsMs) d = new Date(Date.UTC(baseYear - 1, mon, day))
                  }
                  return d
                }
              }
              if (dayMon) {
                const day = parseInt(dayMon[1], 10)
                const mon = monthMap[dayMon[2].toLowerCase()]
                if (mon != null) {
                  let d = new Date(Date.UTC(baseYear, mon, day))
                  if (!isNaN(rec.getTime())) {
                    const diffMs = d.getTime() - rec.getTime()
                    const sixMonthsMs = 1000 * 60 * 60 * 24 * 30 * 6
                    if (diffMs > sixMonthsMs) d = new Date(Date.UTC(baseYear - 1, mon, day))
                  }
                  return d
                }
              }
              return null
            }

            // Strategy 1: Prefer a date near explicit keywords or near a flight number line
            const keywordRes = [/depart/i, /outbound/i, /flight\s+[A-Z]{2}\s?\d{3,5}/i, /FR\s?\d{3,5}/i]
            const parseAroundIndex = (idx: number): Date | null => {
              for (let j = Math.max(0, idx - 2); j <= Math.min(lines.length - 1, idx + 3); j++) {
                const s = lines[j]
                const d = parseDaynameFormat(s) || parseYmd(s) || parseDmy(s) || tryParseLoose(s)
                if (d) return d
              }
              return null
            }
            let extracted: Date | null = null
            for (let i = 0; i < lines.length && !extracted; i++) {
              if (keywordRes.some(r => r.test(lines[i]))) {
                extracted = parseAroundIndex(i)
              }
            }
            // Strategy 2: Fallback - scan entire text for known formats
            if (!extracted) {
              for (const s of lines) {
                const d = parseDaynameFormat(s) || parseYmd(s) || parseDmy(s) || tryParseLoose(s)
                if (d) { extracted = d; break }
              }
            }

            if (extracted && !isNaN(extracted.getTime())) {
              p.departure_date = extracted.toISOString().slice(0, 10)
              console.log(`ENRICHMENT: Extracted departure_date: ${p.departure_date} from nearby context`)
            }
          }
          // Times
          if (!p.departure_time) {
            p.departure_time = pickTimeNear([/depart/i, /outbound/i, /from/i]) || undefined
          }
          if (!p.arrival_time) {
            p.arrival_time = pickTimeNear([/arriv/i, /to\b/i, /inbound/i]) || undefined
          }
          if (!p.departure_time || !p.arrival_time) {
            const all = Array.from((subj + ' ' + text).matchAll(hhmm)).map(m => m[0])
            if (!p.departure_time && all[0]) p.departure_time = all[0]
            if (!p.arrival_time && all[1]) p.arrival_time = all[1]
          }
          // IATA/airports
          if (!p.departure_iata || !p.arrival_iata) {
            const iatas = Array.from((text + " " + subj).matchAll(/\b([A-Z]{3})\b/g)).map(m => m[1])
            if (!p.departure_iata && iatas[0]) p.departure_iata = iatas[0]
            if (!p.arrival_iata && iatas[1]) p.arrival_iata = iatas[1]
          }
          if (p.departure_iata && !p.departure_airport) p.departure_airport = p.departure_iata
          if (p.arrival_iata && !p.arrival_airport) p.arrival_airport = p.arrival_iata
          // Passenger name
          if (!p.passenger_name) {
            const m = /Passenger[s]?:\s*([A-Za-z .'-]+)/i.exec(text) || /(Mr|Mrs|Ms)\.?\s+([A-Za-z .'-]+)/.exec(text)
            if (m) p.passenger_name = (m[2] || m[1]).trim()
          }
          // Total receipt
          if (!p.total_receipt) {
            const m = find(/([€£$]\s?\d+[.,]\d{2})/)
            if (m) p.total_receipt = m[1]
          }
        }
        enrichParsed(chosen, subject, combined)

        // DEBUG: Log what we have after enrichment
        console.log(`AFTER enrichment - Flight ${chosen.flight_number}: departure_date=${chosen.departure_date}, purchased_date=${chosen.purchased_date}`)

        // Validate/sanitize critical fields expected by UI
        const sanitize = (p: any) => {
          const isRyanairEmail = /ryanair/i.test(subject + ' ' + combined)

          // Reservation must look like PNR (5-8 alnum). Otherwise blank so UI shows '—'
          if (p.reservation_number && !/^[A-Z0-9]{5,8}$/i.test(String(p.reservation_number).trim())) {
            p.reservation_number = ''
          }

          // STRICT flight number validation
          if (p.flight_number) {
            const normalized = String(p.flight_number).replace(/\s+/g, '').toUpperCase()

            // For Ryanair, MUST be FR + 3-5 digits
            if (isRyanairEmail) {
              if (/^FR\d{3,5}$/.test(normalized)) {
                p.flight_number = normalized
              } else {
                // Try to extract FR flight number from the string
                const frMatch = normalized.match(/FR\d{3,5}/)
                p.flight_number = frMatch ? frMatch[0] : ''
              }
            } else {
              // For other airlines, must be 2 letters + 3-5 digits
              const m = normalized.match(/^([A-Z]{2})(\d{3,5})$/)
              if (m) {
                p.flight_number = normalized
              } else {
                // Try to extract valid pattern
                const match = normalized.match(/([A-Z]{2}\d{3,5})/)
                p.flight_number = match ? match[1] : ''
              }
            }
          }
          // Dates to ISO (YYYY-MM-DD)
          if (p.departure_date) {
            const d = new Date(p.departure_date)
            if (!isNaN(d.getTime())) {
              p.departure_date = d.toISOString().slice(0, 10)
              console.log(`SANITIZE: Normalized departure_date to ${p.departure_date}`)
            }
          }
          // Times HH:mm
          const fixTime = (t: string) => {
            if (!t) return ''
            const m = t.match(/^(\d{1,2}):?(\d{2})$/)
            if (!m) return ''
            const hh = m[1].padStart(2, '0')
            const mm = m[2]
            const hNum = parseInt(hh, 10)
            const mNum = parseInt(mm, 10)
            if (hNum > 23 || mNum > 59) return ''
            // Reject suspicious "00:00" times that are likely parsing errors
            if (hh === '00' && mm === '00') return ''
            return `${hh}:${mm}`
          }
          if (p.departure_time) p.departure_time = fixTime(p.departure_time)
          if (p.arrival_time) p.arrival_time = fixTime(p.arrival_time)
          // Do NOT set departure_date from email received date. If parsing didn't find a
          // flight date, leave it empty so the UI shows '—' instead of a wrong date.
          // If arrival earlier than departure and arrival_date missing, assume next day
          if (p.departure_date && p.departure_time && p.arrival_time && !p.arrival_date) {
            const dm = p.departure_time.match(/^(\d{2}):(\d{2})$/)
            const am = p.arrival_time.match(/^(\d{2}):(\d{2})$/)
            if (dm && am) {
              const depM = parseInt(dm[1], 10) * 60 + parseInt(dm[2], 10)
              const arrM = parseInt(am[1], 10) * 60 + parseInt(am[2], 10)
              if (arrM < depM) {
                const d0 = new Date(p.departure_date)
                if (!isNaN(d0.getTime())) {
                  d0.setUTCDate(d0.getUTCDate() + 1)
                  p.arrival_date = d0.toISOString().slice(0, 10)
                }
              }
            }
          }
          return p
        }
        // Debug: Log the parsed data to see what's being extracted
        console.log(`Flight ${chosen.flight_number || 'Unknown'}: dep_date=${chosen.departure_date}, dep_time=${chosen.departure_time}, arr_time=${chosen.arrival_time}`)

        sanitize(chosen)

        // DEBUG: Log final result before returning
        console.log(`FINAL RESULT - Flight ${chosen.flight_number}: departure_date=${chosen.departure_date}, purchased_date=${chosen.purchased_date}`)

        const depISO = chosen.departure_date ? new Date(chosen.departure_date).toISOString().slice(0, 10) : ''
        const key = `${(chosen.flight_number || '').trim()}|${(chosen.reservation_number || '').trim()}|${depISO}`
        const duplicate = !!(chosen.flight_number && chosen.reservation_number && depISO && existingKeys.has(key))

        return {
          id,
          subject,
          received_at: dateHeader,
          duplicate,
          key,
          parsed: chosen,
        }
      }))
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) previews.push(r.value)
      }
    }

    // 3) Sort newest first for consistent UI
    previews.sort((a, b) => new Date(b.received_at || 0).getTime() - new Date(a.received_at || 0).getTime())

    // 4) Filter by date range if specified - use departure date only for travel date filtering
    let filteredPreviews = previews
    if (start || end) {
      filteredPreviews = previews.filter(item => {
        // Only use departure date for filtering - this is the actual travel date
        const departureDate = item.parsed?.departure_date

        // For future flight searches, we want to include items without departure date
        // so users can manually review them - they might contain relevant flight data
        if (!departureDate) {
          // Include items without departure date only if we couldn't parse it
          // This allows manual review of potentially valid emails
          return isFutureFlightSearch && item.parsed?.flight_number
        }

        const departureDateObj = new Date(departureDate)
        if (isNaN(departureDateObj.getTime())) {
          // Invalid date - include for future searches with flight number
          return isFutureFlightSearch && item.parsed?.flight_number
        }

        const departureDateISO = departureDateObj.toISOString().slice(0, 10)

        // Check start date
        if (start && departureDateISO < start) return false

        // Check end date
        if (end && departureDateISO > end) return false

        return true
      })

      console.log(`\n=== Date Range Filtering by FLIGHT DEPARTURE DATE ===`)
      console.log(`Looking for flights departing between: ${start || 'unlimited'} and ${end || 'unlimited'}`)
      console.log(`Is future flight search: ${isFutureFlightSearch}`)
      console.log(`Total emails parsed: ${previews.length}`)
      console.log(`Flights with departure in range: ${filteredPreviews.length}`)
      console.log(`Filtered out (departure outside range): ${previews.length - filteredPreviews.length} emails`)

      // Log flights that MATCHED the date range
      if (filteredPreviews.length > 0) {
        console.log(`\nFlights IN date range (showing first 5):`)
        filteredPreviews.slice(0, 5).forEach(item => {
          const p = item.parsed
          console.log(`  ✓ ${p?.flight_number || 'Unknown'} departing ${p?.departure_date} (${p?.departure_iata || '?'} → ${p?.arrival_iata || '?'})`)
        })
      }

      // Log some examples of filtered OUT emails for debugging
      const filteredOut = previews.filter(item => {
        const departureDate = item.parsed?.departure_date
        if (!departureDate) return true
        const departureDateObj = new Date(departureDate)
        if (isNaN(departureDateObj.getTime())) return true
        const departureDateISO = departureDateObj.toISOString().slice(0, 10)
        if (start && departureDateISO < start) return true
        if (end && departureDateISO > end) return true
        return false
      })

      if (filteredOut.length > 0) {
        console.log(`\nFlights OUTSIDE date range (showing first 3):`)
        filteredOut.slice(0, 3).forEach(item => {
          const p = item.parsed
          console.log(`  ✗ ${p?.flight_number || 'Unknown'} departing ${p?.departure_date || 'unknown'} - outside ${start} to ${end}`)
        })
      }
    }

    console.log(`=== Final Result ===`)
    console.log(`Returning ${filteredPreviews.length} emails to frontend`)
    console.log(`====================`)

    return NextResponse.json({ items: filteredPreviews })
  } catch (e: any) {
    const message = e?.message || 'Unknown error'
    if (message.includes('invalid_grant') || message.includes('unauthorized_client')) {
      return NextResponse.json({ error: 'reauthorize', authUrl: getAuthUrl() }, { status: 401 })
    }
    return NextResponse.json({ error: 'server_error', message }, { status: 500 })
  }
}
