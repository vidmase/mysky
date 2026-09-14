'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Globe } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { useUnifiedStatistics } from '@/lib/statistics'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Statistics are now provided by the unified system

export function TotalCountries() {
  const { statistics, loading, error, refetch } = useUnifiedStatistics({
    cacheEnabled: true,
    enableRealtime: true
  })
  const [showCountries, setShowCountries] = useState(false)

  // All data fetching and caching is now handled by the unified statistics hook
  // Force a one-time refresh on mount to invalidate any in-memory stale stats after logic updates
  useEffect(() => {
    refetch(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Memoize the card content to prevent unnecessary re-renders
  const cardContent = useMemo(() => {
    if (error) {
      return <span className="text-[var(--vermillion-dk)]">{error}</span>
    }

    if (loading) {
      return <LoadingSpinner size="lg" />
    }

    if (!statistics) {
      return <span className="text-lg">Sign in to see visited countries</span>
    }

    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span>{statistics.totalCountries.toLocaleString()}</span>
          <button
            onClick={() => setShowCountries(!showCountries)}
            className="text-sm font-normal opacity-80 hover:opacity-100 transition-opacity"
          >
            {showCountries ? 'Hide list' : 'Show list'}
          </button>
        </div>
        {showCountries && statistics.countries && (
          <div className="mt-2 text-sm font-normal max-h-32 overflow-y-auto custom-scrollbar">
            {statistics.countries.join(', ')}
          </div>
        )}
        <span className="text-xs text-[color-mix(in_srgb,var(--ink-2)_60%,transparent)] font-normal mt-1">
          Last updated: {new Date(statistics.lastUpdated).toLocaleTimeString()}
        </span>
      </div>
    )
  }, [error, loading, statistics, showCountries])

  return (
    <Card className="stat-card bg-gradient-to-br from-[var(--jade)] via-[var(--jade)] to-[var(--vermillion)] text-[var(--paper)] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-col gap-1">
          <div className="text-4xl font-bold flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-2">🌍</span>
              {cardContent}
            </div>
          </div>
        </CardTitle>
        <CardDescription className="text-[color-mix(in_srgb,var(--ink-2)_90%,transparent)] font-medium">
          🗺️ Countries Visited
        </CardDescription>
      </CardHeader>
    </Card>
  )
} 