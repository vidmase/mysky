/**
 * Mapbox Datasets API Service
 * 
 * Handles CRUD operations for flight paths stored in Mapbox Datasets.
 * Docs: https://docs.mapbox.com/api/maps/datasets/
 */

const MAPBOX_DATASETS_BASE_URL = "https://api.mapbox.com/datasets/v1"

// Environment variables
const getMapboxConfig = () => {
  const accessToken = process.env.MAPBOX_DATASETS_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const username = process.env.MAPBOX_USERNAME
  
  if (!accessToken) {
    throw new Error("MAPBOX_DATASETS_ACCESS_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN is required")
  }
  if (!username) {
    throw new Error("MAPBOX_USERNAME is required")
  }
  
  return { accessToken, username }
}

// Dataset ID cache
let cachedDatasetId: string | null = null
const DATASET_NAME = "flight-paths"

export interface FlightPathFeature {
  type: "Feature"
  id?: string
  geometry: {
    type: "LineString"
    coordinates: [number, number][] // [lon, lat]
  }
  properties: {
    flightId: string
    originIata: string
    destinationIata: string
    status: "active" | "completed" | "cancelled"
    airline?: string
    flightNumber?: string
    departureDate?: string
    passengerName?: string
    createdAt?: string
    updatedAt?: string
    [key: string]: unknown
  }
}

export interface MapboxDataset {
  id: string
  name: string
  description?: string
  owner: string
  created: string
  modified: string
  features?: number
  size?: number
}

export interface MapboxError {
  message: string
  status: number
  code?: string
}

/**
 * Handle Mapbox API errors
 */
const handleMapboxError = async (response: Response): Promise<never> => {
  const status = response.status
  let message = "Mapbox API error"
  let errorBody: any = null
  
  try {
    errorBody = await response.json()
    message = errorBody.message || errorBody.error || message
  } catch {
    message = response.statusText || message
  }
  
  switch (status) {
    case 401:
      console.error("[Mapbox] Unauthorized - check access token and scopes")
      throw { message: "Mapbox authentication failed. Check access token.", status, code: "UNAUTHORIZED" }
    case 404:
      console.error("[Mapbox] Resource not found")
      throw { message: "Resource not found", status, code: "NOT_FOUND" }
    case 422:
      console.error("[Mapbox] Invalid request:", errorBody)
      throw { message: `Invalid request: ${message}`, status, code: "INVALID_REQUEST" }
    case 429:
      console.error("[Mapbox] Rate limit exceeded")
      throw { message: "Rate limit exceeded. Please try again later.", status, code: "RATE_LIMITED" }
    default:
      console.error(`[Mapbox] Error ${status}:`, message)
      throw { message, status, code: "UNKNOWN_ERROR" }
  }
}

/**
 * List all datasets for the user
 */
export const listDatasets = async (): Promise<MapboxDataset[]> => {
  const { accessToken, username } = getMapboxConfig()
  
  const response = await fetch(
    `${MAPBOX_DATASETS_BASE_URL}/${username}?access_token=${accessToken}`,
    { method: "GET" }
  )
  
  if (!response.ok) {
    await handleMapboxError(response)
  }
  
  return response.json()
}

/**
 * Create a new dataset
 */
