// Unified statistics calculator with consistent calculation methods

import { 
  FlightData, 
  AirportData, 
  UnifiedStatistics, 
  RouteInfo, 
  AirlineInfo,
  MonthlyActivity,
  CalculationOptions,
  DEFAULT_CALCULATION_OPTIONS
} from './types'

// IATA code to country mapping (centralized)
const IATA_TO_COUNTRY: { [key: string]: string } = {
  // United Kingdom
  'LGW': 'United Kingdom',
  'STN': 'United Kingdom',
  'BHX': 'United Kingdom',
  'BRS': 'United Kingdom',
  'LBA': 'United Kingdom',
  'LTN': 'United Kingdom',
  'SEN': 'United Kingdom',
  'LHR': 'United Kingdom',

  // Spain
  'MAD': 'Spain',
  'ALC': 'Spain',
  'GRO': 'Spain',
  'PMI': 'Spain',
  'TFS': 'Spain',
  'BCN': 'Spain',

  // Lithuania
  'KUN': 'Lithuania',
  'VNO': 'Lithuania',
  'PLQ': 'Lithuania',

  // Latvia
  'RIX': 'Latvia',

  // Ireland
  'DUB': 'Ireland',

  // Switzerland
  'GVA': 'Switzerland',
  'ZRH': 'Switzerland',

  // Italy
  'NAP': 'Italy',
  'FCO': 'Italy',
  'BGY': 'Italy',
  'CIA': 'Italy',
  'PSA': 'Italy',
  'BLQ': 'Italy',

  // Cyprus
  'PFO': 'Cyprus',

  // Malta
  'MLA': 'Malta',

  // Poland
  'WAW': 'Poland',
  'KRK': 'Poland',
  'WMI': 'Poland',

  // France
  'CDG': 'France',
  'BVA': 'France',

  // Netherlands
  'AMS': 'Netherlands',
  'EIN': 'Netherlands',

  // Belgium
  'BRU': 'Belgium',
  'CRL': 'Belgium',

  // Sweden
  'ARN': 'Sweden',
  'NYO': 'Sweden',

  // Egypt
  'CAI': 'Egypt',
  'HRG': 'Egypt',
  'SSH': 'Egypt',
  'LXR': 'Egypt',
  'ASW': 'Egypt',
  'AUE': 'Egypt',
  'MUH': 'Egypt',
  'ALY': 'Egypt',

  // Greece
  'CFU': 'Greece'
}

/**
 * Calculate flight duration in hours, handling overnight flights
 */
export function calculateFlightDuration(departureTime: string, arrivalTime: string): number {
  const [depHours, depMinutes] = departureTime.split(':').map(Number)
  const [arrHours, arrMinutes] = arrivalTime.split(':').map(Number)

  let durationMinutes = (arrHours * 60 + arrMinutes) - (depHours * 60 + depMinutes)

  // Handle overnight flights
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60 // Add 24 hours
  }

  return durationMinutes / 60 // Convert to hours
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Generate ETag for caching
 */
export function generateETag(data: any): string {
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 27)
}

/**
 * Get country from IATA code
 */
export function getCountryFromIATA(iata: string): string | undefined {
  return IATA_TO_COUNTRY[iata]
}

/**
 * Main unified statistics calculation function
 */
