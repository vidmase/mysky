import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/app/lib/supabase/client'

export type Statistics = {
  totalFlights: number
  totalCountries: number
  mostUsedAirline: { name: string; count: number } | null
  mostVisitedAirport: { name: string; count: number } | null
  totalHoursInAir: number
  totalSpent: number
  mostFrequentPassenger: { name: string; count: number } | null
  averageFlightDuration: number
  mostCommonSeatType: { name: string; count: number } | null
}

export function useStatistics() {
  const supabase = createClient()
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check if we have a session first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch('/api/statistics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }
      setStatistics(data)
    } catch (error) {
      console.error('Error fetching statistics:', error)
      setError(error instanceof Error ? error.message : 'Failed to load statistics')
      setStatistics(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    let currentSession: string | null = null

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user?.id && currentSession !== session.user.id) {
          currentSession = session.user.id
          fetchStatistics()
        }
      } else if (event === 'SIGNED_OUT') {
        currentSession = null
        setStatistics(null)
        setLoading(false)
      }
    })

    // Initial fetch
    fetchStatistics()

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [fetchStatistics])

  return { statistics, loading, error, refetch: fetchStatistics }
} 