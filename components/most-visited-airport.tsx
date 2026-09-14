'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

type AirportStats = {
  airport: string
  count: number
}

export function MostVisitedAirport() {
  const supabase = createClient()
  const [mostVisitedAirport, setMostVisitedAirport] = useState<AirportStats | null>(null)
  const [loading, setLoading] = useState(false)  // Start with false to prevent initial flash
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchMostVisitedAirport(userId: string) {
      if (!userId || !mounted) return

      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('vidmaflights')
          .select('arrival_airport')
          .eq('owner_id', userId)

        if (!mounted) return

        if (queryError) {
          console.error('Query error:', queryError)
          setError('Failed to fetch airport data')
          return
        }

        if (!data || data.length === 0) {
          setMostVisitedAirport({ airport: 'No flights yet', count: 0 })
          return
        }

        // Count occurrences of each airport
        const airportCounts = data.reduce((acc: { [key: string]: number }, flight) => {
          if (flight.arrival_airport) {
            acc[flight.arrival_airport] = (acc[flight.arrival_airport] || 0) + 1
          }
          return acc
        }, {})

        // Find the airport with the highest count
        const mostVisited = Object.entries(airportCounts).reduce((max, [airport, count]) => {
          return count > (max.count || 0) ? { airport, count } : max
        }, { airport: '', count: 0 })

        if (mounted) {
          setMostVisitedAirport(mostVisited)
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching most visited airport:', error)
          setError('An unexpected error occurred')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Initialize auth state
    let currentSession: string | null = null

    // First, check the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return

      if (session?.user?.id) {
        currentSession = session.user.id
        fetchMostVisitedAirport(session.user.id)
      } else {
        setMostVisitedAirport({ airport: 'Sign in to view', count: 0 })
      }
    })

    // Then set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN') {
        if (session?.user?.id && currentSession !== session.user.id) {
          currentSession = session.user.id
          await fetchMostVisitedAirport(session.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        currentSession = null
        setMostVisitedAirport({ airport: 'Sign in to view', count: 0 })
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center text-airport">
          <MapPin className="h-5 w-5 mr-2 text-airport" />
          Most Visited Airport
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-airport/10 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-airport" />
          </div>
          <div>
            <div className="text-xl font-semibold">
              {loading ? (
                <div className="animate-pulse">Loading...</div>
              ) : error ? (
                <span className="text-[var(--vermillion-dk)]">{error}</span>
              ) : (
                mostVisitedAirport?.airport
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {loading ? (
                <div className="animate-pulse">Loading...</div>
              ) : error ? (
                <span className="text-[var(--vermillion-dk)]">Failed to load data</span>
              ) : mostVisitedAirport?.airport === 'Sign in to view' ? (
                'Sign in to view visit count'
              ) : (
                `${mostVisitedAirport?.count || 0} visits`
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 