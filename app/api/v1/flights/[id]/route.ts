import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// API Response types
interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
    metadata?: {
        validation_errors?: z.ZodError['errors']
    }
}

// Flight update schema
const flightUpdateSchema = z.object({
    departure_airport: z.string().min(1, "Departure airport is required"),
    arrival_airport: z.string().min(1, "Arrival airport is required"),
    departure_date: z.string().min(1, "Departure date is required"),
    departure_time: z.string().min(1, "Departure time is required"),
    arrival_date: z.string().min(1, "Arrival date is required"),
    arrival_time: z.string().min(1, "Arrival time is required"),
    flight_number: z.string().min(1, "Flight number is required"),
    airline: z.string().optional(),
    total_receipt: z.number().min(0, "Total receipt must be non-negative"),
    passenger_name: z.string().min(1, "Passenger name is required"),
    reservation_number: z.string().min(1, "Reservation number is required"),
    departure_iata: z.string().length(3, "IATA code must be 3 characters"),
    arrival_iata: z.string().length(3, "IATA code must be 3 characters"),
    seat: z.string().optional(),
    notes: z.string().optional()
})

// Helper function to check flight ownership
async function checkFlightOwnership(supabase: any, flightId: string, userId: string) {
    const { data: flight, error } = await supabase
        .from('vidmaflights')
        .select('id')
        .eq('id', flightId)
        .eq('owner_id', userId)
        .single()

    if (error || !flight) {
        return false
    }
    return true
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createSupabaseServer()

        // Authenticate user via Clerk
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 })
        }

        // Check flight ownership
        const isOwner = await checkFlightOwnership(supabase, params.id, userId)
        if (!isOwner) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Flight not found or access denied'
            }, { status: 404 })
        }

        // Fetch flight details
        const { data: flight, error } = await supabase
            .from('vidmaflights')
            .select('*')
            .eq('id', params.id)
            .single()

        if (error) {
            console.error('Error fetching flight:', error)
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: error.message
            }, { status: 500 })
        }

        return NextResponse.json<ApiResponse<any>>({
            success: true,
            data: flight
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createSupabaseServer()

        // Authenticate user via Clerk
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 })
        }

        // Check flight ownership
        const isOwner = await checkFlightOwnership(supabase, params.id, userId)
        if (!isOwner) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Flight not found or access denied'
            }, { status: 404 })
        }

        // Validate request body
        const body = await request.json()
        const validatedData = flightUpdateSchema.parse(body)

        // Update flight
        const { data, error } = await supabase
            .from('vidmaflights')
            .update(validatedData)
            .eq('id', params.id)
            .select()
            .single()

        if (error) {
            console.error('Error updating flight:', error)
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Failed to update flight'
            }, { status: 500 })
        }

        return NextResponse.json<ApiResponse<any>>({
            success: true,
            data
        })

    } catch (error) {
        console.error('Error in PUT /api/v1/flights/[id]:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Validation error',
                metadata: { validation_errors: error.errors }
            }, { status: 400 })
        }

        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: 'Internal server error'
        }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createSupabaseServer()

        // Authenticate user via Clerk
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 })
        }

        // Check flight ownership
        const isOwner = await checkFlightOwnership(supabase, params.id, userId)
        if (!isOwner) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Flight not found or access denied'
            }, { status: 404 })
        }

        // Delete flight
        const { error: deleteError } = await supabase
            .from('vidmaflights')
            .delete()
            .eq('id', params.id)

        if (deleteError) {
            console.error('Error deleting flight:', deleteError)
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Failed to delete flight'
            }, { status: 500 })
        }

        return NextResponse.json<ApiResponse<null>>({
            success: true
        }, { status: 200 })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 })
    }
} 