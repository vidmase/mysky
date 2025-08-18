'use client'

// Unified statistics hook for consistent data access across components

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { UnifiedStatistics, CalculationOptions, DEFAULT_CALCULATION_OPTIONS } from './types'
import { calculateUnifiedStatistics } from './calculator'
import { batchFetchFlightData } from './data-fetcher'
import { getCachedStatistics, setCachedStatistics, clearCachedStatistics } from './cache'

interface UseUnifiedStatisticsOptions extends CalculationOptions {
  enableRealtime?: boolean
  cacheEnabled?: boolean
}

interface UseUnifiedStatisticsReturn {
  statistics: UnifiedStatistics | null
  loading: boolean
  error: string | null
  refetch: (force?: boolean) => Promise<void>
  clearCache: () => void
}

export function useUnifiedStatistics(
  options: UseUnifiedStatisticsOptions = {}
): UseUnifiedStatisticsReturn {
  const supabase = createClient()
  
  const {
    enableRealtime = true,
    cacheEnabled = true,
    ...calculationOptions
  } = { ...DEFAULT_CALCULATION_OPTIONS, ...options }

  const [statistics, setStatistics] = useState<UnifiedStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Initialize from cache if available
  useEffect(() => {
    if (userId && cacheEnabled) {
      const cached = getCachedStatistics(userId)
      if (cached) {
        setStatistics(cached)
        setLoading(false)
      }
    }
  }, [userId, cacheEnabled])

  const fetchStatistics = useCallback(async (force = false) => {
    if (!isAuthenticated || !userId) return

    try {
      // Use cached data if available and not forced refresh
      if (!force && cacheEnabled && statistics?.lastUpdated) {
        const cachedTimestamp = new Date(statistics.lastUpdated).getTime()
        const cacheAge = Date.now() - cachedTimestamp
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          return
        }
      }

      setError(null)
      if (force || !statistics) {
        setLoading(true)
      }

      // Fetch fresh data
      const { flights, airports } = await batchFetchFlightData(supabase, userId)
      
      // Calculate statistics
      const newStats = calculateUnifiedStatistics(flights, airports, calculationOptions)

      setStatistics(newStats)

      // Update cache
      if (cacheEnabled) {
        setCachedStatistics(userId, newStats)
      }

    } catch (err) {
      console.error('Error fetching unified statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load statistics')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, userId, statistics?.lastUpdated, cacheEnabled, calculationOptions])

  const clearCache = useCallback(() => {
    if (userId && cacheEnabled) {
      clearCachedStatistics(userId)
    }
  }, [userId, cacheEnabled])

  // Session management: run once, avoid re-subscribing on state changes
  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      const uid = session?.user?.id || null
      setIsAuthenticated(!!uid)
      setUserId(uid)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!mounted) return
      const uid = session?.user?.id || null
      setIsAuthenticated(!!uid)
      setUserId(uid)
      if (!uid) {
        setStatistics(null)
        setLoading(false)
        setError(null)
      } else {
        setLoading(true)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated && userId) {
      fetchStatistics()
    }
  }, [isAuthenticated, userId, fetchStatistics])

  // Share a single realtime channel across hook instances
  // Module-level guard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestFetchRef = useRef(fetchStatistics)
  useEffect(() => { latestFetchRef.current = fetchStatistics }, [fetchStatistics])

  // Track active channel in module scope
  // We store on window to keep it simple and avoid duplicate channels in dev HMR
  const CHANNEL_KEY = '__unified_stats_channel__'
  const COUNT_KEY = '__unified_stats_channel_count__'

  useEffect(() => {
    if (!enableRealtime || !isAuthenticated || !userId) return

    // Initialize counters
    const w = typeof window !== 'undefined' ? (window as any) : (globalThis as any)
    w[COUNT_KEY] = (w[COUNT_KEY] || 0) as number

    // Create channel only for first subscriber
    if (!w[CHANNEL_KEY]) {
      w[CHANNEL_KEY] = supabase
        .channel('unified-flight-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vidmaflights', filter: `owner_id=eq.${userId}` },
          () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => latestFetchRef.current(true), 1000)
          }
        )
        .subscribe()
    }
    w[COUNT_KEY]++

    return () => {
      w[COUNT_KEY]--
      if (w[COUNT_KEY] <= 0 && w[CHANNEL_KEY]) {
        try { w[CHANNEL_KEY].unsubscribe?.() } catch {}
        w[CHANNEL_KEY] = null
        w[COUNT_KEY] = 0
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [enableRealtime, isAuthenticated, userId])

  // Memoize return value to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    statistics,
    loading,
    error,
    refetch: fetchStatistics,
    clearCache
  }), [statistics, loading, error, fetchStatistics, clearCache])

  return returnValue
}
