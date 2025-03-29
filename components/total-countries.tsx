'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Globe } from 'lucide-react'

export function TotalCountries() {
  const [totalCountries, setTotalCountries] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTotalCountries() {
      try {
        const { data, error } = await supabase
          .from('vidmaflights')
          .select('arrival_iata')

        if (error) throw error
        
        // Get unique countries using Set
        const uniqueCountries = new Set(data.map(flight => flight.arrival_iata))
        setTotalCountries(uniqueCountries.size)
      } catch (error) {
        console.error('Error fetching total countries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTotalCountries()
  }, [])

  return (
    <Card className="stat-card bg-gradient-airport text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-4xl font-bold flex items-center">
          <Globe className="h-6 w-6 mr-2 opacity-80" />
          {loading ? '...' : totalCountries?.toLocaleString()}
        </CardTitle>
        <CardDescription className="text-white/80">Countries Visited</CardDescription>
      </CardHeader>
    </Card>
  )
} 