export type SeatType = 'economy' | 'premium-economy' | 'business' | 'first'

export interface Passengers {
  adults: number
  children: number
  infants_in_seat: number
  infants_on_lap: number
}

export interface SimpleDatetime {
  date: number[]
  time: number[]
}

export interface AirportRef {
  code: string
  name: string
}

export interface Segment {
  from_airport: AirportRef
  to_airport: AirportRef
  departure: SimpleDatetime
  arrival: SimpleDatetime
  duration: number
  plane_type?: string
}

export interface FlightOffer {
  type: string
  price: number
  airlines: string[]
  flights: Segment[]
  carbon?: { typical_on_route: number; emission: number }
  stops: number
  duration_minutes: number
  is_best?: boolean
}

export interface LiveSearchResponse {
  current_status: 'success' | 'mock' | 'empty' | string
  google_flights_url?: string | null
  currency: string
  flights: FlightOffer[]
  metadata?: {
    airlines: { code: string; name: string }[]
    alliances: { code: string; name: string }[]
  }
  message?: string | null
  error?: string
  /** Set by /api/live-search when a hop below it failed */
  upstream_status?: number
}

export type TripType = 'one-way' | 'round-trip'

export type SortKey = 'best' | 'price' | 'duration' | 'departure'

/** Backend health as reported by /api/live-search/health */
export type BackendStatus = 'unknown' | 'online' | 'offline'
