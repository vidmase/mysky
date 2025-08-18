'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plane } from 'lucide-react'
import { useMemo } from 'react'
import { useUnifiedStatistics } from '@/lib/statistics'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Statistics are now provided by the unified system

export function TotalFlights() {
  const { statistics, loading, error } = useUnifiedStatistics({
    cacheEnabled: true,
    enableRealtime: true
  })

  // All data fetching and caching is now handled by the unified statistics hook

  // Memoize the card content to prevent unnecessary re-renders
  const cardContent = useMemo(() => {
    if (error) {
      return <span className="text-red-200">{error}</span>
    }

    if (loading) {
      return <LoadingSpinner size="lg" />
    }

    if (!statistics) {
      return <span className="text-lg">Sign in to track your flights</span>
    }

    return (
      <div className="flex flex-col">
        <span>{statistics.totalFlights.toLocaleString()}</span>
        <span className="text-xs text-white/60 font-normal mt-1">
          Last updated: {new Date(statistics.lastUpdated).toLocaleTimeString()}
        </span>
      </div>
    )
  }, [error, loading, statistics])

  return (
    <Card className="stat-card bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-col gap-1">
          <div className="text-4xl font-bold flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-2">✈️</span>
              {cardContent}
            </div>
          </div>
        </CardTitle>
        <CardDescription className="text-white/90 font-medium">
          🌟 Total Flights
        </CardDescription>
      </CardHeader>
    </Card>
  )
} 