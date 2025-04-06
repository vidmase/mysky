"use client"

import React from 'react'
import { createClient } from "@/utils/supabase/client"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function StatsPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [totalFlights, setTotalFlights] = React.useState<number | null>(null)
  const [totalCountries, setTotalCountries] = React.useState<number | null>(null)
  const [frequentRoute, setFrequentRoute] = React.useState<{ route: string; count: number } | null>(null)
  const [topAirline, setTopAirline] = React.useState<{ name: string; count: number } | null>(null)
  const [flightsByYear, setFlightsByYear] = React.useState<{ year: string; count: number }[]>([])
  const [flightsByMonth, setFlightsByMonth] = React.useState<{ month: string; count: number }[]>([])
  const supabase = createClientComponentClient()

  // Month names mapping
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('=== Starting Stats Fetch ===')

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Error getting session')
          return
        }

        if (!session) {
          console.log('No active session')
          setError('Please log in to view your flight statistics')
          return
        }

        console.log('Fetching stats for user:', session.user.id)

        // Get flights data including departure date
        const { data: flightData, error: flightError } = await supabase
          .from('vidmaflights')
          .select('id, arrival_country, airline, departure_iata, arrival_iata, departure_date')
          .eq('owner_id', session.user.id)

        if (flightError) {
          console.error('Flight Data Error:', flightError)
          setError(`Flight data error: ${flightError.message}`)
          return
        }

        if (!flightData || flightData.length === 0) {
          console.log('No flight data found for user')
          setTotalFlights(0)
          setTotalCountries(0)
          return
        }

        // Calculate flights by month
        const monthCounts = Array(12).fill(0) // Initialize array for all months

        flightData.forEach(flight => {
          if (flight.departure_date) {
            const monthStr = flight.departure_date.substring(5, 7)
            const monthIndex = parseInt(monthStr, 10) - 1
            if (monthIndex >= 0 && monthIndex < 12) {
              monthCounts[monthIndex]++
            }
          }
        })

        // Convert to array of objects with month names
        const monthStats = monthCounts.map((count, index) => ({
          month: monthNames[index],
          count: count
        }))

        setFlightsByMonth(monthStats)

        // Calculate flights by year
        const yearCounts = flightData.reduce((acc, flight) => {
          if (flight.departure_date) {
            const year = flight.departure_date.substring(0, 4).trim() // Trim to handle any whitespace
            if (year.length === 4 && !isNaN(Number(year))) { // Validate year format
              acc[year] = (acc[year] || 0) + 1
            }
          }
          return acc
        }, {} as Record<string, number>)

        // Convert to array and sort by year
        const yearStats = Object.entries(yearCounts)
          .map(([year, count]) => ({ year, count }))
          .sort((a, b) => b.year.localeCompare(a.year)) // Sort descending

        setFlightsByYear(yearStats)

        // Calculate airline frequencies
        const airlineCounts = flightData.reduce((acc, flight) => {
          if (flight.airline) {
            acc[flight.airline] = (acc[flight.airline] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)

        // Find the most frequent airline
        const [mostFlownAirline, flightCount] = Object.entries(airlineCounts)
          .reduce((max, [airline, count]) =>
            count > max[1] ? [airline, count] : max
            , ['', 0])

        if (flightCount > 0) {
          setTopAirline({ name: mostFlownAirline, count: flightCount })
        }

        // Calculate route frequencies
        const routeCounts = flightData.reduce((acc, flight) => {
          const route = `${flight.departure_iata} ↔ ${flight.arrival_iata}`
          acc[route] = (acc[route] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // Find the most frequent route
        const [mostFrequentRoute, routeCount] = Object.entries(routeCounts)
          .reduce((max, [route, count]) =>
            count > max[1] ? [route, count] : max
            , ['', 0])

        if (routeCount > 0) {
          setFrequentRoute({ route: mostFrequentRoute, count: routeCount })
        }

        // Calculate countries
        const uniqueCountries = new Set(
          flightData
            .map(flight => flight.arrival_country)
            .filter(country => country != null)
        )

        console.log('Stats calculated:', {
          totalFlights: flightData.length,
          countriesCount: uniqueCountries.size,
          mostFrequentRoute: frequentRoute,
          mostFlownAirline: topAirline,
          flightsByYear: yearStats,
          flightsByMonth: monthStats
        })

        setTotalFlights(flightData.length)
        setTotalCountries(uniqueCountries.size)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setLoading(false)
        console.log('=== Stats Fetch Complete ===')
      }
    }

    fetchStats()
  }, [supabase])

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center text-red-500">
              <BarChart className="h-6 w-6 mr-2" />
              Error Loading Stats
            </h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Mock data for stats
  const stats = {
    totalFlights: totalFlights,
    totalCountries: totalCountries,
    totalHours: 187,
    totalDistance: "215,432 km",
    mostFlownAirline: topAirline?.name || "Loading...",
    mostFrequentRoute: frequentRoute?.route || "Loading...",
    longestFlight: {
      from: "LHR",
      to: "SYD",
      duration: "21h 35m",
      distance: "17,016 km",
    },
    shortestFlight: {
      from: "LHR",
      to: "CDG",
      duration: "1h 15m",
      distance: "344 km",
    },
    airlines: [
      { name: "British Airways", flights: 18 },
      { name: "Lufthansa", flights: 8 },
      { name: "Delta", flights: 6 },
      { name: "United", flights: 5 },
      { name: "Air France", flights: 5 },
    ],
    airports: [
      { code: "LHR", name: "London Heathrow", visits: 24 },
      { code: "JFK", name: "New York JFK", visits: 12 },
      { code: "CDG", name: "Paris Charles de Gaulle", visits: 8 },
      { code: "FRA", name: "Frankfurt", visits: 6 },
      { code: "LAX", name: "Los Angeles", visits: 4 },
    ],
    flightsByYear: [
      { year: 2020, count: 4 },
      { year: 2021, count: 8 },
      { year: 2022, count: 12 },
      { year: 2023, count: 18 },
    ],
    flightsByMonth: [
      { month: "Jan", count: 2 },
      { month: "Feb", count: 1 },
      { month: "Mar", count: 3 },
      { month: "Apr", count: 4 },
      { month: "May", count: 5 },
      { month: "Jun", count: 6 },
      { month: "Jul", count: 7 },
      { month: "Aug", count: 5 },
      { month: "Sep", count: 3 },
      { month: "Oct", count: 2 },
      { month: "Nov", count: 2 },
      { month: "Dec", count: 2 },
    ],
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <BarChart className="h-6 w-6 mr-2 text-stats" />
            Flight Statistics
          </h1>
          <p className="text-muted-foreground">Your flight history at a glance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={`stat-card ${loading ? 'animate-pulse' : ''} bg-gradient-airline text-white`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold flex items-center">
                <Plane className="h-6 w-6 mr-2 opacity-80" />
                {loading ? '...' : totalFlights}
              </CardTitle>
              <CardDescription className="text-white/80">
                Total Flights
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="stat-card bg-gradient-airport text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold flex items-center">
                <Globe className="h-6 w-6 mr-2 opacity-80" />
                {loading ? '...' : totalCountries}
              </CardTitle>
              <CardDescription className="text-white/80 flex items-center">
                Countries Visited
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="stat-card bg-gradient-flight text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold flex items-center">
                <Clock className="h-6 w-6 mr-2 opacity-80" />
                {stats.totalHours}
              </CardTitle>
              <CardDescription className="text-white/80">Hours in Air</CardDescription>
            </CardHeader>
          </Card>
          <Card className="stat-card bg-gradient-stats text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 opacity-80" />
                {stats.totalDistance}
              </CardTitle>
              <CardDescription className="text-white/80">Total Distance</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="airlines" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Airlines
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Time Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-t-4 border-t-flight shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-flight">
                    <Plane className="h-5 w-5 mr-2" />
                    Most Frequent Route
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-flight/10 flex items-center justify-center mr-3">
                        <Plane className="h-6 w-6 text-flight" />
                      </div>
                      <div>
                        <div className="text-xl font-medium">
                          {loading ? "Loading..." : (frequentRoute?.route || "No routes yet")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {loading ? "..." : (frequentRoute ? `${frequentRoute.count} flights total` : "No flights recorded")}
                        </div>
                      </div>
                    </div>
                    {frequentRoute && (
                      <Badge className="bg-flight text-white">{frequentRoute.count} flights</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-airline shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-airline">
                    <Building className="h-5 w-5 mr-2" />
                    Most Flown Airline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-airline/10 flex items-center justify-center mr-3">
                        <Building className="h-6 w-6 text-airline" />
                      </div>
                      <div>
                        <div className="text-xl font-medium">
                          {loading ? "Loading..." : (topAirline?.name || "No airlines yet")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {loading ? "..." : (topAirline ? `${topAirline.count} flights total` : "No flights recorded")}
                        </div>
                      </div>
                    </div>
                    {topAirline && (
                      <Badge className="bg-airline text-white">{topAirline.count} flights</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-flight shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-flight">
                    <ArrowUpRight className="h-5 w-5 mr-2" />
                    Longest Flight
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-flight/10 flex items-center justify-center mr-3">
                          <Plane className="h-5 w-5 text-flight" />
                        </div>
                        <div>
                          <div className="text-lg font-medium">
                            {stats.longestFlight.from} → {stats.longestFlight.to}
                          </div>
                          <div className="text-sm text-muted-foreground">Sydney, Australia</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-flight" />
                        <span>{stats.longestFlight.duration}</span>
                      </div>
                      <span className="text-sm font-medium">{stats.longestFlight.distance}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-flight shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-flight">
                    <ArrowDownRight className="h-5 w-5 mr-2" />
                    Shortest Flight
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-flight/10 flex items-center justify-center mr-3">
                          <Plane className="h-5 w-5 text-flight" />
                        </div>
                        <div>
                          <div className="text-lg font-medium">
                            {stats.shortestFlight.from} → {stats.shortestFlight.to}
                          </div>
                          <div className="text-sm text-muted-foreground">Paris, France</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-flight" />
                        <span>{stats.shortestFlight.duration}</span>
                      </div>
                      <span className="text-sm font-medium">{stats.shortestFlight.distance}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-t-4 border-t-airport shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-airport">
                  <MapPin className="h-5 w-5 mr-2" />
                  Most Visited Airports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.airports.map((airport, index) => (
                    <div
                      key={airport.code}
                      className={`flex items-center justify-between p-3 rounded-md ${index === 0 ? "bg-airport/10" : "hover:bg-muted/50"} transition-colors`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`h-10 w-10 rounded-full ${index === 0 ? "bg-airport text-white" : "bg-airport/10"} flex items-center justify-center mr-3`}
                        >
                          <MapPin className={`h-5 w-5 ${index === 0 ? "text-white" : "text-airport"}`} />
                        </div>
                        <div>
                          <div className="font-medium">{airport.name}</div>
                          <div className="text-sm text-muted-foreground">{airport.code}</div>
                        </div>
                      </div>
                      <Badge className={index === 0 ? "bg-airport text-white" : "bg-muted text-muted-foreground"}>
                        {airport.visits} visits
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="airlines" className="space-y-4">
            <Card className="border-t-4 border-t-airline shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-airline">
                  <Building className="h-5 w-5 mr-2" />
                  Airlines Breakdown
                </CardTitle>
                <CardDescription>Number of flights per airline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {stats.airlines.map((airline, index) => (
                    <div key={airline.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className={`h-8 w-8 rounded-full ${index === 0 ? "bg-airline text-white" : "bg-airline/10"} flex items-center justify-center mr-2`}
                          >
                            <Building className={`h-4 w-4 ${index === 0 ? "text-white" : "text-airline"}`} />
                          </div>
                          <span className="font-medium">{airline.name}</span>
                        </div>
                        <Badge className={index === 0 ? "bg-airline text-white" : "bg-muted text-muted-foreground"}>
                          {airline.flights} flights
                        </Badge>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-airline rounded-full airline-bar"
                          style={{ width: `${(airline.flights / stats.airlines[0].flights) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 aspect-video bg-muted/50 rounded-md flex items-center justify-center pattern-bg">
                  <div className="text-center space-y-2">
                    <div className="h-16 w-16 rounded-full bg-airline/10 flex items-center justify-center mx-auto">
                      <BarChart className="h-8 w-8 text-airline" />
                    </div>
                    <p className="text-sm font-medium">Airline Distribution</p>
                    <p className="text-xs text-muted-foreground">
                      British Airways is your most flown airline with 43% of all flights
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-t-4 border-t-stats shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-stats">
                    <Calendar className="h-5 w-5 mr-2" />
                    Flights by Year
                  </CardTitle>
                  <CardDescription>
                    {loading ? "Loading..." : `${flightsByYear.length} years of flight history`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {loading ? (
                      <div className="text-center py-4">Loading...</div>
                    ) : flightsByYear.length === 0 ? (
                      <div className="text-center py-4">No flight data available</div>
                    ) : (
                      flightsByYear.map((item) => (
                        <div key={item.year} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-stats/10 flex items-center justify-center mr-2">
                                <Calendar className="h-4 w-4 text-stats" />
                              </div>
                              <span className="font-medium">{item.year}</span>
                            </div>
                            <Badge className="bg-stats text-white">{item.count} flights</Badge>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-stats rounded-full airline-bar"
                              style={{
                                width: `${(item.count / Math.max(...flightsByYear.map(i => i.count))) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-stats shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-stats">
                    <Calendar className="h-5 w-5 mr-2" />
                    Flights by Month
                  </CardTitle>
                  <CardDescription>
                    Monthly flight distribution across all years
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">Loading...</div>
                    </div>
                  ) : flightsByMonth.length === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="text-center">No flight data available</div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-end justify-between gap-1 pt-6 pb-2">
                      {flightsByMonth.map((item) => {
                        const maxCount = Math.max(...flightsByMonth.map(i => i.count))
                        const heightPercentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0

                        return (
                          <div key={item.month} className="flex flex-col items-center group relative">
                            {/* Permanent Count Display */}
                            <div className="text-xs font-medium text-stats mb-1">
                              {item.count}
                            </div>

                            {/* Bar Container */}
                            <div className="relative w-8">
                              {/* Background Bar */}
                              <div
                                className="absolute bottom-0 w-full rounded-t-md bg-stats/10"
                                style={{ height: '100%' }}
                              />

                              {/* Animated Bar */}
                              <div
                                className="absolute bottom-0 w-full rounded-t-md transition-all duration-300 ease-out group-hover:shadow-lg"
                                style={{
                                  height: `${heightPercentage}%`,
                                  minHeight: item.count > 0 ? '4px' : '0',
                                  background: `linear-gradient(to top, rgb(var(--stats-rgb)) 0%, rgba(var(--stats-rgb), 0.7) 100%)`
                                }}
                              >
                                {/* Hover Highlight */}
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                              </div>
                            </div>

                            {/* Month Label */}
                            <div className="mt-2 text-xs font-medium transition-colors duration-200 group-hover:text-stats">
                              {item.month}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-t-4 border-t-stats shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-stats">
                  <Clock className="h-5 w-5 mr-2" />
                  Time in Air
                </CardTitle>
                <CardDescription>Distribution of flight durations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center pattern-bg">
                  <div className="text-center space-y-2">
                    <div className="h-16 w-16 rounded-full bg-stats/10 flex items-center justify-center mx-auto">
                      <Clock className="h-8 w-8 text-stats" />
                    </div>
                    <p className="text-sm font-medium">Flight Duration Analysis</p>
                    <p className="text-xs text-muted-foreground">
                      Most of your flights (65%) are medium-haul between 3-8 hours
                    </p>
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="flex flex-col items-center">
                        <div className="h-16 w-4 bg-stats/20 rounded-t-sm"></div>
                        <span className="text-xs mt-1">Short</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="h-32 w-4 bg-stats rounded-t-sm"></div>
                        <span className="text-xs mt-1">Medium</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="h-24 w-4 bg-stats/60 rounded-t-sm"></div>
                        <span className="text-xs mt-1">Long</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

