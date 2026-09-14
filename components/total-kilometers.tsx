'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Map } from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'
import { useUnifiedStatistics } from '@/lib/statistics'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { RefreshCw } from 'lucide-react'

export function TotalKilometers() {
    const { statistics, loading, error, refetch } = useUnifiedStatistics({
        cacheEnabled: true,
        enableRealtime: true
    })
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true)
        try {
            await refetch(true) // Force a fresh fetch
        } finally {
            setIsRefreshing(false)
        }
    }, [refetch])

    const formatKilometers = useCallback((km: number) => {
        if (km >= 1000000) {
            return `${(km / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`
        } else if (km >= 1000) {
            return `${(km / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`
        }
        return km.toLocaleString(undefined, { maximumFractionDigits: 0 })
    }, [])

    const cardContent = useMemo(() => {
        if (error) {
            return <span className="text-[var(--vermillion-dk)]">{error}</span>
        }

        if (loading) {
            return <LoadingSpinner size="lg" />
        }

        if (!statistics) {
            return <span className="text-lg">Sign in to view distance</span>
        }

        return (
            <div className="flex flex-col">
                <span>{formatKilometers(statistics.totalKilometers)} km</span>
                <span className="text-xs text-[color-mix(in_srgb,var(--ink-2)_60%,transparent)] font-normal mt-1">
                    Last updated: {new Date(statistics.lastUpdated).toLocaleTimeString()}
                </span>
            </div>
        )
    }, [error, loading, statistics, formatKilometers])

    return (
        <Card className="stat-card bg-gradient-to-br from-[var(--brass)] via-[var(--vermillion-dk)] to-[var(--vermillion-dk)] text-[var(--paper)] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-2">
                <CardTitle className="flex flex-col gap-1">
                    <div className="text-4xl font-bold flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="text-2xl mr-2">🛣️</span>
                            {cardContent}
                        </div>
                        {statistics && (
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-1 hover:bg-[var(--wash-ink)] rounded-full transition-colors disabled:opacity-50"
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
                <CardDescription className="text-[color-mix(in_srgb,var(--ink-2)_90%,transparent)] font-medium">
                    📏 Total Distance
                </CardDescription>
            </CardHeader>
        </Card>
    )
} 