"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import mapboxgl, { Map as MapboxMap } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RefreshCw, Database, Check, AlertCircle, MapPin, Plane } from 'lucide-react'
import { getGreatCirclePoints } from '@/lib/utils'
import { NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as MAPBOX_ACCESS_TOKEN } from '@/lib/env'

// --- TYPE DEFINITIONS ---
type VidmaFlight = {
  id: string
  passenger_name: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_iata: string
  arrival_iata: string
  departure_date: string
  departure_latitude: number | null
  departure_longitude: number | null
  arrival_latitude: number | null
  arrival_longitude: number | null
  airline: string | null
}

type Flight = {
  id: string
  departure_airport: Airport
  arrival_airport: Airport
}

type Airport = {
  iata: string
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
}

type Route = {
  from: string
  to: string
  count: number
  fromAirport: Airport
  toAirport: Airport
}

interface FlightPathFeature extends GeoJSON.Feature<GeoJSON.LineString> {
  properties: {
    from: string
    to: string
    count: number
    isHighlighted: boolean
    flightId?: string
    originIata?: string
    destinationIata?: string
  }
}

interface AirportFeature extends GeoJSON.Feature<GeoJSON.Point> {
  properties: {
    iata: string
    name: string
    city: string
    country: string
    flightCount: number
  }
}

interface MapboxDatasetFeature {
  type: "Feature"
  id?: string
  geometry: {
    type: "LineString"
    coordinates: [number, number][]
  }
  properties: {
    flightId: string
    originIata: string
    destinationIata: string
    status: string
    [key: string]: unknown
  }
}

// Color palette for routes based on flight count
const getRouteColor = (count: number): string => {
  if (count >= 10) return '#ff3366' // Hot pink for frequent routes
  if (count >= 5) return '#ff6b35'  // Orange
  if (count >= 3) return '#f7c948'  // Yellow
  if (count >= 2) return '#9b59b6'  // Purple
  return '#3498db'                   // Blue for single flights
}

