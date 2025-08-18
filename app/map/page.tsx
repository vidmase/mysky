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
import "flag-icons/css/flag-icons.min.css"
import mapboxgl from "mapbox-gl"
import { Pause, Play, RotateCcw, RefreshCcw } from "lucide-react"
import { Plane } from "lucide-react"
import { ArrowRight } from "lucide-react"
import { ChartContainer } from "@/components/ui/chart"
import {
  PieChart,
  Pie,
  Cell,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend as ReLegend,
} from "recharts"
import { useUnifiedStatistics } from "@/lib/statistics"

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
  id: number
  passenger_name: string
  reservation_number: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_date: string
  departure_time: string
  arrival_time: string
  total_receipt: string
  purchased_date: string
  purchase_time: string
  airline: string | null
  arrival_country: string | null
  arrival_iata: string | null
  departure_iata: string | null
  seat: string | null
  notes: string | null
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
  "PLQ": { lat: 55.9733, lng: 21.0939, name: "Palanga International", city: "Palanga", country: "Lithuania" },
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
  "ALY": { lat: 31.1839, lng: 29.9489, name: "Alexandria International Airport", city: "Alexandria", country: "Egypt" },
  "CFU": { lat: 39.6019, lng: 19.9117, name: "Corfu International Airport", city: "Corfu", country: "Greece" }
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
    "Egypt": "eg",
    "Greece": "gr",
    "Malta": "mt"
  };

  const code = countryMap[normalizedCountry];
  if (!code) {
    console.warn(`No country code mapping found for: ${normalizedCountry}`);
    // Better fallback: try to generate a reasonable country code
    const fallback = normalizedCountry.toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove non-alphabetic chars
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .slice(0, 2);
    return fallback || 'xx';
  }
  return code;
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
  // Align with backend and /stats: 0.5h taxi + cruise at 840km/h
  const TAXI_TIME = 0.5;
  const AVG_CRUISE_SPEED = 840;
  return distance / AVG_CRUISE_SPEED + TAXI_TIME;
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
  console.log('calculateStatistics called with airports:', airports.length);
  
  try {
    // Early return for empty airports
    if (airports.length === 0) {
      console.log('calculateStatistics: No airports, returning empty stats');
      return {
        totalVisits: 0,
        totalRoutes: 0,
        totalFlights: 0,
        totalDistance: 0,
        totalFlightHours: 0,
        longestRoute: { from: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, to: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, distance: 0 },
        shortestRoute: { from: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, to: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, distance: 0 },
        mostVisitedAirport: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] },
        mostConnectedAirport: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] },
        mostFlownRoute: { id: '', from: '', to: '', count: 0 },
        countriesVisited: 0
      };
    }

      console.log('calculateStatistics: Starting calculations with', airports.length, 'airports');
    console.log('Sample airport:', airports[0]);
    
    const totalVisits = airports.reduce((sum, airport) => sum + airport.visits, 0);
    console.log('Total visits calculated:', totalVisits);
    
    const totalRoutes = airports.reduce((sum, airport) => sum + airport.routes.length / 2, 0);
    console.log('Total routes calculated:', totalRoutes);
    
    const totalFlights = airports.reduce((sum, airport) =>
      sum + airport.routes.reduce((routeSum, route) => routeSum + route.count, 0), 0) / 2;
    console.log('Total flights calculated:', totalFlights);

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
          // Unified duration model
          const flightDuration = calculateFlightDuration(distance);
          totalFlightHours += flightDuration * route.count;
        }
      }
    });
  });

    const result = {
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
    
    console.log('calculateStatistics result:', result);
    console.log('Total visits:', totalVisits, 'Total routes:', totalRoutes, 'Countries visited:', countriesVisited);
    return result;
  } catch (error) {
    console.error('Error in calculateStatistics:', error);
    // Return default values on error
    return {
      totalVisits: 0,
      totalRoutes: 0,
      totalFlights: 0,
      totalDistance: 0,
      totalFlightHours: 0,
      longestRoute: { from: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, to: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, distance: 0 },
      shortestRoute: { from: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, to: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, distance: 0 },
      mostVisitedAirport: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] },
      mostConnectedAirport: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] },
      mostFlownRoute: { id: '', from: '', to: '', count: 0 },
      countriesVisited: 0
    };
  }
};

// Add available Mapbox styles
const MAP_STYLES = [
  { label: "Day", value: "mapbox://styles/mapbox/navigation-day-v1" },
  { label: "Night", value: "mapbox://styles/mapbox/navigation-night-v1" },
  { label: "Streets", value: "mapbox://styles/mapbox/streets-v12" },
  { label: "Satellite", value: "mapbox://styles/mapbox/satellite-v9" },
  { label: "Outdoors", value: "mapbox://styles/mapbox/outdoors-v12" },
];

