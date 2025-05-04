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
import mapboxgl from "mapbox-gl"
import { Pause, Play, RotateCcw } from "lucide-react"
import { Plane } from "lucide-react"
import { ArrowRight } from "lucide-react"

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
  "MAD": { lat: 40.4983, lng: -3.5676, name: "Madrid Barajas", city: "Madrid", country: "Spain" },
  "CAI": { lat: 30.1219, lng: 31.4056, name: "Cairo International Airport", city: "Cairo", country: "Egypt" },
  "HRG": { lat: 27.1783, lng: 33.7994, name: "Hurghada International Airport", city: "Hurghada", country: "Egypt" },
  "SSH": { lat: 27.9773, lng: 34.3950, name: "Sharm El Sheikh International Airport", city: "Sharm El Sheikh", country: "Egypt" },
  "LXR": { lat: 25.6710, lng: 32.7067, name: "Luxor International Airport", city: "Luxor", country: "Egypt" },
  "ASW": { lat: 23.9644, lng: 32.8198, name: "Aswan International Airport", city: "Aswan", country: "Egypt" },
  "AUE": { lat: 31.0167, lng: 31.1833, name: "Abu Simbel Airport", city: "Abu Simbel", country: "Egypt" },
  "MUH": { lat: 31.3256, lng: 27.2217, name: "Mersa Matruh International Airport", city: "Mersa Matruh", country: "Egypt" },
  "ALY": { lat: 31.1839, lng: 29.9489, name: "Alexandria International Airport", city: "Alexandria", country: "Egypt" }
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
    "Cyprus": "cy",
    "Egypt": "eg"
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

