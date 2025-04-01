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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchMostUsedAirline(userId: string) {
      if (!userId) return

      try {
        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
          .from('vidmaflights')
          .select('airline')
          .eq('owner_id', userId)

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
        console.error('Error fetching most used airline:', error)
        setError('An unexpected error occurred')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Initialize auth state
    let currentSession: string | null = null

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (event === 'INITIAL_SESSION') {
        if (session?.user?.id) {
          currentSession = session.user.id
          await fetchMostUsedAirline(session.user.id)
        }
      } else if (event === 'SIGNED_IN') {
        if (session?.user?.id && currentSession !== session.user.id) {
          currentSession = session.user.id
          await fetchMostUsedAirline(session.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        currentSession = null
        setMostUsedAirline({ airline: 'Please sign in', count: 0 })
        setLoading(false)
      }
    })

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id && currentSession !== session.user.id) {
        currentSession = session.user.id
        fetchMostUsedAirline(session.user.id)
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
                mostUsedAirline?.airline || 'No flights yet'
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {loading ? (
                <div className="animate-pulse">Loading...</div>
              ) : error ? (
                <span className="text-red-500">Failed to load data</span>
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