// Helper to calculate bearing between two points
function getBearing(start: [number, number], end: [number, number]) {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  const [lng1, lat1] = start;
  const [lng2, lat2] = end;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}

// Simulate a typical commercial flight profile
function getFlightProfile(durationMs: number) {
  // Phases: takeoff (0-10%), climb (10-25%), cruise (25-75%), descent (75-90%), landing (90-100%)
  return [
    { pct: 0.0,   speed: 0,    alt: 0,      phase: 'Takeoff' },
    { pct: 0.10,  speed: 160,  alt: 2000,   phase: 'Climb' },
    { pct: 0.25,  speed: 250,  alt: 12000,  phase: 'Climb' },
    { pct: 0.30,  speed: 450,  alt: 35000,  phase: 'Cruise' },
    { pct: 0.75,  speed: 470,  alt: 37000,  phase: 'Cruise' },
    { pct: 0.90,  speed: 250,  alt: 12000,  phase: 'Descent' },
    { pct: 0.97,  speed: 160,  alt: 2000,   phase: 'Landing' },
    { pct: 1.0,   speed: 0,    alt: 0,      phase: 'Landed' },
  ];
}

function interpolateProfile(profile: any[], t: number) {
  for (let i = 1; i < profile.length; i++) {
    if (t <= profile[i].pct) {
      const prev = profile[i-1], next = profile[i];
      const localT = (t - prev.pct) / (next.pct - prev.pct);
      return {
        speed: Math.round(prev.speed + (next.speed - prev.speed) * localT),
        alt: Math.round(prev.alt + (next.alt - prev.alt) * localT),
        phase: localT < 0.5 ? prev.phase : next.phase
      };
    }
  }
  return { speed: 0, alt: 0, phase: 'Landed' };
}

