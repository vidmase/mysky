import {
  AIRLINE_BRANDS,
  AIRLINE_CODE_TO_NAME,
  AIRLINE_NAME_TO_CODE,
  DEFAULT_AIRLINE_BRAND,
  LOCAL_AIRLINE_LOGOS,
  type AirlineBrand,
} from '@/lib/airlines'
import { AIRPORT_TIMEZONES } from '@/lib/airport-timezones'
import { allAirports } from '@/lib/airports'
import { DateTime } from 'luxon'

// Time formatting utility
export function formatTimeToHHMM(time: string): string {
  if (!time) return ''

  const timeStr = time.toString().trim()
  let hours: string
  let minutes: string

  if (timeStr.includes(':')) {
    ;[hours, minutes] = timeStr.split(':')
  } else {
    hours = timeStr.slice(0, 2)
    minutes = timeStr.slice(2, 4)
  }

  hours = hours.padStart(2, '0')
  minutes = minutes.padStart(2, '0')

  return `${hours}:${minutes}`
}

// Duration calculation between two time strings, optionally timezone-aware
// If ctx includes departureDate and both departure/arrival IATA with known timezones,
// we compute the true elapsed duration using Luxon across timezones. Otherwise we fall back to naive.
export function calculateDuration(
  departureTime: string,
  arrivalTime: string,
  ctx?: {
    departureDate?: string
    arrivalDate?: string | null
    departureIata?: string | null
    arrivalIata?: string | null
    departureAirportName?: string | null
    arrivalAirportName?: string | null
  }
): string {
  try {
    const depTime = formatTimeToHHMM(departureTime)
    const arrTime = formatTimeToHHMM(arrivalTime)

    // Helper to resolve IATA from provided code or airport name
    const resolveIata = (code?: string | null, name?: string | null): string | undefined => {
      const c = code?.toString().trim().toUpperCase()
      if (c && /^[A-Z]{3}$/.test(c)) return c
      const n = name?.toString().trim().toLowerCase()
      if (!n) return undefined
      // Try to extract pattern like "Name (XXX)"
      const m = n.match(/\(([A-Za-z]{3})\)/)
      if (m) return m[1].toUpperCase()
      // Find best match by city or name includes
      const found = allAirports.find(a =>
        a.name.toLowerCase().includes(n) ||
        n.includes(a.name.toLowerCase()) ||
        a.city.toLowerCase().includes(n) ||
        n.includes(a.city.toLowerCase())
      )
      return found?.iata
    }

    const depIata = resolveIata(ctx?.departureIata, ctx?.departureAirportName)
    const arrIata = resolveIata(ctx?.arrivalIata, ctx?.arrivalAirportName)
    const depDate = ctx?.departureDate ?? undefined
    const arrDate = ctx?.arrivalDate ?? undefined

    const depTz = depIata ? AIRPORT_TIMEZONES[depIata] : undefined
    const arrTz = arrIata ? AIRPORT_TIMEZONES[arrIata] : undefined

    if (depDate && depTz && arrTz) {
      // depDate may be 'YYYY-MM-DD' or full ISO; parse safely
      const depDateISO = typeof depDate === 'string' ? depDate : String(depDate)
      const depDateParsed = DateTime.fromISO(depDateISO)
      const depYear = depDateParsed.isValid ? depDateParsed.year : Number(depDateISO.slice(0, 4))
      const depMonth = depDateParsed.isValid ? depDateParsed.month : Number(depDateISO.slice(5, 7))
      const depDay = depDateParsed.isValid ? depDateParsed.day : Number(depDateISO.slice(8, 10))
      const [depHour, depMin] = depTime.split(':').map(Number)
      const [arrHour, arrMin] = arrTime.split(':').map(Number)

      const dep = DateTime.fromObject(
        { year: depYear, month: depMonth, day: depDay, hour: depHour, minute: depMin },
        { zone: depTz }
      )
      let arr: DateTime
      if (arrDate) {
        const arrDateISO = typeof arrDate === 'string' ? arrDate : String(arrDate)
        const arrDateParsed = DateTime.fromISO(arrDateISO)
        const aYear = arrDateParsed.isValid ? arrDateParsed.year : Number(arrDateISO.slice(0, 4))
        const aMonth = arrDateParsed.isValid ? arrDateParsed.month : Number(arrDateISO.slice(5, 7))
        const aDay = arrDateParsed.isValid ? arrDateParsed.day : Number(arrDateISO.slice(8, 10))
        arr = DateTime.fromObject(
          { year: aYear, month: aMonth, day: aDay, hour: arrHour, minute: arrMin },
          { zone: arrTz }
        )
      } else {
        arr = DateTime.fromObject(
          { year: depYear, month: depMonth, day: depDay, hour: arrHour, minute: arrMin },
          { zone: arrTz }
        )
        if (arr < dep) arr = arr.plus({ days: 1 })
      }

      const totalMinutes = Math.max(0, Math.round(arr.toUTC().diff(dep.toUTC()).as('minutes')))
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
    }
  } catch (e) {
    // fall through to naive
  }

  // Naive same-timezone calculation as fallback
  const getMinutes = (time: string) => {
    const [hours, minutes] = formatTimeToHHMM(time).split(':').map(Number)
    return hours * 60 + minutes
  }

  let depMinutes = getMinutes(departureTime)
  let arrMinutes = getMinutes(arrivalTime)

  if (arrMinutes < depMinutes) {
    arrMinutes += 24 * 60 // overnight flight
  }

  const durationMinutes = arrMinutes - depMinutes
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
}

