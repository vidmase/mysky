"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { debounce } from "lodash"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Tab } from "@headlessui/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import type { DebouncedFunc } from "lodash"
import type { Map as LeafletMap, Layer, LayerGroup, GeoJSON } from "leaflet"
import "/node_modules/flag-icons/css/flag-icons.min.css"

// Types
type Airport = {
  code: string
  name: string
  city: string
  country: string
  lat: number
  lng: number
  visits: number
  routes: Route[]
}

type Route = {
  from: string
  to: string
  count: number
}

type Flight = {
  departure_airport: string
  arrival_airport: string
}

// Airport data with coordinates
const airportData: Record<string, { name: string; city: string; country: string; lat: number; lng: number }> = {
  "BRS": { lat: 51.3825, lng: -2.7189, name: "Bristol Airport", city: "Bristol", country: "United Kingdom" },
  "TFS": { lat: 28.0445, lng: -16.5725, name: "Tenerife South Airport", city: "Tenerife", country: "Spain" },
  "KUN": { lat: 54.9639, lng: 24.0848, name: "Kaunas Airport", city: "Kaunas", country: "Lithuania" },
  "STN": { lat: 51.8860, lng: 0.2389, name: "London Stansted", city: "London", country: "United Kingdom" },
  "RIX": { lat: 56.9236, lng: 23.9711, name: "Riga International", city: "Riga", country: "Latvia" },
  "LTN": { lat: 51.8747, lng: -0.3683, name: "London Luton", city: "London", country: "United Kingdom" },
  "VNO": { lat: 54.6341, lng: 25.2858, name: "Vilnius International", city: "Vilnius", country: "Lithuania" },
  "BGY": { lat: 45.6739, lng: 9.7042, name: "Milan Bergamo", city: "Milan", country: "Italy" },
  "CIA": { lat: 41.7994, lng: 12.5949, name: "Rome Ciampino", city: "Rome", country: "Italy" },
  "NYO": { lat: 58.7886, lng: 16.9122, name: "Stockholm Skavsta", city: "Stockholm", country: "Sweden" },
  "PSA": { lat: 43.6838, lng: 10.3927, name: "Pisa International", city: "Pisa", country: "Italy" },
  "BVA": { lat: 49.4544, lng: 2.1128, name: "Paris Beauvais", city: "Paris", country: "France" },
  "EIN": { lat: 51.4500, lng: 5.3747, name: "Eindhoven Airport", city: "Eindhoven", country: "Netherlands" },
  "CRL": { lat: 50.4592, lng: 4.4525, name: "Brussels South Charleroi", city: "Brussels", country: "Belgium" },
  "WMI": { lat: 52.4510, lng: 20.6509, name: "Warsaw Modlin", city: "Warsaw", country: "Poland" },
  "BLQ": { lat: 44.5354, lng: 11.2887, name: "Bologna Airport", city: "Bologna", country: "Italy" },
  "BCN": { lat: 41.2971, lng: 2.0785, name: "Barcelona Airport", city: "Barcelona", country: "Spain" },
  "DUB": { lat: 53.4213, lng: -6.2700, name: "Dublin Airport", city: "Dublin", country: "Ireland" },
  "LBA": { lat: 53.8659, lng: -1.6606, name: "Leeds Bradford Airport", city: "Leeds", country: "United Kingdom" },
  "SEN": { lat: 51.5714, lng: 0.6956, name: "London Southend", city: "London", country: "United Kingdom" },
  "PFO": { lat: 34.7178, lng: 32.4839, name: "Paphos International", city: "Paphos", country: "Cyprus" },
  "NAP": { lat: 40.8847, lng: 14.2908, name: "Naples International", city: "Naples", country: "Italy" },
  "PMI": { lat: 39.5517, lng: 2.7388, name: "Palma de Mallorca", city: "Palma de Mallorca", country: "Spain" },
  "BHX": { lat: 52.4537, lng: -1.7479, name: "Birmingham Airport", city: "Birmingham", country: "United Kingdom" },
  "GRO": { lat: 41.9007, lng: 2.7606, name: "Girona-Costa Brava", city: "Girona", country: "Spain" },
  "LGW": { lat: 51.1537, lng: -0.1821, name: "London Gatwick", city: "London", country: "United Kingdom" },
  "GVA": { lat: 46.2370, lng: 6.1091, name: "Geneva Airport", city: "Geneva", country: "Switzerland" },
  "ALC": { lat: 38.2822, lng: -0.5581, name: "Alicante Airport", city: "Alicante", country: "Spain" },
  "MAD": { lat: 40.4983, lng: -3.5676, name: "Madrid Barajas", city: "Madrid", country: "Spain" }
}

