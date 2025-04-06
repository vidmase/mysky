import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Define the flight data schema for validation
const flightSchema = z.object({
  departure_airport: z.string().min(1, "Departure airport is required"),
  arrival_airport: z.string().min(1, "Arrival airport is required"),
  departure_date: z.string().min(1, "Departure date is required"),
  departure_time: z.string().min(1, "Departure time is required"),
  arrival_date: z.string().min(1, "Arrival date is required"),
  arrival_time: z.string().min(1, "Arrival time is required"),
  flight_number: z.string().optional(),
  airline: z.string().optional(),
  seat: z.string().optional(),
  notes: z.string().optional(),
  passenger_name: z.string().optional(),
  passenger_title: z.string().optional(),
})

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 })
    }

    console.log('Current user:', session.user.id) // Debug log

    // First check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
    }

    if (!profile) {
      console.log('Creating new profile for user:', session.user.id) // Debug log

      // Create profile if it doesn't exist
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || null,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (createProfileError) {
        console.error('Error creating profile:', createProfileError)
        return NextResponse.json({
          error: 'Failed to create user profile',
          details: createProfileError.message
        }, { status: 500 })
      }

      console.log('New profile created:', newProfile) // Debug log
    }

    // Fetch flights for the authenticated user
    const { data: flights, error: flightsError } = await supabase
      .from('vidmaflights')
      .select('*')
      .eq('owner_id', session.user.id)
      .order('departure_date', { ascending: false })

    if (flightsError) {
      console.error('Flights fetch error:', flightsError)
      return NextResponse.json({ error: flightsError.message }, { status: 500 })
    }

    return NextResponse.json(flights || [])
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to add flights' },
        { status: 401 }
      )
    }

    // Get request body
    const flightData = await request.json()

    // Validate required fields
    const requiredFields = [
      'passenger_name',
      'reservation_number',
      'flight_number',
      'departure_airport',
      'arrival_airport',
      'departure_date',
      'departure_time',
      'arrival_time',
      'total_receipt',
      'purchased_date',
      'purchase_time'
    ]

    const missingFields = requiredFields.filter(field => !flightData[field])
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Insert the flight data
    const { data, error: insertError } = await supabase
      .from('vidmaflights')
      .insert([
        {
          passenger_name: flightData.passenger_name,
          reservation_number: flightData.reservation_number,
          flight_number: flightData.flight_number,
          departure_airport: flightData.departure_airport,
          arrival_airport: flightData.arrival_airport,
          departure_date: flightData.departure_date,
          departure_time: flightData.departure_time,
          arrival_time: flightData.arrival_time,
          total_receipt: flightData.total_receipt,
          purchased_date: flightData.purchased_date,
          purchase_time: flightData.purchase_time,
          airline: flightData.airline || null,
          arrival_country: flightData.arrival_country || null,
          arrival_iata: flightData.arrival_iata || null,
          departure_iata: flightData.departure_iata || null,
          seat: flightData.seat || null,
          notes: flightData.notes || null,
          // owner_id will be automatically set by RLS policy
        }
      ])
      .select()

    if (insertError) {
      console.error('Error inserting flight:', insertError)
      return NextResponse.json(
        { error: 'Failed to save flight details' },
        { status: 500 }
      )
    }

    // Return the newly created flight
    return NextResponse.json(
      { message: 'Flight added successfully', flight: data[0] },
      { status: 201 }
    )

  } catch (error) {
    console.error('Error in POST /api/flights:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 