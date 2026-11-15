// One booking read from one confirmation email, by a reader that knows that
// airline's layout exactly. There is no guessing anywhere in this module: an
// email a reader does not recognise yields null and is reported, never saved.

export type EmailLeg = {
  flight_number: string // "FR8681", "W61913", "EZY2703"
  departure_iata: string
  arrival_iata: string
  departure_airport: string
  arrival_airport: string
  departure_date: string // YYYY-MM-DD, local
  arrival_date: string // YYYY-MM-DD, local; the next day when it lands after midnight
  departure_time: string // HH:MM, local
  arrival_time: string // HH:MM, local
}

export type EmailBooking = {
  airline: 'Ryanair' | 'Wizz Air' | 'easyJet'
  /** which reader produced this, recorded on every saved row */
  reader: string
  reservation_number: string
  legs: EmailLeg[]
  passenger_name: string | null
  /** what the whole booking cost, "GBP 239.20"; null when the email does not say */
  total_receipt: string | null
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** "21", "Mar", "26" or "2026" to "2026-03-21"; null when it is not a real date. */
export function isoFromParts(day: string, month: string, year: string): string | null {
  const m = /^\d+$/.test(month) ? parseInt(month, 10) : MONTHS[month.slice(0, 3).toLowerCase()]
  let y = parseInt(year, 10)
  const d = parseInt(day, 10)
  if (!m || isNaN(y) || isNaN(d)) return null
  if (y < 100) y += 2000
  const iso = `${y}-${pad2(m)}-${pad2(d)}`
  const check = new Date(`${iso}T00:00:00Z`)
  return check.getUTCMonth() + 1 === m && check.getUTCDate() === d ? iso : null
}

export function hhmm(t: string): string {
  const [h, m] = t.split(':')
  return `${pad2(parseInt(h, 10))}:${m}`
}

export function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** HTML or plain text to one line of plain text. */
export function flattenEmailText(raw: string): string {
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&bull;/gi, '•')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&pound;/gi, '£')
    .replace(/&euro;/gi, '€')
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Removes repeats of the same leg (an email can list it twice). */
export function uniqueLegs(legs: EmailLeg[]): EmailLeg[] {
  const seen = new Set<string>()
  return legs.filter((l) => {
    const k = `${l.departure_date}|${l.flight_number}|${l.departure_iata}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