// Simple memoization for airline logo resolution
const logoCache = new Map<string, string>()

function norm(s: string) {
  return s.trim().toLowerCase()
}

/** Values that were filed where an airline name should be, but name nothing. */
const NO_AIRLINE = new Set(['', 'unknown', 'unknown airline', 'none', 'n/a', 'na', '-'])

/** The code at the head of a flight number: FR4121 -> FR, W6 1902 -> W6. */
export function airlineCodeFromFlightNumber(flightNumber?: string | null): string | null {
  if (!flightNumber) return null
  const m = flightNumber.trim().toUpperCase().match(/^([A-Z]{2,3}|[A-Z]\d)\s?-?\d+/)
  return m ? m[1] : null
}

/**
 * The carrier to print for a flight. A row whose airline was never filled in
 * still names its carrier in the flight number — which is how the logo has been
 * resolved all along — so the name is read from there rather than shown as
 * "Unknown" beside a Ryanair logo. Returns null when nothing identifies it.
 */
export function resolveAirlineName(
  airline?: string | null,
  flightNumber?: string | null
): string | null {
  const filed = (airline ?? '').trim()
  if (filed && !NO_AIRLINE.has(filed.toLowerCase())) {
    // A row filed as a bare code ("FR") reads better as the airline's name, and
    // one filed under a known spelling ("EasyJet") is printed under the canonical
    // one, so the same carrier stops appearing twice in the filter.
    const asCode = AIRLINE_CODE_TO_NAME[filed.toUpperCase()]
    if (asCode) return asCode
    const knownCode = AIRLINE_NAME_TO_CODE[norm(filed)]
    return (knownCode && AIRLINE_CODE_TO_NAME[knownCode]) || filed
  }
  const code = airlineCodeFromFlightNumber(flightNumber)
  return code ? AIRLINE_CODE_TO_NAME[code] ?? null : null
}

/**
 * The carrier's IATA code, from the airline field if it names one and from the
 * flight number otherwise. The logo, the printed name and the boarding-pass
 * colours all read from this, so a row resolves the same way everywhere.
 */
export function resolveAirlineCode(
  airline?: string | null,
  flightNumber?: string | null
): string | null {
  if (airline) {
    const a = airline.trim()
    if (/^[A-Z0-9]{2,3}$/i.test(a)) return a.toUpperCase()
    const code = AIRLINE_NAME_TO_CODE[norm(a)]
    if (code) return code
  }
  return airlineCodeFromFlightNumber(flightNumber)
}

/** How this carrier's boarding pass is printed. Unknown carriers use the app's stock. */
export function airlineBrand(
  airline?: string | null,
  flightNumber?: string | null
): AirlineBrand {
  const code = resolveAirlineCode(airline, flightNumber)
  return (code && AIRLINE_BRANDS[code]) || DEFAULT_AIRLINE_BRAND
}

// Robust airline logo resolver supporting codes and names
export function getAirlineLogo(airline: string | null, flightNumber?: string | null): string {
  const cacheKey = `${airline ?? ''}|${flightNumber ?? ''}`
  const cached = logoCache.get(cacheKey)
  if (cached !== undefined) return cached

  const code = resolveAirlineCode(airline, flightNumber)

  let result = ''

  if (code && LOCAL_AIRLINE_LOGOS[code]) {
    result = LOCAL_AIRLINE_LOGOS[code]
  } else if (code) {
    result = `https://pics.avs.io/200/50/${code}.png`
  } else if (airline) {
    const cleanAirlineName = norm(airline)
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    result = `https://logo.clearbit.com/${cleanAirlineName}.com`
  }

  logoCache.set(cacheKey, result)
  return result
}

/**
 * Where a leg stands against the clock, for the strip along the foot of its
 * pass: ahead of it, in the air, or behind it.
 *
 * The times on a row are local to their airports, so they are read in those
 * airports' zones where we know them — a flight that leaves Riga at 22:00 is
 * not behind you at 21:00 in London. A row with no date says nothing at all
 * rather than guessing, and a cancelled one never flew whatever the clock says.
 */
