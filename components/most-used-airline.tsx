'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plane } from 'lucide-react'

type AirlineStats = {
  airline: string
  count: number
}

export function MostUsedAirline() {
  const [mostUsedAirline, setMostUsedAirline] = useState<AirlineStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchStatistics() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/statistics')
        if (!mounted) return

        if (!response.ok) {
          if (response.status === 401) {
            setMostUsedAirline({ airline: 'Sign in to view', count: 0 })
            return
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (!mounted) return

        if (data.mostUsedAirline) {
          setMostUsedAirline(data.mostUsedAirline)
        } else {
          setMostUsedAirline({ airline: 'No flights yet', count: 0 })
        }
      } catch (error) {
        if (mounted) {
          console.error('Error fetching statistics:', error)
          setError('An unexpected error occurred')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchStatistics()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center text-airline">
          <Plane className="h-5 w-5 mr-2 text-airline" />
          Most Used Airline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-airline/10 flex items-center justify-center">
            <Plane className="h-6 w-6 text-airline" />
          </div>
          <div>
            <div className="text-xl font-semibold">
              {loading ? (
                <div className="animate-pulse">Loading...</div>
              ) : error ? (
                <span className="text-[var(--vermillion-dk)]">{error}</span>
              ) : (
                mostUsedAirline?.airline
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {loading ? (
                <div className="animate-pulse">Loading...</div>
              ) : error ? (
                <span className="text-[var(--vermillion-dk)]">Failed to load data</span>
              ) : mostUsedAirline?.airline === 'Sign in to view' ? (
                'Sign in to view flight count'
              ) : (
                `${mostUsedAirline?.count || 0} flights`
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 