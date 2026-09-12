/**
 * Year in Review — pure derivation of one calendar year of the log.
 *
 * Everything here is computed from the flight rows alone so the story page and
 * the share card read from the same numbers. Distance and hours follow the
 * /stats page exactly (great-circle km, km / 840 + 0.5 h) so the two surfaces
 * never disagree.
 */

import { europeanAirports } from '@/lib/airports'

export type ReviewFlight = {
  id: string | number
  departure_date?: string | null
  departure_time?: string | null
  airline?: string | null
  flight_number?: string | null
  departure_iata?: string | null
  arrival_iata?: string | null
  departure_airport?: string | null
  arrival_airport?: string | null
  departure_country?: string | null
  arrival_country?: string | null
  departure_latitude?: number | string | null
  departure_longitude?: number | string | null
  arrival_latitude?: number | string | null
  arrival_longitude?: number | string | null
  total_receipt?: string | null
}

export type Leg = {
  id: string | number
  date: string // YYYY-MM-DD
  month: number // 0-11
  weekday: number // 0 = Sunday
  minutes: number | null // departure, minutes after midnight
  from: string
  to: string
  fromName: string
  toName: string
  airline: string | null
  km: number | null
  price: number | null
  fromCoord: [number, number] | null // [lon, lat]
  toCoord: [number, number] | null
}

export type Persona = { name: string; reason: string }

export type YearReview = {
  year: number
  isPartial: boolean
  legs: number
  travelDays: number
  km: number
  hours: number
  equatorLaps: number
  moonShare: number
  previous: { year: number; legs: number; km: number } | null
  airports: number
  countries: string[]
  newCountries: string[]
  newAirports: string[]
  pairs: number
  months: number[]
  busiestMonth: { month: number; count: number } | null
  favouriteWeekday: { weekday: number; count: number } | null
  airlines: { airline: string; count: number }[]
  topAirport: { iata: string; name: string; visits: number } | null
  topPair: { a: string; b: string; count: number } | null
  longest: Leg | null
  shortest: Leg | null
  earliest: Leg | null
  latest: Leg | null
  nightLegs: number
  first: Leg | null
  last: Leg | null
  spend: {
    total: number
    priced: number
    average: number
    cheapest: Leg | null
    per100km: number | null
  } | null
  map: ReviewMap | null
  persona: Persona
}

/** Arcs and airports projected into a unit box; SVG and canvas both scale it. */
export type ReviewMap = {
  aspect: number // width / height
  arcs: { points: [number, number][]; count: number }[]
  airports: { iata: string; x: number; y: number; visits: number }[]
  graticule: { points: [number, number][] }[]
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const EQUATOR_KM = 40075
const MOON_KM = 384400
const CRUISE_KMH = 840
const TAXI_HOURS = 0.5

const fallbackCoords = new Map<string, [number, number]>(
  europeanAirports
    .filter((a) => a.coordinates)
    .map((a) => [a.iata, a.coordinates as [number, number]])
)

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const coord = (lat: unknown, lon: unknown, iata: string): [number, number] | null => {
  const la = num(lat)
  const lo = num(lon)
  if (la != null && lo != null && !(la === 0 && lo === 0)) return [lo, la]
  return fallbackCoords.get(iata) ?? null
}

export const haversineKm = ([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]) => {
  const r = (x: number) => (x * Math.PI) / 180
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(a))
}

