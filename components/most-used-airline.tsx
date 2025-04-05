'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plane } from 'lucide-react'

type AirlineStats = {
  airline: string
  count: number
}

export function MostUsedAirline() {
  const [mostUsedAirline, setMostUsedAirline] = useState<AirlineStats | null>(null)
  const [loading, setLoading] = useState(false)  // Start with false to prevent initial flash
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchMostUsedAirline(userId: string) {
      if (!userId || !mounted) return

      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('vidmaflights')
          .select('airline')
          .eq('owner_id', userId)

        if (!mounted) return

        if (queryError) {
          console.error('Query error:', queryError)
          setError('Failed to fetch airline data')
          return
        }

        if (!data || data.length === 0) {
          setMostUsedAirline({ airline: 'No flights yet', count: 0 })
          return
        }

        // Count occurrences of each airline
        const airlineCounts = data.reduce((acc: { [key: string]: number }, flight) => {
          if (flight.airline) {
            acc[flight.airline] = (acc[flight.airline] || 0) + 1
          }
          return acc
        }, {})

        // Find the airline with the highest count
        const mostUsed = Object.entries(airlineCounts).reduce((max, [airline, count]) => {
          return count > (max.count || 0) ? { airline, count } : max
        }, { airline: '', count: 0 })

        if (mounted) {
          setMostUsedAirline(mostUsed)
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching most used airline:', error)
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
        fetchMostUsedAirline(session.user.id)
      } else {
        setMostUsedAirline({ airline: 'Sign in to view', count: 0 })
      }
    })

    // Then set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN') {
        if (session?.user?.id && currentSession !== session.user.id) {
          currentSession = session.user.id
          await fetchMostUsedAirline(session.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        currentSession = null
        setMostUsedAirline({ airline: 'Sign in to view', count: 0 })
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
        <CardTitle className="flex items-center text-airline">
          <Plane className="h-5 w-5 mr-2 text-airline" />
          Most Used Airline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-airline/10 flex items-center justify-center">
            <Plane className="h-6 w-6 text-airline" />
          </div>
          <div>
            <div className="text-xl font-semibold">
              {loading ? (
                <div className="animate-pulse">Loading...</div>
              ) : error ? (
                <span className="text-red-500">{error}</span>
              ) : (
                mostUsedAirline?.airline
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {loading ? (
                <div className="animate-pulse">Loading...</div>
              ) : error ? (
                <span className="text-red-500">Failed to load data</span>
              ) : mostUsedAirline?.airline === 'Sign in to view' ? (
                'Sign in to view flight count'
              ) : (
                `${mostUsedAirline?.count || 0} flights`
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 