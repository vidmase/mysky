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
        page?: number
        per_page?: number
        total?: number
        total_pages?: number
        validation_errors?: z.ZodError['errors']
    }
}

// Query parameters schema
const querySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    per_page: z.coerce.number().min(1).max(100).default(10),
    sort_by: z.enum(['departure_date', 'arrival_date', 'created_at']).default('departure_date'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
    airline: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional()
})

// Flight data schema
const flightSchema = z.object({
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

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const queryParams = Object.fromEntries(searchParams.entries())

        // Validate query parameters
        const validatedParams = querySchema.parse(queryParams)

        const supabase = createSupabaseServer()

        // Authenticate user via Clerk
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Unauthorized'
            }, { status: 401 })
        }

        // Build query
        let query = supabase
            .from('vidmaflights')
            .select('*', { count: 'exact' })
            .eq('owner_id', userId)
            .order(validatedParams.sort_by, { ascending: validatedParams.sort_order === 'asc' })

        // Apply filters
        if (validatedParams.airline) {
            query = query.eq('airline', validatedParams.airline)
        }
        if (validatedParams.date_from) {
            query = query.gte('departure_date', validatedParams.date_from)
        }
        if (validatedParams.date_to) {
            query = query.lte('departure_date', validatedParams.date_to)
        }

        // Apply pagination
        const from = (validatedParams.page - 1) * validatedParams.per_page
        const to = from + validatedParams.per_page - 1
        query = query.range(from, to)

        // Execute query
        const { data: flights, error: flightsError, count } = await query

        if (flightsError) {
            console.error('Flights fetch error:', flightsError)
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: flightsError.message
            }, { status: 500 })
        }

        // Calculate pagination metadata
        const total = count || 0
        const totalPages = Math.ceil(total / validatedParams.per_page)

        return NextResponse.json<ApiResponse<any[]>>({
            success: true,
            data: flights || [],
            metadata: {
                page: validatedParams.page,
                per_page: validatedParams.per_page,
                total,
                total_pages: totalPages
            }
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json<ApiResponse<null>>({
            success: false,
            error: error instanceof Error ? error.message : 'Internal Server Error'
        }, { status: 500 })
    }
}

export async function POST(request: Request) {
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

        // Validate request body
        const body = await request.json()
        const validatedData = flightSchema.parse(body)

        // Insert flight
        const { data, error: insertError } = await supabase
            .from('vidmaflights')
            .insert([{
                ...validatedData,
                owner_id: userId
            }])
            .select()
            .single()

        if (insertError) {
            console.error('Error inserting flight:', insertError)
            return NextResponse.json<ApiResponse<null>>({
                success: false,
                error: 'Failed to save flight details'
            }, { status: 500 })
        }

        // Best-effort event logging for add (v1)
        try {
            const { error: logErr } = await supabase.from('event_logs').insert([
                {
                    user_id: userId,
                    action: 'add_flight',
                    metadata: { ids: [data.id], type: 'v1' },
                    page: '/flights',
                },
            ])
            if (logErr) console.error('event_logs insert failed (v1 add):', logErr.message)
        } catch (e) {
            console.error('event_logs insert threw (v1 add):', e)
        }

        return NextResponse.json<ApiResponse<any>>({
            success: true,
            data
        }, { status: 201 })

    } catch (error) {
        console.error('Error in POST /api/v1/flights:', error)
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