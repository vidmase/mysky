import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { format } from 'date-fns'

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
    const supabase = createRouteHandlerClient({ cookies })

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

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the flight data from the request
    const flightData = await request.json()
    const { flightType, ...data } = flightData

    // Add the owner_id to the flight data
    const baseFlightData = {
      ...data,
      owner_id: user.id,
      departure_longitude: data.departure_longitude || null,
      departure_latitude: data.departure_latitude || null,
      arrival_longitude: data.arrival_longitude || null,
      arrival_latitude: data.arrival_latitude || null
    }

    // For return flights, we'll create two entries
    if (flightType === 'return') {
      // Create outbound flight
      const outboundFlight = {
        ...baseFlightData,
        flight_number: data.flight_number || data.flightNumber,
        departure_date: data.departure_date,
        arrival_date: data.arrival_date,
        departure_time: data.departure_time || data.departureTime,
        arrival_time: data.arrival_time || data.arrivalTime,
        seat: data.seat,
        total_receipt: data.total_receipt || data.totalReceipt,
        purchased_date: data.purchased_date || data.purchasedDate,
        purchase_time: data.purchase_time || data.purchaseTime,
        passenger_name: data.passenger_name || data.passengerName,
        reservation_number: data.reservation_number || data.reservationNumber,
        notes: data.notes,
        airline: data.airline
      }

      // Create return flight with swapped airports and coordinates
      const returnFlight = {
        ...baseFlightData,
        flight_number: data.return_flight_number,
        departure_date: data.return_departure_date,
        arrival_date: data.return_arrival_date,
        departure_time: data.return_departure_time,
        arrival_time: data.return_arrival_time,
        seat: data.return_seat,
        total_receipt: data.total_receipt || data.totalReceipt,
        purchased_date: data.purchased_date || data.purchasedDate,
        purchase_time: data.purchase_time || data.purchaseTime,
        passenger_name: data.passenger_name || data.passengerName,
        reservation_number: data.reservation_number || data.reservationNumber,
        notes: data.notes,
        airline: data.airline,
        // Swap departure and arrival for return flight
        departure_airport: data.arrival_airport,
        arrival_airport: data.departure_airport,
        departure_iata: data.arrival_iata,
        arrival_iata: data.departure_iata,
        departure_country: data.arrival_country,
        arrival_country: data.departure_country,
        departure_flag: data.arrival_flag,
        arrival_flag: data.departure_flag,
        // Swap coordinates for return flight
        departure_longitude: data.arrival_longitude,
        departure_latitude: data.arrival_latitude,
        arrival_longitude: data.departure_longitude,
        arrival_latitude: data.departure_latitude
      }

      const { data: flights, error } = await supabase
        .from('vidmaflights')
        .insert([outboundFlight, returnFlight])
        .select()

      if (error) {
        console.error('Error inserting flights:', error)
        return NextResponse.json(
          { message: 'Failed to add flights', error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json(flights)
    } else {
      // For one-way flights, just insert the single flight
      const singleFlight = {
        ...baseFlightData,
        flight_number: data.flight_number || data.flightNumber,
        departure_date: data.departure_date,
        arrival_date: data.arrival_date,
        departure_time: data.departure_time || data.departureTime,
        arrival_time: data.arrival_time || data.arrivalTime,
        seat: data.seat,
        total_receipt: data.total_receipt || data.totalReceipt,
        purchased_date: data.purchased_date || data.purchasedDate,
        purchase_time: data.purchase_time || data.purchaseTime,
        passenger_name: data.passenger_name || data.passengerName,
        reservation_number: data.reservation_number || data.reservationNumber,
        notes: data.notes,
        airline: data.airline
      }

      const { data: flight, error } = await supabase
        .from('vidmaflights')
        .insert([singleFlight])
        .select()

      if (error) {
        console.error('Error inserting flight:', error)
        return NextResponse.json(
          { message: 'Failed to add flight', error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json(flight)
    }
  } catch (error) {
    console.error('Error in POST /api/flights:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the flight data from the request
    const flightData = await request.json()

    // Update the flight with coordinates
    const { data: flight, error } = await supabase
      .from('vidmaflights')
      .update({
        ...flightData,
        departure_longitude: flightData.departure_longitude || null,
        departure_latitude: flightData.departure_latitude || null,
        arrival_longitude: flightData.arrival_longitude || null,
        arrival_latitude: flightData.arrival_latitude || null
      })
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .select()

    if (error) {
      console.error('Error updating flight:', error)
      return NextResponse.json(
        { message: 'Failed to update flight', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(flight)
  } catch (error) {
    console.error('Error in PUT /api/flights:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
} 