// --- COMPONENT ---
export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<MapboxMap | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vidmaFlights, setVidmaFlights] = useState<VidmaFlight[]>([])
  const [flights, setFlights] = useState<Flight[]>([])
  const [airports, setAirports] = useState<Airport[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null)
  const [datasetFeatures, setDatasetFeatures] = useState<MapboxDatasetFeature[]>([])
  const [useDatasetSource, setUseDatasetSource] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showAirports, setShowAirports] = useState(true)
  const { toast } = useToast()

  // --- FETCH FROM MAPBOX DATASETS API ---
  const fetchDatasetFlightPaths = useCallback(async () => {
    try {
      const response = await fetch('/api/flight-paths')
      if (!response.ok) {
        // Silently fail for auth errors or other API errors - fall back to local data
        if (response.status === 401) {
          console.log('[Map] Not authenticated, using local data')
          return null
        }
        // For other errors, log but don't throw - just use local data
        console.warn(`[Map] API returned ${response.status}, using local data`)
        return null
      }
      const data = await response.json()
      return data.features || []
    } catch (error) {
      // Network errors or JSON parsing errors - silently fall back to local data
      console.warn('[Map] Error fetching dataset flight paths, using local data:', error)
      return null
    }
  }, [])

  // --- SYNC FLIGHTS TO MAPBOX DATASETS ---
  const syncFlightsToDataset = useCallback(async () => {
    setSyncing(true)
    setSyncStatus('idle')

    try {
      const response = await fetch('/api/flight-paths/sync', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const result = await response.json()

      toast({
        title: 'Sync Complete',
        description: `${result.synced} flight paths synced to Mapbox Datasets`
      })

      setSyncStatus('success')

      const features = await fetchDatasetFlightPaths()
      if (features) {
        setDatasetFeatures(features)
        setUseDatasetSource(true)
      }
    } catch (error) {
      console.error('Sync error:', error)
      setSyncStatus('error')
      toast({
        title: 'Sync Failed',
        description: 'Could not sync flight paths to Mapbox Datasets',
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }, [toast, fetchDatasetFlightPaths])

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchFlightData = async () => {
      if (!MAPBOX_ACCESS_TOKEN) {
        toast({ title: 'Configuration Error', description: 'Mapbox token not found.', variant: 'destructive' })
        setLoading(false)
        return
      }

      setLoading(true)

      // Fetch flight data via API (authenticated by Clerk)
      // Try to fetch from Mapbox Datasets first
      const datasetPaths = await fetchDatasetFlightPaths()
      if (datasetPaths && datasetPaths.length > 0) {
        setDatasetFeatures(datasetPaths)
        console.log(`[Map] Loaded ${datasetPaths.length} flight paths from Mapbox Datasets`)
      }

      const res = await fetch('/api/flights')
      if (!res.ok) {
        if (res.status === 401) {
          toast({ title: 'Not logged in', description: 'Please log in to see your flights.', variant: 'destructive' })
          setLoading(false)
          return
        }
        throw new Error('Failed to fetch flights')
      }

      const responseData = await res.json()
      const vidmaData = responseData.data || responseData || []

      if (Array.isArray(vidmaData)) {
        setVidmaFlights(vidmaData as VidmaFlight[])
        console.log(`[Map] Loaded ${vidmaData.length} flights from vidmaflights`)
      } else {
        setVidmaFlights([])
      }

      setLoading(false)
    }

    fetchFlightData()
  }, [toast, fetchDatasetFlightPaths])

  // --- DATA PROCESSING FROM VIDMAFLIGHTS ---
  useEffect(() => {
    const allAirports = new global.Map<string, Airport>()
    const routeCounts = new global.Map<string, { count: number; from: Airport; to: Airport }>()

    // Process vidmaflights data
    vidmaFlights.forEach(flight => {
      // Skip flights without coordinates
      if (!flight.departure_latitude || !flight.departure_longitude ||
        !flight.arrival_latitude || !flight.arrival_longitude ||
        !flight.departure_iata || !flight.arrival_iata) {
        return
      }

      // Create airport objects from flight data
      const depAirport: Airport = {
        iata: flight.departure_iata,
        name: flight.departure_airport || flight.departure_iata,
        city: flight.departure_airport?.replace(/\s*\([^)]*\)\s*/g, '') || '',
        country: '',
        latitude: Number(flight.departure_latitude),
        longitude: Number(flight.departure_longitude)
      }

      const arrAirport: Airport = {
        iata: flight.arrival_iata,
        name: flight.arrival_airport || flight.arrival_iata,
        city: flight.arrival_airport?.replace(/\s*\([^)]*\)\s*/g, '') || '',
        country: '',
        latitude: Number(flight.arrival_latitude),
        longitude: Number(flight.arrival_longitude)
      }

      allAirports.set(depAirport.iata, depAirport)
      allAirports.set(arrAirport.iata, arrAirport)

      const routeKey = `${depAirport.iata}-${arrAirport.iata}`
      const existing = routeCounts.get(routeKey)
      if (existing) {
        existing.count++
      } else {
        routeCounts.set(routeKey, {
          count: 1,
          from: depAirport,
          to: arrAirport
        })
      }
    })

    setAirports(Array.from(allAirports.values()))
    setRoutes(Array.from(routeCounts.entries()).map(([key, data]) => {
      const [from, to] = key.split('-')
      return { from, to, count: data.count, fromAirport: data.from, toAirport: data.to }
    }))
  }, [vidmaFlights])

  // --- AIRPORT FEATURES ---
  const airportFeatures = useMemo((): AirportFeature[] => {
    const airportFlightCounts = new global.Map<string, number>()

    vidmaFlights.forEach(flight => {
      if (flight.departure_iata) {
        airportFlightCounts.set(
          flight.departure_iata,
          (airportFlightCounts.get(flight.departure_iata) || 0) + 1
        )
      }
      if (flight.arrival_iata) {
        airportFlightCounts.set(
          flight.arrival_iata,
          (airportFlightCounts.get(flight.arrival_iata) || 0) + 1
        )
      }
    })

    return airports.map(airport => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [airport.longitude, airport.latitude]
      },
      properties: {
        iata: airport.iata,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        flightCount: airportFlightCounts.get(airport.iata) || 0
      }
    }))
  }, [airports, vidmaFlights])

  // --- FLIGHT PATH FEATURES (from local data or dataset) ---
  const flightPathFeatures = useMemo((): FlightPathFeature[] => {
    // If using dataset source, convert dataset features
    if (useDatasetSource && datasetFeatures.length > 0) {
      return datasetFeatures.map(feature => ({
        type: 'Feature' as const,
        geometry: feature.geometry,
        properties: {
          from: feature.properties.originIata,
          to: feature.properties.destinationIata,
          count: 1,
          isHighlighted: highlightedRoute === `${feature.properties.originIata}-${feature.properties.destinationIata}`,
          flightId: feature.properties.flightId,
          originIata: feature.properties.originIata,
          destinationIata: feature.properties.destinationIata
        }
      }))
    }

    // Use local calculation with improved geodesic lines
    return routes.map(route => {
      // Calculate distance to determine number of points for smooth curves
      const distance = Math.sqrt(
        Math.pow(route.toAirport.longitude - route.fromAirport.longitude, 2) +
        Math.pow(route.toAirport.latitude - route.fromAirport.latitude, 2)
      )

      // More points for longer distances = smoother curves
      const numPoints = Math.max(200, Math.min(500, Math.ceil(distance * 10)))

      const points = getGreatCirclePoints(
        [route.fromAirport.longitude, route.fromAirport.latitude],
        [route.toAirport.longitude, route.toAirport.latitude],
        numPoints
      )

      const coordinates = (points as any[]).map((p: any) => [Number(p[0]), Number(p[1])] as [number, number])

      const feature: FlightPathFeature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          from: route.from,
          to: route.to,
          count: route.count,
          isHighlighted: highlightedRoute === `${route.from}-${route.to}`,
        },
      }
      return feature
    })
  }, [routes, highlightedRoute, useDatasetSource, datasetFeatures])

  // --- MAP INITIALIZATION ---
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_ACCESS_TOKEN) return
    if (map.current) return

    const containerEl = mapContainer.current as any

    try {
      if (containerEl && containerEl._map && typeof containerEl._map.remove === 'function') {
        containerEl._map.remove()
      }
    } catch (_) { }

    try {
      while (mapContainer.current.firstChild) {
        mapContainer.current.removeChild(mapContainer.current.firstChild)
      }
    } catch (_) { }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN

    const createMap = () => new MapboxMap({
      container: mapContainer.current as HTMLElement,
      style: 'mapbox://styles/mapbox/light-v11', // Bright light style
      center: [10, 50], // Center on Europe
      zoom: 4,
    })

    try {
      map.current = createMap()
      map.current.on('load', () => {
        console.log('[Map] Style loaded')
        setMapLoaded(true)
      })
    } catch (err) {
      const message = (err as Error)?.message || ''
      if (message.includes('Map container is already initialized') && mapContainer.current) {
        mapContainer.current.innerHTML = ''
        map.current = createMap()
        map.current.on('load', () => {
          setMapLoaded(true)
        })
      } else {
        console.error('Map init error:', err)
      }
    }

    return () => {
      try { map.current?.remove() } catch (_) { }
      map.current = null
      setMapLoaded(false)
      if (mapContainer.current) {
        try { mapContainer.current.innerHTML = '' } catch (_) { }
      }
    }
  }, [])

  // --- MAP LAYERS AND SOURCES ---
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapLoaded) return

    const sourceId = 'flight-paths'
    const layerId = 'flight-paths-layer'

    const geojson: GeoJSON.FeatureCollection<GeoJSON.LineString, FlightPathFeature['properties']> = {
      type: 'FeatureCollection',
      features: flightPathFeatures,
    }

    const source = currentMap.getSource(sourceId) as mapboxgl.GeoJSONSource

    if (source) {
      source.setData(geojson)
    } else {
      currentMap.addSource(sourceId, { type: 'geojson', data: geojson })

      // Add glow layer for routes (geodesic lines with glow effect)
      currentMap.addLayer({
        id: `${layerId}-glow`,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            '#FFD700',
            [
              'interpolate',
              ['linear'],
              ['get', 'count'],
              1, '#3498db',
              2, '#9b59b6',
              3, '#f7c948',
              5, '#ff6b35',
              10, '#ff3366'
            ]
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            10,
            [
              'interpolate',
              ['linear'],
              ['get', 'count'],
              1, 5,
              5, 7,
              10, 9
            ]
          ],
          'line-opacity': 0.25,
          'line-blur': 4
        },
      })

      // Main geodesic route layer with smooth curves
      currentMap.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',      // Rounded line caps for smooth appearance
          'line-join': 'round'      // Rounded line joins for smooth curves
        },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            '#FFD700',
            [
              'interpolate',
              ['linear'],
              ['get', 'count'],
              1, '#3498db',
              2, '#9b59b6',
              3, '#f7c948',
              5, '#ff6b35',
              10, '#ff3366'
            ]
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            4,
            [
              'interpolate',
              ['linear'],
              ['get', 'count'],
              1, 2,
              5, 2.5,
              10, 3
            ]
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            1,
            0.85
          ],
        },
      })
    }
  }, [flightPathFeatures, mapLoaded])

  // --- AIRPORT MARKERS ---
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapLoaded || !showAirports) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add airport markers
    airports.forEach(airport => {
      const el = document.createElement('div')
      el.className = 'airport-marker'
      el.style.cssText = `
        width: 12px;
        height: 12px;
        background: #ef4444;
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transition: transform 0.2s;
      `
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.5)'
      })
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)'
      })

      const popup = new mapboxgl.Popup({
        offset: 15,
        closeButton: false
      }).setHTML(`
        <div style="padding: 8px;">
          <div style="font-weight: 600; font-size: 14px;">${airport.iata}</div>
          <div style="font-size: 12px; color: #666;">${airport.name}</div>
          <div style="font-size: 11px; color: #888;">${airport.city}, ${airport.country}</div>
        </div>
      `)

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([airport.longitude, airport.latitude])
        .setPopup(popup)
        .addTo(currentMap)

      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
    }
  }, [airports, mapLoaded, showAirports])

  // --- MAP INTERACTIVITY ---
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapLoaded || !airports.length) return

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    })

    const handleMouseMove = (e: mapboxgl.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        currentMap.getCanvas().style.cursor = 'pointer'
        const feature = e.features[0] as unknown as FlightPathFeature
        const { from, to, count } = feature.properties

        const fromAirport = airports.find(a => a.iata === from)
        const toAirport = airports.find(a => a.iata === to)

        if (fromAirport && toAirport) {
          const description = `
            <div style="padding: 8px; min-width: 200px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 18px;">✈️</span>
                <span style="font-weight: 600;">${count} flight${count > 1 ? 's' : ''}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="text-align: center;">
                  <div style="font-weight: 700; font-size: 16px;">${from}</div>
                  <div style="font-size: 11px; color: #888;">${fromAirport.city}</div>
                </div>
                <div style="flex: 1; text-align: center; color: #666;">→</div>
                <div style="text-align: center;">
                  <div style="font-weight: 700; font-size: 16px;">${to}</div>
                  <div style="font-size: 11px; color: #888;">${toAirport.city}</div>
                </div>
              </div>
            </div>
          `
          popup.setLngLat(e.lngLat).setHTML(description).addTo(currentMap)
        }

        setHighlightedRoute(`${from}-${to}`)
      }
    }

    const handleMouseLeave = () => {
      currentMap.getCanvas().style.cursor = ''
      popup.remove()
      setHighlightedRoute(null)
    }

    currentMap.on('mousemove', 'flight-paths-layer', handleMouseMove)
    currentMap.on('mouseleave', 'flight-paths-layer', handleMouseLeave)

    return () => {
      if (currentMap.getLayer('flight-paths-layer')) {
        currentMap.off('mousemove', 'flight-paths-layer', handleMouseMove)
        currentMap.off('mouseleave', 'flight-paths-layer', handleMouseLeave)
      }
      popup.remove()
    }
  }, [airports, mapLoaded])

  // --- FIT BOUNDS TO ROUTES ---
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapLoaded || airports.length === 0) return

    // Calculate bounds
    const bounds = new mapboxgl.LngLatBounds()
    airports.forEach(airport => {
      bounds.extend([airport.longitude, airport.latitude])
    })

    // Fit map to bounds with padding
    currentMap.fitBounds(bounds, {
      padding: { top: 100, bottom: 100, left: 100, right: 100 },
      maxZoom: 6,
      duration: 1000
    })
  }, [airports, mapLoaded])

  // --- RENDER ---
  if (!MAPBOX_ACCESS_TOKEN) {
    return <div className="p-4">Mapbox access token is not configured.</div>
  }

  return (
    <div className="relative w-full h-screen">
      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Data source indicator */}
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm flex items-center gap-2 border">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {useDatasetSource ? (
              <>
                <span className="text-green-500 font-medium">Mapbox Datasets</span>
                <span className="ml-1">({datasetFeatures.length} paths)</span>
              </>
            ) : (
              <>
                <span className="text-blue-500 font-medium">Local</span>
                <span className="ml-1">({routes.length} routes)</span>
              </>
            )}
          </span>
        </div>

        {/* Toggle airports */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAirports(!showAirports)}
          className="bg-background/90 backdrop-blur-sm"
        >
          <MapPin className={`h-4 w-4 mr-2 ${showAirports ? 'text-red-500' : 'text-muted-foreground'}`} />
          {showAirports ? 'Hide' : 'Show'} Airports
        </Button>

        {/* Sync button */}
        <Button
          variant="outline"
          size="sm"
          onClick={syncFlightsToDataset}
          disabled={syncing || loading}
          className="bg-background/90 backdrop-blur-sm"
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : syncStatus === 'success' ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Synced
            </>
          ) : syncStatus === 'error' ? (
            <>
              <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
              Retry Sync
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync to Mapbox
            </>
          )}
        </Button>

        {/* Toggle source */}
        {datasetFeatures.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseDatasetSource(!useDatasetSource)}
            className="bg-background/90 backdrop-blur-sm text-xs"
          >
            Switch to {useDatasetSource ? 'Local' : 'Dataset'}
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-3 border">
        <div className="text-xs font-medium mb-2 text-muted-foreground">Flight Frequency</div>
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded" style={{ background: '#3498db' }} />
            <span className="text-xs">1 flight</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded" style={{ background: '#9b59b6' }} />
            <span className="text-xs">2 flights</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded" style={{ background: '#f7c948' }} />
            <span className="text-xs">3-4 flights</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded" style={{ background: '#ff6b35' }} />
            <span className="text-xs">5-9 flights</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded" style={{ background: '#ff3366' }} />
            <span className="text-xs">10+ flights</span>
          </div>
        </div>
        <div className="pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground/80 flex items-start gap-1.5">
            <Plane className="h-3 w-3 mt-0.5 flex-shrink-0" />

          </div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-4 py-3 border">
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Airports:</span>
            <span className="font-medium">{airports.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Routes:</span>
            <span className="font-medium">{useDatasetSource ? datasetFeatures.length : routes.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground ml-5">Total Flights:</span>
            <span className="font-medium">{vidmaFlights.length}</span>
          </div>
        </div>
      </div>

      {/* Routes list */}
      {routes.length > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-background/90 backdrop-blur-sm rounded-lg border max-h-64 overflow-auto w-72">
          <div className="px-3 py-2 border-b sticky top-0 bg-background/95">
            <span className="text-sm font-medium">Routes ({routes.length})</span>
          </div>
          <div className="p-2 space-y-1">
            {routes
              .sort((a, b) => b.count - a.count)
              .slice(0, 20)
              .map(route => (
                <div
                  key={`${route.from}-${route.to}`}
                  className={`flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${highlightedRoute === `${route.from}-${route.to}`
                      ? 'bg-primary/20'
                      : 'hover:bg-muted'
                    }`}
                  onMouseEnter={() => setHighlightedRoute(`${route.from}-${route.to}`)}
                  onMouseLeave={() => setHighlightedRoute(null)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: getRouteColor(route.count) }}
                    />
                    <span className="font-mono font-medium">{route.from}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono font-medium">{route.to}</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {route.count}x
                  </span>
                </div>
              ))}
            {routes.length > 20 && (
              <div className="text-xs text-muted-foreground text-center py-1">
                +{routes.length - 20} more routes
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={mapContainer} className="w-full h-full" />
    </div>
  )
}
