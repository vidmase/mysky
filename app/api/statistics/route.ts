import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every minute

// API Response types
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    cache_hit?: boolean
    last_updated?: string
  }
}

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
  'LHR': 'United Kingdom', // London Heathrow

  // Spain
  'MAD': 'Spain', // Madrid
  'ALC': 'Spain', // Alicante
  'GRO': 'Spain', // Girona
  'PMI': 'Spain', // Palma de Mallorca
  'TFS': 'Spain', // Tenerife South
  'BCN': 'Spain', // Barcelona

  // Lithuania
  'KUN': 'Lithuania', // Kaunas
  'VNO': 'Lithuania', // Vilnius
  'PLQ': 'Lithuania', // Palanga

  // Latvia
  'RIX': 'Latvia', // Riga

  // Ireland
  'DUB': 'Ireland', // Dublin

  // Switzerland
  'GVA': 'Switzerland', // Geneva
  'ZRH': 'Switzerland', // Zurich

  // Italy
  'NAP': 'Italy', // Naples
  'FCO': 'Italy', // Rome Fiumicino

  // Cyprus
  'PFO': 'Cyprus', // Paphos

  // Malta
  'MLA': 'Malta', // Malta International

  // Poland
  'WAW': 'Poland', // Warsaw
  'KRK': 'Poland', // Krakow

  // France
  'CDG': 'France', // Paris Charles de Gaulle

  // Netherlands
  'AMS': 'Netherlands', // Amsterdam Schiphol

  // Belgium
  'BRU': 'Belgium', // Brussels

  // Sweden
  'ARN': 'Sweden', // Stockholm Arlanda

  // Egypt
  'CAI': 'Egypt', // Cairo
  'HRG': 'Egypt', // Hurghada
  'SSH': 'Egypt', // Sharm El Sheikh
  'LXR': 'Egypt', // Luxor
  'ASW': 'Egypt', // Aswan
  'AUE': 'Egypt', // Abu Simbel
  'MUH': 'Egypt', // Mersa Matruh
  'ALY': 'Egypt', // Alexandria

  // Greece
  'CFU': 'Greece' // Corfu
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
  mostUsedAirline?: {
    airline: string
    count: number
  }
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
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c) // Round to nearest kilometer
}

// Implement efficient batch fetching with flight counts
const batchFetchFlightData = async (
  supabase: SupabaseClient,
  userId: string
): Promise<{ flights: any[], airports: any[] }> => {
  const [flightsResult, airportsResult] = await Promise.all([
    supabase
      .from('vidmaflights')
      .select('departure_iata, arrival_iata, departure_time, arrival_time, airline')
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

// Implement efficient statistics calculation with improved distance tracking
const calculateStatistics = (flights: any[], airports: any[]): Partial<FlightStatistics> => {
  const airportMap = new Map(airports.map(airport => [
    airport.iata,
    { lat: Number(airport.lat), lon: Number(airport.lon) }
  ]))

  const uniqueIataCodes = new Set<string>()
  const airlineCounts = new Map<string, number>()
  const processedRoutes = new Set<string>()
  let totalKilometers = 0
  let totalHours = 0

  // Create a map to store route distances
  const routeDistances = new Map<string, { distance: number, count: number }>()

  // First pass: Calculate distances for each unique route
  flights.forEach(flight => {
    const departure = airportMap.get(flight.departure_iata)
    const arrival = airportMap.get(flight.arrival_iata)

    if (departure && arrival) {
      // Create a consistent route key regardless of direction
      const routeKey = [flight.departure_iata, flight.arrival_iata].sort().join('-')

      if (!routeDistances.has(routeKey)) {
        const distance = calculateDistance(
          departure.lat,
          departure.lon,
          arrival.lat,
          arrival.lon
        )
        routeDistances.set(routeKey, { distance, count: 1 })
      } else {
        const route = routeDistances.get(routeKey)!
        route.count++
      }
    }

    // Track other statistics
    if (flight.arrival_iata) uniqueIataCodes.add(flight.arrival_iata)
    if (flight.departure_iata) uniqueIataCodes.add(flight.departure_iata)
    if (flight.airline) {
      airlineCounts.set(flight.airline, (airlineCounts.get(flight.airline) || 0) + 1)
    }
    if (flight.departure_time && flight.arrival_time) {
      totalHours += calculateFlightDuration(flight.departure_time, flight.arrival_time)
    }
  })

  // Calculate total distance by multiplying each route's distance by its flight count
  totalKilometers = Array.from(routeDistances.values()).reduce(
    (total, { distance, count }) => total + (distance * count),
    0
  )

  // Find most used airline
  let mostUsedAirline: { airline: string; count: number } | undefined
  for (const [airline, count] of airlineCounts) {
    if (!mostUsedAirline || count > mostUsedAirline.count) {
      mostUsedAirline = { airline, count }
    }
  }

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
    totalKilometers: Math.round(totalKilometers),
    mostUsedAirline: mostUsedAirline || { airline: 'No flights yet', count: 0 }
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
    const supabase = createRouteHandlerClient({ cookies })

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
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
} 