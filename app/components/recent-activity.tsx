'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { format } from 'date-fns'
import { Plane, Calendar, Clock } from 'lucide-react'
import { AirlineBadge } from './ui/airline-badge'

interface Flight {
    id: string
    departure_date: string
    departure_airport: string
    arrival_airport: string
    airline: string
    flight_number: string
}

export function RecentActivity() {
    const [latestFlight, setLatestFlight] = useState<Flight | null>(null)
    const [upcomingFlight, setUpcomingFlight] = useState<Flight | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchFlights() {
            try {
                const today = new Date().toISOString()

                // Get the next upcoming flight
                const { data: upcoming, error: upcomingError } = await supabase
                    .from('vidmaflights')
                    .select('id, departure_date, departure_airport, arrival_airport, airline, flight_number')
                    .gte('departure_date', today)
                    .order('departure_date', { ascending: true })
                    .limit(1)
                    .single()

                if (!upcomingError) {
                    setUpcomingFlight(upcoming)
                }

                // Get the most recent past flight
                const { data: recent, error: recentError } = await supabase
                    .from('vidmaflights')
                    .select('id, departure_date, departure_airport, arrival_airport, airline, flight_number')
                    .lt('departure_date', today)
                    .order('departure_date', { ascending: false })
                    .limit(1)
                    .single()

                if (!recentError) {
                    setLatestFlight(recent)
                }
            } catch (error) {
                console.error('Error fetching flights:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchFlights()
    }, [])

    if (loading) {
        return <div className="animate-pulse space-y-6">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4 p-4 rounded-xl bg-muted/5">
                    <div className="h-12 w-12 rounded-xl bg-muted"></div>
                    <div className="space-y-3 flex-1">
                        <div className="h-5 bg-muted rounded-lg w-3/4"></div>
                        <div className="h-4 bg-muted rounded-lg w-1/2"></div>
                    </div>
                </div>
            ))}
        </div>
    }

    if (!latestFlight && !upcomingFlight) {
        return (
            <div className="text-center py-8">
                <div className="mb-4">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
                </div>
                <h3 className="font-jakarta font-normal tracking-wide mb-2">No Recent Activity</h3>
                <p className="font-jakarta font-light tracking-normal text-sm text-muted-foreground">
                    Add your first flight to start tracking your journey
                </p>
            </div>
        )
    }

    const FlightCard = ({ flight, type }: { flight: Flight | null, type: 'upcoming' | 'latest' }) => {
        if (!flight) return null
        const departureDate = new Date(flight.departure_date)
        const isUpcoming = type === 'upcoming'

        return (
            <div className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] bg-[hsl(var(--card))]">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--wash-ink)]"></div>
                <div className="relative p-4 flex items-start space-x-4">
                    <div className={`shrink-0 p-3 rounded-xl bg-[var(--wash-ink)] text-[color-mix(in_srgb,var(--ink-2)_80%,transparent)] ring-1 ring-[var(--rule)]`}>
                        {isUpcoming ? (
                            <Clock className="h-6 w-6" />
                        ) : (
                            <Plane className="h-6 w-6" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-jakarta font-normal tracking-wide text-base text-[var(--ink)] group-hover:text-[color-mix(in_srgb,var(--ink-2)_90%,transparent)]">
                                    {flight.departure_airport} → {flight.arrival_airport}
                                </p>
                                <p className={`font-jakarta font-light tracking-normal text-sm mt-1 ${isUpcoming ? 'text-[var(--brass)]' : 'text-[color-mix(in_srgb,var(--ink-2)_60%,transparent)]'
                                    }`}>
                                    {format(departureDate, 'MMM d, yyyy')}
                                </p>
                            </div>
                            {isUpcoming && (
                                <span className="inline-flex items-center shrink-0 rounded-full bg-[var(--wash-brass)] px-3 py-1 text-xs font-light tracking-wide text-[var(--brass)] ring-1 ring-[var(--wash-brass)]">
                                    Upcoming
                                </span>
                            )}
                        </div>
                        <AirlineBadge
                            airline={flight.airline}
                            flightNumber={flight.flight_number}
                            className={`${isUpcoming ? 'bg-[var(--wash-ink)]' : 'bg-[var(--wash-ink)]'} text-white/80`}
                        />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {upcomingFlight && <FlightCard flight={upcomingFlight} type="upcoming" />}
            {latestFlight && <FlightCard flight={latestFlight} type="latest" />}
        </div>
    )
} 