// Unified data fetching service for statistics

import { SupabaseClient } from '@supabase/supabase-js'
import { FlightData, AirportData } from './types'

/**
 * Batch fetch flight and airport data efficiently
 */
export async function batchFetchFlightData(
  supabase: SupabaseClient,
  userId: string
): Promise<{ flights: FlightData[], airports: AirportData[] }> {
  const [flightsResult, airportsResult] = await Promise.all([
    // Fetch user's flights with all necessary fields
    supabase
      .from('vidmaflights')
      .select(`
        id,
        passenger_name,
        reservation_number,
        flight_number,
        departure_airport,
        arrival_airport,
        departure_date,
        arrival_date,
        departure_time,
        arrival_time,
        total_receipt,
        purchased_date,
        purchase_time,
        airline,
        arrival_country,
        arrival_iata,
        departure_iata,
        seat,
        notes,
        cancelled,
        extras_receipt
      `)
      .eq('owner_id', userId),

    // Fetch airport coordinates
    supabase
      .from('all_airport_gps')
      .select('iata, lat, lon, name, city, country')
  ])

  if (flightsResult.error) {
    throw new Error(`Failed to fetch flights: ${flightsResult.error.message}`)
  }

  if (airportsResult.error) {
    throw new Error(`Failed to fetch airports: ${airportsResult.error.message}`)
  }

  return {
    flights: flightsResult.data || [],
    airports: (airportsResult.data || []).map(airport => ({
      iata: airport.iata,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      lat: airport.lat,
      lon: airport.lon
    }))
  }
}

/**
 * Fetch only flight count for lightweight operations
 */
export async function fetchFlightCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('vidmaflights')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)

  if (error) {
    throw new Error(`Failed to fetch flight count: ${error.message}`)
  }

  return count || 0
}

/**
 * Fetch unique countries count for lightweight operations
 */
export async function fetchCountriesCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('vidmaflights')
    .select('departure_iata, arrival_iata')
    .eq('owner_id', userId)

  if (error) {
    throw new Error(`Failed to fetch countries data: ${error.message}`)
  }

  // Use the same country mapping logic from calculator
  const { getCountryFromIATA } = await import('./calculator')
  const countries = new Set<string>()
  
  data?.forEach(flight => {
    if (flight.departure_iata) {
      const country = getCountryFromIATA(flight.departure_iata)
      if (country) countries.add(country)
    }
    if (flight.arrival_iata) {
      const country = getCountryFromIATA(flight.arrival_iata)
      if (country) countries.add(country)
    }
  })

  return countries.size
}
