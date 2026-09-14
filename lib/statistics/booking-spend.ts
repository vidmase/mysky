// Spending is filed per flight leg but paid per booking: a return trip is stored as
// one row per leg, every row carrying the same booking reference and repeating the
// fare for the whole booking. Grouping by reference keeps totals from double counting.

export type BookingFlight = {
  id: string | number
  reservation_number?: string | null
  total_receipt?: string | null
  extras_receipt?: string | null
  departure_date?: string | null
  airline?: string | null
  cancelled?: boolean | null
}

export type Booking<T extends BookingFlight = BookingFlight> = {
  /** stable identity of the booking: its reference, or the lone flight's id */
  key: string
  /**
   * What the booking cost, or null when no leg carries a fare. A cancelled
   * booking keeps its total — the money was still spent and the ticket still
   * shows it — so callers summing spend must skip `cancelled` rather than
   * relying on this being null.
   */
  total: number | null
  /**
   * The part of `total` that went on extras — seats, bags, priority, insurance —
   * or null when nothing is on record. It is a portion of the fare, never an
   * addition to it, so a caller reporting both says "of which", not "plus".
   */
  extras: number | null
  /** Every leg was cancelled, so the fare is real but the trip never happened. */
  cancelled: boolean
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

/**
 * One figure for the whole booking. Identical amounts across the legs are one
 * charge repeated on each row; amounts that differ were filed per leg and do add
 * up. The fare and the extras are filed the same way, so they collapse the same
 * way.
 */
function collapseLegAmounts(raws: Array<string | null | undefined>): number | null {
  const amounts = raws
    .map(parseReceiptAmount)
    .filter((amount): amount is number => amount !== null)

  if (amounts.length === 0) return null
  const repeated = amounts.every((amount) => Math.abs(amount - amounts[0]) < 0.01)
  return repeated ? amounts[0] : amounts.reduce((sum, amount) => sum + amount, 0)
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
    const total = collapseLegAmounts(group.map((leg) => leg.total_receipt))
    const extras = collapseLegAmounts(group.map((leg) => leg.extras_receipt))

    // Legs run earliest first, so legs[0] is the outbound: the booking is shown
    // and attributed there, whatever order the list happens to be sorted in.
    const time = (leg: T) => {
      const t = leg.departure_date ? new Date(leg.departure_date).getTime() : NaN
      return isNaN(t) ? Number.POSITIVE_INFINITY : t
    }
    const legs = [...group].sort((a, b) => time(a) - time(b))
    const outbound = legs[0]

    // Cancelled only when the whole booking was: one cancelled leg of a return
    // is a changed trip, not an abandoned one.
    const cancelled = group.length > 0 && group.every((leg) => leg.cancelled === true)

    bookings.push({
      key,
      total,
      extras,
      cancelled,
      departure_date: isFinite(time(outbound)) ? outbound.departure_date ?? null : null,
      airline: outbound?.airline || null,
      legs,
    })
  }
  return bookings
}
