import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'

export async function POST(request: Request) {
    try {
        const flightData = await request.json()

        // Get authenticated user's Supabase UUID
        const userId = await resolveSupabaseUserId()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const supabase = createSupabaseServer()

        // Add owner_id to the flight data
        const flightDataWithUser = {
            ...flightData,
            owner_id: userId,
        }

        // Insert the flight data into the database
        const { data, error } = await supabase
            .from('vidmaflights')
            .insert([flightDataWithUser])
            .select()

        if (error) {
            console.error('Error saving flight:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: 'Flight saved successfully',
            id: data[0]?.id,
            flight: data[0]
        })
    } catch (error) {
        console.error('Error saving flight:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save flight' },
            { status: 500 }
        )
    }
}