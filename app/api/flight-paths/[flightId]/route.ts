import { NextRequest, NextResponse } from "next/server"
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import {
  getFlightPath,
  updateFlightPath,
  deleteFlightPath
} from "@/lib/mapbox-datasets"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface RouteParams {
  params: Promise<{ flightId: string }>
}

/**
 * GET /api/flight-paths/:flightId
 * Get a single flight path by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { flightId } = await params

  try {
    // Verify authentication
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!flightId) {
      return NextResponse.json({ error: "flightId is required" }, { status: 400 })
    }

    const feature = await getFlightPath(flightId)

    return NextResponse.json(feature)
  } catch (error: any) {
    console.error(`[flight-paths/${flightId}] GET error:`, error)

    const status = error.status || 500
    const message = error.message || "Failed to fetch flight path"

    return NextResponse.json({ error: message, code: error.code }, { status })
  }
}

/**
 * PATCH /api/flight-paths/:flightId
 * Update a flight path (partial update)
 * 
 * Body:
 * - geometry?: { type: "LineString", coordinates: [number, number][] }
 * - properties?: object (merged with existing properties)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { flightId } = await params

  try {
    // Verify authentication
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!flightId) {
      return NextResponse.json({ error: "flightId is required" }, { status: 400 })
    }

    const body = await request.json()
    const { geometry, properties } = body

    if (!geometry && !properties) {
      return NextResponse.json({
        error: "At least one of geometry or properties is required"
      }, { status: 400 })
    }

    const updated = await updateFlightPath(flightId, { geometry, properties })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error(`[flight-paths/${flightId}] PATCH error:`, error)

    const status = error.status || 500
    const message = error.message || "Failed to update flight path"

    return NextResponse.json({ error: message, code: error.code }, { status })
  }
}

/**
 * DELETE /api/flight-paths/:flightId
 * Delete a flight path
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { flightId } = await params

  try {
    // Verify authentication
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!flightId) {
      return NextResponse.json({ error: "flightId is required" }, { status: 400 })
    }

    await deleteFlightPath(flightId)

    return NextResponse.json({ success: true, flightId }, { status: 200 })
  } catch (error: any) {
    console.error(`[flight-paths/${flightId}] DELETE error:`, error)

    const status = error.status || 500
    const message = error.message || "Failed to delete flight path"

    return NextResponse.json({ error: message, code: error.code }, { status })
  }
}
