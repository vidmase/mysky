'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock, RefreshCw } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type Statistics = {
    hoursInAir: number
    lastUpdated: string
}

export function HoursInAir() {
    const [stats, setStats] = useState<Statistics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isInitialLoad, setIsInitialLoad] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const fetchStats = useCallback(async (force = false) => {
        if (!isAuthenticated) return

        try {
            // Don't set loading to true for subsequent updates to prevent flicker
            if (isInitialLoad) {
                setLoading(true)
            }
            setIsRefreshing(true)

            // Add cache-busting parameter when forcing refresh
            const url = force ? '/api/statistics?t=' + new Date().getTime() : '/api/statistics'
            const response = await fetch(url, {
                cache: force ? 'no-store' : 'default',
            })

            if (!response.ok) {
                if (response.status === 401) {
                    setIsAuthenticated(false)
                    return
                }
                throw new Error('Failed to fetch statistics')
            }

            const data = await response.json()

            // Only update if the data is newer or if we don't have data yet
            if (!stats?.lastUpdated || new Date(data.lastUpdated) > new Date(stats.lastUpdated)) {
                setStats(data)
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
            }, 120000) // Refresh every 2 minutes instead of 1 minute

            return () => {
                mounted = false
                if (refreshInterval) {
                    clearInterval(refreshInterval)
                }
                flightsSubscription.unsubscribe()
            }
        }
    }, [isAuthenticated, fetchStats])

    return (
        <Card className="stat-card bg-gradient-flight text-white">
            <CardHeader className="pb-2">
                <CardTitle className="flex flex-col gap-1">
                    <div className="text-4xl font-bold flex items-center justify-between">
                        <div className="flex items-center">
                            <Clock className="h-6 w-6 mr-2 opacity-80" />
                            {loading && isInitialLoad ? (
                                <div className="flex items-center space-x-2">
                                    <LoadingSpinner size="lg" />
                                </div>
                            ) : !isAuthenticated ? (
                                <span className="text-lg">Sign in to view hours</span>
                            ) : error ? (
                                <span className="text-red-200">{error}</span>
                            ) : (
                                <div className="flex flex-col">
                                    <span>{stats?.hoursInAir?.toLocaleString(undefined, { maximumFractionDigits: 1 }) || '0'}</span>
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
                    Hours in Air
                </CardDescription>
            </CardHeader>
        </Card>
    )
} 