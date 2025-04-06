'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Globe } from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type Statistics = {
  totalCountries: number
  countries: string[]
  lastUpdated: string
}

const CACHE_KEY = 'total-countries-stats'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function TotalCountries() {
  const [stats, setStats] = useState<Statistics | null>(() => {
    // Initialize from cache if available
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data
        }
      }
    }
    return null
  })
  const [loading, setLoading] = useState(!stats)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showCountries, setShowCountries] = useState(false)

  const fetchStatistics = useCallback(async (force = false) => {
    if (!isAuthenticated) return

    try {
      // Use cached data if available and not forced refresh
      if (!force && stats?.lastUpdated) {
        const cachedTimestamp = new Date(stats.lastUpdated).getTime()
        if (Date.now() - cachedTimestamp < CACHE_DURATION) {
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setIsAuthenticated(false)
        return
      }

      const { data, error: flightError } = await supabase
        .from('vidmaflights')
        .select('arrival_country')
        .eq('owner_id', session.user.id)

      if (flightError) throw flightError

      const uniqueCountries = Array.from(new Set(
        data
          ?.map(flight => flight.arrival_country)
          .filter(country => country != null)
      )).sort()

      const newStats = {
        totalCountries: uniqueCountries.length,
        countries: uniqueCountries,
        lastUpdated: new Date().toISOString()
      }

      setStats(newStats)

      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: newStats,
        timestamp: Date.now()
      }))

      setError(null)
    } catch (err) {
      console.error('Error fetching country statistics:', err)
      setError('Unable to load country data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, stats?.lastUpdated])

  // Memoize session check to prevent unnecessary re-renders
  const checkSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setIsAuthenticated(!!session?.user)
  }, [])

  useEffect(() => {
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [checkSession])

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics()

      // Set up real-time subscription
      const subscription = supabase
        .channel('country-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'vidmaflights' },
          () => fetchStatistics(true)
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [isAuthenticated, fetchStatistics])

  // Memoize the card content to prevent unnecessary re-renders
  const cardContent = useMemo(() => {
    if (!isAuthenticated) {
      return <span className="text-lg">Sign in to see visited countries</span>
    }

    if (error) {
      return <span className="text-red-200">{error}</span>
    }

    if (loading) {
      return <LoadingSpinner size="lg" />
    }

    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span>{stats?.totalCountries.toLocaleString() || '0'}</span>
          <button
            onClick={() => setShowCountries(!showCountries)}
            className="text-sm font-normal opacity-80 hover:opacity-100 transition-opacity"
          >
            {showCountries ? 'Hide list' : 'Show list'}
          </button>
        </div>
        {showCountries && stats?.countries && (
          <div className="mt-2 text-sm font-normal max-h-32 overflow-y-auto custom-scrollbar">
            {stats.countries.join(', ')}
          </div>
        )}
        {stats?.lastUpdated && (
          <span className="text-xs text-white/60 font-normal mt-1">
            Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>
    )
  }, [isAuthenticated, error, loading, stats, showCountries])

  return (
    <Card className="stat-card bg-gradient-airport text-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-col gap-1">
          <div className="text-4xl font-bold flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="h-6 w-6 mr-2 opacity-80" />
              {cardContent}
            </div>
          </div>
        </CardTitle>
        <CardDescription className="text-white/80">
          Countries Visited
        </CardDescription>
      </CardHeader>
    </Card>
  )
} 