export const createDataset = async (name: string, description?: string): Promise<MapboxDataset> => {
  const { accessToken, username } = getMapboxConfig()
  
  const response = await fetch(
    `${MAPBOX_DATASETS_BASE_URL}/${username}?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description })
    }
  )
  
  if (!response.ok) {
    await handleMapboxError(response)
  }
  
  return response.json()
}

/**
 * Get or create the flight-paths dataset
 */
export const getOrCreateFlightPathsDataset = async (): Promise<string> => {
  if (cachedDatasetId) {
    return cachedDatasetId
  }
  
  try {
    const datasets = await listDatasets()
    const existing = datasets.find(d => d.name === DATASET_NAME)
    
    if (existing) {
      console.log(`[Mapbox] Found existing dataset: ${existing.id}`)
      cachedDatasetId = existing.id
      return existing.id
    }
    
    // Create new dataset
    console.log(`[Mapbox] Creating new dataset: ${DATASET_NAME}`)
    const newDataset = await createDataset(DATASET_NAME, "Flight paths for FlightTrack app")
    cachedDatasetId = newDataset.id
    console.log(`[Mapbox] Created dataset: ${newDataset.id}`)
    return newDataset.id
  } catch (error) {
    console.error("[Mapbox] Failed to get/create dataset:", error)
    throw error
  }
}

/**
 * List all features (flight paths) in the dataset
 */
export const listFlightPaths = async (limit = 1000): Promise<FlightPathFeature[]> => {
  const { accessToken, username } = getMapboxConfig()
  const datasetId = await getOrCreateFlightPathsDataset()
  
  const response = await fetch(
    `${MAPBOX_DATASETS_BASE_URL}/${username}/${datasetId}/features?limit=${limit}&access_token=${accessToken}`,
    { method: "GET" }
  )
  
  if (!response.ok) {
    await handleMapboxError(response)
  }
  
  const data = await response.json()
  return data.features || []
}

/**
 * Get a single flight path by ID
 */
export const getFlightPath = async (flightId: string): Promise<FlightPathFeature> => {
  const { accessToken, username } = getMapboxConfig()
  const datasetId = await getOrCreateFlightPathsDataset()
  
  const response = await fetch(
    `${MAPBOX_DATASETS_BASE_URL}/${username}/${datasetId}/features/${flightId}?access_token=${accessToken}`,
    { method: "GET" }
  )
  
  if (!response.ok) {
    await handleMapboxError(response)
  }
  
  return response.json()
}

/**
 * Create or update a flight path
 */
export const upsertFlightPath = async (feature: FlightPathFeature): Promise<FlightPathFeature> => {
  const { accessToken, username } = getMapboxConfig()
  const datasetId = await getOrCreateFlightPathsDataset()
  const flightId = feature.properties.flightId
  
  if (!flightId) {
    throw { message: "flightId is required in properties", status: 400, code: "INVALID_REQUEST" }
  }
  
  // Ensure feature has required structure
  const geoJsonFeature = {
    type: "Feature" as const,
    id: flightId,
    geometry: feature.geometry,
    properties: {
      ...feature.properties,
      updatedAt: new Date().toISOString()
    }
  }
  
  const response = await fetch(
    `${MAPBOX_DATASETS_BASE_URL}/${username}/${datasetId}/features/${flightId}?access_token=${accessToken}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geoJsonFeature)
    }
  )
  
  if (!response.ok) {
    await handleMapboxError(response)
  }
  
  return response.json()
}

/**
 * Update a flight path (partial update)
 */
export const updateFlightPath = async (
  flightId: string, 
  updates: Partial<Pick<FlightPathFeature, "geometry" | "properties">>
): Promise<FlightPathFeature> => {
  // Get existing feature
  const existing = await getFlightPath(flightId)
  
  // Merge updates
  const merged: FlightPathFeature = {
    type: "Feature",
    id: flightId,
    geometry: updates.geometry || existing.geometry,
    properties: {
      ...existing.properties,
      ...updates.properties,
      flightId, // Ensure flightId is preserved
      updatedAt: new Date().toISOString()
    }
  }
  
  return upsertFlightPath(merged)
}

/**
 * Delete a flight path
 */
export const deleteFlightPath = async (flightId: string): Promise<void> => {
  const { accessToken, username } = getMapboxConfig()
  const datasetId = await getOrCreateFlightPathsDataset()
  
  const response = await fetch(
    `${MAPBOX_DATASETS_BASE_URL}/${username}/${datasetId}/features/${flightId}?access_token=${accessToken}`,
    { method: "DELETE" }
  )
  
  if (!response.ok && response.status !== 204) {
    await handleMapboxError(response)
  }
}

/**
 * Generate great circle coordinates between two points
 */
export const generateGreatCircleCoordinates = (
  origin: { lon: number; lat: number },
  destination: { lon: number; lat: number },
  numPoints = 100
): [number, number][] => {
  const coordinates: [number, number][] = []
  
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const toDeg = (rad: number) => (rad * 180) / Math.PI
  
  const lat1 = toRad(origin.lat)
  const lon1 = toRad(origin.lon)
  const lat2 = toRad(destination.lat)
  const lon2 = toRad(destination.lon)
  
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
    )
  )
  
  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y))
    const lon = Math.atan2(y, x)
    
    coordinates.push([toDeg(lon), toDeg(lat)])
  }
  
  return coordinates
}

/**
 * Build a flight path feature from flight data
 */
export const buildFlightPathFeature = (
  flightId: string,
  originIata: string,
  destinationIata: string,
  coordinates: [number, number][],
  metadata?: Record<string, unknown>
): FlightPathFeature => {
  return {
    type: "Feature",
    id: flightId,
    geometry: {
      type: "LineString",
      coordinates
    },
    properties: {
      flightId,
      originIata,
      destinationIata,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...metadata
    }
  }
}





