import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { query } = await request.json()

        if (!query) {
            return NextResponse.json(
                { message: 'Query is required' },
                { status: 400 }
            )
        }

        // Call Mapbox Geocoding API
        const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        const encodedQuery = encodeURIComponent(query)
        const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&types=poi&limit=1`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        )

        if (!response.ok) {
            throw new Error('Failed to fetch from Mapbox API')
        }

        const data = await response.json()

        // Transform the response to match our needs
        const places = data.features?.map((feature: any) => ({
            location: {
                longitude: feature.center[0],
                latitude: feature.center[1]
            },
            name: feature.text,
            place_name: feature.place_name
        })) || []

        return NextResponse.json({ places })
    } catch (error) {
        console.error('Error in maps search:', error)
        return NextResponse.json(
            { message: 'Failed to search location' },
            { status: 500 }
        )
    }
} 