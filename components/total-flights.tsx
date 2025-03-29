'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Plane } from 'lucide-react'

export function TotalFlights() {
  const [totalFlights, setTotalFlights] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTotalFlights() {
      try {
        const { count, error } = await supabase
          .from('vidmaflights')
          .select('*', { count: 'exact', head: true })

        if (error) throw error
        setTotalFlights(count)
      } catch (error) {
        console.error('Error fetching total flights:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTotalFlights()
  }, [])

  return (
    <Card className="stat-card bg-gradient-airline text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-4xl font-bold flex items-center">
          <Plane className="h-6 w-6 mr-2 opacity-80" />
          {loading ? '...' : totalFlights?.toLocaleString()}
        </CardTitle>
        <CardDescription className="text-white/80">Total Flights</CardDescription>
      </CardHeader>
    </Card>
  )
} 