/** Dates are read as the literal calendar day filed, never shifted by timezone. */
const parseDate = (raw?: string | null): string | null => {
  if (!raw) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const parseMinutes = (raw?: string | null): number | null => {
  if (!raw) return null
  const m = /(\d{1,2}):(\d{2})/.exec(raw)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

const parsePrice = (raw?: string | null): number | null => {
  if (!raw) return null
  const n = parseFloat(String(raw).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

const cleanName = (name?: string | null) => (name ?? '').replace(/\s*\([^)]*\)\s*/g, '').trim()

const iataOf = (iata?: string | null, airport?: string | null) => {
  if (iata) return iata.trim().toUpperCase()
  const m = /\(([A-Z]{3})\)/.exec(airport ?? '')
  return m ? m[1] : cleanName(airport) || '—'
}

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function toLegs(flights: ReviewFlight[], until = todayISO()): Leg[] {
  const legs: Leg[] = []
  for (const f of flights) {
    const date = parseDate(f.departure_date)
    // Planned flights are not part of a look back.
    if (!date || date > until) continue
    const from = iataOf(f.departure_iata, f.departure_airport)
    const to = iataOf(f.arrival_iata, f.arrival_airport)
    const fromCoord = coord(f.departure_latitude, f.departure_longitude, from)
    const toCoord = coord(f.arrival_latitude, f.arrival_longitude, to)
    const [y, m, d] = date.split('-').map(Number)
    legs.push({
      id: f.id,
      date,
      month: m - 1,
      weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
      minutes: parseMinutes(f.departure_time),
      from,
      to,
      fromName: cleanName(f.departure_airport) || from,
      toName: cleanName(f.arrival_airport) || to,
      airline: f.airline && f.airline.trim() && f.airline !== 'Unknown' ? f.airline.trim() : null,
      km: fromCoord && toCoord ? haversineKm(fromCoord, toCoord) : null,
      price: parsePrice(f.total_receipt),
      fromCoord,
      toCoord,
    })
  }
  return legs.sort((a, b) => a.date.localeCompare(b.date) || (a.minutes ?? 0) - (b.minutes ?? 0))
}

/** Years that have at least one flown leg, newest first. */
export const reviewYears = (legs: Leg[]) =>
  Array.from(new Set(legs.map((l) => Number(l.date.slice(0, 4))))).sort((a, b) => b - a)

const countBy = <T,>(items: T[], key: (t: T) => string | null) => {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    if (k) map.set(k, (map.get(k) ?? 0) + 1)
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
}

export function buildYearReview(allLegs: Leg[], flights: ReviewFlight[], year: number): YearReview {
  const prefix = String(year)
  const legs = allLegs.filter((l) => l.date.startsWith(prefix))
  const before = allLegs.filter((l) => l.date < `${prefix}-01-01`)
  const prevLegs = allLegs.filter((l) => l.date.startsWith(String(year - 1)))

  // Countries come from the raw rows; legs keep no country columns.
  const countryOf = new Map<string | number, [string | null, string | null]>()
  for (const f of flights) countryOf.set(f.id, [f.departure_country ?? null, f.arrival_country ?? null])
  const countriesIn = (set: Leg[]) => {
    const out = new Set<string>()
    for (const l of set) for (const c of countryOf.get(l.id) ?? []) if (c && c.trim()) out.add(c.trim())
    return out
  }

  const countrySet = countriesIn(legs)
  const priorCountries = countriesIn(before)
  const airportSet = new Set(legs.flatMap((l) => [l.from, l.to]))
  const priorAirports = new Set(before.flatMap((l) => [l.from, l.to]))

  const km = legs.reduce((s, l) => s + (l.km ?? 0), 0)
  const hours = legs.reduce((s, l) => s + (l.km != null ? l.km / CRUISE_KMH + TAXI_HOURS : 0), 0)

  const months = Array.from({ length: 12 }, (_, m) => legs.filter((l) => l.month === m).length)
  const busiest = months.reduce((best, c, m) => (c > best.count ? { month: m, count: c } : best), { month: 0, count: 0 })
  const weekdays = countBy(legs, (l) => String(l.weekday))

  const airlines = countBy(legs, (l) => l.airline).map(([airline, count]) => ({ airline, count }))

  const airportVisits = countBy(legs.flatMap((l) => [l, { ...l, from: l.to }]), (l) => l.from)
  const nameOf = (iata: string) => {
    const l = legs.find((x) => x.from === iata || x.to === iata)
    return l ? (l.from === iata ? l.fromName : l.toName) : iata
  }

  const pairs = countBy(legs, (l) => [l.from, l.to].sort().join('|'))

  const measured = legs.filter((l) => l.km != null && l.km > 0)
  const byKm = [...measured].sort((a, b) => (b.km ?? 0) - (a.km ?? 0))
  const timed = legs.filter((l) => l.minutes != null)
  // The "day" starts at 04:00, so a 01:30 red-eye is the latest night, not the earliest morning.
  const dayMinutes = (l: Leg) => ((l.minutes ?? 0) - 4 * 60 + 24 * 60) % (24 * 60)
  const byTime = [...timed].sort((a, b) => dayMinutes(a) - dayMinutes(b))
  const nightLegs = timed.filter((l) => (l.minutes ?? 0) >= 22 * 60 || (l.minutes ?? 0) < 5 * 60).length
  const earlyLegs = timed.filter((l) => (l.minutes ?? 0) >= 5 * 60 && (l.minutes ?? 0) < 8 * 60).length

  const priced = legs.filter((l) => l.price != null)
  const total = priced.reduce((s, l) => s + (l.price ?? 0), 0)
  const pricedMeasured = priced.filter((l) => l.km)
  const pricedKm = pricedMeasured.reduce((s, l) => s + (l.km ?? 0), 0)

  const partial = `${prefix}-12-31` > todayISO()
  const prevKm = prevLegs.reduce((s, l) => s + (l.km ?? 0), 0)

  const review: YearReview = {
    year,
    isPartial: partial,
    legs: legs.length,
    travelDays: new Set(legs.map((l) => l.date)).size,
    km: Math.round(km),
    hours: Math.round(hours),
    equatorLaps: km / EQUATOR_KM,
    moonShare: km / MOON_KM,
    previous: prevLegs.length ? { year: year - 1, legs: prevLegs.length, km: Math.round(prevKm) } : null,
    airports: airportSet.size,
    countries: Array.from(countrySet).sort(),
    newCountries: before.length ? Array.from(countrySet).filter((c) => !priorCountries.has(c)).sort() : [],
    newAirports: before.length ? Array.from(airportSet).filter((a) => !priorAirports.has(a)) : [],
    pairs: pairs.length,
    months,
    busiestMonth: busiest.count ? busiest : null,
    favouriteWeekday: weekdays[0] ? { weekday: Number(weekdays[0][0]), count: weekdays[0][1] } : null,
    airlines,
    topAirport: airportVisits[0]
      ? { iata: airportVisits[0][0], name: nameOf(airportVisits[0][0]), visits: airportVisits[0][1] }
      : null,
    topPair: pairs[0] && pairs[0][1] > 1
      ? { a: pairs[0][0].split('|')[0], b: pairs[0][0].split('|')[1], count: pairs[0][1] }
      : null,
    longest: byKm[0] ?? null,
    shortest: byKm.length > 1 ? byKm[byKm.length - 1] : null,
    earliest: byTime[0] ?? null,
    latest: byTime.length > 1 ? byTime[byTime.length - 1] : null,
    nightLegs,
    first: legs[0] ?? null,
    last: legs.length > 1 ? legs[legs.length - 1] : null,
    spend: priced.length
      ? {
          total: Math.round(total * 100) / 100,
          priced: priced.length,
          average: Math.round((total / priced.length) * 100) / 100,
          cheapest: [...priced].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0],
          per100km: pricedKm > 0 ? (pricedMeasured.reduce((s, l) => s + (l.price ?? 0), 0) / pricedKm) * 100 : null,
        }
      : null,
    map: projectMap(legs),
    persona: { name: '', reason: '' },
  }

  review.persona = choosePersona(review, legs.length ? earlyLegs / Math.max(1, timed.length) : 0)
  return review
}

function choosePersona(r: YearReview, earlyShare: number): Persona {
  const nightShare = r.legs ? r.nightLegs / r.legs : 0
  const avgKm = r.legs ? r.km / r.legs : 0
  if (r.topPair && r.legs >= 4 && r.topPair.count / r.legs >= 0.5) {
    return {
      name: 'The Commuter',
      reason: `${Math.round((r.topPair.count / r.legs) * 100)}% of your legs ran between ${r.topPair.a} and ${r.topPair.b}. A route worn smooth.`,
    }
  }
  if (r.newCountries.length >= 3 || r.countries.length >= 6) {
    const n = r.newCountries.length >= 3 ? r.newCountries.length : r.countries.length
    const what = r.newCountries.length >= 3 ? 'countries new to your log' : 'countries touched'
    return { name: 'The Explorer', reason: `${n} ${what}. You went looking.` }
  }
  if (avgKm >= 3000) {
    return {
      name: 'The Long-Hauler',
      reason: `Your average leg ran ${Math.round(avgKm).toLocaleString()} km. You don't get up for short hops.`,
    }
  }
  if (r.nightLegs >= 2 && nightShare >= 0.3) {
    return { name: 'The Night Owl', reason: `${r.nightLegs} departures after ten at night or before five. Sleep can wait.` }
  }
  if (earlyShare >= 0.4 && r.legs >= 3) {
    return { name: 'The Early Bird', reason: `${Math.round(earlyShare * 100)}% of your departures left before eight in the morning.` }
  }
  if (r.legs >= 20) {
    return { name: 'The Frequent Flyer', reason: `${r.legs} legs in a single year. The crew might know your name.` }
  }
  if (r.airlines.length >= 4) {
    return { name: 'The Free Agent', reason: `${r.airlines.length} different carriers. No loyalty, only good fares.` }
  }
  return { name: 'The Considered Traveller', reason: `${r.legs} ${r.legs === 1 ? 'leg' : 'legs'}, each one chosen. Quality over mileage.` }
}

/* ------------------------------------------------------------------
   MAP PROJECTION
   Equirectangular, fitted to the year's airports with the longitude
   axis shrunk by cos(mid-latitude) so Europe doesn't look stretched.
   Arcs follow the great circle (slerp) so long legs bow poleward.
   ------------------------------------------------------------------ */
function greatCircle(a: [number, number], b: [number, number], steps = 36): [number, number][] {
  const r = Math.PI / 180
  const toVec = ([lon, lat]: [number, number]) => [
    Math.cos(lat * r) * Math.cos(lon * r),
    Math.cos(lat * r) * Math.sin(lon * r),
    Math.sin(lat * r),
  ]
  const va = toVec(a)
  const vb = toVec(b)
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))
  const omega = Math.acos(dot)
  if (omega < 1e-6) return [a, b]
  const out: [number, number][] = []
  let prevLon = a[0]
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const s1 = Math.sin((1 - t) * omega) / Math.sin(omega)
    const s2 = Math.sin(t * omega) / Math.sin(omega)
    const x = s1 * va[0] + s2 * vb[0]
    const y = s1 * va[1] + s2 * vb[1]
    const z = s1 * va[2] + s2 * vb[2]
    let lon = Math.atan2(y, x) / r
    // Keep the path continuous across the antimeridian.
    while (lon - prevLon > 180) lon -= 360
    while (lon - prevLon < -180) lon += 360
    prevLon = lon
    out.push([lon, Math.atan2(z, Math.sqrt(x * x + y * y)) / r])
  }
  return out
}

