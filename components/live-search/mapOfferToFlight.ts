import type { FlightOffer, SeatType } from './types'

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

export function mapOfferToPlannedFlight(opts: {
  offer: FlightOffer
  fromIata: string
  toIata: string
  searchDate: string
  seat: SeatType
  currency?: string
}): PlannedFlightPayload {
  const { offer, fromIata, toIata, searchDate, seat, currency = 'GBP' } = opts
  const segments = offer.flights || []
  const first = segments[0]
  const last = segments[segments.length - 1]

  const departure_time = formatSegmentTime(first?.departure?.time, '12:00')
  const arrival_time = formatSegmentTime(last?.arrival?.time, '18:00')
  const arrival_date = formatSegmentDate(last?.arrival?.date, searchDate)

  const fromCode = (fromIata || first?.from_airport?.code || '').toUpperCase()
  const toCode = (toIata || last?.to_airport?.code || '').toUpperCase()

  const airline = offer.airlines?.[0] || 'Unknown'
  const priceLabel =
    typeof offer.price === 'number'
      ? `${currency === 'GBP' ? '£' : ''}${offer.price}`
      : String(offer.price ?? '')

  const today = new Date()
  const purchased_date = today.toISOString().slice(0, 10)
  const purchase_time = `${pad2(today.getHours())}:${pad2(today.getMinutes())}`

  return {
    departure_airport: fromCode,
    arrival_airport: toCode,
    departure_iata: fromCode,
    arrival_iata: toCode,
    departure_date: searchDate,
    arrival_date,
    departure_time,
    arrival_time,
    airline,
    flight_number: 'PLANNED',
    reservation_number: 'LIVE-SEARCH',
    passenger_name: 'Planned',
    notes: `[planned] Live search · ${priceLabel} · ${offer.stops ?? 0} stop(s) · added from Fly it again`,
    total_receipt: typeof offer.price === 'number' ? String(offer.price) : String(offer.price ?? ''),
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
