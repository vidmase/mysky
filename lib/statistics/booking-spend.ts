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

export type Booking<T extends BookingFlight = BookingFlight> = {
  /** stable identity of the booking: its reference, or the lone flight's id */
  key: string
  /** what the booking cost, or null when no leg carries a fare */
  total: number | null
  departure_date: string | null
  airline: string | null
  /** every leg of the booking, earliest departure first; legs[0] is the outbound */
  legs: T[]
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
export function groupFlightsIntoBookings<T extends BookingFlight>(flights: T[]): Booking<T>[] {
  const groups = new Map<string, T[]>()
  for (const f of flights) {
    const key = bookingKey(f)
    const group = groups.get(key)
    if (group) group.push(f)
    else groups.set(key, [f])
  }

  const bookings: Booking<T>[] = []
  for (const [key, group] of groups) {
    const amounts = group
      .map((leg) => parseReceiptAmount(leg.total_receipt))
      .filter((amount): amount is number => amount !== null)

    // Identical amounts across the legs are one fare repeated; amounts that differ
    // were priced per leg and do add up.
    const repeatedFare =
      amounts.length > 0 && amounts.every((amount) => Math.abs(amount - amounts[0]) < 0.01)
    const total =
      amounts.length === 0
        ? null
        : repeatedFare
          ? amounts[0]
          : amounts.reduce((sum, amount) => sum + amount, 0)

    // Legs run earliest first, so legs[0] is the outbound: the booking is shown
    // and attributed there, whatever order the list happens to be sorted in.
    const time = (leg: T) => {
      const t = leg.departure_date ? new Date(leg.departure_date).getTime() : NaN
      return isNaN(t) ? Number.POSITIVE_INFINITY : t
    }
    const legs = [...group].sort((a, b) => time(a) - time(b))
    const outbound = legs[0]

    bookings.push({
      key,
      total,
      departure_date: isFinite(time(outbound)) ? outbound.departure_date ?? null : null,
      airline: outbound?.airline || null,
      legs,
    })
  }
  return bookings
}