export function legStanding(
  leg: {
    departureDate?: string | null
    departureTime?: string | null
    arrivalDate?: string | null
    arrivalTime?: string | null
    departureIata?: string | null
    arrivalIata?: string | null
    cancelled?: boolean | null
  },
  now: Date
): string | null {
  if (!leg.departureDate) return null
  if (leg.cancelled) return 'Did not fly'

  const at = (date: string, time?: string | null, iata?: string | null): DateTime | null => {
    const day = DateTime.fromISO(String(date).slice(0, 10))
    if (!day.isValid) return null
    const [hour, minute] = (time ? formatTimeToHHMM(time) : '00:00').split(':').map(Number)
    const zone = iata ? AIRPORT_TIMEZONES[iata.trim().toUpperCase()] : undefined
    const stamped = DateTime.fromObject(
      { year: day.year, month: day.month, day: day.day, hour: hour || 0, minute: minute || 0 },
      zone ? { zone } : undefined
    )
    return stamped.isValid ? stamped : null
  }

  const departure = at(leg.departureDate, leg.departureTime, leg.departureIata)
  if (!departure) return null

  let arrival = at(leg.arrivalDate || leg.departureDate, leg.arrivalTime, leg.arrivalIata)
  // An arrival earlier than its departure and filed without its own date is the
  // small hours of the next day, which is how an overnight leg is written down.
  if (arrival && !leg.arrivalDate && arrival < departure) arrival = arrival.plus({ days: 1 })

  const current = DateTime.fromJSDate(now)
  if (current < departure) {
    return `Departs ${departure.toRelative({ base: current })}`
  }
  if (arrival && current < arrival) return 'In the air now'
  return `Flown ${departure.toRelative({ base: current })}`
}

/**
 * The light a leg left in: the sun's height at the departure airport at the
 * moment it pushed back. A 06:25 out of Stansted in September left at first
 * light, and the band on its pass says so.
 *
 * The altitude comes from the NOAA approximation, which is a degree or so out —
 * far inside the tolerance for choosing between four words. Null when the row
 * does not say when or from where, because a guessed sky is worse than none.
 */
export function legLight(leg: {
  departureDate?: string | null
  departureTime?: string | null
  departureIata?: string | null
}): 'day' | 'dawn' | 'dusk' | 'night' | null {
  if (!leg.departureDate || !leg.departureTime || !leg.departureIata) return null

  const code = leg.departureIata.trim().toUpperCase()
  const coordinates = allAirports.find(a => a.iata === code)?.coordinates
  if (!coordinates) return null
  const [longitude, latitude] = coordinates

  const day = DateTime.fromISO(String(leg.departureDate).slice(0, 10))
  if (!day.isValid) return null
  const [hour, minute] = formatTimeToHHMM(leg.departureTime).split(':').map(Number)
  const zone = AIRPORT_TIMEZONES[code]
  const local = DateTime.fromObject(
    { year: day.year, month: day.month, day: day.day, hour: hour || 0, minute: minute || 0 },
    zone ? { zone } : undefined
  )
  if (!local.isValid) return null

  const rad = Math.PI / 180

  /** How high the sun stands, in degrees, at a moment given in UTC. */
  const altitude = (moment: DateTime): number => {
    const utc = moment.toUTC()
    const dayOfYear = utc.ordinal
    const gamma =
      ((2 * Math.PI) / 365) * (dayOfYear - 1 + (utc.hour + utc.minute / 60 - 12) / 24)
    const equationOfTime =
      229.18 *
      (0.000075 +
        0.001868 * Math.cos(gamma) -
        0.032077 * Math.sin(gamma) -
        0.014615 * Math.cos(2 * gamma) -
        0.040849 * Math.sin(2 * gamma))
    const declination =
      0.006918 -
      0.399912 * Math.cos(gamma) +
      0.070257 * Math.sin(gamma) -
      0.006758 * Math.cos(2 * gamma) +
      0.000907 * Math.sin(2 * gamma) -
      0.002697 * Math.cos(3 * gamma) +
      0.00148 * Math.sin(3 * gamma)
    const trueSolarMinutes =
      utc.hour * 60 + utc.minute + equationOfTime + 4 * longitude
    const hourAngle = trueSolarMinutes / 4 - 180
    const cosZenith =
      Math.sin(latitude * rad) * Math.sin(declination) +
      Math.cos(latitude * rad) * Math.cos(declination) * Math.cos(hourAngle * rad)
    return 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / rad
  }

  const now = altitude(local)
  if (now > 6) return 'day'
  if (now < -6) return 'night'
  // Between the two the sky is turning, and which way it is turning is the
  // difference between the light coming up and the light going.
  return altitude(local.plus({ minutes: 30 })) > now ? 'dawn' : 'dusk'
}
