import { NextResponse } from 'next/server'

type AirportData = {
    [key: string]: string | number | null | undefined
    departure_longitude?: number
    departure_latitude?: number
    departure_airport?: string
    departure_country?: string
    departure_flag?: string
    arrival_longitude?: number
    arrival_latitude?: number
    arrival_airport?: string
    arrival_country?: string
    arrival_flag?: string
}

type ErrorResponse = {
    error: true
    message: string
}

type MapboxContext = {
    id: string
    text: string
    wikidata?: string
    short_code?: string
}

type MapboxFeature = {
    center: [number, number]
    place_name: string
    text: string
    context: MapboxContext[]
    properties: {
        accuracy?: string
        address?: string
        category?: string
        maki?: string
    }
}

export async function POST(request: Request) {
    try {
        const { searchQuery, type } = await request.json()

        if (!searchQuery || !type) {
            const errorResponse: ErrorResponse = {
                error: true,
                message: 'Missing required parameters: searchQuery and type are required'
            }
            return NextResponse.json(errorResponse)
        }

        // Use Mapbox Geocoding API to get coordinates
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        if (!mapboxToken) {
            const errorResponse: ErrorResponse = {
                error: true,
                message: 'Mapbox token not configured'
            }
            return NextResponse.json(errorResponse)
        }

        // Create the search query
        const query = encodeURIComponent(`${searchQuery} Airport`)
        const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&types=poi&limit=5&language=en`

        const mapboxResponse = await fetch(mapboxUrl)
        if (!mapboxResponse.ok) {
            const errorResponse: ErrorResponse = {
                error: true,
                message: 'Failed to fetch from Mapbox API'
            }
            return NextResponse.json(errorResponse)
        }

        const data = await mapboxResponse.json()
        if (!data.features || data.features.length === 0) {
            const errorResponse: ErrorResponse = {
                error: true,
                message: 'No airports found matching your search'
            }
            return NextResponse.json(errorResponse)
        }

        // Find the most relevant airport feature
        const feature = data.features.find((f: MapboxFeature) =>
            f.properties?.category?.toLowerCase().includes('airport') ||
            f.properties?.maki === 'airport' ||
            f.place_name.toLowerCase().includes('airport') ||
            f.text.toLowerCase().includes('airport')
        )

        if (!feature) {
            const errorResponse: ErrorResponse = {
                error: true,
                message: 'No valid airport found in search results'
            }
            return NextResponse.json(errorResponse)
        }

        const [longitude, latitude] = feature.center

        // Find country from context
        const countryContext = feature.context?.find((ctx: MapboxContext) => ctx.id.startsWith('country'))
        const country = countryContext?.text || ''

        // Get country flag emoji
        const countryCode = countryContext?.short_code?.toUpperCase() || ''
        const flag = countryCode ? getCountryFlag(countryCode) : ''

        const response: AirportData = {
            [`${type}_longitude`]: longitude,
            [`${type}_latitude`]: latitude,
            [`${type}_airport`]: feature.text,
            [`${type}_country`]: country,
            [`${type}_flag`]: flag
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error fetching coordinates:', error)
        const errorResponse: ErrorResponse = {
            error: true,
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
        return NextResponse.json(errorResponse)
    }
}

function getCountryFlag(countryCode: string): string {
    // Convert country code to flag emoji
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
} 