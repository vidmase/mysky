import { NextRequest, NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import { resolveSupabaseUserId } from '@/lib/supabase-server'
import {
  listFlightPaths,
  upsertFlightPath,
  buildFlightPathFeature,
  generateGreatCircleCoordinates,
  FlightPathFeature
} from "@/lib/mapbox-datasets"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/flight-paths
 * List all flight paths from Mapbox Datasets
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication via Clerk
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "1000", 10)

    const features = await listFlightPaths(limit)

    // Return as GeoJSON FeatureCollection
    return NextResponse.json({
      type: "FeatureCollection",
      features
    })
  } catch (error: any) {
    console.error("[flight-paths] GET error:", error)

    const status = error.status || 500
    const message = error.message || "Failed to fetch flight paths"

    return NextResponse.json({ error: message, code: error.code }, { status })
  }
}

/**
 * POST /api/flight-paths
 * Create a new flight path
 * 
 * Body:
 * - flightId: string (required)
 * - originIata: string (required)
 * - destinationIata: string (required)
 * - coordinates?: [number, number][] (optional - will be generated if not provided)
 * - originCoords?: { lon: number, lat: number } (required if coordinates not provided)
 * - destinationCoords?: { lon: number, lat: number } (required if coordinates not provided)
 * - metadata?: object (optional extra properties)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication via Clerk
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      flightId,
      originIata,
      destinationIata,
      coordinates,
      originCoords,
      destinationCoords,
      ...metadata
    } = body

    // Validate required fields
    if (!flightId) {
      return NextResponse.json({ error: "flightId is required" }, { status: 400 })
    }
    if (!originIata) {
      return NextResponse.json({ error: "originIata is required" }, { status: 400 })
    }
    if (!destinationIata) {
      return NextResponse.json({ error: "destinationIata is required" }, { status: 400 })
    }

    // Generate coordinates if not provided
    let pathCoordinates = coordinates
    if (!pathCoordinates || pathCoordinates.length === 0) {
      if (!originCoords || !destinationCoords) {
        return NextResponse.json({
          error: "Either coordinates or originCoords/destinationCoords are required"
        }, { status: 400 })
      }
      pathCoordinates = generateGreatCircleCoordinates(originCoords, destinationCoords)
    }

    // Build and save the feature
    const feature = buildFlightPathFeature(
      flightId,
      originIata,
      destinationIata,
      pathCoordinates,
      { ...metadata, userId: userId }
    )

    const saved = await upsertFlightPath(feature)

    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    console.error("[flight-paths] POST error:", error)

    const status = error.status || 500
    const message = error.message || "Failed to create flight path"

    return NextResponse.json({ error: message, code: error.code }, { status })
  }
}

