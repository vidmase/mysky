import 'server-only'

// Aircraft photo service using AeroDataBox API
const RAPIDAPI_HOST = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.AERODATABOX_RAPIDAPI_KEY
const PROVIDER = (process.env.AERODATABOX_PROVIDER || '').toLowerCase() as 'market'|'rapidapi'|''
const MARKET_BASE = process.env.AERODATABOX_MARKET_BASE || 'https://prod.api.market/api/v1/aedbx/aerodatabox'
const MARKET_KEY = process.env.AERODATABOX_MARKET_KEY

export type AircraftPhoto = {
  url: string
  photographer?: string
  source?: string
  registration?: string
  aircraft?: {
    model?: string
    manufacturer?: string
  }
}

// Cache for aircraft photos (5 minutes)
const photoCache = new Map<string, { data: AircraftPhoto | null; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getAircraftPhoto(registration: string): Promise<AircraftPhoto | null> {
  if (!registration) return null
  
  // Clean registration (remove spaces, convert to uppercase)
  const cleanReg = registration.replace(/\s+/g, '').toUpperCase()
  
  // Check cache first
  const cached = photoCache.get(cleanReg)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  try {
    let response: Response
    
    if (PROVIDER === 'market' && MARKET_KEY) {
      // Use API Market provider
      const url = `${MARKET_BASE}/aircrafts/reg/${cleanReg}/image/beta`
      response = await fetch(url, {
        headers: {
          'x-api-market-key': MARKET_KEY,
          'x-magicapi-key': MARKET_KEY,
        },
      })
    } else if (RAPIDAPI_KEY) {
      // Use RapidAPI provider
      const url = `https://${RAPIDAPI_HOST}/aircrafts/reg/${cleanReg}/image/beta`
      response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
      })
    } else {
      console.warn('No AeroDataBox API key configured for aircraft photos')
      return null
    }

    if (!response.ok) {
      if (response.status === 404) {
        // No photo found for this aircraft - cache null result
        photoCache.set(cleanReg, { data: null, timestamp: Date.now() })
        return null
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Extract photo data from API response
    const photo: AircraftPhoto | null = data?.url ? {
      url: data.url,
      photographer: data.photographer,
      source: data.source,
      registration: cleanReg,
      aircraft: {
        model: data.aircraft?.model,
        manufacturer: data.aircraft?.manufacturer,
      }
    } : null

    // Cache the result
    photoCache.set(cleanReg, { data: photo, timestamp: Date.now() })
    
    return photo
  } catch (error) {
    console.error(`Error fetching aircraft photo for ${cleanReg}:`, error)
    // Cache null result to avoid repeated failed requests
    photoCache.set(cleanReg, { data: null, timestamp: Date.now() })
    return null
  }
}

// Helper function to extract aircraft registration from flight data
export function extractAircraftRegistration(flightData: any): string | null {
  // Try to extract from various possible fields in flight status data
  if (flightData?.aircraft?.reg) return flightData.aircraft.reg
  if (flightData?.aircraft?.registration) return flightData.aircraft.registration
  if (flightData?.registration) return flightData.registration
  if (flightData?.reg) return flightData.reg
  
  return null
}
