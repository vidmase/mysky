import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { departure, arrival } = await request.json()
          const supabase = createSupabaseServer()

        // Fetch coordinates for both airports in parallel
        const [departureResult, arrivalResult] = await Promise.all([
            supabase
                .from('all_airport_gps')
                .select('iata, lat, lon')
                .eq('iata', departure.toUpperCase())
                .single(),
            supabase
                .from('all_airport_gps')
                .select('iata, lat, lon')
                .eq('iata', arrival.toUpperCase())
                .single()
        ])

        if (departureResult.error || arrivalResult.error) {
            console.error('Error fetching airport coordinates:', {
                departure: departureResult.error,
                arrival: arrivalResult.error
            })
            return NextResponse.json(
                { error: 'Failed to fetch airport coordinates' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            departure: departureResult.data,
            arrival: arrivalResult.data
        })
    } catch (error) {
        console.error('Error in POST /api/airports:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        )
    }
} 