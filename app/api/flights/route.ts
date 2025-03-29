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
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the request body
    const body = await request.json()

    // Validate the request data
    const validatedData = flightSchema.parse(body)

    // Format dates and times
    const departureDateTime = new Date(`${validatedData.departure_date}T${validatedData.departure_time}`)
    const arrivalDateTime = new Date(`${validatedData.arrival_date}T${validatedData.arrival_time}`)

    // Prepare the flight data for insertion
    const flightData = {
      owner_id: session.user.id,
      departure_airport: validatedData.departure_airport,
      arrival_airport: validatedData.arrival_airport,
      departure_date: departureDateTime.toISOString(),
      departure_time: validatedData.departure_time,
      arrival_date: arrivalDateTime.toISOString(),
      arrival_time: validatedData.arrival_time,
      flight_number: validatedData.flight_number || null,
      airline: validatedData.airline || null,
      seat: validatedData.seat || null,
      notes: validatedData.notes || null,
      passenger_name: validatedData.passenger_name || null,
      passenger_title: validatedData.passenger_title || null,
      purchased_date: new Date().toISOString(),
      purchase_time: new Date().toLocaleTimeString(),
      total_receipt: "0 USD"
    }

    // Insert the flight data into Supabase
    const { data, error } = await supabase
      .from('vidmaflights')
      .insert([flightData])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save flight data' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })

  } catch (error) {
    console.error('API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 