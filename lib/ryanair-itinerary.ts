// Reads a Ryanair "Travel Itinerary" email into every leg it books.
//
// The generic parsers return one flight per email, so the return leg of a
// booking was always dropped, and they do not know Ryanair's current layout,
// so a fallback guessed airports like "DTD". Ryanair has used four layouts
// since 2012; each is matched exactly here, and anything else returns null so
// the caller can fall back to its other parsers.

export type RyanairLeg = {
  flight_number: string
  departure_iata: string
  arrival_iata: string
  departure_airport: string
  arrival_airport: string
  departure_date: string // YYYY-MM-DD
  arrival_date: string // YYYY-MM-DD, the next day when the flight lands after midnight
  departure_time: string // HH:MM, local
  arrival_time: string // HH:MM, local
}

export type RyanairItinerary = {
  reservation_number: string
  legs: RyanairLeg[]
  passenger_name: string | null
  total_receipt: string | null // "GBP 239.20", the whole booking
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** HTML or plain text to one line of plain text. */
export function flattenEmailText(raw: string): string {
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

const pad = (n: number) => String(n).padStart(2, '0')

function isoDate(day: string, mon: string, year: string): string | null {
  const m = MONTHS[mon.slice(0, 3).toLowerCase()]
  let y = parseInt(year, 10)
  if (!m || isNaN(y)) return null
  if (y < 100) y += 2000
  return `${y}-${pad(m)}-${pad(parseInt(day, 10))}`
}

function hhmm(t: string): string {
  const [h, m] = t.split(':')
  return `${pad(parseInt(h, 10))}:${m}`
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

const name = (s: string) => s.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim()

// 2019-now: "To Bristol FR8682 Kaunas - Bristol Mon, 02 Nov 26 Departure time - 11:15 Arrival time - 12:15 (KUN) - (BRS)"
const LAYOUT_CURRENT = /(FR ?\d{1,4})\s+(.{2,60}?)\s+-\s+(.{2,60}?)\s+\w{3},\s*(\d{1,2}) ?([A-Za-z]{3}) ?(\d{2,4})\s+Departure time\s*-\s*(\d{1,2}:\d{2})\s+Arrival time\s*-\s*(\d{1,2}:\d{2})\s+\(([A-Z]{3})\)\s*-\s*\(([A-Z]{3})\)/g
// 2015-2018: "To Kaunas : FR8681 DEPART: Bristol (BRS) DATE: Tue, 11 Aug 15 TIME: 08:45 ARRIVAL: Kaunas (KUN) DATE: Tue, 11 Aug 15 TIME: 13:35"
const LAYOUT_2015 = /(FR ?\d{1,4})\s+DEPART:\s*(.{2,60}?)\(([A-Z]{3})\)\s*DATE:\s*\w{3},?\s*(\d{1,2}) ?([A-Za-z]{3}) ?(\d{2,4})\s+TIME:\s*(\d{1,2}:\d{2})\s+ARRIVAL:\s*(.{2,60}?)\(([A-Z]{3})\)\s*DATE:.{5,22}?TIME:\s*(\d{1,2}:\d{2})/gi
// 2013-2015: "From Bristol to Kaunas (FR8681) DEPART (BRS) Bristol ARRIVAL (KUN) Kaunas Wed 05 Mar 2014 15:45 hrs Wed 05 Mar 2014 20:15 hrs"
const LAYOUT_2014 = /\((FR ?\d{1,4})\)\s+DEPART\s+\(([A-Z]{3})\)\s+(.{2,40}?)\s+ARRIVAL\s+\(([A-Z]{3})\)\s+(.{2,40}?)\s+\w{3} (\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{1,2}:\d{2}) hrs \w{3} \d{1,2} [A-Za-z]{3} \d{4} (\d{1,2}:\d{2}) hrs/g
// 2010-2013: "From Bristol (BRS) to Kaunas (KUN) Fri, 01Jun12 Flight FR8681 Depart BRS at 17:05 and arrive KUN at 21:55"
const LAYOUT_2012 = /From (.{2,40}?) \(([A-Z]{3})\) to (.{2,40}?) \(([A-Z]{3})\) \w{3}, (\d{2})([A-Za-z]{3})(\d{2}) Flight (FR ?\d{1,4}) Depart [A-Z]{3} at (\d{1,2}:\d{2}) and arrive [A-Z]{3} at (\d{1,2}:\d{2})/g

function leg(fn: string, fromName: string, from: string, toName: string, to: string, date: string | null, dep: string, arr: string): RyanairLeg | null {
  if (!date) return null
  const departure_time = hhmm(dep)
  const arrival_time = hhmm(arr)
  return {
    flight_number: fn.replace(/\s+/g, '').toUpperCase(),
    departure_iata: from.toUpperCase(),
    arrival_iata: to.toUpperCase(),
    departure_airport: name(fromName) || from,
    arrival_airport: name(toName) || to,
    departure_date: date,
    // Times are local; landing earlier on the clock than take-off means after midnight.
    arrival_date: arrival_time < departure_time ? nextDay(date) : date,
    departure_time,
    arrival_time,
  }
}

export function parseRyanairItinerary(raw: string): RyanairItinerary | null {
  const t = flattenEmailText(raw)

  const ref =
    /Reservation:?\s*([A-Z0-9]{6})\b/.exec(t) ||
    /RESERVATION NUMBER(?: IS:)?\s+([A-Z0-9]{6})\b/i.exec(t)
  if (!ref) return null

  const legs: RyanairLeg[] = []
  for (const m of t.matchAll(LAYOUT_CURRENT)) legs.push(leg(m[1], m[2], m[9], m[3], m[10], isoDate(m[4], m[5], m[6]), m[7], m[8])!)
  for (const m of t.matchAll(LAYOUT_2015)) legs.push(leg(m[1], m[2], m[3], m[8], m[9], isoDate(m[4], m[5], m[6]), m[7], m[10])!)
  for (const m of t.matchAll(LAYOUT_2014)) legs.push(leg(m[1], m[3], m[2], m[5], m[4], isoDate(m[6], m[7], m[8]), m[9], m[10])!)
  for (const m of t.matchAll(LAYOUT_2012)) legs.push(leg(m[8], m[1], m[2], m[3], m[4], isoDate(m[5], m[6], m[7]), m[9], m[10])!)

  // The same leg can be listed twice (a summary and a detail block).
  const seen = new Set<string>()
  const unique = legs.filter((l) => {
    if (!l) return false
    const k = `${l.departure_date}|${l.flight_number}|${l.departure_iata}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  if (!unique.length) return null

  // Passengers run until the receipt; a family booking lists four, so take
  // everything up to the next section rather than a fixed window.
  const paxStart = t.search(/Passenger\(s\):?/i)
  const paxText = paxStart < 0 ? '' : t.slice(paxStart, paxStart + 800).split(/Receipt|Total paid|Total price|Payment|No travel|Reserve your/i)[0]
  const names = paxText
    ? Array.from(paxText.matchAll(/(?:Mrs?|Ms|Miss|Child|Chd|Inf)\.? ([A-Z][A-Za-z\- ]+?)(?= ●| •| Flight| (?:Mrs?|Ms|Miss|Child|Chd|Inf)\b|$)/g)).map((n) => n[0].replace(/\s+/g, ' ').trim())
    : []
  const passengers = /PASSENGERS\s+1\.\s+(MRS?|MS|MISS) ([A-Z ]+?)\s+ADT/.exec(t)
  const passenger_name = names.length ? names.join(', ') : passengers ? `${passengers[1]} ${passengers[2]}` : null

  const total =
    /Total (?:price|paid)[^0-9]{0,90}?(?:\d{4} )?(\d[\d,]*\.\d{2})\s*([A-Z]{3})/i.exec(t) ||
    /\*+(\d[\d,]*\.\d{2}) ([A-Z]{3})\s+Total Paid/i.exec(t)
  const total_receipt = total ? `${total[2].toUpperCase()} ${total[1].replace(/,/g, '')}` : null

  return { reservation_number: ref[1], legs: unique, passenger_name, total_receipt }
}

/**
 * One parsed-flight object per leg, in the shape the Gmail preview and import
 * already use. The fare is the whole booking's and is repeated on each leg, as
 * the rest of the log does; spending counts it once per booking reference.
 */
export function itineraryToFlights(it: RyanairItinerary, receivedAt?: string) {
  const received = receivedAt ? new Date(receivedAt) : null
  const ok = received && !isNaN(received.getTime())
  return it.legs.map((l) => ({
    ...l,
    reservation_number: it.reservation_number,
    passenger_name: it.passenger_name,
    total_receipt: it.total_receipt,
    airline: 'Ryanair',
    purchased_date: ok ? received!.toISOString().slice(0, 10) : null,
    purchase_time: ok ? received!.toISOString().slice(11, 19) : null,
  }))
}
