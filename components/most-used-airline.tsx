'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plane } from 'lucide-react'

type AirlineStats = {
  airline: string
  count: number
}

export function MostUsedAirline() {
  const [mostUsedAirline, setMostUsedAirline] = useState<AirlineStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMostUsedAirline() {
      try {
        const { data, error } = await supabase
          .from('vidmaflights')
          .select('airline')

        if (error) throw error

        // Count occurrences of each airline
        const airlineCounts = data.reduce((acc: { [key: string]: number }, flight) => {
          acc[flight.airline] = (acc[flight.airline] || 0) + 1
          return acc
        }, {})

        // Find the airline with the highest count
        const mostUsed = Object.entries(airlineCounts).reduce((max, [airline, count]) => {
          return count > (max.count || 0) ? { airline, count } : max
        }, { airline: '', count: 0 })

        setMostUsedAirline(mostUsed)
      } catch (error) {
        console.error('Error fetching most used airline:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMostUsedAirline()
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
              {loading ? '...' : mostUsedAirline?.airline}
            </div>
            <div className="text-sm text-muted-foreground">
              {loading ? '...' : `${mostUsedAirline?.count} flights`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 