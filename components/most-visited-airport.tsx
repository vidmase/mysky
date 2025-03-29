'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

type AirportStats = {
  airport: string
  count: number
}

export function MostVisitedAirport() {
  const [mostVisitedAirport, setMostVisitedAirport] = useState<AirportStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMostVisitedAirport() {
      try {
        const { data, error } = await supabase
          .from('vidmaflights')
          .select('arrival_airport')

        if (error) throw error

        // Count occurrences of each airport
        const airportCounts = data.reduce((acc: { [key: string]: number }, flight) => {
          const airport = flight.arrival_airport
          if (airport) {
            acc[airport] = (acc[airport] || 0) + 1
          }
          return acc
        }, {})

        // Find the airport with the highest count
        const mostVisited = Object.entries(airportCounts).reduce((max, [airport, count]) => {
          return count > (max.count || 0) ? { airport, count } : max
        }, { airport: '', count: 0 })

        setMostVisitedAirport(mostVisited)
      } catch (error) {
        console.error('Error fetching most visited airport:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMostVisitedAirport()
  }, [])

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center text-airport">
          <MapPin className="h-5 w-5 mr-2 text-airport" />
          Most Visited Airport
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-airport/10 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-airport" />
          </div>
          <div>
            <div className="text-xl font-semibold">
              {loading ? '...' : mostVisitedAirport?.airport}
            </div>
            <div className="text-sm text-muted-foreground">
              {loading ? '...' : `${mostVisitedAirport?.count} visits`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 