export function calculateUnifiedStatistics(
  flights: FlightData[], 
  airports: AirportData[],
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS
): UnifiedStatistics {
  // Create airport lookup map
  const airportMap = new Map<string, AirportData>()
  airports.forEach(airport => {
    airportMap.set(airport.iata, airport)
  })

  // Initialize tracking variables
  const countries = new Set<string>()
  const uniqueIataCodes = new Set<string>()
  const unmappedCodes = new Set<string>()
  const airlineCounts = new Map<string, number>()
  const airportVisits = new Map<string, number>()
  const routeDistances = new Map<string, { count: number; distance: number; sample?: FlightData }>()
  const monthCounts = new Map<string, number>()
  
  let totalKilometers = 0
  let totalHours = 0
  let flightsWithDistance = 0

  // Process each flight
  for (const flight of flights) {
    const depIata = flight.departure_iata || undefined
    const arrIata = flight.arrival_iata || undefined

    // Unique airports per side
    if (depIata) uniqueIataCodes.add(depIata)
    if (arrIata) uniqueIataCodes.add(arrIata)

    // Visits: arrivals only
    if (arrIata) {
      airportVisits.set(arrIata, (airportVisits.get(arrIata) || 0) + 1)
    }

    // Countries per side
    if (depIata) {
      const depAirportCountry = airportMap.get(depIata)?.country
      const depCountry = depAirportCountry || getCountryFromIATA(depIata)
      if (depCountry) countries.add(depCountry)
      else unmappedCodes.add(depIata)
    }

    if (arrIata) {
      const arrAirportCountry = airportMap.get(arrIata)?.country
      const arrCountry = arrAirportCountry || flight.arrival_country || getCountryFromIATA(arrIata)
      if (arrCountry) countries.add(arrCountry)
      else unmappedCodes.add(arrIata)
    }

    // Distance and routes require both sides and known coords
    if (depIata && arrIata) {
      const depAirport = airportMap.get(depIata)
      const arrAirport = airportMap.get(arrIata)
      if (depAirport && arrAirport) {
        const distance = calculateDistance(
          depAirport.lat,
          depAirport.lon,
          arrAirport.lat,
          arrAirport.lon
        )
        totalKilometers += distance
        flightsWithDistance++

        // Track routes (directional - each direction is a separate route)
        const routeKey = `${depIata}-${arrIata}`
        const existing = routeDistances.get(routeKey)
        if (existing) {
          existing.count++
        } else {
          routeDistances.set(routeKey, {
            count: 1,
            distance,
            sample: flight
          })
        }
      }
    }

    // Track airlines
    if (flight.airline) {
      airlineCounts.set(flight.airline, (airlineCounts.get(flight.airline) || 0) + 1)
    }

    // Track monthly activity
    if (flight.departure_date) {
      const monthKey = flight.departure_date.slice(0, 7)
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1)
    }

    // Track flight duration if times are available
    if (flight.departure_time && flight.arrival_time) {
      totalHours += calculateFlightDuration(flight.departure_time, flight.arrival_time)
    }
  }

  // Use actual flight hours if available, otherwise calculate derived hours
  const actualHours = Math.round(totalHours * 10) / 10
  const derivedHours = Math.round(
    ((totalKilometers / (options.cruiseSpeedKmh || 840)) + 
     (flightsWithDistance * (options.taxiTimeHours || 0.5))) * 10
  ) / 10
  
  // Prefer actual hours if we have flight time data, otherwise use derived
  const finalHours = actualHours > 0 ? actualHours : derivedHours

  // Find most used airline
  let mostUsedAirline: AirlineInfo | undefined
  if (options.includeAirlineAnalysis) {
    for (const [airline, count] of airlineCounts) {
      if (!mostUsedAirline || count > mostUsedAirline.count) {
        mostUsedAirline = { airline, count }
      }
    }
  }

  // Find most visited airport
  let mostVisitedAirport: { iata: string; name?: string; visits: number } | undefined
  for (const [iata, visits] of airportVisits) {
    if (!mostVisitedAirport || visits > mostVisitedAirport.visits) {
      const airport = airportMap.get(iata)
      mostVisitedAirport = {
        iata,
        name: airport?.name,
        visits
      }
    }
  }

  // Find most flown and longest routes
  let mostFlown: { key: string; count: number } | undefined
  let longest: { key: string; distance: number } | undefined
  
  if (options.includeRouteAnalysis) {
    for (const [key, info] of routeDistances.entries()) {
      if (!mostFlown || info.count > mostFlown.count) {
        mostFlown = { key, count: info.count }
      }
      if (!longest || info.distance > longest.distance) {
        longest = { key, distance: info.distance }
      }
    }
  }

  // Helper to resolve route names
  const resolveRouteNames = (key?: string): RouteInfo | undefined => {
    if (!key) return undefined
    
    const [iataA, iataB] = key.split('-')
    const routeInfo = routeDistances.get(key)
    const sample = routeInfo?.sample
    
    const airportA = airportMap.get(iataA)
    const airportB = airportMap.get(iataB)
    
    return {
      from: {
        iata: iataA,
        name: airportA?.name || (sample?.departure_iata === iataA ? sample?.departure_airport : sample?.arrival_airport),
        country: getCountryFromIATA(iataA)
      },
      to: {
        iata: iataB,
        name: airportB?.name || (sample?.departure_iata === iataB ? sample?.departure_airport : sample?.arrival_airport),
        country: getCountryFromIATA(iataB)
      },
      count: routeInfo?.count || 0,
      distance_km: Math.round(routeInfo?.distance || 0)
    }
  }

  const mostFlownRoute = mostFlown ? resolveRouteNames(mostFlown.key) : undefined
  const longestRoute = longest ? resolveRouteNames(longest.key) : undefined

  // Find busiest month
  let busiestMonth: MonthlyActivity | undefined
  if (options.includeMonthlyAnalysis) {
    for (const [month, count] of monthCounts) {
      if (!busiestMonth || count > busiestMonth.count) {
        busiestMonth = { month, count }
      }
    }
  }

  // Calculate total visits (sum of all airport visits)
  const totalVisits = Array.from(airportVisits.values()).reduce((sum, visits) => sum + visits, 0)

  // Dev diagnostics: log computed countries and unmapped codes
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.debug('[stats] countries:', Array.from(countries).sort())
      if (unmappedCodes.size) {
        console.debug('[stats] unmapped IATA codes:', Array.from(unmappedCodes).sort())
      }
    } catch {}
  }

  const statistics: UnifiedStatistics = {
    totalFlights: flights.length,
    totalCountries: countries.size,
    totalAirports: uniqueIataCodes.size,
    totalRoutes: routeDistances.size,
    totalVisits,
    totalKilometers: Math.round(totalKilometers),
    hoursInAir: finalHours,
    countries: Array.from(countries).sort(),
    unmappedAirports: Array.from(unmappedCodes),
    mostUsedAirline,
    mostVisitedAirport,
    mostFlownRoute,
    longestRoute,
    busiestMonth,
    lastUpdated: new Date().toISOString()
  }

  // Generate ETag
  statistics.etag = generateETag(statistics)

  return statistics
}
