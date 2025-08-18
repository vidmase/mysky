"use client"

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
import { getUserStats } from "@/src/lib/services/stats"
import { createClient } from "@/app/lib/supabase/client"
import { useEffect, useState } from "react"

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setStats(null)
        setLoading(false)
        return
      }
      const userStats = await getUserStats(supabase, user.id)
      setStats(userStats)
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>
  }
  if (!stats) {
    return <div className="container mx-auto px-4 py-8">No stats available.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <BarChart className="h-6 w-6 mr-2 text-stats" />
            Stats & Insights
          </h1>
          <p className="text-muted-foreground">Analyze your travel patterns and flight history</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="stat-card bg-gradient-airline text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold flex items-center">
                <Plane className="h-6 w-6 mr-2 opacity-80" />
                {stats.totalFlights}
              </CardTitle>
              <CardDescription className="text-white/80 flex items-center">
                Total Flights
                <Badge className="ml-2 bg-white/20 text-white">+18% YoY</Badge>
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="stat-card bg-gradient-airport text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-4xl font-bold flex items-center">
                <Globe className="h-6 w-6 mr-2 opacity-80" />
                {stats.totalCountries}
              </CardTitle>
              <CardDescription className="text-white/80 flex items-center">
                Countries Visited
                <Badge className="ml-2 bg-white/20 text-white">+3 new</Badge>
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
                        <div className="text-xl font-medium">{stats.mostFrequentRoute}</div>
                        <div className="text-sm text-muted-foreground">8 flights total</div>
                      </div>
                    </div>
                    <Badge className="bg-flight text-white">8 flights</Badge>
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
                        <div className="text-xl font-medium">{stats.mostFlownAirline}</div>
                        <div className="text-sm text-muted-foreground">{stats.airlines[0].flights} flights total</div>
                      </div>
                    </div>
                    <Badge className="bg-airline text-white">{stats.airlines[0].flights} flights</Badge>
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
                  {stats.airports.map((airport: any, index: number) => (
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
                  {stats.airlines.map((airline: any, index: number) => (
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {stats.flightsByYear.map((item: any) => (
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
                              width: `${(item.count / Math.max(...stats.flightsByYear.map((i: any) => i.count))) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-stats shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-stats">
                    <Calendar className="h-5 w-5 mr-2" />
                    Flights by Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end justify-between gap-1 pt-6">
                    {stats.flightsByMonth.map((item: any) => (
                      <div key={item.month} className="flex flex-col items-center group">
                        <div className="text-xs text-muted-foreground mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.count}
                        </div>
                        <div
                          className="w-8 bg-stats rounded-t-sm month-bar relative"
                          style={{
                            height: `${(item.count / Math.max(...stats.flightsByMonth.map((i: any) => i.count))) * 100}%`,
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div className="mt-2 text-xs font-medium">{item.month}</div>
                      </div>
                    ))}
                  </div>
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

