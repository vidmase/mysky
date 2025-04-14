"use client"

import React, { Suspense, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { europeanAirports, Airport } from '@/lib/airports'
import Image from 'next/image'
import { Toaster, toast } from 'sonner'
import {
  BarChart,
  Calendar,
  Clock,
  MapPin,
  Plane,
  Globe,
  Building,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  LogIn,
  LogOut,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { RecentActivity } from "../components/recent-activity"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

// Create a map for faster lookups
const airportMap = new Map<string, Airport>()
europeanAirports.forEach(airport => {
  airportMap.set(airport.iata, airport)
})

const ActivityLoadingFallback = () => (
  <Card>
    <CardHeader>
      <LoadingSpinner />
    </CardHeader>
  </Card>
)

// Haversine distance calculation function
function calculateDistance(airport1: Airport, airport2: Airport): number {
  if (!airport1.coordinates || !airport2.coordinates) return 0

  const [lon1, lat1] = airport1.coordinates
  const [lon2, lat2] = airport2.coordinates

  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function StatsPage() {
  const [basicStats, setBasicStats] = useState({
    totalAirports: 0,
    totalCountries: 0,
  })

  interface Flight {
    departure_airport: string;
    arrival_airport: string;
  }

  const [flights, setFlights] = useState<Flight[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Calculate basic statistics
    const uniqueCountries = new Set(europeanAirports.map(airport => airport.country))
    setBasicStats({
      totalAirports: europeanAirports.length,
      totalCountries: uniqueCountries.size,
    })

    // Fetch flights data
    async function fetchFlights() {
      const { data: flightsData, error } = await supabase
        .from('flights')
        .select('departure_airport, arrival_airport')

      if (error) {
        console.error('Error fetching flights:', error)
        return
      }

      setFlights(flightsData || [])
    }

    fetchFlights()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        toast.success('Welcome back!', {
          icon: <LogIn className="h-5 w-5" />,
          className: 'bg-background/80 backdrop-blur-sm border border-border',
          description: `Signed in as ${session?.user?.email}`,
          duration: 4000,
          position: 'top-center',
        })
      }
      if (event === 'SIGNED_OUT') {
        toast('See you soon!', {
          icon: <LogOut className="h-5 w-5" />,
          className: 'bg-background/80 backdrop-blur-sm border border-border',
          description: 'Successfully signed out',
          duration: 4000,
          position: 'top-center',
        })
      }
    })

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Calculate total distance and unique countries
  let totalDistance = 0
  const uniqueCountries = new Set<string>()

  // Process each flight
  flights.forEach(flight => {
    const departureAirport = airportMap.get(flight.departure_airport)
    const arrivalAirport = airportMap.get(flight.arrival_airport)

    if (departureAirport && arrivalAirport) {
      totalDistance += calculateDistance(departureAirport, arrivalAirport)
      uniqueCountries.add(departureAirport.country)
      uniqueCountries.add(arrivalAirport.country)
    }
  })

  console.log('Total distance:', totalDistance)
  console.log('Unique countries:', uniqueCountries.size)

  return (
    <div className="relative min-h-screen bg-background">
      <Toaster />
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/plane5.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.15,
        }}
      />

      {/* Content with higher z-index */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted/80 flex items-center justify-center backdrop-blur-sm">
            <Plane className="h-8 w-8" />
          </div>

          {/* Basic Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-8">
            <Card className="bg-muted/80 backdrop-blur-sm relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Airports</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">137</div>
                <p className="text-xs text-muted-foreground">Across Europe</p>
                <div className="absolute -rotate-12 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground/20 text-lg md:text-xl font-bold uppercase tracking-[0.2em]">
                  Example Data
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/80 backdrop-blur-sm relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Countries Covered</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">32</div>
                <p className="text-xs text-muted-foreground">European Nations</p>
                <div className="absolute -rotate-12 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-muted-foreground/20 text-lg md:text-xl font-bold uppercase tracking-[0.2em]">
                  Example Data
                </div>
              </CardContent>
            </Card>
          </div>

          <h1 className="text-2xl font-bold">Advanced Statistics Coming Soon</h1>
          <p className="text-muted-foreground max-w-md">
            We're currently updating our statistics system to provide you with more accurate and detailed insights.
            Please check back soon.
          </p>
          <div className="bg-muted/80 backdrop-blur-sm rounded-lg p-4 mt-8 max-w-md">
            <p className="text-sm">
              🔄 Expected to be back online soon with improved features:
            </p>
            <ul className="text-sm text-left list-disc list-inside mt-2 space-y-1">
              <li>More accurate flight distance calculations</li>
              <li>Enhanced time-in-air tracking</li>
              <li>Improved data visualization</li>
            </ul>
          </div>

          <div className="mt-8 bg-flight/20 backdrop-blur-sm rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-flight mb-2 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 mr-2" />
              Looking for Flight Stats?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              While we're improving this page, you can find exciting statistics in our interactive map view:
            </p>
            <ul className="text-sm text-left list-disc list-inside space-y-2 mb-4">
              <li>Total distance flown</li>
              <li>Most frequent routes</li>
              <li>Interactive flight paths</li>
              <li>Airport statistics</li>
            </ul>
            <a
              href="/map"
              className="inline-flex items-center justify-center rounded-md bg-flight px-4 py-2 text-sm font-medium text-white hover:bg-flight/90 transition-colors"
            >
              View Flight Map
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

