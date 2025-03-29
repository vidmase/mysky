"use client"

import { useState, useEffect, useRef } from "react"
import type L from "leaflet"
import "leaflet/dist/leaflet.css"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Globe, MapPin, Plane, ArrowRight } from "lucide-react"

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Globe className="h-6 w-6 mr-2 text-airport" />
            Travel Map
          </h1>
          <p className="text-muted-foreground">Visualize your journeys around the world</p>
        </div>

        <Tabs defaultValue="map" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Airport List
            </TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="space-y-4">
            <Card className="border-t-4 border-t-airport shadow-md">
              <CardContent className="p-0">
                {/* Leaflet Map Container */}
                <div
                  ref={mapContainerRef}
                  className="aspect-[16/9] rounded-md overflow-hidden"
                  style={{ height: "500px" }}
                />

                {/* Map Legend */}
                <div className="p-4 bg-muted/10 border-t">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-airport mr-2"></div>
                      <span className="text-sm">Airports ({airports.length})</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-0.5 w-4 bg-flight mr-2"></div>
                      <span className="text-sm">Flight Routes ({routes.length})</span>
                    </div>
                    <div className="flex items-center">
                      <Plane className="h-3 w-3 mr-2 text-flight" />
                      <span className="text-sm">Total Flights (42)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedAirportData && (
              <Card className="border-t-4 border-t-airport shadow-md animate-slide-up">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-airport" />
                    {selectedAirportData.name} ({selectedAirportData.code})
                  </CardTitle>
                  <CardDescription>
                    {selectedAirportData.city}, {selectedAirportData.country}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Visits</span>
                    <Badge className="bg-airport text-white">{selectedAirportData.visits}</Badge>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <Plane className="h-4 w-4 mr-1 text-flight" />
                      Connected Routes:
                    </h4>
                    <div className="space-y-2">
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
                              className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors"
                            >
                              <div className="flex items-center">
                                {isOrigin ? (
                                  <ArrowRight className="h-4 w-4 mr-1 text-flight" />
                                ) : (
                                  <ArrowRight className="h-4 w-4 mr-1 text-flight rotate-180" />
                                )}
                                <span className="font-medium">
                                  {isOrigin ? "To: " : "From: "}
                                  {connectedAirport?.city} ({connectedCode})
                                </span>
                              </div>
                              <Badge variant="outline" className="bg-flight/10 text-flight border-flight/20">
                                {route.count}x
                              </Badge>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="list">
            <Card className="border-t-4 border-t-airport shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-airport">
                  <MapPin className="h-5 w-5 mr-2" />
                  Visited Airports
                </CardTitle>
                <CardDescription>All airports you've visited on your journeys</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {airports.map((airport) => (
                    <div
                      key={airport.code}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAirport(airport.code)
                        document
                          .querySelector('[data-value="map"]')
                          ?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
                      }}
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-airport/10 flex items-center justify-center mr-3">
                          <MapPin className="h-5 w-5 text-airport" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {airport.name} ({airport.code})
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {airport.city}, {airport.country}
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-airport text-white">{airport.visits} visits</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add global styles for Leaflet customization */}
      <style jsx global>{`
        .leaflet-container {
          font-family: inherit;
        }
        
        .leaflet-tooltip {
          font-family: inherit;
          font-size: 0.875rem;
          padding: 0.5rem;
          border-radius: 0.375rem;
          border: none;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }
        
        .flight-path {
          animation: dash 30s linear infinite;
        }
        
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}</style>
    </div>
  )
}

