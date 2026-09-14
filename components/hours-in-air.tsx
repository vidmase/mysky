'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { useMemo } from 'react'
import { useUnifiedStatistics } from '@/lib/statistics'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export function HoursInAir() {
  const { statistics, loading, error } = useUnifiedStatistics({
    cacheEnabled: true,
    enableRealtime: true
  })

  // Memoize the card content to prevent unnecessary re-renders
  const cardContent = useMemo(() => {
    if (error) {
      return <span className="text-[var(--vermillion-dk)]">{error}</span>
    }

    if (loading) {
      return <LoadingSpinner size="lg" />
    }

    if (!statistics) {
      return <span className="text-lg">Sign in to track your hours</span>
    }

    return (
      <div className="flex flex-col">
        <span>{statistics.hoursInAir.toLocaleString()}</span>
        <span className="text-xs text-[color-mix(in_srgb,var(--ink-2)_60%,transparent)] font-normal mt-1">
          Last updated: {new Date(statistics.lastUpdated).toLocaleTimeString()}
        </span>
      </div>
    )
  }, [error, loading, statistics])

  return (
    <Card className="stat-card bg-gradient-to-br from-[var(--vermillion)] via-[var(--vermillion)] to-[var(--vermillion-dk)] text-[var(--paper)] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-col gap-1">
          <div className="text-4xl font-bold flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-8 h-8 mr-3" />
              {cardContent}
            </div>
          </div>
        </CardTitle>
        <CardDescription className="text-[color-mix(in_srgb,var(--ink-2)_80%,transparent)]">
          Hours in Air
        </CardDescription>
      </CardHeader>
    </Card>
  )
}