// Add this helper function near the top of the file, after the types
const getCountryCode = (country: string): string => {
  // Normalize the country name to handle any case issues
  const normalizedCountry = country.trim();

  const countryMap: Record<string, string> = {
    "United Kingdom": "gb",
    "Lithuania": "lt",
    "Latvia": "lv",
    "Spain": "es",
    "Italy": "it",
    "Sweden": "se",
    "France": "fr",
    "Netherlands": "nl",
    "Belgium": "be",
    "Poland": "pl",
    "Ireland": "ie",
    "Switzerland": "ch",
    "Cyprus": "cy"
  };

  const code = countryMap[normalizedCountry];
  if (!code) {
    console.warn(`No country code mapping found for: ${normalizedCountry}`);
  }
  return code || normalizedCountry.toLowerCase().slice(0, 2);
};

export default function MapPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // State
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null)
  const [airports, setAirports] = useState<Airport[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("map")

  // Refs for map elements
  const mapRef = useRef<LeafletMap | null>(null)
  const pathLayerGroupRef = useRef<LayerGroup | null>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)

  // Process flight data
  const processFlightData = useCallback((flights: Flight[]) => {
    const airportMap = new Map<string, Airport>();
    const routeMap = new Map<string, number>();

    // Helper function to extract IATA code from airport string
    const extractIATACode = (airportString: string) => {
      const match = airportString.match(/\(([A-Z]{3})\)/);
      if (match) return match[1];

      // If no IATA code in parentheses, try to find the matching airport by name
      const normalizedName = airportString.toLowerCase().trim();
      for (const [code, data] of Object.entries(airportData)) {
        if (data.name.toLowerCase().includes(normalizedName) ||
          data.city.toLowerCase().includes(normalizedName)) {
          return code;
        }
      }
      return airportString;
    };

    // Helper function to get normalized route key
    const getRouteKey = (from: string, to: string) => {
      const fromCode = extractIATACode(from);
      const toCode = extractIATACode(to);
      // Sort codes to ensure consistent key regardless of direction
      return [fromCode, toCode].sort().join('-');
    };

    // First pass: Create airports and count visits
    flights.forEach((flight) => {
      const depCode = extractIATACode(flight.departure_airport);
      const arrCode = extractIATACode(flight.arrival_airport);

      // Process departure airport
      if (!airportMap.has(depCode)) {
        const airportInfo = airportData[depCode] || {
          name: flight.departure_airport.split(' (')[0],
          city: flight.departure_airport.split(' (')[0],
          country: '',
          lat: 0,
          lng: 0
        };

        airportMap.set(depCode, {
          code: depCode,
          name: airportInfo.name,
          city: airportInfo.city,
          country: airportInfo.country,
          lat: airportInfo.lat,
          lng: airportInfo.lng,
          visits: 1,
          routes: []
        });
      } else {
        const airport = airportMap.get(depCode)!;
        airport.visits++;
      }

      // Process arrival airport
      if (!airportMap.has(arrCode)) {
        const airportInfo = airportData[arrCode] || {
          name: flight.arrival_airport.split(' (')[0],
          city: flight.arrival_airport.split(' (')[0],
          country: '',
          lat: 0,
          lng: 0
        };

        airportMap.set(arrCode, {
          code: arrCode,
          name: airportInfo.name,
          city: airportInfo.city,
          country: airportInfo.country,
          lat: airportInfo.lat,
          lng: airportInfo.lng,
          visits: 1,
          routes: []
        });
      } else {
        const airport = airportMap.get(arrCode)!;
        airport.visits++;
      }

      // Process route (count both directions)
      const routeKey = getRouteKey(flight.departure_airport, flight.arrival_airport);
      routeMap.set(routeKey, (routeMap.get(routeKey) || 0) + 1);
    });

    // Convert maps to arrays and sort airports by visits
    const airportArray = Array.from(airportMap.values())
      .filter(airport => airport.code in airportData) // Only include airports we have data for
      .sort((a, b) => b.visits - a.visits);

    // Process routes and assign them to airports
    const routeArray: Route[] = [];
    routeMap.forEach((count, key) => {
      const [airport1, airport2] = key.split('-');

      // Only include routes where both airports are in our airportData
      if (airport1 in airportData && airport2 in airportData) {
        // Create routes in both directions
        routeArray.push({ from: airport1, to: airport2, count });
        if (airport1 !== airport2) {
          routeArray.push({ from: airport2, to: airport1, count });
        }
      }
    });

    // Sort routes by count
    routeArray.sort((a, b) => b.count - a.count);

    // Add routes to airports
    airportArray.forEach(airport => {
      airport.routes = routeArray
        .filter(route => route.from === airport.code)
        .sort((a, b) => b.count - a.count);
    });

    return { airports: airportArray, routes: routeArray };
  }, []);

  // Create flight path helper
  const createFlightPath = useCallback((
    fromAirport: Airport,
    toAirport: Airport,
    route: Route,
    map: LeafletMap,
    isHighlighted: boolean = false
  ) => {
    if (typeof window === 'undefined' || !leafletRef.current) return null;
    const L = leafletRef.current;

    // Calculate distance and midpoint for arc height
    const distance = map.distance(
      [fromAirport.lat, fromAirport.lng],
      [toAirport.lat, toAirport.lng]
    );

    // Dynamic curve intensity based on distance
    const curveIntensity = Math.min(0.3, distance / 3000000);
    const numPoints = Math.max(100, Math.min(200, distance / 5000));

    // Generate curved path points
    const points: [number, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;

      // Start and end points
      const startLat = fromAirport.lat;
      const startLng = fromAirport.lng;
      const endLat = toAirport.lat;
      const endLng = toAirport.lng;

      // Calculate curved point
      const lat = startLat * (1 - t) + endLat * t;
      const lng = startLng * (1 - t) + endLng * t;

      // Add altitude curve using sine wave
      const alt = Math.sin(t * Math.PI) * curveIntensity;
      const latOffset = alt * (endLat - startLat);
      const lngOffset = alt * (endLng - startLng);

      points.push([lat + latOffset, lng + lngOffset]);
    }

    // Create the path with animation
    const path = L.polyline(points, {
      color: "hsl(var(--color-flight))",
      weight: 3,
      opacity: 0.9,
      className: "flight-path animate-draw",
      interactive: true,
      smoothFactor: 1,
    });

    // Add interactivity
    path
      .bindTooltip(
        `<div class="flight-tooltip">
          <div class="flight-route">
            <span class="fi fi-${getCountryCode(fromAirport.country)}" style="margin-right: 4px;"></span>
            ${route.from} → 
            <span class="fi fi-${getCountryCode(toAirport.country)}" style="margin-left: 4px;"></span>
            ${route.to}
          </div>
          <div class="flight-count">
            ${route.count} flight${route.count > 1 ? 's' : ''}
          </div>
          <div class="flight-distance">
            ${Math.round(distance / 1000)}km
          </div>
        </div>`,
        {
          permanent: false,
          direction: 'top',
          className: 'custom-tooltip'
        }
      );

    return path;
  }, []);

  // Debounced path update function
  const updatePaths = useMemo(() => debounce((filterAirport?: string) => {
    if (!mapRef.current || !pathLayerGroupRef.current || !leafletRef.current || typeof window === 'undefined') return;

    const map = mapRef.current;
    const layerGroup = pathLayerGroupRef.current;
    const L = leafletRef.current;

    // Clear existing paths
    layerGroup.clearLayers();

    // Filter routes if needed
    const routesToDraw = filterAirport
      ? routes.filter((route) => route.from === filterAirport || route.to === filterAirport)
      : routes;

    // Batch path creation
    const paths: Layer[] = [];
    routesToDraw.forEach((route) => {
      const fromAirport = airports.find((a) => a.code === route.from);
      const toAirport = airports.find((a) => a.code === route.to);

      if (fromAirport && toAirport) {
        const path = createFlightPath(fromAirport, toAirport, route, map, !!filterAirport);
        if (path) {
          paths.push(path);
        }
      }
    });

    // Add all paths at once
    layerGroup.addLayer(L.layerGroup(paths));
  }, 100) as DebouncedFunc<(filterAirport?: string) => void>, [routes, airports, createFlightPath]);

  // Fetch flight data
  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session?.user) {
          router.push("/login")
          return
        }

        const { data: flights, error: flightsError } = await supabase
          .from("vidmaflights")
          .select("departure_airport, arrival_airport")

        if (flightsError) {
          throw flightsError
        }

        const { airports: processedAirports, routes: processedRoutes } = processFlightData(flights)
        setAirports(processedAirports)
        setRoutes(processedRoutes)
        setLoading(false)
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "Error fetching flights",
          description: "Please try again later",
          variant: "destructive",
        })
      }
    }

    fetchFlights()
  }, [supabase, router, toast, processFlightData])

  // Initialize map
  useEffect(() => {
    let map: LeafletMap | null = null;
    let layerGroup: LayerGroup | null = null;

    const initMap = async () => {
      if (typeof window === "undefined" || activeTab !== "map") return

      // Clean up existing map instance if it exists
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        pathLayerGroupRef.current = null
      }

      try {
        const L = await import("leaflet")
        leafletRef.current = L.default

        // Create map instance
        map = L.default.map("map", {
          center: [20, 0],
          zoom: 2,
          minZoom: 2,
          maxZoom: 8,
          maxBounds: L.default.latLngBounds(L.default.latLng(-90, -180), L.default.latLng(90, 180)),
          maxBoundsViscosity: 1.0,
          zoomControl: false,
          attributionControl: false,
        })

        // Add custom map tiles
        L.default.tileLayer("https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}", {
          id: "mapbox/light-v11",
          tileSize: 512,
          zoomOffset: -1,
          accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        }).addTo(map)

        // Get unique visited countries
        const visitedCountries = new Set(airports.map(airport => airport.country));

        // Fetch and add GeoJSON data for country borders
        const response = await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
        const geoData = await response.json();

        // Add GeoJSON layer with custom styling
        L.default.geoJSON(geoData, {
          style: (feature) => ({
            fillColor: visitedCountries.has(feature?.properties?.ADMIN) ? 'hsl(var(--color-flight))' : 'transparent',
            fillOpacity: visitedCountries.has(feature?.properties?.ADMIN) ? 0.1 : 0,
            weight: visitedCountries.has(feature?.properties?.ADMIN) ? 1.5 : 0.5,
            color: visitedCountries.has(feature?.properties?.ADMIN) ? 'hsl(var(--color-flight))' : '#666',
            opacity: visitedCountries.has(feature?.properties?.ADMIN) ? 0.8 : 0.2
          }),
          interactive: true,
          onEachFeature: (feature, layer) => {
            if (visitedCountries.has(feature?.properties?.ADMIN)) {
              layer.on({
                mouseover: (e) => {
                  const geoJSONLayer = e.target as GeoJSON;
                  geoJSONLayer.setStyle({
                    fillOpacity: 0.3,
                    weight: 2,
                    opacity: 1
                  });
                },
                mouseout: (e) => {
                  const geoJSONLayer = e.target as GeoJSON;
                  geoJSONLayer.setStyle({
                    fillOpacity: 0.1,
                    weight: 1.5,
                    opacity: 0.8
                  });
                }
              });
            }
          }
        }).addTo(map);

        // Create layer group for paths (but don't add any paths initially)
        layerGroup = L.default.layerGroup().addTo(map)

        // Store references
        mapRef.current = map
        pathLayerGroupRef.current = layerGroup

        // Add markers for all airports
        airports.forEach(airport => {
          if (!map) return;

          const marker = L.default.circleMarker([airport.lat, airport.lng], {
            radius: 5,
            fillColor: "hsl(var(--color-flight))",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).bindTooltip(
            `<div class="marker-tooltip">
              <div class="font-medium">${airport.name}</div>
              <div class="text-sm text-muted-foreground">${airport.code}</div>
              <div class="text-xs text-muted-foreground">${airport.visits} visits</div>
            </div>`,
            {
              direction: 'top',
              className: 'custom-tooltip',
              permanent: false,
              offset: [0, -10],
              opacity: 1
            }
          );

          let currentPaths: Layer[] = [];

          marker.on({
            mouseover: () => {
              if (!map) return;

              // Clear existing paths
              pathLayerGroupRef.current?.clearLayers();

              // Find all routes for this airport
              const airportRoutes = routes.filter(route =>
                route.from === airport.code || route.to === airport.code
              );

              // Draw routes for this airport
              airportRoutes.forEach(route => {
                const fromAirport = airports.find(a => a.code === route.from);
                const toAirport = airports.find(a => a.code === route.to);
                if (fromAirport && toAirport && map) {
                  const path = createFlightPath(fromAirport, toAirport, route, map, true);
                  if (path) {
                    currentPaths.push(path);
                    pathLayerGroupRef.current?.addLayer(path);
                  }
                }
              });

              // Highlight the marker
              marker.setStyle({
                radius: 7,
                fillOpacity: 1,
                weight: 3
              });
            },
            mouseout: (e) => {
              const relatedTarget = e.originalEvent?.relatedTarget as HTMLElement;
              // Only clear paths if we're not hovering over a path or tooltip
              if (!relatedTarget?.closest('.leaflet-tooltip') &&
                !relatedTarget?.closest('.flight-path')) {
                // Clear flight paths
                pathLayerGroupRef.current?.clearLayers();
                currentPaths = [];

                // Reset marker style
                marker.setStyle({
                  radius: 5,
                  fillOpacity: 0.8,
                  weight: 2
                });
              }
            },
            click: () => {
              if (!map) return;
              // Zoom to airport
              map.setView([airport.lat, airport.lng], 6, {
                animate: true,
                duration: 1
              });
            }
          });

          marker.addTo(map);
        });

        // Add zoom control
        L.default.control.zoom({
          position: "bottomright"
        }).addTo(map)

      } catch (error) {
        console.error("Error initializing map:", error)
      }
    }

    initMap()

    // Cleanup function
    return () => {
      if (map) {
        map.remove()
        mapRef.current = null
        pathLayerGroupRef.current = null
      }
    }
  }, [activeTab, airports, routes, createFlightPath])

  // If user is not authenticated, show login prompt
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push("/login")
      }
    }

    checkAuth()
  }, [supabase, router])

  // Add global styles for map
  const mapStyles = `
    .leaflet-container {
      background: #f8f9fa;
    }

    .leaflet-tile-pane {
      filter: saturate(1.1) hue-rotate(-5deg);
    }

    .leaflet-popup-content-wrapper {
      background: white;
      color: #333;
      border: none;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .leaflet-popup-tip {
      background: white;
      border: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .custom-tooltip {
      background: white;
      color: #333;
      border: none;
      border-radius: 8px;
      padding: 0.75rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .marker-tooltip {
      text-align: center;
    }

    .flight-path {
      stroke: hsl(var(--color-flight));
      stroke-linecap: round;
      stroke-linejoin: round;
      filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.1));
    }

    .animate-draw {
      animation: draw 1.5s ease-out forwards;
      stroke-dasharray: 1000;
      stroke-dashoffset: 1000;
    }

    @keyframes draw {
      to {
        stroke-dashoffset: 0;
      }
    }

    .flight-path:hover {
      filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.2));
    }
  `

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Tabs defaultValue="map" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="list">Airport List</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="space-y-4">
          <div className="aspect-video rounded-lg border bg-background">
            <div id="map" className="h-full w-full" />
          </div>
        </TabsContent>
        <TabsContent value="list">
          <div className="space-y-4">
            <div className="grid gap-4">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </Card>
                ))
              ) : (
                airports
                  .sort((a, b) => b.visits - a.visits)
                  .map((airport: Airport) => (
                    <Card
                      key={airport.code}
                      className={cn(
                        "group relative p-6 hover:bg-muted/50 transition-all duration-300 cursor-pointer border-l-4",
                        selectedAirport === airport.code
                          ? "bg-muted border-l-primary"
                          : "border-l-transparent hover:border-l-primary/50"
                      )}
                      onClick={() => setSelectedAirport(selectedAirport === airport.code ? null : airport.code)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`fi fi-${getCountryCode(airport.country)}`}
                                style={{ width: "1.5rem", height: "1.125rem" }}
                                title={airport.country} />
                              <h3 className="font-semibold text-lg tracking-tight">
                                {airport.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md">
                                {airport.code}
                              </span>
                              {airport.country && (
                                <span className="flex items-center gap-2">
                                  <span>•</span>
                                  {airport.country}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/80"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (mapRef.current) {
                                  mapRef.current.setView([airport.lat, airport.lng], 6)
                                }
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                              >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span className="sr-only">Show on map</span>
                            </Button>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4 text-muted-foreground"
                              >
                                <path d="M12 20v-6M6.8 20h10.4" />
                                <path d="M22 7.5V14l-2 1-4.5-2.5-6.5 2.5-3-1V7.5l3 1 6.5-2.5 4.5 2.5 2-1z" />
                              </svg>
                              <span>{airport.visits}</span>
                            </div>
                          </div>
                        </div>
                        {selectedAirport === airport.code && airport.routes.length > 0 && (
                          <div className="mt-4 space-y-3 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                              >
                                <path d="M12 2l4.5 11h5.5l-4.5 5 2 6-7.5-4.5-7.5 4.5 2-6-4.5-5h5.5l4.5-11z" />
                              </svg>
                              Connected Routes
                            </div>
                            <div className="grid gap-2">
                              {airport.routes.map((route) => {
                                const otherAirport = airports.find(
                                  (a) => a.code === (route.from === airport.code ? route.to : route.from)
                                )
                                return (
                                  <div
                                    key={`${route.from}-${route.to}`}
                                    className="flex items-center justify-between rounded-lg bg-background/50 p-2 text-sm hover:bg-background transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`fi fi-${getCountryCode(airport.country)}`}
                                          style={{ width: "1.25rem", height: "0.9375rem" }}
                                          title={airport.country} />
                                        <span>{airport.code}</span>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-4 w-4 text-muted-foreground"
                                        >
                                          <path d="M5 12h14" />
                                          <path d="m12 5 7 7-7 7" />
                                        </svg>
                                        <span className={`fi fi-${getCountryCode(otherAirport?.country || '')}`}
                                          style={{ width: "1.25rem", height: "0.9375rem" }}
                                          title={otherAirport?.country} />
                                        <span>{otherAirport?.code}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="h-4 w-4"
                                      >
                                        <path d="M16 22h2c.5 0 1-.2 1.4-.6.4-.4.6-.9.6-1.4V7.5L14.5 2H6c-.5 0-1 .2-1.4.6C4.2 3 4 3.5 4 4v3" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <path d="M10 12h2v6" />
                                        <path d="M12 12c-3.3 0-6 2.7-6 6s2.7 6 6 6c2.2 0 4.1-1.2 5.2-3" />
                                      </svg>
                                      {route.count}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        .leaflet-container {
          background: hsl(var(--background));
        }

        .fi {
          display: inline-block;
          vertical-align: middle;
          background-size: contain;
          background-position: 50%;
          background-repeat: no-repeat;
          position: relative;
          box-shadow: 0 0 1px rgba(0,0,0,0.2);
          border-radius: 2px;
        }

        .leaflet-popup-content-wrapper {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius);
        }

        .leaflet-popup-tip {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
        }

        .custom-tooltip {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius);
          padding: 0.5rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          box-shadow: var(--shadow);
        }

        .flight-tooltip {
          text-align: center;
        }

        .flight-route {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .flight-count,
        .flight-distance {
          color: hsl(var(--muted-foreground));
          font-size: 0.75rem;
          line-height: 1rem;
        }
        
        .flight-path {
          transition: all 0.2s ease;
        }

        .plane-icon {
          transition: all 0.3s ease;
        }

        ${mapStyles}
      `}</style>
    </div>
  )
}




