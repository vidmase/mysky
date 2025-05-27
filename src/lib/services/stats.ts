// --- iataToCountry mapping ---
export const iataToCountry: Record<string, string> = {
  'LHR': 'United Kingdom',
  'JFK': 'United States',
  'CDG': 'France',
  'FRA': 'Germany',
  'LAX': 'United States',
  'DUB': 'Ireland',
  'GVA': 'Switzerland',
  'NAP': 'Italy',
  'PFO': 'Cyprus',
  // ...add more as needed
}

// --- Distance calculation ---
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const R = 6371 // km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// --- UserStats type ---
export interface UserStats {
  totalFlights: number
  totalCountries: number
  totalKilometers: number
  hoursInAir: number
  lastFlightDate?: string
  favoriteDestination?: string
  mostFrequentAirline?: string
  averageFlightDuration?: number
  mostVisitedAirport: string
  mostFlownRoute: string
  nextFlight?: any
}

// Helper to parse date and time into a Date object
function parseTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  // Handles "2024-06-01" and "14:30" or "14:30:00"
  return new Date(`${date}T${time.length === 5 ? time + ':00' : time}`);
}

// --- getUserStats ---
export async function getUserStats(supabase: any, userId: string): Promise<UserStats> {
  try {
    const [flightsResult, airportsResult] = await Promise.all([
      supabase
        .from('vidmaflights')
        .select('*')
        .eq('owner_id', userId),
      supabase
        .from('all_airport_gps')
        .select('iata, lat, lon')
    ])

    if (flightsResult.error) throw flightsResult.error
    if (airportsResult.error) throw airportsResult.error

    const flights = flightsResult.data || []
    const airports = airportsResult.data || []

    if (flights.length === 0) {
      return {
        totalFlights: 0,
        totalCountries: 0,
        totalKilometers: 0,
        hoursInAir: 0,
        mostVisitedAirport: '',
        mostFlownRoute: ''
      }
    }

    const today = new Date()
    const upcomingFlights = flights
      .filter((f: any) => f.departure_date && new Date(f.departure_date) > today)
      .sort((a: any, b: any) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime())
    const nextFlight = upcomingFlights[0]

    const airportMap = new Map(airports.map((airport: any) => [
      airport.iata,
      { lat: Number(airport.lat), lon: Number(airport.lon) }
    ]))

    const uniqueIataCodes = new Set<string>()
    const airlineCounts = new Map<string, number>()
    const airportVisitCounts = new Map<string, number>()
    const routeCounts = new Map<string, number>()
    let totalKilometers = 0
    let totalHours = 0
    let mostVisitedAirport = ''
    let mostVisitedAirportCount = 0
    let mostFlownRoute = ''
    let mostFlownRouteCount = 0
    let favoriteDestination = ''
    let favoriteDestinationCount = 0

    flights.forEach((flight: any) => {
      if (flight.arrival_iata) uniqueIataCodes.add(flight.arrival_iata)
      if (flight.departure_iata) uniqueIataCodes.add(flight.departure_iata)
      if (flight.airline) airlineCounts.set(flight.airline, (airlineCounts.get(flight.airline) || 0) + 1)
      if (flight.arrival_airport) airportVisitCounts.set(flight.arrival_airport, (airportVisitCounts.get(flight.arrival_airport) || 0) + 1)
      if (flight.departure_airport) airportVisitCounts.set(flight.departure_airport, (airportVisitCounts.get(flight.departure_airport) || 0) + 1)
      if (flight.arrival_airport) {
        const count = (airportVisitCounts.get(flight.arrival_airport) || 0)
        if (count > favoriteDestinationCount) {
          favoriteDestination = flight.arrival_airport
          favoriteDestinationCount = count
        }
      }
      if (flight.departure_iata && flight.arrival_iata) {
        const routeKey = [flight.departure_iata, flight.arrival_iata].sort().join('-')
        routeCounts.set(routeKey, (routeCounts.get(routeKey) || 0) + 1)
      }
      const depCoords = airportMap.get(flight.departure_iata)
      const arrCoords = airportMap.get(flight.arrival_iata)
      let distance = 0
      if (
        depCoords && arrCoords &&
        typeof depCoords === 'object' && depCoords !== null &&
        typeof arrCoords === 'object' && arrCoords !== null &&
        'lat' in depCoords && 'lon' in depCoords &&
        'lat' in arrCoords && 'lon' in arrCoords &&
        typeof depCoords.lat === 'number' && typeof depCoords.lon === 'number' &&
        typeof arrCoords.lat === 'number' && typeof arrCoords.lon === 'number'
      ) {
        distance = calculateDistance(depCoords.lat, depCoords.lon, arrCoords.lat, arrCoords.lon)
      } else if (flight.distance_km) {
        distance = flight.distance_km
      }
      if (distance > 0) {
        totalKilometers += distance
      }
      // --- Calculate duration ---
      let durationHours = 0;
      if (flight.flight_duration) {
        // Parse "2h 30m"
        const match = flight.flight_duration.match(/(\d+)h\s*(\d+)m?/);
        if (match) {
          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          durationHours = hours + minutes / 60;
        }
      } else if (flight.departure_date && flight.departure_time && flight.arrival_date && flight.arrival_time) {
        const dep = parseTime(flight.departure_date, flight.departure_time);
        const arr = parseTime(flight.arrival_date, flight.arrival_time);
        if (dep && arr) {
          let diff = (arr.getTime() - dep.getTime()) / (1000 * 60 * 60); // hours
          // Handle overnight flights (arrival next day)
          if (diff < 0) diff += 24;
          durationHours = diff;
        }
      }
      totalHours += durationHours;
    })

    airportVisitCounts.forEach((count, airport) => {
      if (count > mostVisitedAirportCount) {
        mostVisitedAirport = airport
        mostVisitedAirportCount = count
      }
    })
    routeCounts.forEach((count, route) => {
      if (count > mostFlownRouteCount) {
        mostFlownRoute = route
        mostFlownRouteCount = count
      }
    })
    let mostFrequentAirline = ''
    let mostFrequentAirlineCount = 0
    airlineCounts.forEach((count, airline) => {
      if (count > mostFrequentAirlineCount) {
        mostFrequentAirline = airline
        mostFrequentAirlineCount = count
      }
    })
    const countries = new Set<string>()
    uniqueIataCodes.forEach(iata => {
      const country = iataToCountry[iata]
      if (country) countries.add(country)
    })
    const averageFlightDuration = flights.length > 0 ? totalHours / flights.length : 0
    const sortedFlights = flights.sort((a: any, b: any) => new Date(b.departure_date).getTime() - new Date(a.departure_date).getTime())
    const lastFlightDate = sortedFlights[0]?.departure_date
    return {
      totalFlights: flights.length,
      totalCountries: countries.size,
      totalKilometers: Math.round(totalKilometers),
      hoursInAir: Math.round(totalHours * 10) / 10,
      lastFlightDate,
      favoriteDestination,
      mostFrequentAirline,
      averageFlightDuration: Math.round(averageFlightDuration * 10) / 10,
      mostVisitedAirport,
      mostFlownRoute,
      nextFlight
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return {
      totalFlights: 0,
      totalCountries: 0,
      totalKilometers: 0,
      hoursInAir: 0,
      mostVisitedAirport: '',
      mostFlownRoute: ''
    }
  }
} 