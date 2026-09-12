// Per-leg rules shared by every surface that reports on the log (/stats and the
// Year in Review story), so the same flight always yields the same country,
// hours and currency wherever it is counted.

import { allAirports } from '@/lib/airports'

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

export function detectMoneyPrefix(receipts: Array<string | null | undefined>): string {
  let gbp = 0, eur = 0, usd = 0
  for (const r of receipts) {
    if (!r) continue
    if (r.includes("£") || /gbp/i.test(r)) gbp++
    else if (r.includes("€") || /eur/i.test(r)) eur++
    else if (r.includes("$") || /usd/i.test(r)) usd++
  }
  if (gbp >= eur && gbp >= usd && gbp > 0) return "£"
  if (eur >= usd && eur > 0) return "€"
  if (usd > 0) return "$"
  return "£" // MySky default
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

/** Recorded duration when it is plausible, otherwise the great-circle estimate. */
export function legHours(
  durations: { flight_duration?: string | null; calculated_duration?: string | null },
  distanceKm: number | null
): LegHours {
  const recorded =
    parseDurationHours(durations.flight_duration) ?? parseDurationHours(durations.calculated_duration)
  const plausible = recorded != null && recorded > 0 && recorded <= MAX_LEG_HOURS ? recorded : null
  return {
    hours: plausible ?? (distanceKm != null ? deriveDurationHours(distanceKm) : null),
    implausible: recorded != null && plausible == null ? recorded : null,
  }
}
