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
    "Greece": "gr"
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

  // Memoized statistics calculation
  const stats = useMemo(() => {
    console.log('Recalculating stats, airports length:', airports.length);
    console.log('Airports data:', airports.slice(0, 5)); // Show first 5 airports
    const calculatedStats = calculateStatistics(airports);
    console.log('Calculated stats result:', calculatedStats);
    return calculatedStats;
  }, [airports, airportsKey, forceUpdateKey]);

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
    if (map.getLayer('visited-countries')) {
      map.removeLayer('visited-countries');
    }
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
        // Convert visited set to array for use in filter
        const visitedIsoArray = Array.from(visitedIsoCodes) as string[];

        // Add a fill layer for visited countries
        map.addLayer({
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

        // Add the boundary line layer for visited countries
        map.addLayer({
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
      });
  }, [airports]);

  // Re-add sources/layers when the style changes (e.g. user switches base map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleStyleData = () => {
      updateAirportMarkers();
      updateFlightPaths();
      addVisitedCountriesLayer();
    };

    map.on('styledata', handleStyleData);
    handleStyleData(); // initialize immediately
    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [updateAirportMarkers, updateFlightPaths, addVisitedCountriesLayer]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 space-y-3 sm:space-y-4">
      <Tabs defaultValue="map" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-10 sm:h-9">
          <TabsTrigger value="map" className="text-xs sm:text-sm">Map View</TabsTrigger>
          <TabsTrigger value="list" className="text-xs sm:text-sm">Airport List</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs sm:text-sm">Statistics</TabsTrigger>
        </TabsList>
        <TabsContent value="map" className="space-y-3 sm:space-y-4">
          <div className="relative w-full h-[calc(100vh-8rem)] sm:h-[calc(100vh-4rem)]">
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
        <TabsContent value="stats" className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">Flight Statistics</h2>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span>{flights.length} flights • Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                  realtimeStatus === 'SUBSCRIBED' 
                    ? 'bg-green-100 text-green-800' 
                    : realtimeStatus === 'CLOSED' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    realtimeStatus === 'SUBSCRIBED' ? 'bg-green-500' : 
                    realtimeStatus === 'CLOSED' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  {realtimeStatus === 'SUBSCRIBED' ? 'Live' : 
                   realtimeStatus === 'CLOSED' ? 'Offline' : 'Connecting'}
                </span>
              </div>
            </div>
            <Button
              onClick={() => fetchUserFlights()}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
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
              {airports.length > 0 ? (
                (() => {
                  console.log('Rendering stats component with:', { airportsLength: airports.length, statsCountries: stats.countriesVisited });
                  
                  // 3. Accessible color palette
                  const chartColors = [
                    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#6366f1', '#fbbf24', '#ef4444', '#10b981', '#a21caf', '#f472b6'
                  ];
                  
                  return (
                    <>
                      <div className="grid gap-4 sm:gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                        {/* Pie Chart: Flights by Country (Enhanced) */}
                        <Card className="p-3 sm:p-4 flex flex-col items-center bg-white dark:bg-slate-900">
                          <h3 className="text-sm sm:text-base font-semibold mb-2 text-foreground">Flights by Country</h3>
                          <ChartContainer config={{}} className="w-full h-48 sm:h-56 md:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                              <Pie
                                data={chartData.countryData}
                                dataKey="visits"
                                nameKey="country"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent, value }: any) =>
                                  percent > 0.05 && name !== 'Other'
                                    ? `${name}: ${(percent * 100).toFixed(1)}%`
                                    : ''
                                }
                                isAnimationActive={false}
                              >
                                {chartData.countryData.map((entry, idx) => (
                                  <Cell key={entry.country} fill={chartColors[idx % chartColors.length]} />
                                ))}
                              </Pie>
                              <ReTooltip
                                formatter={(value: number, name: string, props: any) => {
                                  const percent = ((value as number) / chartData.totalFlights) * 100;
                                  return [`${value} flights (${percent.toFixed(1)}%)`, props.payload.country];
                                }}
                                contentStyle={{ color: '#0f172a', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                                itemStyle={{ color: '#0f172a' }}
                                wrapperStyle={{ zIndex: 50 }}
                                cursor={{ fill: '#e0e7ef', opacity: 0.2 }}
                              />
                                <ReLegend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ color: '#0f172a', marginTop: 8 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                          {chartData.grouped.length > 0 && (
                            <div className="mt-3 sm:mt-4 w-full text-xs text-foreground">
                              <div className="font-semibold mb-1">Other countries:</div>
                              <ul className="list-disc list-inside space-y-0.5 text-xs">
                                {chartData.grouped.map((c) => (
                                  <li key={c.country} className="truncate">
                                    {c.country}: {c.visits} flight{c.visits > 1 ? 's' : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Card>
                        {/* Bar Chart: Flights per Year */}
                        <Card className="p-3 sm:p-4 flex flex-col items-center bg-white dark:bg-slate-900">
                          <h3 className="text-sm sm:text-base font-semibold mb-2 text-foreground">Flights by Year</h3>
                          <ChartContainer config={{}} className="w-full h-48 sm:h-56 md:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <ReBarChart data={chartData.flightsByYear}>
                                <XAxis dataKey="year" stroke="#0f172a" tick={{ fill: '#0f172a', fontSize: 10 }} />
                                <YAxis allowDecimals={false} stroke="#0f172a" tick={{ fill: '#0f172a', fontSize: 10 }} />
                                <Bar dataKey="count" fill="#0ea5e9" />
                                <ReTooltip contentStyle={{ color: '#0f172a', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} itemStyle={{ color: '#0f172a' }} wrapperStyle={{ zIndex: 50 }} cursor={{ fill: '#e0e7ef', opacity: 0.2 }} />
                              </ReBarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </Card>
                        {/* Bar Chart: Flights per Airline */}
                        <Card className="p-3 sm:p-4 flex flex-col items-center bg-white dark:bg-slate-900">
                          <h3 className="text-sm sm:text-base font-semibold mb-2 text-foreground">Flights by Airline</h3>
                          <ChartContainer config={{}} className="w-full h-48 sm:h-56 md:h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <ReBarChart data={chartData.airlineData} layout="vertical">
                                <YAxis dataKey="airline" type="category" width={60} stroke="#0f172a" tick={{ fill: '#0f172a', fontSize: 9 }} />
                                <XAxis type="number" allowDecimals={false} stroke="#0f172a" tick={{ fill: '#0f172a', fontSize: 10 }} />
                                <Bar dataKey="count" fill="#f59e42" />
                                <ReTooltip contentStyle={{ color: '#0f172a', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} itemStyle={{ color: '#0f172a' }} wrapperStyle={{ zIndex: 50 }} cursor={{ fill: '#e0e7ef', opacity: 0.2 }} />
                              </ReBarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </Card>
                      </div>
                      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                        <Card className="p-4 sm:p-6 space-y-1 sm:space-y-2">
                          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Total Airports</h3>
                          <div className="text-xl sm:text-2xl font-bold">{airports.length}</div>
                          <div className="text-xs text-muted-foreground hidden sm:block">Key: {airportsKey.slice(-20)}</div>
                        </Card>
                        <Card className="p-4 sm:p-6 space-y-1 sm:space-y-2">
                          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Total Visits</h3>
                          <div className="text-xl sm:text-2xl font-bold">{stats.totalVisits}</div>
                          <div className="text-xs text-muted-foreground hidden sm:block">Calculated: {new Date().toLocaleTimeString()}</div>
                        </Card>
                        <Card className="p-4 sm:p-6 space-y-1 sm:space-y-2">
                          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Total Routes</h3>
                          <div className="text-xl sm:text-2xl font-bold">{stats.totalRoutes}</div>
                        </Card>
                        <Card className="p-4 sm:p-6 space-y-1 sm:space-y-2">
                          <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Countries Visited</h3>
                          <div className="text-xl sm:text-2xl font-bold">{stats.countriesVisited}</div>
                        </Card>
                      </div>

                      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
                        <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                          <h3 className="text-base sm:text-lg font-semibold">Most Visited Airport</h3>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`fi fi-${getCountryCode(stats.mostVisitedAirport.country)} flex-shrink-0`}
                                style={{ width: "1.2rem", height: "0.9rem" }}
                                title={stats.mostVisitedAirport.country} />
                              <span className="font-medium text-sm sm:text-base truncate">{stats.mostVisitedAirport.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <span className="font-mono bg-muted px-1.5 py-0.5 rounded-md">
                                {stats.mostVisitedAirport.code}
                              </span>
                              <span>•</span>
                              <span>{stats.mostVisitedAirport.visits} visits</span>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h3 className="text-base sm:text-lg font-semibold">Route Statistics</h3>
                            <select
                              className="text-xs sm:text-sm bg-muted px-2 py-1 rounded-md border border-input hover:bg-accent hover:text-accent-foreground w-full sm:w-auto"
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
                              <div className="flex flex-col gap-2 text-sm">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`fi fi-${getCountryCode(stats.longestRoute.from.country)} flex-shrink-0`}
                                    style={{ width: "1rem", height: "0.75rem" }} />
                                  <span className="font-medium text-xs sm:text-sm truncate min-w-0">{stats.longestRoute.from.name}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded-md">
                                    {stats.longestRoute.from.code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pl-4 sm:pl-6">
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
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                  </svg>
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {new Intl.NumberFormat('en-US').format(stats.longestRoute.distance)} km
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`fi fi-${getCountryCode(stats.longestRoute.to.country)} flex-shrink-0`}
                                    style={{ width: "1rem", height: "0.75rem" }} />
                                  <span className="font-medium text-xs sm:text-sm truncate min-w-0">{stats.longestRoute.to.name}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded-md">
                                    {stats.longestRoute.to.code}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div id="shortest-route" className="route-section" style={{ display: 'none' }}>
                              <div className="flex flex-col gap-2 text-sm">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`fi fi-${getCountryCode(stats.shortestRoute.from.country)} flex-shrink-0`}
                                    style={{ width: "1rem", height: "0.75rem" }} />
                                  <span className="font-medium text-xs sm:text-sm truncate min-w-0">{stats.shortestRoute.from.name}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded-md">
                                    {stats.shortestRoute.from.code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pl-4 sm:pl-6">
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
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                  </svg>
                                  <span className="text-xs sm:text-sm text-muted-foreground">
                                    {new Intl.NumberFormat('en-US').format(stats.shortestRoute.distance)} km
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`fi fi-${getCountryCode(stats.shortestRoute.to.country)} flex-shrink-0`}
                                    style={{ width: "1rem", height: "0.75rem" }} />
                                  <span className="font-medium text-xs sm:text-sm truncate min-w-0">{stats.shortestRoute.to.name}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded-md">
                                    {stats.shortestRoute.to.code}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                          <h3 className="text-base sm:text-lg font-semibold">Most Flown Route</h3>
                          {stats.mostFlownRoute && (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className={`fi fi-${getCountryCode(airports.find(a => a.code === stats.mostFlownRoute.from)?.country || '')} flex-shrink-0`}
                                    style={{ width: "1rem", height: "0.75rem" }} />
                                  <span className="font-mono text-xs sm:text-sm">{stats.mostFlownRoute.from}</span>
                                </div>
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
                                  <path d="M5 12h14" />
                                  <path d="m12 5 7 7-7 7" />
                                </svg>
                                <div className="flex items-center gap-2">
                                  <span className={`fi fi-${getCountryCode(airports.find(a => a.code === stats.mostFlownRoute.to)?.country || '')} flex-shrink-0`}
                                    style={{ width: "1rem", height: "0.75rem" }} />
                                  <span className="font-mono text-xs sm:text-sm">{stats.mostFlownRoute.to}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
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

                        <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h3 className="text-base sm:text-lg font-semibold">Total Distance Flown</h3>
                            <div className="text-xl sm:text-2xl font-bold">
                              {new Intl.NumberFormat('en-US').format(stats.totalDistance)} km
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <h3 className="text-base sm:text-lg font-semibold">Total Hours in Air</h3>
                            <div className="text-xl sm:text-2xl font-bold">
                              {Math.round(stats.totalFlightHours)} hours
                            </div>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            Including taxi, takeoff, and landing times
                          </div>
                        </Card>
                      </div>
                    </>
                  );
                })()
              ) : null}
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
