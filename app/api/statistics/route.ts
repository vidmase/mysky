import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every minute

// Cache version for invalidation
const CACHE_VERSION = '1.0.0'

// IATA code to country mapping
const iataToCountry: { [key: string]: string } = {
  // United Kingdom
  'LGW': 'United Kingdom',
  'STN': 'United Kingdom',
  'BHX': 'United Kingdom', // Birmingham
  'BRS': 'United Kingdom', // Bristol
  'LBA': 'United Kingdom', // Leeds Bradford
  'LTN': 'United Kingdom', // London Luton
  'SEN': 'United Kingdom', // London Southend

  // Spain
  'MAD': 'Spain', // Madrid
  'ALC': 'Spain', // Alicante
  'GRO': 'Spain', // Girona
  'PMI': 'Spain', // Palma de Mallorca
  'TFS': 'Spain', // Tenerife South

  // Lithuania
  'KUN': 'Lithuania', // Kaunas
  'VNO': 'Lithuania', // Vilnius

  // Latvia
  'RIX': 'Latvia', // Riga

  // Ireland
  'DUB': 'Ireland', // Dublin

  // Switzerland
  'GVA': 'Switzerland', // Geneva

  // Italy
  'NAP': 'Italy', // Naples

  // Cyprus
  'PFO': 'Cyprus' // Paphos
}

interface FlightStatistics {
  totalFlights: number
  totalCountries: number
  countries: string[]
  unmappedAirports: string[]
  hoursInAir: number
  totalKilometers: number
  lastUpdated: string
  etag?: string
}

// Calculate duration between two times, handling overnight flights
function calculateFlightDuration(departureTime: string, arrivalTime: string): number {
  const [depHours, depMinutes] = departureTime.split(':').map(Number)
  const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number)

  let durationMinutes = (arrHours * 60 + arrMinutes) - (depHours * 60 + depMinutes)

  // If arrival time is earlier than departure time, it's an overnight flight
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60 // Add 24 hours
  }

  return durationMinutes / 60 // Convert to hours
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers

  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Implement efficient batch fetching
const batchFetchFlightData = async (
  supabase: SupabaseClient,
  userId: string
): Promise<{ flights: any[], airports: any[] }> => {
  const [flightsResult, airportsResult] = await Promise.all([
    supabase
      .from('vidmaflights')
      .select('departure_iata, arrival_iata, departure_time, arrival_time')
      .eq('owner_id', userId)
      .not('arrival_iata', 'is', null),

    supabase
      .from('all_airport_gps')
      .select('iata, lat, lon')
  ])

  if (flightsResult.error) throw flightsResult.error
  if (airportsResult.error) throw airportsResult.error

  return {
    flights: flightsResult.data,
    airports: airportsResult.data
  }
}

// Implement efficient statistics calculation
const calculateStatistics = (flights: any[], airports: any[]): Partial<FlightStatistics> => {
  const airportMap = new Map(airports.map(airport => [
    airport.iata,
    { lat: Number(airport.lat), lon: Number(airport.lon) }
  ]))

  const uniqueIataCodes = new Set<string>()
  let totalKilometers = 0
  let totalHours = 0

  // Single pass through flights for all calculations
  flights.forEach(flight => {
    if (flight.arrival_iata) {
      uniqueIataCodes.add(flight.arrival_iata)
    }

    // Calculate distance if coordinates available
    const departure = airportMap.get(flight.departure_iata)
    const arrival = airportMap.get(flight.arrival_iata)
    if (departure && arrival) {
      totalKilometers += calculateDistance(
        departure.lat,
        departure.lon,
        arrival.lat,
        arrival.lon
      )
    }

    // Calculate duration
    if (flight.departure_time && flight.arrival_time) {
      totalHours += calculateFlightDuration(flight.departure_time, flight.arrival_time)
    }
  })

  // Process countries
  const countries = new Set<string>()
  const unmappedCodes = new Set<string>()

  uniqueIataCodes.forEach(iata => {
    const country = iataToCountry[iata]
    if (country) {
      countries.add(country)
    } else {
      unmappedCodes.add(iata)
    }
  })

  return {
    totalFlights: flights.length,
    totalCountries: countries.size,
    countries: Array.from(countries).sort(),
    unmappedAirports: Array.from(unmappedCodes),
    hoursInAir: Math.round(totalHours * 10) / 10,
    totalKilometers: Math.round(totalKilometers)
  }
}

// Generate ETag for caching
const generateETag = (data: any): string => {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 27)
}

// Implement efficient caching strategy
const getCacheKey = (userId: string) => `flight_stats_${userId}_${CACHE_VERSION}`

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for If-None-Match header
    const ifNoneMatch = request.headers.get('If-None-Match')

    // Implement stale-while-revalidate caching
    const cachedStats = await unstable_cache(
      async () => {
        const { flights, airports } = await batchFetchFlightData(supabase, session.user.id)
        const stats = calculateStatistics(flights, airports)
        const etag = generateETag(stats)

        return {
          ...stats,
          lastUpdated: new Date().toISOString(),
          etag
        }
      },
      [getCacheKey(session.user.id)],
      {
        revalidate: 3600, // Cache for 1 hour
        tags: ['flight-statistics', `user-${session.user.id}`]
      }
    )()

    // Return 304 if ETag matches
    if (ifNoneMatch && ifNoneMatch === cachedStats.etag) {
      return new NextResponse(null, { status: 304 })
    }

    // Set cache headers
    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    headers.set('ETag', cachedStats.etag)
    headers.set('Vary', 'Cookie, Authorization')

    return NextResponse.json(cachedStats, { headers })

  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 