export default function MapPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Use unified statistics system
  const { statistics: unifiedStats, loading: statsLoading, error: statsError, refetch: refetchStats } = useUnifiedStatistics()

  // State
  const [selectedAirport, setSelectedAirport] = useState<string | null>(null)
  const [airports, setAirports] = useState<Airport[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("map")
  const [flights, setFlights] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<string>('disconnected')
  const [forceUpdateKey, setForceUpdateKey] = useState<number>(0)

  // Refs for map elements
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  // Create a dependency key that changes when airports really change
  const airportsKey = useMemo(() => {
    return `${airports.length}-${airports.map(a => `${a.code}:${a.visits}`).join(',').slice(0, 100)}`;
  }, [airports]);

  // Map unified statistics to the format expected by the map page
  const stats = useMemo(() => {
    if (!unifiedStats) {
      return {
        totalVisits: 0,
        totalRoutes: 0,
        totalFlights: 0,
        totalDistance: 0,
        totalFlightHours: 0,
        longestRoute: { from: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, to: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, distance: 0 },
        shortestRoute: { from: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, to: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, distance: 0 },
        mostVisitedAirport: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] },
        mostConnectedAirport: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] },
        mostFlownRoute: { id: '', from: '', to: '', count: 0 },
        countriesVisited: 0
      };
    }

    // Convert unified statistics to map page format
    return {
      totalVisits: unifiedStats.totalVisits || 0,
      totalRoutes: unifiedStats.totalRoutes || 0,
      totalFlights: unifiedStats.totalFlights || 0,
      totalDistance: unifiedStats.totalKilometers || 0,
      totalFlightHours: unifiedStats.hoursInAir || 0,
      longestRoute: unifiedStats.longestRoute ? {
        from: { 
          code: unifiedStats.longestRoute.from.iata || '', 
          name: unifiedStats.longestRoute.from.name || '', 
          city: '', 
          country: '', 
          lat: 0, 
          lng: 0, 
          visits: 0, 
          routes: [] 
        },
        to: { 
          code: unifiedStats.longestRoute.to.iata || '', 
          name: unifiedStats.longestRoute.to.name || '', 
          city: '', 
          country: '', 
          lat: 0, 
          lng: 0, 
          visits: 0, 
          routes: [] 
        },
        distance: unifiedStats.longestRoute.distance_km || 0
      } : { from: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, to: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, distance: 0 },
      shortestRoute: { from: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, to: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, distance: 0 }, // Not available in unified stats
      mostVisitedAirport: unifiedStats.mostVisitedAirport ? {
        code: unifiedStats.mostVisitedAirport.iata || '',
        name: unifiedStats.mostVisitedAirport.name || '',
        city: '',
        country: '',
        lat: 0,
        lng: 0,
        visits: unifiedStats.mostVisitedAirport.visits || 0,
        routes: []
      } : { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] },
      mostConnectedAirport: { code: '', name: '', city: '', country: '', lat: 0, lng: 0, visits: 0, routes: [] }, // Not available in unified stats
      mostFlownRoute: unifiedStats.mostFlownRoute ? {
        id: `${unifiedStats.mostFlownRoute.from.iata}-${unifiedStats.mostFlownRoute.to.iata}`,
        from: unifiedStats.mostFlownRoute.from.iata || '',
        to: unifiedStats.mostFlownRoute.to.iata || '',
        count: unifiedStats.mostFlownRoute.count || 0
      } : { id: '', from: '', to: '', count: 0 },
      countriesVisited: unifiedStats.totalCountries || 0
    };
  }, [unifiedStats]);

  // Memoized chart data
  const chartData = useMemo(() => {
    console.log('Recalculating chart data, flights length:', flights.length);
    
    const countryData = airports.reduce<{ country: string; visits: number }[]>((acc, airport) => {
      const found = acc.find((a) => a.country === airport.country);
      if (found) found.visits += airport.visits;
      else acc.push({ country: airport.country, visits: airport.visits });
      return acc;
    }, []);

    const flightsByYear = flights.reduce<{ year: string; count: number }[]>((acc, flight) => {
      const date = flight.departure_date ? new Date(flight.departure_date) : null;
      if (!date) return acc;
      const year = date.getFullYear().toString();
      const found = acc.find((a) => a.year === year);
      if (found) found.count++;
      else acc.push({ year, count: 1 });
      return acc;
    }, []).sort((a, b) => a.year.localeCompare(b.year));

    const airlineData = flights.reduce<{ airline: string; count: number }[]>((acc, flight) => {
      const airline = flight.airline || "Unknown";
      const found = acc.find((a) => a.airline === airline);
      if (found) found.count++;
      else acc.push({ airline, count: 1 });
      return acc;
    }, []);

    // Enhanced: sort, group, label, accessible colors
    // 1. Sort countries by visits descending
    let sortedCountryData = [...countryData].sort((a, b) => b.visits - a.visits);
    // 2. Group countries with <3 flights into 'Other'
    const grouped = sortedCountryData.filter(c => c.visits < 3);
    let displayCountryData = sortedCountryData.filter(c => c.visits >= 3);
    if (grouped.length > 0) {
      const otherTotal = grouped.reduce((sum, c) => sum + c.visits, 0);
      displayCountryData.push({ country: 'Other', visits: otherTotal });
    }

    return {
      countryData: displayCountryData,
      flightsByYear,
      airlineData,
      grouped,
      totalFlights: displayCountryData.reduce((sum, c) => sum + c.visits, 0)
    };
  }, [airports, flights, forceUpdateKey]);

  // Process flight data
  const processFlightData = useCallback((flights: Flight[]) => {
    console.log('processFlightData called with flights:', flights.length);
    const airportMap = new Map<string, Airport>();
    const routeMap = new Map<string, number>();
    const visitedCountries = new Set<string>();

    // Helper function to extract IATA code from airport string or use database IATA
    const extractIATACode = (airportString: string, flight: Flight, isArrival: boolean = false) => {
      // First, try to use the IATA codes from the database
      const iataCode = isArrival ? flight.arrival_iata : flight.departure_iata;
      if (iataCode && iataCode.length === 3) {
        return iataCode;
      }
      
      // Fallback: extract from airport string
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
    const getRouteKey = (flight: Flight) => {
      const fromCode = extractIATACode(flight.departure_airport, flight, false);
      const toCode = extractIATACode(flight.arrival_airport, flight, true);
      // Sort codes to ensure consistent key regardless of direction
      return [fromCode, toCode].sort().join('-');
    };

    // First pass: Create airports and count visits
    flights.forEach((flight) => {
      const depCode = extractIATACode(flight.departure_airport, flight, false);
      const arrCode = extractIATACode(flight.arrival_airport, flight, true);

      // Process departure airport - include all airports, not just those in hardcoded data
      if (depCode && depCode.length === 3) {
        if (!airportMap.has(depCode)) {
          const airportInfo = airportData[depCode];
          airportMap.set(depCode, {
            code: depCode,
            name: airportInfo?.name || flight.departure_airport || `Airport ${depCode}`,
            city: airportInfo?.city || 'Unknown City',
            country: airportInfo?.country || 'Unknown Country',
            lat: airportInfo?.lat || 0,
            lng: airportInfo?.lng || 0,
            visits: 1,
            routes: []
          });
          
          // Log when we encounter an airport not in our hardcoded data
          if (!airportInfo) {
            console.warn(`Airport ${depCode} not found in hardcoded data, using fallback data`);
          }
        } else {
          const airport = airportMap.get(depCode)!;
          airport.visits++;
        }
      }

      // Process arrival airport - include all airports, not just those in hardcoded data
      if (arrCode && arrCode.length === 3) {
        if (!airportMap.has(arrCode)) {
          const airportInfo = airportData[arrCode];
          airportMap.set(arrCode, {
            code: arrCode,
            name: airportInfo?.name || flight.arrival_airport || `Airport ${arrCode}`,
            city: airportInfo?.city || 'Unknown City',
            country: airportInfo?.country || 'Unknown Country',
            lat: airportInfo?.lat || 0,
            lng: airportInfo?.lng || 0,
            visits: 1,
            routes: []
          });
          
          // Log when we encounter an airport not in our hardcoded data
          if (!airportInfo) {
            console.warn(`Airport ${arrCode} not found in hardcoded data, using fallback data`);
          }
        } else {
          const airport = airportMap.get(arrCode)!;
          airport.visits++;
        }
      }

      // Process route - include all valid IATA codes
      if (depCode && arrCode && depCode.length === 3 && arrCode.length === 3) {
        const routeKey = getRouteKey(flight);
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

    console.log('processFlightData result - airports:', airportArray.length, 'routes:', routeArray.length);
    console.log('Sample airports:', airportArray.slice(0, 3));

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

    // Create GeoJSON features for all paths with valid coordinates
    const features = routesToDraw.flatMap((route) => {
      const fromAirport = airports.find((a) => a.code === route.from);
      const toAirport = airports.find((a) => a.code === route.to);

      if (fromAirport && toAirport && 
          fromAirport.lat !== 0 && fromAirport.lng !== 0 && 
          toAirport.lat !== 0 && toAirport.lng !== 0) {
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

  // Extract fetchUserFlights so it can be used by both useEffect and manual refresh
  const fetchUserFlights = useCallback(async (skipLoading = false) => {
    if (!skipLoading) {
      setIsRefreshing(true);
    }
    console.log('Fetching user flights...');
    
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data?.session;
      if (!session?.user) {
        console.log('No session found');
        setFlights([]);
        setAirports([]);
        setRoutes([]);
        return;
      }
      
      console.log('Current user ID:', session.user.id);
      console.log('Session email:', session.user.email);
      
      // Add cache-busting parameter to ensure fresh data
      const result = await supabase
        .from('vidmaflights')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('departure_date', { ascending: true });
        
      if (result.error) {
        console.error('Error fetching flights:', result.error);
        setFlights([]);
        setAirports([]);
        setRoutes([]);
        return;
      }
      
      console.log('Fetched flights count:', result.data?.length);
      console.log('Flight IDs:', result.data?.map(f => f.id));
      
      setFlights(result.data || []);
      // Also update airports/routes for the map
      const { airports: processedAirports, routes: processedRoutes } = processFlightData(result.data || []);
      console.log('Processed airports:', processedAirports.length, 'routes:', processedRoutes.length);
      
      // Force state updates by creating new arrays
      setAirports([...processedAirports]);
      setRoutes([...processedRoutes]);
      setLastUpdate(new Date());
      setForceUpdateKey(prev => prev + 1); // Force re-render
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUserFlights:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [supabase, processFlightData]);

  // Fetch flight data
  useEffect(() => {
    let channel: any = null;
    let isSubscribed = true;
    
    const setupRealtimeSubscription = async () => {
      try {
        // Initial fetch
        await fetchUserFlights(true);
        
        // Get session for realtime subscription
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || !isSubscribed) return;
        
        console.log('Setting up realtime subscription for user:', session.user.id);
        
        // Subscribe to realtime changes
        channel = supabase.channel(`realtime-flights-${session.user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'vidmaflights',
              filter: `owner_id=eq.${session.user.id}`
            },
            (payload) => {
              console.log('Real-time database change detected:', {
                eventType: payload.eventType,
                table: payload.table,
                schema: payload.schema,
                new: payload.new,
                old: payload.old
              });
              
              // Refetch data on any change
              if (isSubscribed) {
                fetchUserFlights(true);
              }
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
            setRealtimeStatus(status);
          });
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };
    
    setupRealtimeSubscription();
    
    return () => {
      isSubscribed = false;
      if (channel) {
        console.log('Unsubscribing from realtime channel');
        channel.unsubscribe();
      }
    };
  }, [fetchUserFlights, supabase]);

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

  // Function to update airport markers (move this up so it's defined before use)
  const updateAirportMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !airports || airports.length === 0) return;

    // Ensure the style is loaded before adding sources/layers
    if (!map.isStyleLoaded()) {
      map.once('load', () => {
        // Re-run once the style has loaded
        updateAirportMarkers();
      });
      return;
    }

    // Create GeoJSON features for airports with valid coordinates
    const airportFeatures = airports
      .filter(airport => airport.lat !== 0 && airport.lng !== 0) // Only include airports with valid coordinates
      .map(airport => ({
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

  // Update map initialization to depend on activeTab
  useEffect(() => {
    if (activeTab !== "map") return;
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
            '#3b82f6',
            '#94a3b8'
          ],
          'line-width': [
            'case',
            ['any',
              ['==', ['get', 'from'], ['get', 'hover_airport']],
              ['==', ['get', 'to'], ['get', 'hover_airport']]
            ],
            3,
            1.5
          ],
          'line-opacity': [
            'case',
            ['any',
              ['==', ['get', 'from'], ['get', 'hover_airport']],
              ['==', ['get', 'to'], ['get', 'hover_airport']]
            ],
            0.8,
            0.4
          ]
        }
      });

      // Register hover events for flight paths
      const removePopups = () => {
        const popups = document.getElementsByClassName('mapboxgl-popup');
        while (popups[0]) popups[0].remove();
      };
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
      const handleFlightPathMouseLeave = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
        map.getCanvas().style.cursor = '';
        removePopups();
      };
      map.on('mouseenter', 'flight-paths-layer', handleFlightPathMouseEnter);
      map.on('mouseleave', 'flight-paths-layer', handleFlightPathMouseLeave);
      if (airports && airports.length > 0) {
        updateFlightPaths();
        // Initialize airport markers once the style is loaded
        updateAirportMarkers();
      }
      // Register click event for airports-layer to show statistics popup
      map.on('click', 'airports-layer', (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (!props) return;
        const airportCode = props.code;
        const airport = airports.find(a => a.code === airportCode);
        if (!airport) return;
        new mapboxgl.Popup({ closeButton: true, className: 'airport-popup', offset: 12 })
          .setLngLat([airport.lng, airport.lat])
          .setHTML(`
            <div class="airport-tooltip">
              <div class="airport-name">${airport.name}</div>
              <div class="airport-meta">
                <span class="fi fi-${getCountryCode(airport.country)}" style="width:1.25rem;height:0.9375rem;"></span>
                <span class="airport-code">${airport.code}</span>
                <span class="airport-city">${airport.city}</span>
                <span class="airport-country">${airport.country}</span>
              </div>
              <div class="airport-visits">Flights from this airport: <b>${airport.visits}</b></div>
            </div>
          `)
          .addTo(map);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeTab]);

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
    const handleFlightPathMouseLeave = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
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
      background: rgba(30,41,59,0.97); /* slate-900, high contrast */
      color: #fff;
      border-radius: 1rem;
      box-shadow: 0 6px 32px 0 rgba(0,0,0,0.18), 0 1.5px 6px 0 rgba(0,0,0,0.12);
      padding: 1.1rem 1.3rem 1.1rem 1.3rem;
      min-width: 220px;
      max-width: 320px;
      font-family: var(--font-sans, 'Inter', 'Segoe UI', Arial, sans-serif);
      transition: box-shadow 0.2s, transform 0.2s, background 0.2s;
      font-size: 1rem;
      position: relative;
      opacity: 0.98;
      border: none;
      animation: tooltip-pop 0.18s cubic-bezier(.4,1.4,.6,1) both;
    }
    .flight-tooltip:hover {
      box-shadow: 0 10px 40px 0 rgba(30,41,59,0.22), 0 2px 8px 0 rgba(0,0,0,0.16);
      background: rgba(30,41,59,1);
      transform: scale(1.025);
      color: #fff;
    }
    @keyframes tooltip-pop {
      0% { opacity: 0; transform: scale(0.95); }
      100% { opacity: 0.98; transform: scale(1); }
    }
    .flight-tooltip .flight-route {
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 1.08rem;
      letter-spacing: 0.01em;
      color: #fbbf24;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4em;
    }
    .flight-tooltip .flight-route svg {
      color: #38bdf8;
      margin: 0 0.2em;
    }
    .flight-tooltip .flight-count, .flight-tooltip .flight-distance {
      color: #e0e7ef;
      font-size: 0.93rem;
      margin-bottom: 0.1rem;
      font-weight: 500;
      letter-spacing: 0.01em;
      text-shadow: 0 1px 2px rgba(0,0,0,0.10);
    }
    .flight-tooltip .flight-count b, .flight-tooltip .flight-distance b {
      color: #38bdf8;
      font-weight: 700;
    }
    .flight-tooltip .fi {
      box-shadow: none;
      border-radius: 3px;
      border: 1px solid #334155;
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

  // Add/update countries layers safely (idempotent)
  const addVisitedCountriesLayer = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    // Only add source/layer if style is loaded
    if (!map.isStyleLoaded()) {
      map.once('style.load', addVisitedCountriesLayer);
      return;
    }
    // Fetch the countries GeoJSON and add as a source if missing
    fetch('/countries.geojson')
      .then(res => res.json())
      .then((geojson) => {
        // Re-check map instance and style; guard against unmount/style reloads
        const mapInstance = mapRef.current;
        if (!mapInstance || !mapInstance.getStyle()) return;
        if (!mapInstance.getSource('countries')) {
          mapInstance.addSource('countries', {
            type: 'geojson',
            data: geojson,
          });
        }
        // Get visited country ISO3 codes
        const visitedIsoCodes = new Set(
          airports.map(a => a.country).map(country => {
            // Try to find the matching feature in the GeoJSON by country name
            const feature = geojson.features.find((f: any) => f.properties.name === country);
            return feature ? feature.properties['ISO3166-1-Alpha-3'] : null;
          }).filter(Boolean)
        );
        // Convert visited set to array for use in filter
        const visitedIsoArray = Array.from(visitedIsoCodes) as string[];

        // Add or update fill layer for visited countries
        if (!map.getLayer('visited-countries')) {
        mapInstance.addLayer({
            id: 'visited-countries',
            type: 'fill',
          source: 'countries',
            filter: [
              'in',
              ['get', 'ISO3166-1-Alpha-3'],
              ['literal', visitedIsoArray]
            ],
            paint: {
              'fill-color': '#f59e42',
              'fill-opacity': 0.12
            }
          });
        } else {
          map.setFilter('visited-countries', [
            'in',
            ['get', 'ISO3166-1-Alpha-3'],
            ['literal', visitedIsoArray]
          ]);
          map.setPaintProperty('visited-countries', 'fill-opacity', 0.12);
        }

        // Add or update boundary line layer for visited countries
        if (!mapInstance.getLayer('visited-countries-boundary')) {
          mapInstance.addLayer({
            id: 'visited-countries-boundary',
            type: 'line',
            source: 'countries',
            filter: [
              'in',
              ['get', 'ISO3166-1-Alpha-3'],
              ['literal', visitedIsoArray]
            ],
            paint: {
              'line-color': '#f59e42',
              'line-width': 2,
              'line-opacity': 0.8,
            },
          });
        } else {
          mapInstance.setFilter('visited-countries-boundary', [
            'in',
            ['get', 'ISO3166-1-Alpha-3'],
            ['literal', visitedIsoArray]
          ]);
        }
        // Apply choropleth coloring by visit counts
        updateVisitedCountriesChoropleth(geojson);
      });
  }, [airports]);

  // Helpers for country choropleth coloring
  const getCountryVisitCounts = (geojson: any) => {
    try {
      if (!geojson || !Array.isArray(geojson.features)) return new Map<string, number>();
      const nameToIso3 = new Map<string, string>();
      for (const f of geojson.features) {
        const props = (f && f.properties) ? f.properties : {};
        const name = props?.name as string | undefined;
        const iso = props?.['ISO3166-1-Alpha-3'] as string | undefined;
        if (name && iso) nameToIso3.set(name, iso);
      }
      const counts = new Map<string, number>();
      for (const a of airports) {
        const iso3 = nameToIso3.get(a.country);
        if (!iso3) continue;
        counts.set(iso3, (counts.get(iso3) ?? 0) + a.visits);
      }
      return counts;
    } catch (e) {
      console.error('getCountryVisitCounts error:', e);
      return new Map<string, number>();
    }
  };

  const colorForCount = (c: number) => {
    if (c >= 25) return '#b91c1c';
    if (c >= 15) return '#dc2626';
    if (c >= 8) return '#ef4444';
    if (c >= 4) return '#f87171';
    if (c >= 2) return '#fca5a5';
    if (c >= 1) return '#fecaca';
    return '#e5e7eb';
  };

  const updateVisitedCountriesChoropleth = (geojson: any) => {
    try {
      const map = mapRef.current;
      if (!map) return;
      const counts = getCountryVisitCounts(geojson);
      const stops: (string | number)[] = [];
      for (const [iso3, c] of counts.entries()) {
        stops.push(iso3, colorForCount(c));
      }
      if (map.getLayer('visited-countries')) {
        if (stops.length >= 2) {
          map.setPaintProperty(
            'visited-countries',
            'fill-color',
            ['match', ['get', 'ISO3166-1-Alpha-3'], ...stops, '#e5e7eb']
          );
        } else {
          // Fallback when there are no stops yet
          map.setPaintProperty('visited-countries', 'fill-color', '#e5e7eb');
        }
        map.setPaintProperty('visited-countries', 'fill-opacity', 0.55);
        if (!map.getLayer('visited-countries-boundary')) {
          map.addLayer({
            id: 'visited-countries-boundary',
            type: 'line',
            source: 'countries',
            paint: { 'line-color': '#334155', 'line-width': 0.5, 'line-opacity': 0.8 },
          });
        }
      }
    } catch (e) {
      console.error('updateVisitedCountriesChoropleth error:', e);
    }
  };

  // Reactively update choropleth when airports change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('countries') as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    // Access the current data from the source
    const data: any = (src as any)._data || (src as any).serialize?.()?.data || (src as any).getData?.() || undefined;
    if (data) updateVisitedCountriesChoropleth(data);
  }, [airports]);

  // Airports heatmap source/layer
  const buildAirportsHeatmap = (apts: Airport[]): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: apts
      .filter(a => Number.isFinite(a.lat) && Number.isFinite(a.lng))
      .map(a => ({
        type: 'Feature',
        properties: { code: a.code, name: a.name, country: a.country, visits: a.visits },
        geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
      })),
  } as GeoJSON.FeatureCollection);

  const addAirportsHeatmapLayer = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (!map.isStyleLoaded()) {
      map.once('style.load', addAirportsHeatmapLayer);
      return;
    }
    console.log('[map] (re)adding airports-heatmap layer');
    if (map.getLayer('airports-heatmap')) map.removeLayer('airports-heatmap');
    if (map.getLayer('airports-heat-count')) map.removeLayer('airports-heat-count');
    if (map.getSource('airports-heat')) map.removeSource('airports-heat');
    if (map.getSource('airports-heat-points')) map.removeSource('airports-heat-points');

    map.addSource('airports-heat', { type: 'geojson', data: buildAirportsHeatmap(airports) });

    // Classic heatmap with green->yellow->red ramp
    map.addLayer({
        id: 'airports-heatmap',
        type: 'heatmap',
        source: 'airports-heat',
        maxzoom: 12,
        paint: {
          // Weight by visits but keep smooth
          'heatmap-weight': [
            'interpolate', ['exponential', 1.2], ['*', ['get', 'visits'], 2],
            1, 1.0,
            5, 2.0,
            10, 3.0,
            20, 4.0
          ],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1.2, 6, 2.0, 10, 2.6, 12, 3.0],
          // Classic green->yellow->red ramp
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0.00, 'rgba(0,0,0,0)',
            0.20, '#2DC937',
            0.40, '#99C140',
            0.60, '#E7B416',
            0.80, '#DB7B2B',
            1.00, '#CC3232'
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 12, 6, 32, 10, 64, 12, 96],
          'heatmap-opacity': 0.95,
        },
      },
      // Place below circle markers if they exist
      map.getLayer('airports-layer') ? 'airports-layer' : undefined
    );

    // Clustered points for numeric labels over hotspots
    map.addSource('airports-heat-points', {
      type: 'geojson',
      data: buildAirportsHeatmap(airports),
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 40,
      // Sum up visits per cluster
      clusterProperties: {
        sum_visits: ['+', ['accumulated'], ['get', 'visits']]
      }
    } as any);

    // Symbol labels showing summed visits per cluster (white text with halo)
    map.addLayer({
      id: 'airports-heat-count',
      type: 'symbol',
      source: 'airports-heat-points',
      filter: ['has', 'sum_visits'],
      layout: {
        'text-field': ['to-string', ['get', 'sum_visits']],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 6, 12, 12, 16]
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0,0,0,0.6)',
        'text-halo-width': 1.5
      }
    });
  }, [airports]);

  // Apply per-airport color ramp and sizing by visit counts
  const applyAirportCircleStyling = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('airports-layer')) return;
    try {
      map.setPaintProperty(
        'airports-layer',
        'circle-color',
        [
          'interpolate', ['linear'], ['get', 'visits'],
          1, '#3b82f6',   // blue
          3, '#22c55e',   // green
          6, '#eab308',   // yellow
          10, '#f97316',  // orange
          20, '#ef4444',  // red
          40, '#a21caf'   // purple
        ]
      );
      map.setPaintProperty(
        'airports-layer',
        'circle-radius',
        ['interpolate', ['linear'], ['get', 'visits'], 1, 6, 5, 9, 10, 12, 20, 16, 40, 20]
      );
      map.setPaintProperty('airports-layer', 'circle-stroke-color', '#ffffff');
      map.setPaintProperty('airports-layer', 'circle-stroke-width', 1.5);
      // Default zoom-dependent subtle blur for circles (when heatmap is OFF)
      map.setPaintProperty(
        'airports-layer',
        'circle-blur',
        ['interpolate', ['linear'], ['zoom'],
          0, 0.35,
          6, 0.25,
          10, 0.18,
          14, 0.10
        ]
      );
    } catch (_) {}
  }, []);

  // Attach heatmap on style load
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onStyle = () => addAirportsHeatmapLayer();
    if (map.isStyleLoaded()) onStyle(); else map.once('style.load', onStyle);
    return () => { try { map.off('style.load', onStyle); } catch (_) {} };
  }, [addAirportsHeatmapLayer]);

  // Apply airport circle styling once the style is ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onStyle = () => applyAirportCircleStyling();
    if (map.isStyleLoaded()) onStyle(); else map.once('style.load', onStyle);
    return () => { try { map.off('style.load', onStyle); } catch (_) {} };
  }, [applyAirportCircleStyling]);

  // Keep heatmap data in sync with airports
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('airports-heat') as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(buildAirportsHeatmap(airports));
  }, [airports]);

  // Toggle visibility of airports heatmap layer
  const [showHeatmap, setShowHeatmap] = useState(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layerId = 'airports-heatmap';
    const countId = 'airports-heat-count';
    if (!map.getLayer(layerId) || !map.getLayer(countId)) {
      // Try to add it if missing
      console.log('[map] heatmap layer missing on toggle; attempting to add');
      addAirportsHeatmapLayer();
    }
    if (map.getLayer(layerId)) {
      console.log('[map] setting heatmap visibility:', showHeatmap);
      map.setLayoutProperty(layerId, 'visibility', showHeatmap ? 'visible' : 'none');
      if (map.getLayer(countId)) {
        map.setLayoutProperty(countId, 'visibility', showHeatmap ? 'visible' : 'none');
      }
      // Keep airport circles visible (color by visits), hide only flight paths for clarity
      try {
        if (map.getLayer('airports-layer')) {
          map.setLayoutProperty('airports-layer', 'visibility', 'visible');
          map.setPaintProperty('airports-layer', 'circle-opacity', showHeatmap ? 0.7 : 0.7);
          map.setPaintProperty(
            'airports-layer',
            'circle-blur',
            showHeatmap
              ? ['interpolate', ['linear'], ['zoom'], 0, 0.8, 6, 0.6, 10, 0.4, 14, 0.25]
              : ['interpolate', ['linear'], ['zoom'], 0, 0.35, 6, 0.25, 10, 0.18, 14, 0.10]
          );
          applyAirportCircleStyling();
        }
        if (map.getLayer('flight-paths-layer')) {
          map.setLayoutProperty('flight-paths-layer', 'visibility', showHeatmap ? 'none' : 'visible');
        }
        if (map.getLayer('visited-countries')) {
          map.setPaintProperty('visited-countries', 'fill-opacity', showHeatmap ? 0.08 : 0.55);
        }
      } catch (_) {}
    }
  }, [showHeatmap]);

  // Re-add sources/layers when the style changes (e.g. user switches base map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleStyleData = () => {
      updateAirportMarkers();
      updateFlightPaths();
      addVisitedCountriesLayer();
      addAirportsHeatmapLayer();
      applyAirportCircleStyling();
      // Ensure z-order: heatmap under airports, numeric labels above airports
      try {
        if (map.getLayer('airports-heatmap') && map.getLayer('airports-layer')) map.moveLayer('airports-heatmap', 'airports-layer');
        if (map.getLayer('airports-heat-count')) map.moveLayer('airports-heat-count');
      } catch (_) {}
    };

    map.on('styledata', handleStyleData);
    handleStyleData(); // initialize immediately
    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [updateAirportMarkers, updateFlightPaths, addVisitedCountriesLayer, addAirportsHeatmapLayer]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 space-y-3 sm:space-y-4">
      <Tabs defaultValue="map" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-10 sm:h-9">
          <TabsTrigger value="map" className="text-xs sm:text-sm">Map View</TabsTrigger>
          <TabsTrigger value="list" className="text-xs sm:text-sm">Airport List</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="space-y-3 sm:space-y-4">
          <div className="relative w-full h-[calc(100vh-8rem)] sm:h-[calc(100vh-4rem)]">
            <div className="absolute top-3 right-3 z-50 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowHeatmap(v => !v)}
                title="Toggle airport heatmap"
              >
                {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
              </Button>
            </div>
            <div ref={mapContainerRef} className="w-full h-full rounded-lg overflow-hidden" />
          </div>
        </TabsContent>
        <TabsContent value="list">
          <div className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4">
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
                        "group relative p-4 sm:p-6 hover:bg-muted/50 transition-all duration-300 cursor-pointer border-l-4",
                        selectedAirport === airport.code
                          ? "bg-muted border-l-primary"
                          : "border-l-transparent hover:border-l-primary/50"
                      )}
                      onClick={() => setSelectedAirport(selectedAirport === airport.code ? null : airport.code)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`fi fi-${getCountryCode(airport.country)} flex-shrink-0`}
                                style={{ width: "1.2rem", height: "0.9rem" }}
                                title={airport.country} />
                              <h3 className="font-semibold text-base sm:text-lg tracking-tight truncate">
                                {airport.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground flex-wrap">
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md">
                                {airport.code}
                              </span>
                              {airport.country && (
                                <span className="flex items-center gap-2 truncate">
                                  <span>•</span>
                                  <span className="truncate">{airport.country}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-background/80 h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (mapRef.current) {
                                  mapRef.current.flyTo({ center: [airport.lat, airport.lng], zoom: 4 })
                                }
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5"
                              >
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              <span className="sr-only">Show on map</span>
                            </Button>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5 text-muted-foreground"
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
