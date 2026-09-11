// Spending is filed per flight leg but paid per booking: a return trip is stored as
// one row per leg, every row carrying the same booking reference and repeating the
// fare for the whole booking. Grouping by reference keeps totals from double counting.

export type BookingFlight = {
  id: string | number
  reservation_number?: string | null
  total_receipt?: string | null
  departure_date?: string | null
  airline?: string | null
}

export type Booking = {
  total: number
  departure_date: string | null
  airline: string | null
}

export function parseReceiptAmount(raw?: string | null): number | null {
  if (!raw) return null
  const value = parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  return !isNaN(value) && value > 0 ? value : null
}

// Placeholders people type when a booking has no reference. They must not collapse
// unrelated flights into a single booking.
const PLACEHOLDER_REFS = new Set(['NA', 'N/A', 'NONE', 'UNKNOWN', 'TBC', '-', '--'])

function bookingKey(f: BookingFlight): string {
  const ref = (f.reservation_number || '').trim().toUpperCase()
  if (!ref || ref.length < 4 || PLACEHOLDER_REFS.has(ref)) return `flight:${f.id}`
  return `ref:${ref}`
}

/**
 * A return trip is filed as one row per leg, every row carrying the same booking
 * reference and repeating the fare for the whole booking. Summing the legs charges
 * that fare twice, so the fare is counted once per reference instead.
 */
export function groupFlightsIntoBookings(flights: BookingFlight[]): Booking[] {
  const groups = new Map<string, BookingFlight[]>()
  for (const f of flights) {
    const key = bookingKey(f)
    const group = groups.get(key)
    if (group) group.push(f)
    else groups.set(key, [f])
  }

  const bookings: Booking[] = []
  for (const legs of groups.values()) {
    const amounts = legs
      .map((leg) => parseReceiptAmount(leg.total_receipt))
      .filter((amount): amount is number => amount !== null)
    if (amounts.length === 0) continue

    // Identical amounts across the legs are one fare repeated; amounts that differ
    // were priced per leg and do add up.
    const repeatedFare = amounts.every((amount) => Math.abs(amount - amounts[0]) < 0.01)
    const total = repeatedFare ? amounts[0] : amounts.reduce((sum, amount) => sum + amount, 0)

    // The booking is attributed to its first leg, so a return trip lands in the year
    // and with the carrier it was flown out on.
    const dated = legs
      .filter((leg) => leg.departure_date && !isNaN(new Date(leg.departure_date).getTime()))
      .sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime())
    const first = dated[0] || legs[0]

    bookings.push({
      total,
      departure_date: dated[0]?.departure_date || null,
      airline: first?.airline || null,
    })
  }
  return bookings
}
