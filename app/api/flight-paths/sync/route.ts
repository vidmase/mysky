import { NextRequest, NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import {
  upsertFlightPath,
  buildFlightPathFeature,
  generateGreatCircleCoordinates,
  getOrCreateFlightPathsDataset
} from "@/lib/mapbox-datasets"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface AirportData {
  iata: string
  latitude: number
  longitude: number
}

interface FlightWithAirports {
  id: string
  flight_number?: string
  departure_date?: string
  passenger_name?: string
  airline?: string
  departure_airport: AirportData | null
  arrival_airport: AirportData | null
}

/**
 * POST /api/flight-paths/sync
 * Sync all user flights to Mapbox Datasets
 * 
 * This endpoint fetches all flights from Supabase and creates/updates
 * corresponding flight paths in Mapbox Datasets.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure dataset exists
    await getOrCreateFlightPathsDataset()

    // Fetch all flights with airport coordinates
    const { data: flights, error: flightsError } = await supabase
      .from("flights")
      .select(`
        id,
        flight_number,
        departure_date,
        passenger_name,
        airline,
        departure_airport:airports!flights_departure_airport_fkey(iata, latitude, longitude),
        arrival_airport:airports!flights_arrival_airport_fkey(iata, latitude, longitude)
      `)
      .order("departure_date", { ascending: false })

    if (flightsError) {
      console.error("[flight-paths/sync] Supabase error:", flightsError)
      return NextResponse.json({
        error: "Failed to fetch flights from database"
      }, { status: 500 })
    }

    const typedFlights = flights as unknown as FlightWithAirports[]

    // Filter flights with valid airport data
    const validFlights = typedFlights.filter(f =>
      f.departure_airport?.latitude &&
      f.departure_airport?.longitude &&
      f.arrival_airport?.latitude &&
      f.arrival_airport?.longitude
    )

    console.log(`[flight-paths/sync] Syncing ${validFlights.length} flights with valid coordinates`)

    const results = {
      synced: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process flights in batches to avoid rate limiting
    const BATCH_SIZE = 10
    for (let i = 0; i < validFlights.length; i += BATCH_SIZE) {
      const batch = validFlights.slice(i, i + BATCH_SIZE)

      await Promise.all(batch.map(async (flight) => {
        try {
          const dep = flight.departure_airport!
          const arr = flight.arrival_airport!

          const coordinates = generateGreatCircleCoordinates(
            { lon: dep.longitude, lat: dep.latitude },
            { lon: arr.longitude, lat: arr.latitude }
          )

          const feature = buildFlightPathFeature(
            flight.id,
            dep.iata,
            arr.iata,
            coordinates,
            {
              flightNumber: flight.flight_number,
              departureDate: flight.departure_date,
              passengerName: flight.passenger_name,
              airline: flight.airline,
              userId: userId,
              status: "completed"
            }
          )

          await upsertFlightPath(feature)
          results.synced++
        } catch (error: any) {
          results.failed++
          results.errors.push(`Flight ${flight.id}: ${error.message}`)
          console.error(`[flight-paths/sync] Failed to sync flight ${flight.id}:`, error)
        }
      }))

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < validFlights.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`[flight-paths/sync] Completed: ${results.synced} synced, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      totalFlights: flights.length,
      validFlights: validFlights.length,
      synced: results.synced,
      failed: results.failed,
      errors: results.errors.slice(0, 10) // Limit error messages
    })
  } catch (error: any) {
    console.error("[flight-paths/sync] Error:", error)

    const status = error.status || 500
    const message = error.message || "Failed to sync flight paths"

    return NextResponse.json({ error: message, code: error.code }, { status })
  }
}

/**
 * GET /api/flight-paths/sync
 * Check sync status / initialize dataset
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check/create dataset
    const datasetId = await getOrCreateFlightPathsDataset()

    return NextResponse.json({
      success: true,
      datasetId,
      message: "Dataset ready"
    })
  } catch (error: any) {
    console.error("[flight-paths/sync] GET error:", error)

    const status = error.status || 500
    const message = error.message || "Failed to check dataset status"

    return NextResponse.json({ error: message, code: error.code }, { status })
  }
}