function projectMap(legs: Leg[]): ReviewMap | null {
  const drawn = legs.filter((l) => l.fromCoord && l.toCoord && l.from !== l.to)
  if (!drawn.length) return null

  const pairCounts = new Map<string, { a: [number, number]; b: [number, number]; count: number }>()
  for (const l of drawn) {
    const key = [l.from, l.to].sort().join('|')
    const hit = pairCounts.get(key)
    if (hit) hit.count++
    else pairCounts.set(key, { a: l.fromCoord!, b: l.toCoord!, count: 1 })
  }
  const lines = Array.from(pairCounts.values()).map((p) => ({ points: greatCircle(p.a, p.b), count: p.count }))

  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const line of lines) {
    for (const [lon, lat] of line.points) {
      minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon)
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
    }
  }
  // A floor on the frame so a single short hop still reads as a map.
  const midLat = (minLat + maxLat) / 2
  const k = Math.max(0.35, Math.cos((midLat * Math.PI) / 180))
  let w = (maxLon - minLon) * k
  let h = maxLat - minLat
  const minSpan = 8
  if (w < minSpan) { const d = (minSpan - w) / 2 / k; minLon -= d; maxLon += d; w = minSpan }
  if (h < minSpan * 0.6) { const d = (minSpan * 0.6 - h) / 2; minLat -= d; maxLat += d; h = minSpan * 0.6 }
  const pad = 0.12
  minLon -= (w * pad) / k; maxLon += (w * pad) / k; minLat -= h * pad; maxLat += h * pad
  w = (maxLon - minLon) * k
  h = maxLat - minLat

  const px = ([lon, lat]: [number, number]): [number, number] => [((lon - minLon) * k) / w, (maxLat - lat) / h]

  const visits = countBy(drawn.flatMap((l) => [l, { ...l, from: l.to, fromCoord: l.toCoord }]), (l) => l.from)
  const coordOf = new Map<string, [number, number]>()
  for (const l of drawn) { coordOf.set(l.from, l.fromCoord!); coordOf.set(l.to, l.toCoord!) }

  const graticule: { points: [number, number][] }[] = []
  const step = Math.max(w, h) > 60 ? 20 : Math.max(w, h) > 25 ? 10 : 5
  for (let lon = Math.ceil(minLon / step) * step; lon <= maxLon; lon += step) {
    graticule.push({ points: [px([lon, maxLat]), px([lon, minLat])] })
  }
  for (let lat = Math.ceil(minLat / step) * step; lat <= maxLat; lat += step) {
    graticule.push({ points: [px([minLon, lat]), px([maxLon, lat])] })
  }

  return {
    aspect: w / h,
    arcs: lines.map((l) => ({ points: l.points.map(px), count: l.count })),
    airports: visits.map(([iata, v]) => {
      const [x, y] = px(coordOf.get(iata)!)
      return { iata, x, y, visits: v }
    }),
    graticule,
  }
}

/* ------------------------------------------------------------------
   FORMATTING
   ------------------------------------------------------------------ */
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' })
}

export const fmtTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const fmtMoney = (v: number) =>
  `€${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