// Add this function after the calculateDistance function
const calculateFlightDuration = (distance: number): number => {
  // Average speeds for different flight phases (in km/h)
  const TAXI_TIME = 30 / 60; // 30 minutes total for taxi, takeoff, and landing procedures
  const AVG_CRUISE_SPEED = 840; // Average cruise speed for commercial flights

  // Calculate cruise time in hours
  const cruiseTime = distance / AVG_CRUISE_SPEED;

  // Total flight time including taxi, takeoff, and landing
  return cruiseTime + TAXI_TIME;
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
  totalFlightHours: number;
  longestRoute: { from: Airport; to: Airport; distance: number };
  shortestRoute: { from: Airport; to: Airport; distance: number };
  mostVisitedAirport: Airport;
  mostConnectedAirport: Airport;
  mostFlownRoute: Route;
  countriesVisited: number;
} => {
  const totalVisits = airports.reduce((sum, airport) => sum + airport.visits, 0);
  const totalRoutes = airports.reduce((sum, airport) => sum + airport.routes.length / 2, 0);
  const totalFlights = airports.reduce((sum, airport) =>
    sum + airport.routes.reduce((routeSum, route) => routeSum + route.count, 0), 0) / 2;

  // Calculate longest and shortest routes
  let longestRoute = {
    from: airports[0],
    to: airports[0],
    distance: 0
  };

  let shortestRoute = {
    from: airports[0],
    to: airports[0],
    distance: Infinity
  };

  // Find the longest and shortest distances between any two airports that have a route between them
  airports.forEach(fromAirport => {
    fromAirport.routes.forEach(route => {
      const toAirport = airports.find(a => a.code === route.to);
      if (toAirport) {
        const distance = calculateDistance(
          fromAirport.lat,
          fromAirport.lng,
          toAirport.lat,
          toAirport.lng
        );

        // Update longest route
        if (distance > longestRoute.distance) {
          longestRoute = {
            from: fromAirport,
            to: toAirport,
            distance
          };
        }

        // Update shortest route (only if it's a valid route with distance > 0)
        if (distance > 0 && distance < shortestRoute.distance) {
          shortestRoute = {
            from: fromAirport,
            to: toAirport,
            distance
          };
        }
      }
    });
  });

  // Rest of the existing calculations...
  const processedRoutes = new Set<string>();
  const totalDistance = airports.reduce((sum, fromAirport) => {
    let airportDistance = 0;
    fromAirport.routes.forEach(route => {
      const routeId = [route.from, route.to].sort().join('-');
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

  // Calculate total flight hours
  let totalFlightHours = 0;
  const processedTimeRoutes = new Set<string>();

  airports.forEach(fromAirport => {
    fromAirport.routes.forEach(route => {
      const routeId = [route.from, route.to].sort().join('-');
      if (!processedTimeRoutes.has(routeId)) {
        processedTimeRoutes.add(routeId);
        const toAirport = airports.find(a => a.code === (route.from === fromAirport.code ? route.to : route.from));
        if (toAirport) {
          const distance = calculateDistance(
            fromAirport.lat,
            fromAirport.lng,
            toAirport.lat,
            toAirport.lng
          );
          const flightDuration = calculateFlightDuration(distance);
          totalFlightHours += flightDuration * route.count;
        }
      }
    });
  });

  return {
    totalVisits,
    totalRoutes,
    totalFlights,
    totalDistance,
    totalFlightHours,
    longestRoute,
    shortestRoute,
    mostVisitedAirport,
    mostConnectedAirport,
    mostFlownRoute,
    countriesVisited
  };
};

// Add available Mapbox styles
const MAP_STYLES = [
  { label: "Day", value: "mapbox://styles/mapbox/navigation-day-v1" },
  { label: "Night", value: "mapbox://styles/mapbox/navigation-night-v1" },
  { label: "Streets", value: "mapbox://styles/mapbox/streets-v12" },
  { label: "Satellite", value: "mapbox://styles/mapbox/satellite-v9" },
  { label: "Outdoors", value: "mapbox://styles/mapbox/outdoors-v12" },
];

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
  const [flights, setFlights] = useState<any[]>([])
  const [selectedFlight, setSelectedFlight] = useState<any | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const animationRef = useRef<number | null>(null)
  const planeMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const pathLayerId = 'selected-flight-path'
  const startMarkerId = 'selected-flight-start'
  const endMarkerId = 'selected-flight-end'

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

  // Add hover interactions for flight paths
  useEffect(() => {
    if (!mapRef.current || !airports) return;
    const map = mapRef.current;

    // Helper to remove all popups
    const removePopups = () => {
      const popups = document.getElementsByClassName('mapboxgl-popup');
      while (popups[0]) popups[0].remove();
    };

    // Mouse enter handler for flight paths
    const handleFlightPathMouseEnter = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      map.getCanvas().style.cursor = 'pointer';
      removePopups();
      const feature = e.features[0];
      const { from, to, count } = feature.properties || {};
      const fromAirport = airports.find(a => a.code === from);
      const toAirport = airports.find(a => a.code === to);
      if (fromAirport && toAirport) {
        const distance = calculateDistance(fromAirport.lat, fromAirport.lng, toAirport.lat, toAirport.lng);
        new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'flight-path-popup',
          offset: 10
        })
          .setLngLat([(fromAirport.lng + toAirport.lng) / 2, (fromAirport.lat + toAirport.lat) / 2])
          .setHTML(`
            <div class="flight-tooltip">
              <div class="flight-route">
                <span class="fi fi-${getCountryCode(fromAirport.country)}" style="width:1.25rem;height:0.9375rem;"></span>
                <span>${fromAirport.code}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline h-4 w-4 mx-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                <span class="fi fi-${getCountryCode(toAirport.country)}" style="width:1.25rem;height:0.9375rem;"></span>
                <span>${toAirport.code}</span>
              </div>
              <div class="flight-count">Flights: <b>${count}</b></div>
              <div class="flight-distance">Distance: <b>${distance} km</b></div>
            </div>
          `)
          .addTo(map);
      }
    };

    // Mouse leave handler for flight paths
    const handleFlightPathMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      removePopups();
    };

    if (map.isStyleLoaded()) {
      map.on('mouseenter', 'flight-paths-layer', handleFlightPathMouseEnter);
      map.on('mouseleave', 'flight-paths-layer', handleFlightPathMouseLeave);
    } else {
      map.once('load', () => {
        map.on('mouseenter', 'flight-paths-layer', handleFlightPathMouseEnter);
        map.on('mouseleave', 'flight-paths-layer', handleFlightPathMouseLeave);
      });
    }

    return () => {
      map.off('mouseenter', 'flight-paths-layer', handleFlightPathMouseEnter);
      map.off('mouseleave', 'flight-paths-layer', handleFlightPathMouseLeave);
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

  // Add countries boundary source and layer using new Mapbox API method
  const addVisitedCountriesLayer = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    // Only add source/layer if style is loaded
    if (!map.isStyleLoaded()) {
      map.once('style.load', addVisitedCountriesLayer);
      return;
    }
    // Remove previous layers and sources if they exist
    if (map.getLayer('visited-countries-boundary')) {
      map.removeLayer('visited-countries-boundary');
    }
    if (map.getSource('countries')) {
      map.removeSource('countries');
    }
    // Fetch the countries GeoJSON and add as a source
    fetch('/countries.geojson')
      .then(res => res.json())
      .then((geojson) => {
        map.addSource('countries', {
          type: 'geojson',
          data: geojson,
        });
        // Get visited country ISO3 codes
        const visitedIsoCodes = new Set(
          airports.map(a => a.country).map(country => {
            // Try to find the matching feature in the GeoJSON by country name
            const feature = geojson.features.find((f: any) => f.properties.name === country);
            return feature ? feature.properties['ISO3166-1-Alpha-3'] : null;
          }).filter(Boolean)
        );
        // Set feature-state for visited countries
        geojson.features.forEach((feature: any) => {
          const iso3 = feature.properties['ISO3166-1-Alpha-3'];
          map.setFeatureState(
            { source: 'countries', id: feature.id || iso3 },
            { visited: visitedIsoCodes.has(iso3) }
          );
        });
        // Add the boundary layer for visited countries using feature-state
        map.addLayer({
          id: 'visited-countries-boundary',
          type: 'line',
          source: 'countries',
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'visited'], false],
              '#f59e42',
              'rgba(0,0,0,0)'
            ],
            'line-width': 2,
            'line-opacity': 0.8,
          },
        });
      });
  }, [airports]);

  // Call this function after style changes and on airports update
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const handleStyleData = () => {
      updateAirportMarkers();
      updateFlightPaths();
      addVisitedCountriesLayer();
    };
    map.on('styledata', handleStyleData);
    // Also call once on mount
    handleStyleData();
    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [updateAirportMarkers, updateFlightPaths, addVisitedCountriesLayer]);

  // Fetch flights on mount
  useEffect(() => {
    fetch('/api/flights')
      .then(res => res.json())
      .then(data => setFlights(data.sort((a: any, b: any) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime())))
      .catch(() => setFlights([]))
  }, [])

  // Animate selected flight
  useEffect(() => {
    if (!selectedFlight || !mapRef.current) return
    const map = mapRef.current
    // Remove previous path and markers
    if (map.getLayer(pathLayerId)) map.removeLayer(pathLayerId)
    if (map.getSource(pathLayerId)) map.removeSource(pathLayerId)
    if (map.getLayer(startMarkerId)) map.removeLayer(startMarkerId)
    if (map.getSource(startMarkerId)) map.removeSource(startMarkerId)
    if (map.getLayer(endMarkerId)) map.removeLayer(endMarkerId)
    if (map.getSource(endMarkerId)) map.removeSource(endMarkerId)
    if (planeMarkerRef.current) { planeMarkerRef.current.remove(); planeMarkerRef.current = null }
    setAnimationProgress(0)
    setIsPaused(false)
    setIsAnimating(true)

    // Get coordinates
    const depCode = Object.keys(airportData).find(code => selectedFlight.departure_iata === code || selectedFlight.departure_airport.includes(code) || selectedFlight.departure_airport.toLowerCase().includes(airportData[code].name.toLowerCase()))
    const arrCode = Object.keys(airportData).find(code => selectedFlight.arrival_iata === code || selectedFlight.arrival_airport.includes(code) || selectedFlight.arrival_airport.toLowerCase().includes(airportData[code].name.toLowerCase()))
    if (!depCode || !arrCode) return
    const from = airportData[depCode]
    const to = airportData[arrCode]
    const start = [from.lng, from.lat]
    const end = [to.lng, to.lat]
    // Path as straight line (could be curved for realism)
    const path = [start, end]
    // Add path layer
    map.addSource(pathLayerId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path } } })
    map.addLayer({ id: pathLayerId, type: 'line', source: pathLayerId, paint: { 'line-color': '#f59e42', 'line-width': 4, 'line-opacity': 0.9 } })
    // Add start/end markers
    map.addSource(startMarkerId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: start } } })
    map.addLayer({ id: startMarkerId, type: 'circle', source: startMarkerId, paint: { 'circle-radius': 7, 'circle-color': '#22c55e', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
    map.addSource(endMarkerId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: end } } })
    map.addLayer({ id: endMarkerId, type: 'circle', source: endMarkerId, paint: { 'circle-radius': 7, 'circle-color': '#ef4444', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } })
    // Add plane marker
    const el = document.createElement('div')
    el.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 19.5L21.5 12L2.5 4.5V10.5L17.5 12L2.5 13.5V19.5Z"/></svg>`
    el.style.transform = 'translate(-16px, -16px)'
    const marker = new mapboxgl.Marker(el).setLngLat([start[0], start[1]]).addTo(map)
    planeMarkerRef.current = marker
    // Animation
    let startTime: number | null = null
    let duration = 6000 // ms
    let reqId: number
    function animate(ts: number) {
      if (!isAnimating || isPaused) { animationRef.current = null; return }
      if (!startTime) startTime = ts
      const t = Math.min((ts - startTime) / duration, 1)
      const lng = start[0] + (end[0] - start[0]) * t
      const lat = start[1] + (end[1] - start[1]) * t
      marker.setLngLat([lng, lat])
      setAnimationProgress(t)
      if (t < 1) {
        reqId = requestAnimationFrame(animate)
        animationRef.current = reqId
      } else {
        setIsAnimating(false)
        setAnimationProgress(1)
      }
    }
    reqId = requestAnimationFrame(animate)
    animationRef.current = reqId
    // Center map
    map.fitBounds([[start[0], start[1]], [end[0], end[1]]], { padding: 100 })
    // Cleanup on unmount/flight change
    return () => {
      if (map.getLayer(pathLayerId)) map.removeLayer(pathLayerId)
      if (map.getSource(pathLayerId)) map.removeSource(pathLayerId)
      if (map.getLayer(startMarkerId)) map.removeLayer(startMarkerId)
      if (map.getSource(startMarkerId)) map.removeSource(startMarkerId)
      if (map.getLayer(endMarkerId)) map.removeLayer(endMarkerId)
      if (map.getSource(endMarkerId)) map.removeSource(endMarkerId)
      if (planeMarkerRef.current) { planeMarkerRef.current.remove(); planeMarkerRef.current = null }
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [selectedFlight])

  // Animation controls
  const handlePlay = () => { setIsPaused(false); setIsAnimating(true) }
  const handlePause = () => { setIsPaused(true); setIsAnimating(false) }
  const handleReplay = () => { setSelectedFlight(null); setTimeout(() => setSelectedFlight(selectedFlight), 100) }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Floating flight selector panel */}
      <div className="fixed top-6 right-6 z-50 bg-white/90 dark:bg-zinc-900/90 shadow-lg rounded-lg p-4 w-80 max-w-full max-h-[80vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800">
        <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Plane className="h-5 w-5 text-flight" /> Replay a Flight</h2>
        <div className="space-y-2">
          {flights.length === 0 && <div className="text-muted-foreground text-sm">No flights found.</div>}
          {flights.map((flight, idx) => {
            const dep = flight.departure_iata || (flight.departure_airport.match(/\(([A-Z]{3})\)/)?.[1]) || flight.departure_airport.slice(0,3)
            const arr = flight.arrival_iata || (flight.arrival_airport.match(/\(([A-Z]{3})\)/)?.[1]) || flight.arrival_airport.slice(0,3)
            return (
              <button
                key={flight.id || idx}
                className={`w-full text-left px-3 py-2 rounded-md border flex flex-col gap-0.5 transition-all ${selectedFlight === flight ? 'bg-flight/10 border-flight' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-flight/5'}`}
                onClick={() => setSelectedFlight(flight)}
                disabled={isAnimating && selectedFlight === flight}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5">{dep}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5">{arr}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{flight.departure_date}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{flight.airline}</span>
                  <span>{flight.flight_number}</span>
                </div>
              </button>
            )
          })}
        </div>
        {/* Animation controls */}
        {selectedFlight && (
          <div className="flex items-center gap-2 mt-4 justify-center">
            <button onClick={handlePlay} disabled={isAnimating && !isPaused} className="p-2 rounded-full bg-flight/90 text-white disabled:opacity-50"><Play className="h-4 w-4" /></button>
            <button onClick={handlePause} disabled={!isAnimating || isPaused} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:opacity-50"><Pause className="h-4 w-4" /></button>
            <button onClick={handleReplay} className="p-2 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"><RotateCcw className="h-4 w-4" /></button>
            <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-2 relative overflow-hidden">
              <div className="bg-flight h-2 rounded-full transition-all" style={{ width: `${Math.round(animationProgress * 100)}%` }} />
            </div>
          </div>
        )}
      </div>
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
                        <h3 className="text-sm font-medium text-muted-foreground">Total Airports</h3>
                        <div className="text-2xl font-bold">{airports.length}</div>
                      </Card>
                      <Card className="p-6 space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Visits</h3>
                        <div className="text-2xl font-bold">{stats.totalVisits}</div>
                      </Card>
                      <Card className="p-6 space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Routes</h3>
                        <div className="text-2xl font-bold">{stats.totalRoutes}</div>
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
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Route Statistics</h3>
                          <select
                            className="text-sm bg-muted px-2 py-1 rounded-md border border-input hover:bg-accent hover:text-accent-foreground"
                            defaultValue="longest-route"
                            onChange={(e) => {
                              const elements = document.querySelectorAll('.route-section');
                              elements.forEach(el => {
                                if (el instanceof HTMLElement) {
                                  el.style.display = el.id === e.target.value ? 'block' : 'none';
                                }
                              });
                            }}
                          >
                            <option value="longest-route">Longest Route</option>
                            <option value="shortest-route">Shortest Route</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <div id="longest-route" className="route-section">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`fi fi-${getCountryCode(stats.longestRoute.from.country)}`}
                                  style={{ width: "1.25rem", height: "0.9375rem" }} />
                                <span className="font-medium">{stats.longestRoute.from.name}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded-md">
                                  {stats.longestRoute.from.code}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pl-6">
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
                                <span className="text-sm text-muted-foreground">
                                  {new Intl.NumberFormat('en-US').format(stats.longestRoute.distance)} km
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`fi fi-${getCountryCode(stats.longestRoute.to.country)}`}
                                  style={{ width: "1.25rem", height: "0.9375rem" }} />
                                <span className="font-medium">{stats.longestRoute.to.name}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded-md">
                                  {stats.longestRoute.to.code}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div id="shortest-route" className="route-section" style={{ display: 'none' }}>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`fi fi-${getCountryCode(stats.shortestRoute.from.country)}`}
                                  style={{ width: "1.25rem", height: "0.9375rem" }} />
                                <span className="font-medium">{stats.shortestRoute.from.name}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded-md">
                                  {stats.shortestRoute.from.code}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pl-6">
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
                                <span className="text-sm text-muted-foreground">
                                  {new Intl.NumberFormat('en-US').format(stats.shortestRoute.distance)} km
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`fi fi-${getCountryCode(stats.shortestRoute.to.country)}`}
                                  style={{ width: "1.25rem", height: "0.9375rem" }} />
                                <span className="font-medium">{stats.shortestRoute.to.name}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded-md">
                                  {stats.shortestRoute.to.code}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>

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

                      <Card className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Total Hours in Air</h3>
                          <div className="text-2xl font-bold">
                            {Math.round(stats.totalFlightHours)} hours
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Including taxi, takeoff, and landing times
                        </div>
                      </Card>
                    </div>
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