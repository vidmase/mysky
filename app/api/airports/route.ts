import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { europeanAirports } from '@/lib/airports'

interface AirportCoords {
    iata: string
    lat: number
    lon: number
}

// Build a lookup map from the local airport data for fallback
const airportCoordinatesMap = new Map<string, { iata: string; lat: number; lon: number }>()
europeanAirports.forEach(airport => {
    if (airport.coordinates) {
        const [lon, lat] = airport.coordinates
        airportCoordinatesMap.set(airport.iata.toUpperCase(), {
            iata: airport.iata,
            lat,
            lon
        })
        // Also map by name and city for fallback lookup
        airportCoordinatesMap.set(airport.name.toUpperCase(), {
            iata: airport.iata,
            lat,
            lon
        })
        airportCoordinatesMap.set(airport.city.toUpperCase(), {
            iata: airport.iata,
            lat,
            lon
        })
    }
})

async function findAirportCoordinates(
    supabase: ReturnType<typeof createSupabaseServer>,
    iataOrName: string,
    fullName?: string
): Promise<AirportCoords | null> {
    const searchCode = iataOrName.toUpperCase().trim()
    const searchName = fullName?.toUpperCase().trim() || searchCode

    // Try 1: Exact IATA match from database
    const { data: iataMatch, error: iataError } = await supabase
        .from('all_airport_gps')
        .select('iata, lat, lon')
        .eq('iata', searchCode)
        .single()

    if (!iataError && iataMatch) {
        return iataMatch
    }

    // Try 2: Search by airport name (if fullName provided and different from code)
    if (fullName && fullName.length > 3) {
        const { data: nameMatch, error: nameError } = await supabase
            .from('all_airport_gps')
            .select('iata, lat, lon')
            .ilike('name', `%${fullName}%`)
            .single()

        if (!nameError && nameMatch) {
            return nameMatch
        }

        // Try 3: Search by city name
        const { data: cityMatch, error: cityError } = await supabase
            .from('all_airport_gps')
            .select('iata, lat, lon')
            .ilike('city', `%${fullName}%`)
            .single()

        if (!cityError && cityMatch) {
            return cityMatch
        }
    }

    // Try 4: Fallback to local airport data by IATA
    const localByIata = airportCoordinatesMap.get(searchCode)
    if (localByIata) {
        return {
            iata: localByIata.iata,
            lat: localByIata.lat,
            lon: localByIata.lon
        }
    }

    // Try 5: Fallback to local airport data by name/city (partial match)
    for (const [key, coords] of airportCoordinatesMap.entries()) {
        if (searchName.includes(key) || key.includes(searchName)) {
            return {
                iata: coords.iata,
                lat: coords.lat,
                lon: coords.lon
            }
        }
    }

    // Try 6: Last resort - try to find any airport that starts with the same letters
    // This handles cases where we have "Bristol" but not "BRI"
    const first4Letters = searchName.slice(0, 4)
    for (const airport of europeanAirports) {
        if (airport.coordinates && 
            (airport.name.toUpperCase().startsWith(first4Letters) ||
             airport.city.toUpperCase().startsWith(first4Letters))) {
            const [lon, lat] = airport.coordinates
            return {
                iata: airport.iata,
                lat,
                lon
            }
        }
    }

    return null
}

export async function POST(request: Request) {
    try {
        const { departure, arrival, departureName, arrivalName } = await request.json()
        const supabase = createSupabaseServer()

        // Fetch coordinates for both airports
        const [departureCoords, arrivalCoords] = await Promise.all([
            findAirportCoordinates(supabase, departure, departureName || departure),
            findAirportCoordinates(supabase, arrival, arrivalName || arrival)
        ])

        if (!departureCoords || !arrivalCoords) {
            console.error('Could not find coordinates:', {
                departure: { search: departure, name: departureName, found: !!departureCoords },
                arrival: { search: arrival, name: arrivalName, found: !!arrivalCoords }
            })
            return NextResponse.json(
                { 
                    error: 'Failed to fetch airport coordinates',
                    details: {
                        departureFound: !!departureCoords,
                        arrivalFound: !!arrivalCoords
                    }
                },
                { status: 404 }
            )
        }

        return NextResponse.json({
            departure: departureCoords,
            arrival: arrivalCoords
        })
    } catch (error) {
        console.error('Error in POST /api/airports:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        )
    }
}
