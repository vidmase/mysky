import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every minute

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
}

interface Flight {
  arrival_iata: string
  departure_time: string
  arrival_time: string
  departure_date: string
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

// Cache key generator with version for invalidation
const getCacheKey = (userId: string) => `flight_statistics_${userId}_v2`

// Fetch and process flight statistics
const getFlightStatistics = async (
  supabase: SupabaseClient,
  userId: string
): Promise<FlightStatistics> => {
  // Fetch all flights with departure and arrival IATA codes
  const flightsResult = await supabase
    .from('vidmaflights')
    .select('departure_iata, arrival_iata')
    .eq('owner_id', userId)
    .not('arrival_iata', 'is', null)

  if (flightsResult.error) throw flightsResult.error

  // Get unique IATA codes from flights
  const iataSet = new Set<string>()
  flightsResult.data.forEach(flight => {
    if (flight.departure_iata) iataSet.add(flight.departure_iata)
    if (flight.arrival_iata) iataSet.add(flight.arrival_iata)
  })

  // Fetch GPS coordinates for all airports
  const airportsResult = await supabase
    .from('all_airport_gps')
    .select('iata, lat, lon')
    .in('iata', Array.from(iataSet))

  if (airportsResult.error) throw airportsResult.error

  // Create a map of IATA codes to coordinates
  const airportCoords = new Map(
    airportsResult.data.map(airport => [
      airport.iata,
      { lat: Number(airport.lat), lon: Number(airport.lon) }
    ])
  )

  // Calculate total distance
  let totalKilometers = 0
  flightsResult.data.forEach(flight => {
    const departure = airportCoords.get(flight.departure_iata)
    const arrival = airportCoords.get(flight.arrival_iata)

    if (departure && arrival) {
      totalKilometers += calculateDistance(
        departure.lat,
        departure.lon,
        arrival.lat,
        arrival.lon
      )
    }
  })

  // Get existing statistics
  const [flightCountResult, flightDetailsResult] = await Promise.all([
    supabase
      .from('vidmaflights')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId),

    supabase
      .from('vidmaflights')
      .select('arrival_iata, departure_time, arrival_time, departure_date')
      .eq('owner_id', userId)
      .not('arrival_iata', 'is', null)
  ])

  if (flightCountResult.error) throw flightCountResult.error
  if (flightDetailsResult.error) throw flightDetailsResult.error

  const flights = flightDetailsResult.data

  // Process IATA codes efficiently using Set operations
  const uniqueIataCodes = new Set(
    flights
      .map(flight => flight.arrival_iata)
      .filter(Boolean)
  )

  // Calculate total hours in air
  const totalHours = flights.reduce((total, flight) => {
    if (flight.departure_time && flight.arrival_time) {
      return total + calculateFlightDuration(flight.departure_time, flight.arrival_time)
    }
    return total
  }, 0)

  // Pre-allocate sets for better performance
  const countries = new Set<string>()
  const unmappedCodes = new Set<string>()

  // Single-pass processing of IATA codes
  for (const iata of uniqueIataCodes) {
    if (typeof iata === 'string') {
      const country = iataToCountry[iata]
      country ? countries.add(country) : unmappedCodes.add(iata)
    }
  }

  return {
    totalFlights: flightCountResult.count || 0,
    totalCountries: countries.size,
    countries: Array.from(countries).sort(),
    unmappedAirports: Array.from(unmappedCodes),
    hoursInAir: Math.round(totalHours * 10) / 10,
    totalKilometers: Math.round(totalKilometers),
    lastUpdated: new Date().toISOString()
  }
}

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Use cached data if available, with shorter cache duration
    const cachedStatistics = await unstable_cache(
      async () => {
        return getFlightStatistics(supabase, session.user.id)
      },
      [getCacheKey(session.user.id)],
      {
        revalidate: 60, // Cache for 1 minute
        tags: ['flight-statistics', `user-${session.user.id}`]
      }
    )()

    return NextResponse.json(cachedStatistics)

  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
} 