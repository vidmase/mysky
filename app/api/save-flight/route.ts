import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
    try {
        const flightData = await request.json()

        // Get authenticated Supabase client
        const supabase = createRouteHandlerClient({ cookies })

        // Get the user's session
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Add user_id to the flight data
        const flightDataWithUser = {
            ...flightData,
            user_id: session.user.id,
            created_at: new Date().toISOString()
        }

        // Insert the flight data into the database
        const { data, error } = await supabase
            .from('flights')
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