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
