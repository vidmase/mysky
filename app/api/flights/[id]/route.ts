import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: flight, error } = await supabase
      .from('vidmaflights')
      .select('*')
      .eq('id', params.id)
      .eq('owner_id', session.user.id)
      .single()

    if (error) {
      console.error('Error fetching flight:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!flight) {
      return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    }

    return NextResponse.json(flight)
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      passenger_name,
      reservation_number,
      flight_number,
      departure_airport,
      arrival_airport,
      departure_date,
      departure_time,
      arrival_time,
      total_receipt,
      purchased_date,
      purchase_time,
      airline,
      arrival_country,
      arrival_iata,
      departure_iata,
      seat,
      notes
    } = body

    // Validate required fields
    if (!passenger_name || !reservation_number || !flight_number || 
        !departure_airport || !arrival_airport || !departure_date || 
        !departure_time || !arrival_time || !total_receipt || 
        !purchased_date || !purchase_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Update the flight
    const { data, error } = await supabase
      .from('vidmaflights')
      .update({
        passenger_name,
        reservation_number,
        flight_number,
        departure_airport,
        arrival_airport,
        departure_date,
        departure_time,
        arrival_time,
        total_receipt,
        purchased_date,
        purchase_time,
        airline,
        arrival_country,
        arrival_iata,
        departure_iata,
        seat,
        notes
      })
      .eq('id', params.id)
      .eq('owner_id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating flight:', error)
      return NextResponse.json(
        { error: 'Failed to update flight' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Error in PUT /api/flights/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Check if user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First check if the flight exists and belongs to the user
    const { data: flight, error: fetchError } = await supabase
      .from('vidmaflights')
      .select('*')
      .eq('id', params.id)
      .eq('owner_id', session.user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching flight:', fetchError)
      return NextResponse.json(
        { error: 'Flight not found or access denied' },
        { status: 404 }
      )
    }

    // Delete the flight
    const { error: deleteError } = await supabase
      .from('vidmaflights')
      .delete()
      .eq('id', params.id)
      .eq('owner_id', session.user.id)

    if (deleteError) {
      console.error('Error deleting flight:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete flight' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Flight deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic' 