'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Globe } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type Statistics = {
  totalFlights: number
  totalCountries: number
  countries: string[]
  lastUpdated: string
}

export function TotalCountries() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [showCountries, setShowCountries] = useState(false)

  const fetchStatistics = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setError(null)
      // Don't set loading to true for subsequent updates to prevent flicker
      if (isInitialLoad) {
        setLoading(true)
      }

      const response = await fetch('/api/statistics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false)
          return
        }
        throw new Error('Failed to fetch statistics')
      }

      const data = await response.json()
      setStats(data)
      setIsInitialLoad(false)
    } catch (error) {
      console.error('Error fetching statistics:', error)
      setError('Unable to load country data')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, isInitialLoad])

  useEffect(() => {
    let mounted = true
    let refreshInterval: NodeJS.Timeout | null = null

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setIsAuthenticated(true)
      }
    })

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          setIsAuthenticated(true)
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
        setStats(null)
        setLoading(false)
        setIsInitialLoad(true)
        if (refreshInterval) {
          clearInterval(refreshInterval)
          refreshInterval = null
        }
      }
    })

    return () => {
      mounted = false
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      subscription?.unsubscribe()
    }
  }, [])

  // Separate effect for data fetching
  useEffect(() => {
    let mounted = true
    let refreshInterval: NodeJS.Timeout | null = null

    if (isAuthenticated) {
      fetchStatistics()
      // Refresh every 2 minutes instead of 30 seconds
      refreshInterval = setInterval(fetchStatistics, 120000)
    }

    return () => {
      mounted = false
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [isAuthenticated, fetchStatistics])

  return (
    <Card className="stat-card bg-gradient-airport text-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-col gap-1">
          <div className="text-4xl font-bold flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="h-6 w-6 mr-2 opacity-80" />
              {loading && isInitialLoad ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !isAuthenticated ? (
                <span className="text-lg">Sign in to see visited countries</span>
              ) : error ? (
                <span className="text-red-200">{error}</span>
              ) : (
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
              )}
            </div>
            {loading && !isInitialLoad && (
              <LoadingSpinner size="sm" className="opacity-60" />
            )}
          </div>
        </CardTitle>
        <CardDescription className="text-white/80">
          Countries Visited
        </CardDescription>
      </CardHeader>
    </Card>
  )
} 