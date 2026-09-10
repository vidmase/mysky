import { NextResponse } from 'next/server'
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

        // Explicitly map all known columns to prevent NOT NULL constraint violations
        const flightDataToInsert = {
            owner_id: userId,
            passenger_name: flightData.passenger_name || null,
            reservation_number: flightData.reservation_number || null,
            flight_number: flightData.flight_number || null,
            departure_airport: flightData.departure_airport || '',
            arrival_airport: flightData.arrival_airport || '',
            departure_date: flightData.departure_date || null,
            arrival_date: flightData.arrival_date || flightData.departure_date || null,
            departure_time: flightData.departure_time || '00:00:00',
            arrival_time: flightData.arrival_time || '00:00:00',
            airline: flightData.airline || null,
            seat: flightData.seat || null,
            departure_iata: flightData.departure_iata || null,
            arrival_iata: flightData.arrival_iata || null,
            departure_country: flightData.departure_country || null,
            arrival_country: flightData.arrival_country || null,
            departure_flag: flightData.departure_flag || null,
            arrival_flag: flightData.arrival_flag || null,
            departure_longitude: flightData.departure_longitude || null,
            departure_latitude: flightData.departure_latitude || null,
            arrival_longitude: flightData.arrival_longitude || null,
            arrival_latitude: flightData.arrival_latitude || null,
            total_receipt: flightData.total_receipt || null,
            purchased_date: flightData.purchased_date || null,
            purchase_time: flightData.purchase_time || null,
            notes: flightData.notes || null,
            return_arrival_time: flightData.return_arrival_time || null,
        }

        // Insert the flight data into the database
        const { data, error } = await supabase
            .from('vidmaflights')
            .insert([flightDataToInsert])
            .select()

        if (error) {
            console.error('[save-flight] Supabase insert error:', JSON.stringify(error))
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        // Best-effort event logging (matches pattern in flights/route.ts)
        try {
            await supabase.from('event_logs').insert([{
                user_id: userId,
                action: 'add_flight',
                metadata: { id: data[0]?.id, type: 'scanner' },
                page: '/add-flight',
            }])
        } catch {
            // Non-critical: event logging should not block flight save
        }

        return NextResponse.json({
            message: 'Flight saved successfully',
            id: data[0]?.id,
            flight: data[0]
        })
    } catch (error) {
        console.error('[save-flight] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to save flight' },
            { status: 500 }
        )
    }
}