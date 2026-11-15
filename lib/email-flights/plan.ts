import { allAirports } from '@/lib/airports'
import { flightKey, flightParseProblem } from '@/lib/flight-validity'
import { open, seal } from '@/lib/secret-box'
import type { EmailBooking, EmailLeg } from './types'

// Deciding what each leg from email means for the log, and sealing exactly
// what the user is shown so that saving writes that and nothing else.

export type ReadEmail = { emailId: string; subject: string; receivedAt: string; booking: EmailBooking }

export type LogRow = {
  departure_date: string | null
  flight_number: string | null
  reservation_number: string | null
  departure_iata: string | null
  arrival_iata: string | null
}

/**
 * new: not in the log, ready to add.
 * changed: the log has this booking with other flights, so the airline moved
 *   it; adding is left to the user, who may want to remove the old flight.
 * in_log: the same date and flight number is already filed.
 */
export type LegStatus = 'new' | 'changed' | 'in_log'

export type PlannedLeg = {
  status: LegStatus
  note?: string
  /** sealed row to save; absent for in_log */
  token?: string
  display: {
    date: string
    flightNumber: string
    from: string
    to: string
    departs: string
    arrives: string
    airline: string
    reference: string
    passengers: string | null
    fare: string | null
  }
}

const AIRPORT = new Map(allAirports.map((a) => [a.iata, a]))
const ref = (s: string | null | undefined) => (s || '').trim().toUpperCase()

/** The row exactly as it will be inserted, built from one leg of one email. */
export function rowForLeg(ownerId: string, read: ReadEmail, leg: EmailLeg) {
  const received = new Date(read.receivedAt)
  const receivedOk = !isNaN(received.getTime())
  const dep = AIRPORT.get(leg.departure_iata)
  const arr = AIRPORT.get(leg.arrival_iata)
  return {
    owner_id: ownerId,
    passenger_name: read.booking.passenger_name || 'Unknown',
    reservation_number: read.booking.reservation_number,
    flight_number: leg.flight_number,
    airline: read.booking.airline,
    departure_airport: leg.departure_airport,
    arrival_airport: leg.arrival_airport,
    departure_iata: leg.departure_iata,
    arrival_iata: leg.arrival_iata,
    departure_date: leg.departure_date,
    arrival_date: leg.arrival_date,
    departure_time: leg.departure_time,
    arrival_time: leg.arrival_time,
    // The whole booking's fare on each leg, as the rest of the log is filed;
    // spending counts it once per booking reference.
    total_receipt: read.booking.total_receipt ?? '',
    purchased_date: receivedOk ? received.toISOString().slice(0, 10) : leg.departure_date,
    purchase_time: receivedOk ? received.toISOString().slice(11, 19) : '00:00:00',
    departure_country: dep?.country ?? null,
    arrival_country: arr?.country ?? null,
    departure_latitude: dep?.coordinates?.[1] ?? null,
    departure_longitude: dep?.coordinates?.[0] ?? null,
    arrival_latitude: arr?.coordinates?.[1] ?? null,
    arrival_longitude: arr?.coordinates?.[0] ?? null,
    is_direct: true,
    is_return_flight: false,
    return_is_direct: true,
    cancelled: false,
    notes: `[gmail-import] ${read.booking.reader}, email ${read.emailId}`,
  }
}

export type FlightRow = ReturnType<typeof rowForLeg>

const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

/** A row sealed for one user, so it can be saved later exactly as shown and by no one else. */
export function sealRow(ownerId: string, row: FlightRow, now = Date.now()): string {
  return Buffer.from(JSON.stringify(seal(JSON.stringify({ o: ownerId, t: now, r: row })))).toString('base64url')
}

export function openRow(token: string, ownerId: string, now = Date.now()): FlightRow | null {
  try {
    const p = JSON.parse(open(JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))))
    if (p.o !== ownerId || typeof p.t !== 'number' || now - p.t > TOKEN_MAX_AGE_MS || p.t > now + 60_000) return null
    if (p.r?.owner_id !== ownerId) return null
    return p.r as FlightRow
  } catch {
    return null
  }
}

/**
 * Every leg departing in [start, end], with what it means for the log. When a
 * booking was emailed more than once (a change, extras added later), the most
 * recently received email is the booking as it stands.
 */
export function planLegs(ownerId: string, reads: ReadEmail[], log: LogRow[], start: string, end: string): PlannedLeg[] {
  const latest = new Map<string, ReadEmail>()
  for (const r of reads) {
    const key = `${r.booking.airline}|${ref(r.booking.reservation_number)}`
    const prev = latest.get(key)
    if (!prev || new Date(r.receivedAt).getTime() > new Date(prev.receivedAt).getTime()) latest.set(key, r)
  }

  const inLog = new Set(log.map((f) => flightKey(f.departure_date, f.flight_number)))
  const planned: PlannedLeg[] = []
  const offered = new Set<string>()

  for (const read of latest.values()) {
    const b = read.booking
    const emailKeys = new Set(b.legs.map((l) => flightKey(l.departure_date, l.flight_number)))
    const loggedForBooking = log.filter((f) => ref(f.reservation_number) === ref(b.reservation_number))
    const outdated = loggedForBooking.filter((f) => !emailKeys.has(flightKey(f.departure_date, f.flight_number)))

    for (const leg of b.legs) {
      if (leg.departure_date < start || leg.departure_date > end) continue
      const row = rowForLeg(ownerId, read, leg)
      // The readers only emit well-formed legs; this is the last line of defence.
      if (flightParseProblem(row)) continue
      const key = flightKey(leg.departure_date, leg.flight_number)
      if (offered.has(key)) continue
      offered.add(key)

      const display = {
        date: leg.departure_date,
        flightNumber: leg.flight_number,
        from: leg.departure_iata,
        to: leg.arrival_iata,
        departs: leg.departure_time,
        arrives: leg.arrival_time,
        airline: b.airline,
        reference: b.reservation_number,
        passengers: b.passenger_name,
        fare: b.total_receipt,
      }
      if (inLog.has(key)) {
        planned.push({ status: 'in_log', display })
      } else if (outdated.length) {
        const was = outdated.map((f) => `${(f.departure_date || '').slice(0, 10)} ${f.flight_number} ${f.departure_iata}-${f.arrival_iata}`).join(', ')
        planned.push({
          status: 'changed',
          note: `Your log has booking ${b.reservation_number} on ${was}; the latest email has this flight instead.`,
          token: sealRow(ownerId, row),
          display,
        })
      } else {
        planned.push({ status: 'new', token: sealRow(ownerId, row), display })
      }
    }
  }
  return planned.sort((a, b) => a.display.date.localeCompare(b.display.date) || a.display.departs.localeCompare(b.display.departs))
}
