// What an email parse must look like before it may become a row in someone's
// log. The Gmail parsers fall back to placeholder values when they misread an
// email (airports "DTD" to "DTD", a 15:00-15:00 flight, a reference of
// "Number"), and those rows would otherwise go straight into the stats.

export type ParsedFlightLike = {
  departure_iata?: unknown
  arrival_iata?: unknown
  flight_number?: unknown
  departure_date?: unknown
  departure_time?: unknown
  arrival_time?: unknown
}

const IATA = /^[A-Z]{3}$/
const FLIGHT_NUMBER = /^[A-Z0-9]{2}\s?\d{1,4}[A-Z]?$/

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

/** Why the parse cannot be trusted as a flight, or null when it can. */
export function flightParseProblem(f: ParsedFlightLike): string | null {
  const from = text(f.departure_iata).toUpperCase()
  const to = text(f.arrival_iata).toUpperCase()
  if (!IATA.test(from) || !IATA.test(to)) return 'airports not read'
  if (from === to) return `departure and arrival are both ${from}`
  if (!FLIGHT_NUMBER.test(text(f.flight_number).toUpperCase())) return 'flight number not read'
  const date = text(f.departure_date).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) return 'departure date not read'
  const dep = text(f.departure_time).slice(0, 5)
  const arr = text(f.arrival_time).slice(0, 5)
  if (dep && arr && dep === arr) return `departure and arrival times are both ${dep}`
  return null
}

/**
 * The same flight, however it was filed: one date and one flight number. The
 * booking reference is not used because a misread email turns it into words
 * like "Number" or "PUBLIC", which then never match the real booking.
 */
export function flightKey(date: unknown, flightNumber: unknown): string {
  return `${text(date).slice(0, 10)}|${text(flightNumber).replace(/\s+/g, '').toUpperCase()}`
}
