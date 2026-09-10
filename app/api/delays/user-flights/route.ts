import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
    getFlightStatusByNumberAndDate,
    getLastProviderError,
    isProviderPaused,
} from '@/src/lib/services/flight-status'
import { resolveSupabaseUserId } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function getServerClient() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url) return null
    if (serviceKey) return createClient(url, serviceKey, { auth: { persistSession: false } })
    if (anonKey) return createClient(url, anonKey, { auth: { persistSession: false } })
    return null
}

export type FlightDelayRecord = {
    id: string
    flight_number: string
    departure_airport: string
    arrival_airport: string
    departure_iata: string | null
    arrival_iata: string | null
    departure_date: string
    airline: string | null
    status: string | null
    depDelayMinutes: number | null
    arrDelayMinutes: number | null
}

export type UserDelayStats = {
    totalFlights: number
    flightsWithData: number
    onTime: number
    delayed: number       // >= 15 min
    early: number
    cancelled: number
    avgDepDelay: number | null
    avgArrDelay: number | null
    worstDelay: FlightDelayRecord | null
    bestAirline: { name: string; avgDelay: number; flights: number } | null
    worstAirline: { name: string; avgDelay: number; flights: number } | null
    airports: string[]     // unique IATA codes from user's flights
    records: FlightDelayRecord[]
    /**
     * Set when the status provider refused our requests. Without it an outage
     * is indistinguishable from a log that genuinely has no delay data — both
     * render as "No data" on every row.
     */
    providerError: { message: string; kind: string; status: number } | null
}

/** The flight as we hold it, with no status attached. */
function withoutStatus(flight: any): FlightDelayRecord {
    return {
        id: flight.id,
        flight_number: flight.flight_number || 'Unknown',
        departure_airport: flight.departure_airport || '',
        arrival_airport: flight.arrival_airport || '',
        departure_iata: flight.departure_iata || null,
        arrival_iata: flight.arrival_iata || null,
        departure_date: flight.departure_date || '',
        airline: flight.airline || null,
        status: null,
        depDelayMinutes: null,
        arrDelayMinutes: null,
    }
}

// Process flights in batches to avoid rate-limiting
async function processFlightsInBatches(
    flights: any[],
    batchSize: number = 3,
    delayMs: number = 500
): Promise<FlightDelayRecord[]> {
    const records: FlightDelayRecord[] = []

    for (let i = 0; i < flights.length; i += batchSize) {
        // The provider has refused and lookups are paused. Nothing is being
        // requested, so there is no rate to limit — pacing the remaining
        // batches would just sleep for the better part of a minute before
        // returning the same empty result.
        if (isProviderPaused()) {
            for (const flight of flights.slice(i)) records.push(withoutStatus(flight))
            break
        }

        const batch = flights.slice(i, i + batchSize)
        const batchResults = await Promise.allSettled(
            batch.map(async (flight: any) => {
                if (!flight.flight_number || !flight.departure_date) {
                    return withoutStatus(flight)
                }

                try {
                    const date = flight.departure_date.slice(0, 10)
                    const data = await getFlightStatusByNumberAndDate(flight.flight_number, date, {
                        dateLocalRole: 'Both',
                    })

                    if (!data || !data.length) {
                        return withoutStatus(flight)
                    }

                    // Find best match by IATA pair
                    const match =
                        data.find(
                            (f) =>
                                (f?.departure?.airport?.iata &&
                                    flight.departure_iata &&
                                    f.departure.airport.iata === flight.departure_iata) ||
                                (f?.arrival?.airport?.iata &&
                                    flight.arrival_iata &&
                                    f.arrival.airport.iata === flight.arrival_iata)
                        ) || data[0]

                    return {
                        ...withoutStatus(flight),
                        airline: flight.airline || match?.airline || null,
                        status: match?.status || null,
                        depDelayMinutes: match?.departure?.delayMinutes ?? null,
                        arrDelayMinutes: match?.arrival?.delayMinutes ?? null,
                    }
                } catch (err) {
                    console.warn(`[user-flights] Error fetching status for ${flight.flight_number}:`, err)
                    return withoutStatus(flight)
                }
            })
        )

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                records.push(result.value)
            }
        }

        // Small delay between batches to avoid rate-limiting
        if (i + batchSize < flights.length) {
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }

    return records
}

