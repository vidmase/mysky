// Per-leg rules shared by every surface that reports on the log (/stats and the
// Year in Review story), so the same flight always yields the same country,
// hours and currency wherever it is counted.

import { allAirports } from '@/lib/airports'
import { calculateTZDurationMinutes } from './calculator'

export const AIRPORT_BY_IATA = new Map(
  allAirports.map((a) => [a.iata.toUpperCase(), a])
)

/** The country filed on the row wins; a blank or "none" falls back to the airport catalogue. */
export function countryForIata(iata?: string | null, fallback?: string | null): string | null {
  const code = (iata || "").toUpperCase().trim()
  if (fallback && fallback.trim() && fallback.trim().toLowerCase() !== "none") {
    return fallback.trim()
  }
  if (!code) return null
  return AIRPORT_BY_IATA.get(code)?.country || null
}

export function parseDurationHours(raw?: string | null): number | null {
  if (!raw) return null
  const s = String(raw).trim()
  // "-19h -50m" is an arrival clock time earlier than the departure's, not nineteen hours aloft.
  if (s.startsWith('-')) return null
  const hm = s.match(/(\d+)\s*h(?:ours?)?\s*(\d+)?\s*m?/i)
  if (hm) {
    const h = Number(hm[1]) || 0
    const m = Number(hm[2]) || 0
    return h + m / 60
  }
  const mins = s.match(/^(\d+)\s*m(?:in(?:utes?)?)?$/i)
  if (mins) return (Number(mins[1]) || 0) / 60
  const colon = s.match(/^(\d+):(\d{2})$/)
  if (colon) return (Number(colon[1]) || 0) + (Number(colon[2]) || 0) / 60
  return null
}

/**
 * The legs that were actually flown, each once. The log holds rows, and a row
 * is not always a flight: a cancelled leg stays on file for its fare, and one
 * flight can be filed several times over — a second receipt for bags or seats
 * bought later, or a companion's booking on the same aircraft. Counting rows
 * would put flights, kilometres and hours into the totals that never happened.
 * Fares are a separate matter and are still read from every row.
 */
export function flownLegs<
  T extends {
    id: string | number
    cancelled?: boolean | null
    flight_number?: string | null
    departure_date?: string | null
    departure_iata?: string | null
    arrival_iata?: string | null
  }
>(flights: T[]): T[] {
  const seen = new Set<string>()
  const legs: T[] = []
  for (const f of flights) {
    if (f.cancelled === true) continue
    const number = (f.flight_number || '').replace(/\s+/g, '').toUpperCase()
    const date = (f.departure_date || '').slice(0, 10)
    // Without a flight number and a date there is nothing to tell two flights on
    // the same route apart, so such a row always stands as its own leg.
    const key = number && date
      ? `${date}|${number}|${(f.departure_iata || '').toUpperCase()}|${(f.arrival_iata || '').toUpperCase()}`
      : `row:${f.id}`
    if (seen.has(key)) continue
    seen.add(key)
    legs.push(f)
  }
  return legs
}

export const deriveDurationHours = (distanceKm: number) => distanceKm / 840 + 0.5

/* A leg's recorded duration is worked out from its dates, so a single
   mistyped arrival date — an arrival filed years after the departure —
   produces a duration that dwarfs every real flight put together. No
   scheduled service runs past twenty hours nonstop, so anything longer is
   a filing error and falls back to the distance estimate. */
export const MAX_LEG_HOURS = 20

export type LegHours = {
  /** hours counted for the leg, or null when neither a duration nor a distance is known */
  hours: number | null
  /** a recorded duration that was rejected as impossible, for reporting */
  implausible: number | null
}

/**
 * Hours aloft for one leg. The departure and arrival times are each local to
 * their own airport, so the elapsed time is worked out across the two time
 * zones: Bristol 06:15 to Kaunas 11:00 is 2h45, not the 4h45 on the clocks.
 * A duration stored on the row was filed as that plain clock difference, so it
 * is only read when a time or a time zone is missing; an implausible result
 * from either falls back to the great-circle estimate.
 */
export function legHours(
  leg: {
    flight_duration?: string | null
    calculated_duration?: string | null
    departure_iata?: string | null
    arrival_iata?: string | null
    departure_date?: string | null
    arrival_date?: string | null
    departure_time?: string | null
    arrival_time?: string | null
  },
  distanceKm: number | null
): LegHours {
  const elapsed = calculateTZDurationMinutes(leg)
  const recorded =
    elapsed != null
      ? elapsed / 60
      : parseDurationHours(leg.flight_duration) ?? parseDurationHours(leg.calculated_duration)
  const plausible = recorded != null && recorded > 0 && recorded <= MAX_LEG_HOURS ? recorded : null
  return {
    hours: plausible ?? (distanceKm != null ? deriveDurationHours(distanceKm) : null),
    implausible: recorded != null && plausible == null ? recorded : null,
  }
}
