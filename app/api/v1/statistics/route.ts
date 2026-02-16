import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
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

interface FlightStatistics {
    total_flights: number
    total_countries: number
    countries: string[]
    unmapped_airports: string[]
    hours_in_air: number
    total_kilometers: number
    most_used_airline?: {
        name: string
        count: number
    }
    busiest_month?: {
        month: string
        count: number
    }
}

// Cache version for invalidation
const CACHE_VERSION = '1.0.0'

// Generate cache key
const getCacheKey = (userId: string) => `flight_stats_${userId}_${CACHE_VERSION}`

// IATA code to country mapping
const iataToCountry: { [key: string]: string } = {
    // United Kingdom
    'LGW': 'United Kingdom',
    'STN': 'United Kingdom',
    'BHX': 'United Kingdom',
    'BRS': 'United Kingdom',
    'LBA': 'United Kingdom',
    'LTN': 'United Kingdom',
    'SEN': 'United Kingdom',

    // Spain
    'MAD': 'Spain',
    'ALC': 'Spain',
    'GRO': 'Spain',
    'PMI': 'Spain',
    'TFS': 'Spain',

    // Lithuania
    'KUN': 'Lithuania',
    'VNO': 'Lithuania',

    // Latvia
    'RIX': 'Latvia',

    // Ireland
    'DUB': 'Ireland',

    // Switzerland
    'GVA': 'Switzerland',

    // Italy
    'NAP': 'Italy',

    // Cyprus
    'PFO': 'Cyprus'
}

// Efficient batch data fetching
async function batchFetchFlightData(
    supabase: SupabaseClient,
    userId: string
) {
    const [flightsResult, airportsResult, airlinesResult] = await Promise.all([
        supabase
            .from('vidmaflights')
            .select(`
        departure_iata,
        arrival_iata,
        departure_time,
        arrival_time,
        departure_date,
        airline
      `)
            .eq('owner_id', userId),

        supabase
            .from('all_airport_gps')
            .select('iata, lat, lon'),

        supabase
            .from('vidmaflights')
            .select('airline')
            .eq('owner_id', userId)
            .not('airline', 'is', null)
    ])

    if (flightsResult.error) throw flightsResult.error
    if (airportsResult.error) throw airportsResult.error
    if (airlinesResult.error) throw airlinesResult.error

    return {
        flights: flightsResult.data,
        airports: airportsResult.data,
        airlines: airlinesResult.data
    }
}

// Calculate flight duration in hours
function calculateFlightDuration(departureTime: string, arrivalTime: string): number {
    const [depHours, depMinutes] = departureTime.split(':').map(Number)
    const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number)

    let durationMinutes = (arrHours * 60 + arrMinutes) - (depHours * 60 + depMinutes)
    if (durationMinutes < 0) {
        durationMinutes += 24 * 60 // Add 24 hours for overnight flights
    }

    return durationMinutes / 60
}

// Calculate distance between airports using Haversine formula
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

// Calculate statistics efficiently
function calculateStatistics(
    flights: any[],
    airports: any[],
    airlines: any[]
): FlightStatistics {
    const airportMap = new Map(airports.map(airport => [
        airport.iata,
        { lat: Number(airport.lat), lon: Number(airport.lon) }
    ]))

    const uniqueIataCodes = new Set<string>()
    const airlineCounts = new Map<string, number>()
    const monthCounts = new Map<string, number>()

    let totalKilometers = 0
    let totalHours = 0

    // Single pass through flights for all calculations
    flights.forEach(flight => {
        // Track unique airports
        if (flight.arrival_iata) uniqueIataCodes.add(flight.arrival_iata)
        if (flight.departure_iata) uniqueIataCodes.add(flight.departure_iata)

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

        // Track airline usage
        if (flight.airline) {
            airlineCounts.set(flight.airline, (airlineCounts.get(flight.airline) || 0) + 1)
        }

        // Track monthly activity
        if (flight.departure_date) {
            const month = flight.departure_date.substring(0, 7) // YYYY-MM
            monthCounts.set(month, (monthCounts.get(month) || 0) + 1)
        }
    })

    // Find most used airline
    let mostUsedAirline: { name: string; count: number } | undefined
    for (const [airline, count] of airlineCounts) {
        if (!mostUsedAirline || count > mostUsedAirline.count) {
            mostUsedAirline = { name: airline, count }
        }
    }

    // Find busiest month
    let busiestMonth: { month: string; count: number } | undefined
    for (const [month, count] of monthCounts) {
        if (!busiestMonth || count > busiestMonth.count) {
            busiestMonth = { month, count }
        }
    }

    // Process countries from IATA codes
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
        total_flights: flights.length,
        total_countries: countries.size,
        countries: Array.from(countries).sort(),
        unmapped_airports: Array.from(unmappedCodes),
        hours_in_air: Math.round(totalHours * 10) / 10,
        total_kilometers: Math.round(totalKilometers),
        most_used_airline: mostUsedAirline,
        busiest_month: busiestMonth
    }
}

export async function GET(request: Request) {
    try {
        const supabase = createSupabaseServer()

        // Authenticate user via Clerk
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 })
        }

        // Check for If-None-Match header
        const ifNoneMatch = request.headers.get('If-None-Match')

        // Get cached statistics with stale-while-revalidate strategy
        const stats = await unstable_cache(
            async () => {
                const data = await batchFetchFlightData(supabase, userId)
                const statistics = calculateStatistics(data.flights, data.airports, data.airlines)
                return {
                    ...statistics,
                    last_updated: new Date().toISOString()
                }
            },
            [getCacheKey(userId)],
            {
                revalidate: 3600, // Cache for 1 hour
                tags: ['flight-statistics', `user-${userId}`]
            }
        )()

        // Generate ETag
        const etag = `"${Buffer.from(JSON.stringify(stats)).toString('base64').slice(0, 27)}"`

        // Return 304 if ETag matches
        if (ifNoneMatch && ifNoneMatch === etag) {
            return new NextResponse(null, { status: 304 })
        }

        // Set cache headers
        const headers = new Headers()
        headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
        headers.set('ETag', etag)
        headers.set('Vary', 'Cookie, Authorization')

        return NextResponse.json<ApiResponse<FlightStatistics>>({
            success: true,
            data: stats,
            metadata: {
                last_updated: stats.last_updated
            }
        }, { headers })

    } catch (error) {
        console.error('Error fetching statistics:', error)
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 })
    }
} 