import type { FlightOffer, Segment, SeatType } from './types'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format SimpleDatetime.time [H, M] (or longer) as HH:MM */
export function formatSegmentTime(time: number[] | undefined, fallback: string): string {
  if (!time || time.length < 2) return fallback
  const h = Number(time[0])
  const m = Number(time[1])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback
  return `${pad2(h)}:${pad2(m)}`
}

/** Format SimpleDatetime.date [Y, M, D] as YYYY-MM-DD */
export function formatSegmentDate(date: number[] | undefined, fallback: string): string {
  if (!date || date.length < 3) return fallback
  const y = Number(date[0])
  const m = Number(date[1])
  const d = Number(date[2])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return fallback
  return `${y}-${pad2(m)}-${pad2(d)}`
}

export function mapSeatToCode(seat: SeatType): string {
  switch (seat) {
    case 'premium-economy':
      return 'W'
    case 'business':
      return 'J'
    case 'first':
      return 'F'
    case 'economy':
    default:
      return 'Y'
  }
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

export interface PlannedFlightPayload {
  departure_airport: string
  arrival_airport: string
  departure_iata: string
  arrival_iata: string
  departure_date: string
  arrival_date: string
  departure_time: string
  arrival_time: string
  airline: string
  flight_number: string
  reservation_number: string
  passenger_name: string
  notes: string
  total_receipt: string
  seat: string
  purchased_date: string
  purchase_time: string
}

export interface OfferLegs {
  outbound: Segment[]
  /** Return segments when the offer contains a round-trip itinerary, otherwise null */
  inbound: Segment[] | null
}

/**
 * Split an offer's segments into outbound and return legs.
 * The return leg starts after the first segment that lands at the destination,
 * which is how Google Flights orders round-trip itineraries. Offers that only
 * carry the outbound itinerary (the usual round-trip response) get inbound: null.
 */
export function splitOfferLegs(offer: FlightOffer, toIata: string): OfferLegs {
  const segments = offer.flights || []
  const dest = (toIata || segments[segments.length - 1]?.to_airport?.code || '').toUpperCase()
  if (segments.length < 2 || !dest) return { outbound: segments, inbound: null }

  const turnaround = segments.findIndex(
    (s) => (s.to_airport?.code || '').toUpperCase() === dest
  )
  if (turnaround < 0 || turnaround >= segments.length - 1) {
    return { outbound: segments, inbound: null }
  }

  return {
    outbound: segments.slice(0, turnaround + 1),
    inbound: segments.slice(turnaround + 1),
  }
}

/** Layover minutes between two consecutive segments, or null when undatable */
export function layoverMinutes(prev: Segment, next: Segment): number | null {
  const arrive = toDate(prev.arrival?.date, prev.arrival?.time)
  const depart = toDate(next.departure?.date, next.departure?.time)
  if (!arrive || !depart) return null
  const diff = Math.round((depart.getTime() - arrive.getTime()) / 60000)
  return diff > 0 ? diff : null
}

function toDate(date: number[] | undefined, time: number[] | undefined): Date | null {
  if (!date || date.length < 3 || !time || time.length < 2) return null
  const [y, m, d] = date
  const [h, min] = time
  if (![y, m, d, h, min].every((n) => Number.isFinite(Number(n)))) return null
  return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min))
}

/** Whole days the itinerary crosses between departure and arrival (0 = same day) */
export function dayOffset(segments: Segment[]): number {
  const first = segments[0]
  const last = segments[segments.length - 1]
  const dep = formatSegmentDate(first?.departure?.date, '')
  const arr = formatSegmentDate(last?.arrival?.date, '')
  if (!dep || !arr || dep === arr) return 0
  const diff = Date.parse(arr) - Date.parse(dep)
  return Number.isFinite(diff) ? Math.round(diff / 86400000) : 0
}

/** Total flying time of a set of segments, in minutes */
export function segmentsDuration(segments: Segment[]): number {
  return segments.reduce((total, s) => total + (Number(s.duration) || 0), 0)
}

export function mapOfferToPlannedFlight(opts: {
  offer: FlightOffer
  fromIata: string
  toIata: string
  searchDate: string
  seat: SeatType
  currency?: string
  /** Segments to book as this flight; defaults to the whole offer */
  segments?: Segment[]
  /** Label used in the note, e.g. "Return" for the inbound leg of a round trip */
  legLabel?: string
  /** Return legs share the round-trip price, so only the outbound records the cost */
  includePrice?: boolean
}): PlannedFlightPayload {
  const {
    offer,
    fromIata,
    toIata,
    searchDate,
    seat,
    currency = 'GBP',
    segments: legSegments,
    legLabel,
    includePrice = true,
  } = opts
  const segments = legSegments?.length ? legSegments : offer.flights || []
  const first = segments[0]
  const last = segments[segments.length - 1]

  const departure_time = formatSegmentTime(first?.departure?.time, '12:00')
  const arrival_time = formatSegmentTime(last?.arrival?.time, '18:00')
  const departure_date = formatSegmentDate(first?.departure?.date, searchDate)
  const arrival_date = formatSegmentDate(last?.arrival?.date, departure_date)

  const fromCode = (first?.from_airport?.code || fromIata || '').toUpperCase()
  const toCode = (last?.to_airport?.code || toIata || '').toUpperCase()

  const airline = offer.airlines?.[0] || 'Unknown'
  const priceLabel =
    typeof offer.price === 'number'
      ? `${currency === 'GBP' ? '£' : `${currency} `}${offer.price}`
      : String(offer.price ?? '')

  const today = new Date()
  const purchased_date = today.toISOString().slice(0, 10)
  const purchase_time = `${pad2(today.getHours())}:${pad2(today.getMinutes())}`

  const stops = Math.max(0, segments.length - 1)
  const noteParts = [
    '[planned] Live search',
    legLabel ? `${legLabel} leg` : null,
    includePrice ? priceLabel : `${priceLabel} (round trip total, booked on outbound)`,
    `${stops} stop(s)`,
    'added from Fly it again',
  ].filter(Boolean)

  return {
    departure_airport: fromCode,
    arrival_airport: toCode,
    departure_iata: fromCode,
    arrival_iata: toCode,
    departure_date,
    arrival_date,
    departure_time,
    arrival_time,
    airline,
    flight_number: 'PLANNED',
    reservation_number: 'LIVE-SEARCH',
    passenger_name: 'Planned',
    notes: noteParts.join(' · '),
    total_receipt:
      includePrice && typeof offer.price === 'number' ? String(offer.price) : '',
    seat: mapSeatToCode(seat),
    purchased_date,
    purchase_time,
  }
}

/** Default search date: today + 21 days (YYYY-MM-DD) */
export function defaultSearchDate(daysAhead = 21): string {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

/** Shift a YYYY-MM-DD date string by n days */
export function addDays(date: string, n: number): string {
  const parsed = Date.parse(date)
  if (!Number.isFinite(parsed)) return date
  const d = new Date(parsed)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
