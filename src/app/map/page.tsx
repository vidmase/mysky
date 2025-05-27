"use client"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from "next/navigation"
import type L from "leaflet"
// @ts-ignore
// 'leaflet/dist/leaflet.css' is imported dynamically in useEffect to avoid SSR issues and linter errors

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, MapPin, Plane, ArrowRight, Navigation, BarChart3, Clock } from "lucide-react"

// Define types for our data
interface Airport {
  code: string
  name: string
  city: string
  country: string
  visits: number
  lat: number
  lng: number
}

interface Route {
  from: string
  to: string
  count: number
}

export default function MapPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<{ [key: string]: L.Marker }>({})
  const pathsRef = useRef<L.Polyline[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Mock data for airports and routes
  const airports: Airport[] = [
    {
      code: "LHR",
      name: "London Heathrow",
      city: "London",
      country: "United Kingdom",
      visits: 4,
      lat: 51.47,
      lng: -0.4543,
    },
    {
      code: "JFK",
      name: "John F. Kennedy",
      city: "New York",
      country: "United States",
      visits: 3,
      lat: 40.6413,
      lng: -73.7781,
    },
    {
      code: "LAX",
      name: "Los Angeles International",
      city: "Los Angeles",
      country: "United States",
      visits: 2,
      lat: 33.9416,
      lng: -118.4085,
    },
    {
      code: "SFO",
      name: "San Francisco International",
      city: "San Francisco",
      country: "United States",
      visits: 2,
      lat: 37.6213,
      lng: -122.379,
    },
    { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", visits: 1, lat: 49.0097, lng: 2.5479 },
  ]

  const routes: Route[] = [
    { from: "LHR", to: "JFK", count: 2 },
    { from: "JFK", to: "LAX", count: 1 },
    { from: "LAX", to: "SFO", count: 1 },
    { from: "SFO", to: "LHR", count: 1 },
    { from: "LHR", to: "CDG", count: 1 },
  ]

  const handleAirportClick = (code: string) => {
    setSelectedAirport(code === selectedAirport ? null : code)
  }

  const selectedAirportData = selectedAirport ? airports.find((airport) => airport.code === selectedAirport) : null

  // Initialize the map
  useEffect(() => {
    // Only run on client-side
    if (typeof window === "undefined" || !mapContainerRef.current) return

    // Dynamic import for Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Only initialize the map if it doesn't exist
      if (!mapRef.current) {
        // Import CSS dynamically
        import("leaflet/dist/leaflet.css")
        // Create custom airport icon
        const airportIcon = L.divIcon({
          className: "custom-div-icon",
          html: `<div class="bg-airport text-white rounded-full p-1 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        })

        // Create the map
        mapRef.current = L.map(mapContainerRef.current, {
          center: [20, 0], // Center on the world
          zoom: 2,
          minZoom: 2,
          maxZoom: 10,
          zoomControl: true,
          attributionControl: true,
        })

        // Add the tile layer (map style)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapRef.current)

        // Add airport markers
        airports.forEach((airport) => {
          const marker = L.marker([airport.lat, airport.lng], {
            icon: airportIcon,
            title: airport.code,
          })
            .addTo(mapRef.current!)
            .bindTooltip(`${airport.code} - ${airport.name}`)
            .on("click", () => handleAirportClick(airport.code))

          markersRef.current[airport.code] = marker
        })

        // Draw flight paths
        drawFlightPaths()
      }
    })

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markersRef.current = {}
        pathsRef.current = []
      }
    }
  }, [])

  // Update map when selected airport changes
  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    // Import Leaflet dynamically
    import("leaflet").then((L) => {
      // Reset all markers to default style
      Object.keys(markersRef.current).forEach((code) => {
        const marker = markersRef.current[code]
        const defaultIcon = L.divIcon({
          className: "custom-div-icon",
          html: `<div class="bg-airport text-white rounded-full p-1 shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                 </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        })
        marker.setIcon(defaultIcon)
      })

      // Clear existing paths
      pathsRef.current.forEach((path) => {
        mapRef.current?.removeLayer(path)
      })
      pathsRef.current = []

      // If an airport is selected
      if (selectedAirport) {
        // Highlight the selected airport
        const selectedMarker = markersRef.current[selectedAirport]
        if (selectedMarker) {
          const highlightedIcon = L.divIcon({
            className: "custom-div-icon",
            html: `<div class="bg-airport text-white rounded-full p-2 shadow-lg scale-125">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          })
          selectedMarker.setIcon(highlightedIcon)

          // Center map on selected airport
          const airport = airports.find((a) => a.code === selectedAirport)
          if (airport) {
            mapRef.current?.setView([airport.lat, airport.lng], 4)
          }
        }

        // Draw only the routes connected to the selected airport
        drawFlightPaths(selectedAirport)
      } else {
        // If no airport is selected, draw all routes and reset view
        drawFlightPaths()
        mapRef.current?.setView([20, 0], 2)
      }
    })
  }, [selectedAirport])

  // Function to draw flight paths
  const drawFlightPaths = (filterAirport?: string) => {
    if (typeof window === "undefined" || !mapRef.current) return

    // Import Leaflet dynamically
    import("leaflet").then((L) => {
      // Clear existing paths
      pathsRef.current.forEach((path) => {
        mapRef.current?.removeLayer(path)
      })
      pathsRef.current = []

      // Filter routes if needed
      const routesToDraw = filterAirport
        ? routes.filter((route) => route.from === filterAirport || route.to === filterAirport)
        : routes

      // Draw each route
      routesToDraw.forEach((route) => {
        const fromAirport = airports.find((a) => a.code === route.from)
        const toAirport = airports.find((a) => a.code === route.to)

        if (fromAirport && toAirport) {
          // Create a curved path for the route
          const latlngs = createCurvedPath([fromAirport.lat, fromAirport.lng], [toAirport.lat, toAirport.lng])

          // Create the path with animation
          const path = L.polyline(latlngs, {
            color: "hsl(var(--color-flight))",
            weight: filterAirport ? 3 : 2,
            opacity: filterAirport ? 0.8 : 0.5,
            dashArray: "5, 5",
            className: "flight-path",
          })
            .addTo(mapRef.current)
            .bindTooltip(`${route.from} to ${route.to} (${route.count} flights)`)

          // Add a plane icon in the middle of the path
          const midpoint = latlngs[Math.floor(latlngs.length / 2)]
          const planeIcon = L.divIcon({
            className: "plane-icon",
            html: `<div class="bg-white rounded-full p-1 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--color-flight))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-plane"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })

          L.marker(midpoint, { icon: planeIcon }).addTo(mapRef.current)

          // Store the path for later reference
          pathsRef.current.push(path)
        }
      })
    })
  }

  // Function to create a curved path between two points
  const createCurvedPath = (start: [number, number], end: [number, number], curveIntensity = 0.2) => {
    const latlngs: [number, number][] = []

    // Calculate the midpoint
    const midLat = (start[0] + end[0]) / 2
    const midLng = (start[1] + end[1]) / 2

    // Calculate the distance between points
    const distance = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2))

    // Create a curve by offsetting the midpoint
    // The curve is more pronounced for longer distances
    const curveOffset = distance * curveIntensity

    // Determine if we need to curve north or south
    // For routes crossing the equator, curve away from the equator
    const curveLat = midLat + curveOffset * (midLat > 0 ? 1 : -1)

    // Add points to create the curve
    const numPoints = 20
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints

      // Quadratic Bezier curve
      const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * curveLat + t * t * end[0]

      const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * midLng + t * t * end[1]

      latlngs.push([lat, lng])
    }

    return latlngs
  }

  // Only import CSS on client-side
  useEffect(() => {
    import("leaflet/dist/leaflet.css")
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkSession()
  }, [supabase])

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/auth")
    }
  }, [isAuthenticated, router])

  if (isAuthenticated === null || !isAuthenticated) {
    return null // or a spinner
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
    <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col space-y-8">
          {/* Enhanced Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-airport/20 via-airport/10 to-airport/5 p-8 backdrop-blur-sm border border-airport/20">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
            <div className="relative">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 rounded-xl bg-airport/20 backdrop-blur-sm">
                  <Globe className="h-8 w-8 text-airport" />
                </div>
        <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-airport to-airport/60 bg-clip-text text-transparent">
                    ✈️ Travel Map ✈️
          </h1>
                  <p className="text-lg text-muted-foreground mt-1">
                    Explore your aviation adventures across the globe
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 mt-6">
                <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2">
                  <MapPin className="h-4 w-4 text-airport" />
                  <span className="text-sm font-medium">{airports.length} Airports</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2">
                  <Navigation className="h-4 w-4 text-flight" />
                  <span className="text-sm font-medium">{routes.length} Routes</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-4 py-2">
                  <BarChart3 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">42 Total Flights</span>
                </div>
              </div>
            </div>
        </div>

        <Tabs defaultValue="map" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 backdrop-blur-sm">
              <TabsTrigger value="map" className="flex items-center gap-2 data-[state=active]:bg-airport/10 data-[state=active]:text-airport">
              <Globe className="h-4 w-4" />
              Map View
            </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2 data-[state=active]:bg-airport/10 data-[state=active]:text-airport">
              <MapPin className="h-4 w-4" />
              Airport List
            </TabsTrigger>
          </TabsList>
            
            <TabsContent value="map" className="space-y-6 mt-6">
              {/* Enhanced Map Card */}
              <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-airport/10 via-airport/5 to-transparent p-1">
                  <CardContent className="p-0 bg-background/95 backdrop-blur-sm rounded-lg m-1">
                {/* Leaflet Map Container */}
                    <div className="relative">
                <div
                  ref={mapContainerRef}
                        className="aspect-[16/9] rounded-lg overflow-hidden ring-1 ring-border/50"
                        style={{ height: "600px" }}
                />

                      {/* Modern Floating Legend */}
                      <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/20">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <div className="h-3 w-3 rounded-full bg-airport shadow-sm"></div>
                            <span className="text-sm font-medium">Airports</span>
                            <Badge variant="secondary" className="text-xs">{airports.length}</Badge>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="h-1 w-6 bg-flight rounded-full shadow-sm"></div>
                            <span className="text-sm font-medium">Routes</span>
                            <Badge variant="secondary" className="text-xs">{routes.length}</Badge>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Plane className="h-3 w-3 text-flight" />
                            <span className="text-sm font-medium">Flights</span>
                            <Badge variant="secondary" className="text-xs">42</Badge>
                          </div>
                        </div>
                    </div>
                      
                      {/* Interactive Instruction */}
                      {!selectedAirport && (
                        <div className="absolute top-4 right-4 bg-airport/90 text-white backdrop-blur-md rounded-xl p-3 shadow-lg">
                          <p className="text-sm font-medium flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            Click any airport to explore
                          </p>
                    </div>
                      )}
                    </div>
                  </CardContent>
                </div>
            </Card>

              {/* Enhanced Selected Airport Card */}
            {selectedAirportData && (
                <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-airport/5 via-background to-airport/5 backdrop-blur-sm animate-slide-up">
                  <div className="bg-gradient-to-r from-airport/20 via-airport/10 to-transparent p-1">
                    <div className="bg-background/95 backdrop-blur-sm rounded-lg m-1">
                      <CardHeader className="pb-4 bg-gradient-to-r from-airport/5 to-transparent">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center space-x-3 text-xl">
                              <div className="p-2 rounded-xl bg-airport/20">
                                <MapPin className="h-5 w-5 text-airport" />
                              </div>
                              <div>
                                <div className="font-bold">{selectedAirportData.name}</div>
                                <div className="text-lg font-mono text-airport">({selectedAirportData.code})</div>
                              </div>
                  </CardTitle>
                            <CardDescription className="mt-2 text-base">
                              📍 {selectedAirportData.city}, {selectedAirportData.country}
                  </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="bg-gradient-to-r from-airport to-airport/80 text-white rounded-xl px-4 py-2">
                              <div className="text-2xl font-bold">{selectedAirportData.visits}</div>
                              <div className="text-xs opacity-90">visits</div>
                            </div>
                          </div>
                        </div>
                </CardHeader>
                      <CardContent className="pt-2">
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Navigation className="h-4 w-4" />
                            <span>Connected Routes</span>
                  </div>
                          
                          <div className="grid gap-3">
                      {routes
                        .filter(
                          (route) => route.from === selectedAirportData.code || route.to === selectedAirportData.code,
                        )
                        .map((route, index) => {
                          const isOrigin = route.from === selectedAirportData.code
                          const connectedCode = isOrigin ? route.to : route.from
                          const connectedAirport = airports.find((a) => a.code === connectedCode)

                          return (
                            <div
                              key={index}
                                    className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/30 via-muted/20 to-muted/10 hover:from-flight/10 hover:via-flight/5 hover:to-flight/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-flight/20"
                            >
                                    <div className="flex items-center space-x-3">
                                      <div className={`p-2 rounded-lg ${isOrigin ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                {isOrigin ? (
                                          <ArrowRight className="h-4 w-4" />
                                ) : (
                                          <ArrowRight className="h-4 w-4 rotate-180" />
                                )}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-sm">
                                          {isOrigin ? "Destination" : "Origin"}
                                        </div>
                                        <div className="font-medium">
                                  {connectedAirport?.city} ({connectedCode})
                                        </div>
                                      </div>
                              </div>
                                    <div className="flex items-center space-x-2">
                                      <Badge variant="outline" className="bg-flight/10 text-flight border-flight/30 font-medium">
                                {route.count}x
                              </Badge>
                                      <Clock className="h-4 w-4 text-muted-foreground group-hover:text-flight transition-colors" />
                                    </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </CardContent>
                    </div>
                  </div>
              </Card>
            )}
          </TabsContent>
            
            <TabsContent value="list" className="mt-6">
              {/* Enhanced Airport List */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-airport/10 via-airport/5 to-transparent p-1">
                  <div className="bg-background/95 backdrop-blur-sm rounded-lg m-1">
                    <CardHeader className="bg-gradient-to-r from-airport/5 to-transparent">
                      <CardTitle className="flex items-center space-x-3 text-airport">
                        <div className="p-2 rounded-xl bg-airport/20">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xl font-bold">Visited Airports</div>
                          <div className="text-sm font-normal text-muted-foreground">Your global aviation journey</div>
                        </div>
                </CardTitle>
              </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid gap-4">
                        {airports.map((airport, index) => (
                    <div
                      key={airport.code}
                            className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/20 via-background to-muted/10 hover:from-airport/10 hover:via-airport/5 hover:to-airport/10 transition-all duration-300 cursor-pointer border border-transparent hover:border-airport/20 hover:shadow-lg"
                      onClick={() => {
                        setSelectedAirport(airport.code)
                        document
                          .querySelector('[data-value="map"]')
                          ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
                      }}
                    >
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-airport/20 to-airport/10 flex items-center justify-center group-hover:from-airport/30 group-hover:to-airport/20 transition-all duration-300">
                                  <MapPin className="h-6 w-6 text-airport" />
                                </div>
                                <div className="absolute -top-1 -right-1 h-5 w-5 bg-flight rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-white">{index + 1}</span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-base group-hover:text-airport transition-colors">
                                  {airport.name}
                        </div>
                                <div className="text-sm text-muted-foreground mb-1">
                                  📍 {airport.city}, {airport.country}
                          </div>
                                <div className="text-xs font-mono text-airport bg-airport/10 rounded px-2 py-1 inline-block">
                                  {airport.code}
                          </div>
                        </div>
                      </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className="bg-gradient-to-r from-airport to-airport/80 text-white rounded-xl px-3 py-2">
                                  <div className="text-lg font-bold">{airport.visits}</div>
                                  <div className="text-xs opacity-90">visits</div>
                                </div>
                              </div>
                              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-airport group-hover:translate-x-1 transition-all duration-300" />
                            </div>
                    </div>
                  ))}
                </div>
              </CardContent>
                  </div>
                </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

        {/* Enhanced Global Styles */}
      <style jsx global>{`
        .leaflet-container {
          font-family: inherit;
        }
        
        .leaflet-tooltip {
          font-family: inherit;
          font-size: 0.875rem;
            padding: 0.75rem;
            border-radius: 0.75rem;
          border: none;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            backdrop-filter: blur(8px);
            background: rgba(255, 255, 255, 0.95);
          }
          
          .dark .leaflet-tooltip {
            background: rgba(0, 0, 0, 0.9);
            color: white;
        }
        
        .flight-path {
          animation: dash 30s linear infinite;
            filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.3));
        }
        
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
          
          .bg-grid-white {
            background-image: linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          }
      `}</style>
      </div>
    </div>
  )
}

