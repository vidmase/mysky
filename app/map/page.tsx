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
import "/node_modules/flag-icons/css/flag-icons.min.css"
import "mapbox-gl/dist/mapbox-gl.css"
import mapboxgl from "mapbox-gl"

// Types
interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  visits: number;
  routes: Route[];
}

interface Route {
  id: string;
  from: string;
  to: string;
  count: number;
}

interface Flight {
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

// Function to get unique visited countries
const getVisitedCountries = (airports: Airport[]): Set<string> => {
  const countryNameMap: Record<string, string> = {
    "United Kingdom": "United Kingdom of Great Britain and Northern Ireland",
    "Ireland": "Ireland",
    "Cyprus": "Cyprus",
    "Switzerland": "Switzerland",
    "Lithuania": "Lithuania",
    "Spain": "Spain"
  };

  return new Set(airports.map(airport => countryNameMap[airport.country] || airport.country));
};

// Update the color function to return a string instead of Color array
const getArcColor = (count: number): string => {
  // Color gradient based on flight count
  const scale = Math.min(1, count / 10); // Normalize count to 0-1 range
  const r = Math.round(103 + scale * (0 - 103));
  const g = Math.round(232 + scale * (165 - 232));
  const b = Math.round(249 + scale * (233 - 249));
  return `rgba(${r}, ${g}, ${b}, 0.7)`;
};

// Add type for the feature
interface FlightPathFeature {
  type: 'Feature';
  properties: {
    from: string;
    to: string;
    count: number;
    hover_airport: string | null;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

// Add the Haversine distance calculation function
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c); // Return rounded kilometers
};

// Update the calculateTotalDistance function
const calculateTotalDistance = (airport: Airport, airports: Airport[]): number => {
  let totalDistance = 0;
  const processedRoutes = new Set<string>();

  airport.routes.forEach(route => {
    // Create a unique route identifier that's the same regardless of direction
    const routeId = [route.from, route.to].sort().join('-');

    // Only process each route once
    if (!processedRoutes.has(routeId)) {
      processedRoutes.add(routeId);

      const otherAirport = airports.find(a =>
        a.code === (route.from === airport.code ? route.to : route.from)
      );

      if (otherAirport) {
        const distance = calculateDistance(
          airport.lat, airport.lng,
          otherAirport.lat, otherAirport.lng
        );
        totalDistance += distance * route.count;
      }
    }
  });

  return totalDistance;
};

// Update the calculateStatistics function
const calculateStatistics = (airports: Airport[]): {
  totalVisits: number;
  totalRoutes: number;
  totalFlights: number;
  totalDistance: number;
  mostVisitedAirport: Airport;
  mostConnectedAirport: Airport;
  mostFlownRoute: Route;
  countriesVisited: number;
} => {
  const totalVisits = airports.reduce((sum, airport) => sum + airport.visits, 0);
  const totalRoutes = airports.reduce((sum, airport) => sum + airport.routes.length / 2, 0);
  const totalFlights = airports.reduce((sum, airport) =>
    sum + airport.routes.reduce((routeSum, route) => routeSum + route.count, 0), 0) / 2;

  // Improved total distance calculation
  const processedRoutes = new Set<string>();
  const totalDistance = airports.reduce((sum, fromAirport) => {
    let airportDistance = 0;
    fromAirport.routes.forEach(route => {
      // Create a unique route identifier that's the same regardless of direction
      const routeId = [route.from, route.to].sort().join('-');

      // Only process each route once
      if (!processedRoutes.has(routeId)) {
        processedRoutes.add(routeId);

        const toAirport = airports.find(a => a.code === (route.from === fromAirport.code ? route.to : route.from));
        if (toAirport) {
          const distance = calculateDistance(
            fromAirport.lat,
            fromAirport.lng,
            toAirport.lat,
            toAirport.lng
          );
          // Multiply distance by the number of flights on this route
          airportDistance += distance * route.count;
        }
      }
    });
    return sum + airportDistance;
  }, 0);

  const mostVisitedAirport = airports.reduce((max, airport) =>
    airport.visits > (max?.visits || 0) ? airport : max, airports[0]);

  const mostConnectedAirport = airports.reduce((max, airport) =>
    airport.routes.length > (max?.routes.length || 0) ? airport : max, airports[0]);

  // Find the most flown route
  const routeMap = new Map<string, number>();
  airports.forEach(airport => {
    airport.routes.forEach(route => {
      const routeId = [route.from, route.to].sort().join('-');
      if (!routeMap.has(routeId)) {
        routeMap.set(routeId, route.count);
      }
    });
  });

  const [mostFlownRouteId, mostFlownCount] = Array.from(routeMap.entries())
    .reduce(([maxId, maxCount], [id, count]) =>
      count > maxCount ? [id, count] : [maxId, maxCount],
      ['', 0]
    );

  const [from, to] = mostFlownRouteId.split('-');
  const mostFlownRoute = { id: mostFlownRouteId, from, to, count: mostFlownCount };

  const countriesVisited = new Set(airports.map(airport => airport.country)).size;

  return {
    totalVisits,
    totalRoutes,
    totalFlights,
    totalDistance,
    mostVisitedAirport,
    mostConnectedAirport,
    mostFlownRoute,
    countriesVisited
  };
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
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  // Process flight data
  const processFlightData = useCallback((flights: Flight[]) => {
    const airportMap = new Map<string, Airport>();
    const routeMap = new Map<string, number>();
    const visitedCountries = new Set<string>();

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
      if (depCode in airportData) {
        if (!airportMap.has(depCode)) {
          airportMap.set(depCode, {
            code: depCode,
            name: airportData[depCode].name,
            city: airportData[depCode].city,
            country: airportData[depCode].country,
            lat: airportData[depCode].lat,
            lng: airportData[depCode].lng,
            visits: 1,
            routes: []
          });
        } else {
          const airport = airportMap.get(depCode)!;
          airport.visits++;
        }
      }

      // Process arrival airport
      if (arrCode in airportData) {
        if (!airportMap.has(arrCode)) {
          airportMap.set(arrCode, {
            code: arrCode,
            name: airportData[arrCode].name,
            city: airportData[arrCode].city,
            country: airportData[arrCode].country,
            lat: airportData[arrCode].lat,
            lng: airportData[arrCode].lng,
            visits: 1,
            routes: []
          });
        } else {
          const airport = airportMap.get(arrCode)!;
          airport.visits++;
        }
      }

      // Process route
      if (depCode in airportData && arrCode in airportData) {
        const routeKey = getRouteKey(depCode, arrCode);
        routeMap.set(routeKey, (routeMap.get(routeKey) || 0) + 1);
      }
    });

    // Convert maps to arrays and sort airports by visits
    const airportArray = Array.from(airportMap.values())
      .sort((a, b) => b.visits - a.visits);

    // Process routes and assign them to airports
    const routeArray: Route[] = [];
    routeMap.forEach((count, key) => {
      const [airport1, airport2] = key.split('-');
      routeArray.push({ id: key, from: airport1, to: airport2, count });
      if (airport1 !== airport2) {
        routeArray.push({ id: key, from: airport2, to: airport1, count });
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

  // Update the createFlightPath function signature
  const createFlightPath = useCallback((
    fromAirport: Airport,
    toAirport: Airport,
    route: Route,
    map: mapboxgl.Map,
    isHighlighted: boolean = false
  ) => {
    // Remove the map parameter since it's not used in this function
    if (typeof window === 'undefined') return null;

    // Create a GeoJSON feature for the flight path
    const feature = {
      type: 'Feature' as const,
      properties: {
        from: route.from,
        to: route.to,
        count: route.count,
        isHighlighted
      },
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [fromAirport.lng, fromAirport.lat],
          [toAirport.lng, toAirport.lat]
        ]
      }
    };

    return feature;
  }, []);

  // Update the updatePaths function
  const updatePaths = useMemo(() => debounce((filterAirport?: string) => {
    if (!mapRef.current || typeof window === 'undefined') return;

    const map = mapRef.current;

    // Filter routes if needed
    const routesToDraw = filterAirport
      ? routes.filter((route) => route.from === filterAirport || route.to === filterAirport)
      : routes;

    // Create GeoJSON features for all paths
    const features = routesToDraw.flatMap((route) => {
      const fromAirport = airports.find((a) => a.code === route.from);
      const toAirport = airports.find((a) => a.code === route.to);

      if (fromAirport && toAirport) {
        const path = createFlightPath(fromAirport, toAirport, route, map, !!filterAirport);
        return path ? [path] : [];
      }
      return [];
    });

    // Update the source data if it exists
    const source = map.getSource('flights-paths') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      });
    }
  }, 100), [routes, airports, createFlightPath]);

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

  // Update the updateFlightPaths function
  const updateFlightPaths = useCallback(() => {
    const map = mapRef.current;
    if (!map || !airports || airports.length === 0) return;

    console.log('Updating flight paths...'); // Debug log

    // Create features for all flight paths
    const features = airports.flatMap((airport: Airport) => {
      console.log(`Processing routes for airport ${airport.code}, routes:`, airport.routes); // Debug log
      return airport.routes
        .map((route) => {
          const otherAirport = airports.find((a: Airport) =>
            a.code === (route.from === airport.code ? route.to : route.from)
          );

          if (!otherAirport) return null;

          const feature: GeoJSON.Feature = {
            type: 'Feature',
            properties: {
              from: route.from,
              to: route.to,
              count: route.count,
              hover_airport: null
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [airport.lng, airport.lat],
                [otherAirport.lng, otherAirport.lat]
              ]
            }
          };

          return feature;
        })
        .filter((feature): feature is GeoJSON.Feature => feature !== null);
    });

    console.log('Created features:', features); // Debug log

    // Update the source data
    const source = map.getSource('flight-paths') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features
      });
    } else {
      console.log('Flight paths source not found!'); // Debug log
    }
  }, [airports]);

  // Update the map initialization
  useEffect(() => {
    if (mapContainerRef.current === null || mapRef.current !== null) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [-0.118092, 51.509865], // London
      zoom: 5
    });

    mapRef.current = map;

    map.on('load', () => {
      console.log('Map style loaded, initializing layers...'); // Debug log

      // Add flight paths source
      map.addSource('flight-paths', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Add flight paths layer
      map.addLayer({
        id: 'flight-paths-layer',
        type: 'line',
        source: 'flight-paths',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          'visibility': 'visible'
        },
        paint: {
          'line-color': [
            'case',
            ['any',
              ['==', ['get', 'from'], ['get', 'hover_airport']],
              ['==', ['get', 'to'], ['get', 'hover_airport']]
            ],
            '#3b82f6', // Bright blue for connected routes
            '#94a3b8'  // Gray for other routes
          ],
          'line-width': [
            'case',
            ['any',
              ['==', ['get', 'from'], ['get', 'hover_airport']],
              ['==', ['get', 'to'], ['get', 'hover_airport']]
            ],
            3,  // Thicker for connected routes
            1.5 // Normal for other routes
          ],
          'line-opacity': [
            'case',
            ['any',
              ['==', ['get', 'from'], ['get', 'hover_airport']],
              ['==', ['get', 'to'], ['get', 'hover_airport']]
            ],
            0.8, // More visible for connected routes
            0.4  // Less visible for other routes
          ]
        }
      });

      // Update flight paths if we have data
      if (airports && airports.length > 0) {
        console.log('Airports data available, updating flight paths...'); // Debug log
        updateFlightPaths();
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add effect to update flight paths when airports data changes
  useEffect(() => {
    if (!mapRef.current || !airports || airports.length === 0) return;

    const map = mapRef.current;
    if (map.isStyleLoaded()) {
      console.log('Map style is loaded, updating flight paths...'); // Debug log
      updateFlightPaths();
    } else {
      console.log('Waiting for map style to load...'); // Debug log
      map.once('load', () => {
        console.log('Map style loaded, updating flight paths...'); // Debug log
        updateFlightPaths();
      });
    }
  }, [airports, updateFlightPaths]);

  // Function to update airport markers
  const updateAirportMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !airports || airports.length === 0) return;

    // Create GeoJSON features for airports
    const airportFeatures = airports.map(airport => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [airport.lng, airport.lat]
      },
      properties: {
        id: airport.code,
        name: airport.name,
        code: airport.code,
        visits: airport.visits,
        lat: airport.lat,
        lng: airport.lng
      }
    }));

    // Add or update the airports source
    if (!map.getSource('airports')) {
      map.addSource('airports', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: airportFeatures
        }
      });
    } else {
      (map.getSource('airports') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: airportFeatures
      });
    }

    // Add the airports layer if it doesn't exist
    if (!map.getLayer('airports-layer')) {
      map.addLayer({
        id: 'airports-layer',
        type: 'circle',
        source: 'airports',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'visits'],
            1, 6,    // minimum size for 1 visit
            10, 8,  // medium size for 10 visits
            50, 10   // maximum size for 50+ visits
          ],
          'circle-color': '#0ea5e9', // Light blue color
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff', // White border
          'circle-opacity': 0.7
        }
      });

      // Update the other instance of airport labels layer
      if (!map.getLayer('airport-labels')) {
        map.addLayer({
          id: 'airport-labels',
          type: 'symbol',
          source: 'airports',
          layout: {
            'text-field': ['get', 'code'],  // Show only airport code
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'visibility': 'none'  // Hide labels completely
          },
          paint: {
            'text-color': '#1e293b',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
            'text-opacity': 1
          }
        });
      }
    }
  }, [airports]);

  // Update markers when airports data changes
  useEffect(() => {
    if (!mapRef.current || !airports || airports.length === 0) return;

    const map = mapRef.current;

    if (map.isStyleLoaded()) {
      console.log('Map style is loaded, updating airport markers immediately');
      updateAirportMarkers();
    } else {
      console.log('Waiting for map style to load...');
      map.once('load', () => {
        console.log('Map style loaded, updating airport markers');
        updateAirportMarkers();
      });
    }
  }, [airports, updateAirportMarkers]);

  // Update hover interactions for airports
  useEffect(() => {
    if (!mapRef.current || !airports) return;

    const map = mapRef.current;

    const handleMouseEnter = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';

        const feature = e.features[0];
        const airportCode = feature.properties?.code;

        if (airportCode) {
          // Update the hover_airport property in the source data
          const source = map.getSource('flight-paths') as mapboxgl.GeoJSONSource;
          if (source) {
            const data = source.serialize().data;
            if (data && typeof data === 'object' && 'features' in data) {
              source.setData({
                type: 'FeatureCollection',
                features: (data.features as any[]).map(f => ({
                  ...f,
                  properties: {
                    ...f.properties,
                    hover_airport: airportCode
                  }
                }))
              });
            }
          }

          // Show popup with airport info and connected routes
          const airport = airports.find(a => a.code === airportCode);
          if (airport) {
            const connectedRoutes = airport.routes.length;
            const totalKm = calculateTotalDistance(airport, airports);
            const formattedDistance = new Intl.NumberFormat('en-US').format(totalKm);

            new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              className: 'airport-popup',
              offset: [0, -10]
            })
              .setLngLat([airport.lng, airport.lat])
              .setHTML(`
                <div class="airport-tooltip">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="fi fi-${getCountryCode(airport.country)}"
                          style="width: 1.25rem; height: 0.9375rem;"
                          title="${airport.country}"></span>
                    <span class="font-medium">${airport.name}</span>
                  </div>
                  <div class="text-sm text-muted-foreground">
                    <span class="font-mono bg-muted px-1.5 py-0.5 rounded-md">${airport.code}</span>
                    <span class="mx-1">•</span>
                    ${airport.visits} visit${airport.visits !== 1 ? 's' : ''}
                    <span class="mx-1">•</span>
                    ${connectedRoutes} route${connectedRoutes !== 1 ? 's' : ''}
                    <span class="mx-1">•</span>
                    ${formattedDistance} km total
                  </div>
                </div>
              `)
              .addTo(map);
          }
        }
      }
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';

      // Reset the hover_airport property
      const source = map.getSource('flight-paths') as mapboxgl.GeoJSONSource;
      if (source) {
        const data = source.serialize().data;
        if (data && typeof data === 'object' && 'features' in data) {
          source.setData({
            type: 'FeatureCollection',
            features: (data.features as any[]).map(f => ({
              ...f,
              properties: {
                ...f.properties,
                hover_airport: null
              }
            }))
          });
        }
      }

      // Remove all popups
      const popups = document.getElementsByClassName('mapboxgl-popup');
      while (popups[0]) {
        popups[0].remove();
      }
    };

    if (map.isStyleLoaded()) {
      map.on('mouseenter', 'airports-layer', handleMouseEnter);
      map.on('mouseleave', 'airports-layer', handleMouseLeave);
    } else {
      map.once('load', () => {
        map.on('mouseenter', 'airports-layer', handleMouseEnter);
        map.on('mouseleave', 'airports-layer', handleMouseLeave);
      });
    }

    // Cleanup
    return () => {
      map.off('mouseenter', 'airports-layer', handleMouseEnter);
      map.off('mouseleave', 'airports-layer', handleMouseLeave);
    };
  }, [airports]);

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

    .airport-popup .mapboxgl-popup-content {
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      padding: 0.75rem;
      font-family: var(--font-sans);
    }
    
    .airport-tooltip {
      min-width: 200px;
    }
    
    .airport-tooltip .airport-name {
      font-size: 1rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
  `

  // Update the flyToAirport function
  const flyToAirport = (airport: string) => {
    if (!mapRef.current || !(airport in airportData)) return;

    const { lat, lng } = airportData[airport];
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: 8,
      essential: true
    });
  };

  // Update map view when selected airport changes
  useEffect(() => {
    if (selectedAirport && mapRef.current) {
      const { lat, lng } = airportData[selectedAirport];
      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 8,
        essential: true
      });
    }
  }, [selectedAirport]);

  // Function to update visited countries highlighting
  const updateVisitedCountries = useCallback(() => {
    const map = mapRef.current;
    if (!map || !airports || airports.length === 0) return;

    console.log('Updating visited countries...');

    // Get unique visited countries
    const visitedCountries = Array.from(getVisitedCountries(airports));
    console.log(`Found ${visitedCountries.length} visited countries:`, visitedCountries);

    // Create filters for both layers using proper Mapbox expressions
    const nameFilter = [
      'match',
      ['get', 'name_en'],
      [
        'United Kingdom of Great Britain and Northern Ireland',
        'Ireland',
        'Cyprus',
        'Switzerland',
        'Lithuania',
        'Spain'
      ],
      true,
      false
    ] as mapboxgl.FilterSpecification;

    const isoFilter = [
      'match',
      ['get', 'iso_3166_1_alpha_3'],
      ['GBR', 'IRL', 'CYP', 'CHE', 'LTU', 'ESP'],
      true,
      false
    ] as mapboxgl.FilterSpecification;

    if (map.getLayer('visited-countries')) {
      map.setFilter('visited-countries', nameFilter);
    }
    if (map.getLayer('visited-countries-border')) {
      map.setFilter('visited-countries-border', isoFilter);
    }
  }, [airports]);

  // Update visited countries when airports data changes
  useEffect(() => {
    if (!mapRef.current || !airports || airports.length === 0) return;

    const map = mapRef.current;

    if (map.isStyleLoaded()) {
      console.log('Map style is loaded, updating visited countries immediately');
      updateVisitedCountries();
    } else {
      console.log('Waiting for map style to load...');
      map.once('load', () => {
        console.log('Map style loaded, updating visited countries');
        updateVisitedCountries();
      });
    }
  }, [airports, updateVisitedCountries]);

  // Add hover effect for visited countries
  useEffect(() => {
    if (!mapRef.current || !airports) return;

    const map = mapRef.current;

    const handleMouseEnter = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        map.getCanvas().style.cursor = 'pointer';

        const countryName = e.features[0].properties?.name_en;
        if (countryName) {
          // Highlight the hovered country
          map.setPaintProperty('visited-countries', 'fill-opacity', [
            'case',
            ['==', ['get', 'name_en'], countryName],
            0.3, // Hovered opacity
            0.1  // Default opacity
          ]);
        }
      }
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      map.setPaintProperty('visited-countries', 'fill-opacity', 0.1);
    };

    if (map.isStyleLoaded()) {
      map.on('mouseenter', 'visited-countries', handleMouseEnter);
      map.on('mouseleave', 'visited-countries', handleMouseLeave);
    } else {
      map.once('load', () => {
        map.on('mouseenter', 'visited-countries', handleMouseEnter);
        map.on('mouseleave', 'visited-countries', handleMouseLeave);
      });
    }

    // Cleanup
    return () => {
      map.off('mouseenter', 'visited-countries', handleMouseEnter);
      map.off('mouseleave', 'visited-countries', handleMouseLeave);
    };
  }, [airports]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Tabs defaultValue="map" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="list">Airport List</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="space-y-4">
          <div className="relative w-full h-[calc(100vh-4rem)]">
            <div ref={mapContainerRef} className="w-full h-full" />
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
                                  mapRef.current.flyTo({ center: [airport.lat, airport.lng], zoom: 4 })
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
        <TabsContent value="stats" className="space-y-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-8 w-[100px] mb-4" />
                  <Skeleton className="h-6 w-[60px]" />
                </Card>
              ))}
            </div>
          ) : (
            <>
              {airports.length > 0 && (() => {
                const stats = calculateStatistics(airports);
                return (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Card className="p-6 space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Visits</h3>
                        <div className="text-2xl font-bold">{stats.totalVisits}</div>
                      </Card>
                      <Card className="p-6 space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Routes</h3>
                        <div className="text-2xl font-bold">{stats.totalRoutes}</div>
                      </Card>
                      <Card className="p-6 space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Flights</h3>
                        <div className="text-2xl font-bold">{stats.totalFlights}</div>
                      </Card>
                      <Card className="p-6 space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Countries Visited</h3>
                        <div className="text-2xl font-bold">{stats.countriesVisited}</div>
                      </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold">Most Visited Airport</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`fi fi-${getCountryCode(stats.mostVisitedAirport.country)}`}
                              style={{ width: "1.5rem", height: "1.125rem" }}
                              title={stats.mostVisitedAirport.country} />
                            <span className="font-medium">{stats.mostVisitedAirport.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md">
                              {stats.mostVisitedAirport.code}
                            </span>
                            <span>•</span>
                            <span>{stats.mostVisitedAirport.visits} visits</span>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold">Most Connected Airport</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`fi fi-${getCountryCode(stats.mostConnectedAirport.country)}`}
                              style={{ width: "1.5rem", height: "1.125rem" }}
                              title={stats.mostConnectedAirport.country} />
                            <span className="font-medium">{stats.mostConnectedAirport.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md">
                              {stats.mostConnectedAirport.code}
                            </span>
                            <span>•</span>
                            <span>{stats.mostConnectedAirport.routes.length} routes</span>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <Card className="p-6 space-y-4">
                      <h3 className="text-lg font-semibold">Most Flown Route</h3>
                      {stats.mostFlownRoute && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className={`fi fi-${getCountryCode(airports.find(a => a.code === stats.mostFlownRoute.from)?.country || '')}`}
                                style={{ width: "1.25rem", height: "0.9375rem" }} />
                              <span className="font-mono">{stats.mostFlownRoute.from}</span>
                            </div>
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
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                            <div className="flex items-center gap-2">
                              <span className={`fi fi-${getCountryCode(airports.find(a => a.code === stats.mostFlownRoute.to)?.country || '')}`}
                                style={{ width: "1.25rem", height: "0.9375rem" }} />
                              <span className="font-mono">{stats.mostFlownRoute.to}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
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
                            {stats.mostFlownRoute.count} flights
                          </div>
                        </div>
                      )}
                    </Card>

                    <Card className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Total Distance Flown</h3>
                        <div className="text-2xl font-bold">
                          {new Intl.NumberFormat('en-US').format(stats.totalDistance)} km
                        </div>
                      </div>
                    </Card>
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        ${mapStyles}
        @keyframes dash {
          to {
            stroke-dashoffset: -7;
          }
        }

        .mapboxgl-canvas {
          animation: dash 1s linear infinite;
        }

        .flight-path-connected {
          animation: dash 1s linear infinite;
          stroke-dasharray: 4, 3;
        }
      `}</style>
    </div>
  )
}