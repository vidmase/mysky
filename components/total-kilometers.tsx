'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Map } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { RefreshCw } from 'lucide-react'

type Statistics = {
    totalKilometers: number
    lastUpdated: string
}

export function TotalKilometers() {
    const [stats, setStats] = useState<Statistics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Add local storage caching
    useEffect(() => {
        const cachedStats = localStorage.getItem('flight-stats')
        if (cachedStats) {
            try {
                const parsed = JSON.parse(cachedStats)
                const cacheAge = Date.now() / 1000 - parsed.cacheTimestamp
                if (cacheAge < 3600) { // Use cache if less than 1 hour old
                    setStats(parsed)
                    setLoading(false)
                    setIsInitialLoad(false)
                }
            } catch (e) {
                localStorage.removeItem('flight-stats')
            }
        }
    }, [])

    const fetchStats = useCallback(async (force = false) => {
        if (!isAuthenticated) return

        try {
            if (isInitialLoad) {
                setLoading(true)
            }
            setIsRefreshing(true)

            // Implement request deduplication
            const currentTimestamp = Date.now()
            const lastFetch = parseInt(sessionStorage.getItem('last-fetch') || '0')
            if (!force && currentTimestamp - lastFetch < 10000) { // Prevent refetching within 10 seconds
                setIsRefreshing(false)
                return
            }

            const url = force ? '/api/statistics?t=' + currentTimestamp : '/api/statistics'
            const response = await fetch(url, {
                cache: force ? 'no-store' : 'default',
                headers: {
                    'Accept': 'application/json',
                    'If-None-Match': sessionStorage.getItem('etag') || ''
                }
            })

            if (response.status === 304) {
                setIsRefreshing(false)
                return
            }

            if (!response.ok) {
                if (response.status === 401) {
                    setIsAuthenticated(false)
                    return
                }
                throw new Error('Failed to fetch statistics')
            }

            const data = await response.json()

            // Update cache timestamps
            sessionStorage.setItem('last-fetch', currentTimestamp.toString())
            sessionStorage.setItem('etag', response.headers.get('etag') || '')

            // Only update if data is newer
            if (!stats?.lastUpdated || new Date(data.lastUpdated).getTime() > new Date(stats.lastUpdated).getTime()) {
                setStats(data)
                localStorage.setItem('flight-stats', JSON.stringify({
                    ...data,
                    cacheTimestamp: Math.floor(Date.now() / 1000)
                }))
            }

            setError(null)
        } catch (err) {
            console.error('Error fetching statistics:', err)
            setError('Error loading statistics')
        } finally {
            setLoading(false)
            setIsInitialLoad(false)
            setIsRefreshing(false)
        }
    }, [isAuthenticated, isInitialLoad, stats?.lastUpdated])

    const handleRefresh = useCallback(async () => {
        await fetchStats(true) // Force a fresh fetch
    }, [fetchStats])

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

    // Separate effect for data fetching and real-time updates
    useEffect(() => {
        let mounted = true
        let refreshInterval: NodeJS.Timeout | null = null

        if (isAuthenticated) {
            fetchStats()

            // Subscribe to database changes for real-time updates
            const flightsSubscription = supabase
                .channel('flight-updates')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'vidmaflights'
                }, () => {
                    if (mounted) {
                        fetchStats(true)
                    }
                })
                .subscribe()

            // Set up periodic refresh with a longer interval
            refreshInterval = setInterval(() => {
                if (mounted) {
                    fetchStats()
                }
            }, 120000) // Refresh every 2 minutes

            return () => {
                mounted = false
                if (refreshInterval) {
                    clearInterval(refreshInterval)
                }
                flightsSubscription.unsubscribe()
            }
        }
    }, [isAuthenticated, fetchStats])

    const formatKilometers = (km: number) => {
        if (km >= 1000000) {
            return `${(km / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
        } else if (km >= 1000) {
            return `${(km / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`
        }
        return km.toLocaleString(undefined, { maximumFractionDigits: 0 })
    }

    return (
        <Card className="stat-card bg-gradient-stats text-white">
            <CardHeader className="pb-2">
                <CardTitle className="flex flex-col gap-1">
                    <div className="text-4xl font-bold flex items-center justify-between">
                        <div className="flex items-center">
                            <Map className="h-6 w-6 mr-2 opacity-80" />
                            {loading && isInitialLoad ? (
                                <div className="flex items-center space-x-2">
                                    <LoadingSpinner size="lg" />
                                </div>
                            ) : !isAuthenticated ? (
                                <span className="text-lg">Sign in to view distance</span>
                            ) : error ? (
                                <span className="text-red-200">{error}</span>
                            ) : (
                                <div className="flex flex-col">
                                    <span>{formatKilometers(stats?.totalKilometers || 0)} km</span>
                                    {stats?.lastUpdated && (
                                        <span className="text-xs text-white/60 font-normal mt-1">
                                            Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        {isAuthenticated && !isInitialLoad && (
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                                title="Refresh"
                            >
                                {isRefreshing ? (
                                    <LoadingSpinner size="sm" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                            </button>
                        )}
                    </div>
                </CardTitle>
                <CardDescription className="text-white/80">
                    Total Distance
                </CardDescription>
            </CardHeader>
        </Card>
    )
} 