export async function GET(req: NextRequest) {
    try {
        const supabase = getServerClient()
        if (!supabase) {
            return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
        }

        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch user's flights
        const { data: flights, error } = await supabase
            .from('vidmaflights')
            .select(
                'id, flight_number, departure_airport, arrival_airport, departure_iata, arrival_iata, departure_date, airline'
            )
            .eq('owner_id', userId)
            .order('departure_date', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!flights || flights.length === 0) {
            const emptyStats: UserDelayStats = {
                totalFlights: 0,
                flightsWithData: 0,
                onTime: 0,
                delayed: 0,
                early: 0,
                cancelled: 0,
                avgDepDelay: null,
                avgArrDelay: null,
                worstDelay: null,
                bestAirline: null,
                worstAirline: null,
                airports: [],
                records: [],
                providerError: null,
            }
            return NextResponse.json(emptyStats)
        }

        // Only refusals raised by *this* run should be reported, not one left
        // behind by an earlier request from a different page.
        const startedAt = Date.now()

        // Process all flights to get their delay data
        const records = await processFlightsInBatches(flights, 3, 600)

        // Report a refusal raised by this run, or one still holding lookups
        // paused — during a pause nothing is requested, so the recorded error
        // predates `startedAt` while remaining the reason the page is empty.
        const lastError = getLastProviderError()
        const providerError =
            lastError && (lastError.at >= startedAt || isProviderPaused())
                ? { message: lastError.message, kind: lastError.kind, status: lastError.status }
                : null

        // Compute aggregate stats
        const airports = new Set<string>()
        flights.forEach((f: any) => {
            if (f.departure_iata) airports.add(f.departure_iata)
            if (f.arrival_iata) airports.add(f.arrival_iata)
        })

        const withData = records.filter(
            (r) => r.depDelayMinutes !== null || r.arrDelayMinutes !== null || r.status !== null
        )
        let onTime = 0
        let delayed = 0
        let early = 0
        let cancelled = 0
        let depDelaySum = 0
        let depDelayCnt = 0
        let arrDelaySum = 0
        let arrDelayCnt = 0
        let worstDelay: FlightDelayRecord | null = null
        let worstDelayMin = 0
        const airlineStats = new Map<string, { sum: number; count: number }>()

        for (const r of withData) {
            const status = (r.status || '').toLowerCase()
            if (status.includes('cancel')) {
                cancelled++
                continue
            }

            const maxDelay = Math.max(r.depDelayMinutes ?? 0, r.arrDelayMinutes ?? 0)
            if (maxDelay >= 15) delayed++
            else if (maxDelay < 0) early++
            else onTime++

            if (r.depDelayMinutes !== null) {
                depDelaySum += r.depDelayMinutes
                depDelayCnt++
            }
            if (r.arrDelayMinutes !== null) {
                arrDelaySum += r.arrDelayMinutes
                arrDelayCnt++
            }

            if (maxDelay > worstDelayMin) {
                worstDelayMin = maxDelay
                worstDelay = r
            }

            if (r.airline) {
                const key = r.airline.toLowerCase()
                const existing = airlineStats.get(key) || { sum: 0, count: 0 }
                existing.sum += maxDelay
                existing.count += 1
                airlineStats.set(key, existing)
            }
        }

        // Find best/worst airline (min 2 flights for meaningful comparison)
        let bestAirline: UserDelayStats['bestAirline'] = null
        let worstAirline: UserDelayStats['worstAirline'] = null
        let bestAvg = Infinity
        let worstAvg = -Infinity

        for (const [name, stats] of airlineStats) {
            if (stats.count < 2) continue
            const avg = Math.round(stats.sum / stats.count)
            if (avg < bestAvg) {
                bestAvg = avg
                bestAirline = {
                    name: records.find((r) => r.airline?.toLowerCase() === name)?.airline || name,
                    avgDelay: avg,
                    flights: stats.count,
                }
            }
            if (avg > worstAvg) {
                worstAvg = avg
                worstAirline = {
                    name: records.find((r) => r.airline?.toLowerCase() === name)?.airline || name,
                    avgDelay: avg,
                    flights: stats.count,
                }
            }
        }

        const stats: UserDelayStats = {
            totalFlights: flights.length,
            flightsWithData: withData.length,
            onTime,
            delayed,
            early,
            cancelled,
            avgDepDelay: depDelayCnt ? Math.round(depDelaySum / depDelayCnt) : null,
            avgArrDelay: arrDelayCnt ? Math.round(arrDelaySum / arrDelayCnt) : null,
            worstDelay,
            bestAirline,
            worstAirline,
            airports: Array.from(airports),
            records,
            providerError,
        }

        return NextResponse.json(stats)
    } catch (e: any) {
        console.error('[user-flights] Error:', e)
        return NextResponse.json(
            { error: e?.message || 'Failed to compute delay stats' },
            { status: 500 }
        )
    }
}
