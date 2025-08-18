// Unified statistics types for consistent interfaces across the application

export interface FlightData {
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

export interface AirportData {
  iata: string
  name?: string
  city?: string
  country?: string
  lat: number
  lon: number
}

export interface RouteInfo {
  from: {
    iata: string
    name?: string
    country?: string
  }
  to: {
    iata: string
    name?: string
    country?: string
  }
  count: number
  distance_km: number
}

export interface AirlineInfo {
  airline: string
  count: number
}

export interface MonthlyActivity {
  month: string
  count: number
}

export interface UnifiedStatistics {
  // Core metrics
  totalFlights: number
  totalCountries: number
  totalAirports: number
  totalRoutes: number
  totalVisits: number
  
  // Distance and time
  totalKilometers: number
  hoursInAir: number
  
  // Collections
  countries: string[]
  unmappedAirports: string[]
  
  // Top items
  mostUsedAirline?: AirlineInfo
  mostVisitedAirport?: {
    iata: string
    name?: string
    visits: number
  }
  mostFlownRoute?: RouteInfo
  longestRoute?: RouteInfo
  
  // Monthly data
  busiestMonth?: MonthlyActivity
  
  // Metadata
  lastUpdated: string
  etag?: string
}

export interface StatisticsCache {
  data: UnifiedStatistics
  timestamp: number
  userId: string
}

export interface CalculationOptions {
  includeRouteAnalysis?: boolean
  includeAirlineAnalysis?: boolean
  includeMonthlyAnalysis?: boolean
  cruiseSpeedKmh?: number
  taxiTimeHours?: number
}

export const DEFAULT_CALCULATION_OPTIONS: CalculationOptions = {
  includeRouteAnalysis: true,
  includeAirlineAnalysis: true,
  includeMonthlyAnalysis: true,
  cruiseSpeedKmh: 840,
  taxiTimeHours: 0.5
}
