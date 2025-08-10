import { AIRLINE_NAME_TO_CODE, LOCAL_AIRLINE_LOGOS } from '@/lib/airlines'

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

// Duration calculation between two time strings
export function calculateDuration(departureTime: string, arrivalTime: string): string {
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

// Robust airline logo resolver supporting codes and names
export function getAirlineLogo(airline: string | null, flightNumber?: string | null): string {
  const cacheKey = `${airline ?? ''}|${flightNumber ?? ''}`
  const cached = logoCache.get(cacheKey)
  if (cached !== undefined) return cached

  // Try to determine IATA/ICAO code
  let code: string | null = null

  if (airline) {
    const a = airline.trim()
    if (/^[A-Z0-9]{2,3}$/.test(a) || /^[A-Z0-9]{2,3}$/.test(a.toUpperCase())) {
      code = a.toUpperCase()
    } else {
      const name = norm(a)
      if (AIRLINE_NAME_TO_CODE[name]) {
        code = AIRLINE_NAME_TO_CODE[name]
      }
    }
  }

  if (!code && flightNumber) {
    const m = flightNumber.trim().toUpperCase().match(/^([A-Z]{2,3}|[A-Z]\d)\s?-?\d+/)
    if (m) code = m[1]
  }

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
