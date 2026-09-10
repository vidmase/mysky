"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import mapboxgl, { Map as MapboxMap } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Database, Check, AlertCircle, MapPin, Layers } from 'lucide-react'
import { getGreatCirclePoints } from '@/lib/utils'
import { NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as MAPBOX_ACCESS_TOKEN } from '@/lib/env'
import { PaperNav } from '@/app/components/paper-nav'
import s from './map.module.css'

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

// --- HELPER FUNCTIONS ---

/**
 * Safely check if a layer exists on the map
 */
function hasLayer(map: mapboxgl.Map | undefined, layerId: string): boolean {
  if (!map) return false
  try {
    return !!map.getLayer(layerId)
  } catch {
    return false
  }
}

/**
 * Safely check if a source exists on the map
 */
function hasSource(map: mapboxgl.Map | undefined, sourceId: string): boolean {
  if (!map) return false
  try {
    return !!map.getSource(sourceId)
  } catch {
    return false
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

// --- PAPER PALETTE (mirrors app/styles/paper.css; Mapbox needs literals) ---
const PAPER = '#f2ece1'
const PAPER_2 = '#e8dfcd'
const PAPER_3 = '#ded2ba'
const INK = '#17130e'
const INK_2 = '#5b5142'
const INK_3 = '#8c8071'
const VERMILLION = '#ce3b1e'
const VERMILLION_DK = '#a32c14'
const BRASS = '#c9942f'
const JADE = '#2f6b53'

/* A pair you fly once is a faint pencil trace; fly it often enough and the
   line darkens all the way to vermillion. Same steps as the printed legend. */
const ROUTE_RAMP: Array<[number, string]> = [
  [1, INK_3],
  [2, JADE],
  [3, BRASS],
  [5, VERMILLION],
  [10, VERMILLION_DK],
]

const getRouteColor = (count: number): string => {
  if (count >= 10) return VERMILLION_DK
  if (count >= 5) return VERMILLION
  if (count >= 3) return BRASS
  if (count >= 2) return JADE
  return INK_3
}

/** The `interpolate` expression Mapbox wants, built from the ramp above. */
const routeColorExpression = [
  'case',
  ['boolean', ['get', 'isHighlighted'], false],
  VERMILLION,
  ['interpolate', ['linear'], ['get', 'count'], ...ROUTE_RAMP.flat()],
]

/**
 * Repaint a stock Mapbox style onto paper stock. Rules are matched on layer id
 * and applied one at a time inside try/catch: an id that moves or disappears in
 * a future style version quietly keeps its default rather than throwing.
 */
function printOnPaper(map: mapboxgl.Map) {
  const style = map.getStyle()
  if (!style?.layers) return

  const hide = /^(road|bridge|tunnel|building|poi|transit|aeroway|landuse|landcover|national-park|hillshade|ferry|path|golf)/
  // An atlas keeps its country and sea names and drops everything else.
  const keepLabel = /^(country-label|water-label|waterway-label|natural-line-label|natural-point-label)$/

  for (const layer of style.layers) {
    const id = layer.id
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(id, 'background-color', PAPER)
      } else if (hide.test(id)) {
        map.setLayoutProperty(id, 'visibility', 'none')
      } else if (/-label$/.test(id)) {
        if (keepLabel.test(id)) {
          map.setPaintProperty(id, 'text-color', INK_3)
          map.setPaintProperty(id, 'text-halo-color', PAPER)
          map.setPaintProperty(id, 'text-halo-width', 1.4)
          map.setLayoutProperty(id, 'text-letter-spacing', 0.16)
        } else {
          map.setLayoutProperty(id, 'visibility', 'none')
        }
      } else if (/water|ocean|bathymetry/.test(id)) {
        if (layer.type === 'fill') map.setPaintProperty(id, 'fill-color', PAPER_3)
        if (layer.type === 'line') map.setPaintProperty(id, 'line-color', PAPER_3)
      } else if (/^land/.test(id)) {
        map.setPaintProperty(id, 'fill-color', PAPER)
      } else if (/^admin/.test(id)) {
        // country and state borders become the plate's hairline rules
        map.setPaintProperty(id, 'line-color', 'rgba(23, 19, 14, 0.3)')
        map.setPaintProperty(id, 'line-width', 0.6)
      }
    } catch {
      /* layer id not in this style version — leave it as the style ships it */
    }
  }
}

// --- COMPONENT ---
export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<MapboxMap | null>(null)

  const animationRef = useRef<number | null>(null)
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
        if (response.status === 401) {
          console.log('[Map] Not authenticated, using local data')
          return null
        }
        console.warn(`[Map] API returned ${response.status}, using local data`)
        return null
      }
      const data = await response.json()
      return data.features || []
    } catch (error) {
      console.warn('[Map] Error fetching dataset flight paths, using local data:', error)
      return null
    }
  }, [])

  // --- SYNC FLIGHTS TO MAPBOX DATASETS ---
  const syncFlightsToDataset = useCallback(async () => {
    setSyncing(true)
    setSyncStatus('idle')
    try {
      const response = await fetch('/api/flight-paths/sync', { method: 'POST' })
      if (!response.ok) throw new Error('Sync failed')
      const result = await response.json()
      toast({ title: 'Sync Complete', description: `${result.synced} flight paths synced to Mapbox Datasets` })
      setSyncStatus('success')
      const features = await fetchDatasetFlightPaths()
      if (features) {
        setDatasetFeatures(features)
        setUseDatasetSource(true)
      }
    } catch (error) {
      console.error('Sync error:', error)
      setSyncStatus('error')
      toast({ title: 'Sync Failed', description: 'Could not sync flight paths to Mapbox Datasets', variant: 'destructive' })
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

    vidmaFlights.forEach(flight => {
      if (!flight.departure_latitude || !flight.departure_longitude ||
        !flight.arrival_latitude || !flight.arrival_longitude ||
        !flight.departure_iata || !flight.arrival_iata) {
        return
      }
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
        routeCounts.set(routeKey, { count: 1, from: depAirport, to: arrAirport })
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
        airportFlightCounts.set(flight.departure_iata, (airportFlightCounts.get(flight.departure_iata) || 0) + 1)
      }
      if (flight.arrival_iata) {
        airportFlightCounts.set(flight.arrival_iata, (airportFlightCounts.get(flight.arrival_iata) || 0) + 1)
      }
    })
    return airports.map(airport => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [airport.longitude, airport.latitude] },
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
    return routes.map(route => {
      const distance = Math.sqrt(
        Math.pow(route.toAirport.longitude - route.fromAirport.longitude, 2) +
        Math.pow(route.toAirport.latitude - route.fromAirport.latitude, 2)
      )
      const numPoints = Math.max(200, Math.min(500, Math.ceil(distance * 10)))
      const points = getGreatCirclePoints(
        [route.fromAirport.longitude, route.fromAirport.latitude],
        [route.toAirport.longitude, route.toAirport.latitude],
        numPoints
      )
      const coordinates = (points as any[]).map((p: any) => [Number(p[0]), Number(p[1])] as [number, number])
      const feature: FlightPathFeature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
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
      style: 'mapbox://styles/mapbox/light-v11',
      center: [10, 50],
      zoom: 4,
      pitch: 0,
      bearing: 0,
      // A printed plate is flat; the v3 default globe leaves the frame's
      // corners empty and reads as an accident rather than a choice.
      projection: { name: 'mercator' },
    })

    const onLoad = (instance: MapboxMap) => {
      printOnPaper(instance)
      setMapLoaded(true)
    }

    try {
      map.current = createMap()
      map.current.on('load', () => {
        console.log('[Map] Style loaded')
        onLoad(map.current as MapboxMap)
      })
    } catch (err) {
      const message = (err as Error)?.message || ''
      if (message.includes('Map container is already initialized') && mapContainer.current) {
        mapContainer.current.innerHTML = ''
        map.current = createMap()
        map.current.on('load', () => { onLoad(map.current as MapboxMap) })
      } else {
        console.error('Map init error:', err)
      }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
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

      // --- LAYER 1: The impression the plate leaves in the stock ---
      currentMap.addLayer({
        id: `${layerId}-halo`,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': INK,
          'line-width': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            9,
            ['interpolate', ['linear'], ['get', 'count'], 1, 4, 5, 6, 10, 8],
          ],
          'line-opacity': 0.07,
          'line-blur': 3,
        },
      })

      // --- LAYER 2: A wide, transparent band so thin arcs stay hoverable ---
      currentMap.addLayer({
        id: `${layerId}-hit`,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': INK, 'line-width': 14, 'line-opacity': 0 },
      })

      // --- LAYER 3: The printed arc ---
      currentMap.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': routeColorExpression as any,
          'line-width': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            2.6,
            ['interpolate', ['linear'], ['get', 'count'], 1, 1, 5, 1.6, 10, 2.2],
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            1,
            0.85,
          ],
        },
      })

      // --- LAYER 4: A paper-coloured dash travelling the arc ---
      currentMap.addLayer({
        id: `${layerId}-dash`,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: {
          'line-color': PAPER,
          'line-width': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            2,
            ['interpolate', ['linear'], ['get', 'count'], 1, 0.8, 5, 1.1, 10, 1.4],
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'isHighlighted'], false],
            0.85,
            0.55,
          ],
          'line-dasharray': [0, 4, 3],
        },
      })

      // --- ANIMATE THE DASH ---
      let dashStep = 0
      const dashArraySeq = [
        [0, 4, 3],
        [0.5, 4, 2.5],
        [1, 4, 2],
        [1.5, 4, 1.5],
        [2, 4, 1],
        [2.5, 4, 0.5],
        [3, 4, 0],
        [0, 0.5, 3, 3.5],
        [0, 1, 3, 3],
        [0, 1.5, 3, 2.5],
        [0, 2, 3, 2],
        [0, 2.5, 3, 1.5],
        [0, 3, 3, 1],
        [0, 3.5, 3, 0.5]
      ]

      const animateDash = (timestamp: number) => {
        // Slow down: change every ~120ms
        const newStep = Math.floor(timestamp / 120) % dashArraySeq.length
        if (newStep !== dashStep) {
          dashStep = newStep
          if (hasLayer(currentMap, `${layerId}-dash`)) {
            currentMap.setPaintProperty(`${layerId}-dash`, 'line-dasharray', dashArraySeq[dashStep])
          }
        }
        animationRef.current = requestAnimationFrame(animateDash)
      }
      animationRef.current = requestAnimationFrame(animateDash)
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [flightPathFeatures, mapLoaded])

  // --- AIRPORT MARKERS (Native Mapbox Layers - pixel-perfect positioning) ---
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapLoaded) return

    const sourceId = 'airports'
    const glowLayerId = 'airports-glow'
    const dotLayerId = 'airports-dot'
    const labelLayerId = 'airports-label'

    // Build GeoJSON from airport features
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: airportFeatures,
    }

    // Remove old layers/source if they exist (for re-renders)
    if (hasLayer(currentMap, labelLayerId)) currentMap.removeLayer(labelLayerId)
    if (hasLayer(currentMap, dotLayerId)) currentMap.removeLayer(dotLayerId)
    if (hasLayer(currentMap, glowLayerId)) currentMap.removeLayer(glowLayerId)
    if (hasSource(currentMap, sourceId)) currentMap.removeSource(sourceId)

    if (!showAirports) return

    currentMap.addSource(sourceId, { type: 'geojson', data: geojson })

    // Layer 1: A soft ring around the airports you use most
    currentMap.addLayer({
      id: glowLayerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'flightCount'],
          1, 8,
          10, 13,
          50, 18
        ],
        'circle-color': VERMILLION,
        'circle-opacity': 0.12,
        'circle-blur': 0.6,
      },
    })

    // Layer 2: The node itself — paper centre, ink rule, as on the landing plate
    currentMap.addLayer({
      id: dotLayerId,
      type: 'circle',
      source: sourceId,
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'flightCount'],
          1, 3.2,
          10, 4.5,
          50, 6
        ],
        'circle-color': PAPER_2,
        'circle-stroke-color': INK,
        'circle-stroke-width': 1.4,
        'circle-opacity': 1,
      },
    })

    // Layer 3: IATA text labels
    currentMap.addLayer({
      id: labelLayerId,
      type: 'symbol',
      source: sourceId,
      layout: {
        'text-field': ['get', 'iata'],
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
        'text-size': 10,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-letter-spacing': 0.16,
      },
      paint: {
        'text-color': INK_2,
        'text-halo-color': PAPER,
        'text-halo-width': 1.6,
      },
    })

    // Click handler for airport popups
    const handleAirportClick = (e: mapboxgl.MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return
      const feature = e.features[0]
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number]
      const props = feature.properties as AirportFeature['properties']

      new mapboxgl.Popup({
        closeButton: true,
        className: 'map-popup-paper',
        offset: 12,
      })
        .setLngLat(coordinates)
        .setHTML(`
          <div class="mp">
            <div class="mp-head">
              <span class="mp-iata">${props.iata}</span>
            </div>
            <div class="mp-name">${props.name}</div>
            ${props.city ? `<div class="mp-sub">${props.city}${props.country ? ', ' + props.country : ''}</div>` : ''}
            <div class="mp-foot">${props.flightCount} leg${props.flightCount !== 1 ? "s" : ""} filed</div>
          </div>
        `)
        .addTo(currentMap)
    }

    // Hover cursor change
    const handleMouseEnter = () => { currentMap.getCanvas().style.cursor = 'pointer' }
    const handleMouseLeave = () => { currentMap.getCanvas().style.cursor = '' }

    currentMap.on('click', dotLayerId, handleAirportClick)
    currentMap.on('mouseenter', dotLayerId, handleMouseEnter)
    currentMap.on('mouseleave', dotLayerId, handleMouseLeave)

    return () => {
      try {
        currentMap.off('click', dotLayerId, handleAirportClick)
        currentMap.off('mouseenter', dotLayerId, handleMouseEnter)
        currentMap.off('mouseleave', dotLayerId, handleMouseLeave)
        if (currentMap.getStyle()) {
          if (hasLayer(currentMap, labelLayerId)) currentMap.removeLayer(labelLayerId)
          if (hasLayer(currentMap, dotLayerId)) currentMap.removeLayer(dotLayerId)
          if (hasLayer(currentMap, glowLayerId)) currentMap.removeLayer(glowLayerId)
          if (hasSource(currentMap, sourceId)) currentMap.removeSource(sourceId)
        }
      } catch (_) { /* map already destroyed */ }
    }
  }, [airportFeatures, mapLoaded, showAirports])

  // --- MAP INTERACTIVITY ---
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapLoaded || !airports.length) return

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'map-popup-paper'
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
            <div class="mp mp-route">
              <div class="mp-head">
                <span class="mp-label">${count} leg${count > 1 ? 's' : ''} on this pair</span>
                <span class="mp-tick" style="background:${getRouteColor(count)}"></span>
              </div>
              <div class="mp-pair">
                <div class="mp-end">
                  <div class="mp-iata">${from}</div>
                  <div class="mp-sub">${fromAirport.city}</div>
                </div>
                <svg class="mp-arc" viewBox="0 0 60 18" aria-hidden="true">
                  <path d="M1 15 C 16 2, 44 2, 59 15" />
                </svg>
                <div class="mp-end">
                  <div class="mp-iata">${to}</div>
                  <div class="mp-sub">${toAirport.city}</div>
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

    // Bound to the invisible wide band, not the hairline itself — a 1px arc is
    // otherwise almost impossible to put a cursor on.
    const hitLayerId = 'flight-paths-layer-hit'

    currentMap.on('mousemove', hitLayerId, handleMouseMove)
    currentMap.on('mouseleave', hitLayerId, handleMouseLeave)

    return () => {
      try {
        // Check if layer still exists before removing listeners
        const style = currentMap.getStyle()
        if (style?.layers?.some((l: mapboxgl.Layer) => l.id === hitLayerId)) {
          currentMap.off('mousemove', hitLayerId, handleMouseMove)
          currentMap.off('mouseleave', hitLayerId, handleMouseLeave)
        }
      } catch {
        // Map may already be destroyed
      }
      popup.remove()
    }
  }, [airports, mapLoaded])

  // --- FIT BOUNDS TO ROUTES ---
  useEffect(() => {
    const currentMap = map.current
    if (!currentMap || !mapLoaded || airports.length === 0) return
    const bounds = new mapboxgl.LngLatBounds()
    airports.forEach(airport => { bounds.extend([airport.longitude, airport.latitude]) })
    currentMap.fitBounds(bounds, {
      padding: { top: 100, bottom: 100, left: 100, right: 100 },
      maxZoom: 6,
      duration: 1500
    })
  }, [airports, mapLoaded])

  // --- RENDER ---
  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <div className={s.page}>
        <div className={s.shell}>
          <PaperNav />
          <div className={s.notice}>
            <h1 className={s.noticeTitle}>The plate is not mounted</h1>
            <p className={s.noticeNote}>
              No Mapbox access token is configured, so the atlas cannot be drawn.
              Set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> and reload.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const topRoutes = [...routes].sort((a, b) => b.count - a.count).slice(0, 20)

  return (
    <div className={s.page}>
      <style jsx global>{`
        /* Mapbox popups, reprinted on paper */
        .map-popup-paper .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .map-popup-paper .mapboxgl-popup-tip {
          display: none !important;
        }
        .map-popup-paper .mapboxgl-popup-close-button {
          color: var(--ink-3);
          font-size: 16px;
          padding: 0 6px;
        }
        .map-popup-paper .mapboxgl-popup-close-button:hover {
          background: transparent;
          color: var(--vermillion);
        }
        .map-popup-paper .mp {
          min-width: 168px;
          padding: 0.7rem 0.85rem 0.75rem;
          background: #fbf7ef;
          border: 1px solid rgba(23, 19, 14, 0.38);
          box-shadow: 3px 3px 0 rgba(23, 19, 14, 0.16);
          font-family: var(--body);
          color: var(--ink);
        }
        .map-popup-paper .mp-route {
          min-width: 226px;
        }
        .map-popup-paper .mp-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding-bottom: 0.5rem;
          margin-bottom: 0.6rem;
          border-bottom: 1px solid rgba(23, 19, 14, 0.16);
        }
        .map-popup-paper .mp-label {
          font-family: var(--code);
          font-size: 0.4375rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ink-2);
        }
        .map-popup-paper .mp-tick {
          width: 18px;
          height: 2px;
          flex: none;
        }
        .map-popup-paper .mp-iata {
          font-family: var(--code);
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .map-popup-paper .mp-name {
          font-size: 0.75rem;
          line-height: 1.4;
          color: var(--ink-2);
        }
        .map-popup-paper .mp-sub {
          margin-top: 0.25rem;
          font-family: var(--code);
          font-size: 0.4375rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-3);
        }
        .map-popup-paper .mp-foot {
          margin-top: 0.6rem;
          padding-top: 0.55rem;
          border-top: 1px solid rgba(23, 19, 14, 0.16);
          font-family: var(--code);
          font-size: 0.4375rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--vermillion);
        }
        .map-popup-paper .mp-pair {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 0.6rem;
        }
        .map-popup-paper .mp-end:last-child {
          text-align: right;
        }
        .map-popup-paper .mp-arc {
          width: 60px;
          height: 18px;
          fill: none;
          stroke: rgba(23, 19, 14, 0.3);
          stroke-width: 1;
          stroke-dasharray: 3 3;
        }

        /* Mapbox's own chrome, toned down to hairlines */
        .mapboxgl-ctrl-attrib {
          background: rgba(251, 247, 239, 0.85) !important;
          font-family: var(--body);
          font-size: 10px;
        }
        .mapboxgl-ctrl-attrib a {
          color: var(--ink-2) !important;
        }
        .mapboxgl-ctrl-logo {
          opacity: 0.55;
        }
      `}</style>

      <div className={s.shell}>
        <PaperNav />
      </div>

      <header className={s.shell}>
        <div className={s.masthead}>
          <div className={s.mastheadCopy}>
            <p className={`${s.stamp} ${s.tag} ${s.rise}`} style={{ animationDelay: '40ms' }}>
              <span />
              <span>Plate II · Route atlas</span>
            </p>
            <h1 className={`${s.title} ${s.rise}`} style={{ animationDelay: '110ms' }}>
              The shape of <em>where you go</em>
            </h1>
            <p className={`${s.lede} ${s.rise}`} style={{ animationDelay: '200ms' }}>
              Every filed leg becomes a great circle. Fly a pair often enough and the
              line darkens, until the plate is unmistakably yours.
            </p>
          </div>

          <dl className={`${s.ledger} ${s.rise}`} style={{ animationDelay: '280ms' }}>
            <div className={s.ledgerCell}>
              <dt className={s.ledgerLabel}>Airports</dt>
              <dd className={s.ledgerValue}>{airports.length}</dd>
            </div>
            <div className={s.ledgerCell}>
              <dt className={s.ledgerLabel}>Pairs</dt>
              <dd className={`${s.ledgerValue} ${s.ledgerValueHot}`}>
                {useDatasetSource ? datasetFeatures.length : routes.length}
              </dd>
            </div>
            <div className={s.ledgerCell}>
              <dt className={s.ledgerLabel}>Legs</dt>
              <dd className={s.ledgerValue}>{vidmaFlights.length}</dd>
            </div>
          </dl>
        </div>
      </header>

      <main className={s.shell}>
        <div className={s.plate}>
          <div ref={mapContainer} className={s.canvas} />

          {loading && (
            <div className={s.loading}>
              <div className={s.compass} />
              <span className={s.loadingNote}>Drawing the plate</span>
            </div>
          )}

          {/* Legend — top left */}
          <div className={`${s.panel} ${s.legend}`}>
            <div className={s.panelHead}>
              <span className={s.panelTitle}>Frequency</span>
            </div>
            <div className={s.legendBody}>
              {[
                { color: INK_3, label: '1 leg' },
                { color: JADE, label: '2 legs' },
                { color: BRASS, label: '3–4 legs' },
                { color: VERMILLION, label: '5–9 legs' },
                { color: VERMILLION_DK, label: '10+ legs' },
              ].map((item) => (
                <div key={item.label} className={s.legendRow}>
                  <span className={s.legendRule} style={{ background: item.color }} />
                  <span className={s.legendLabel}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls — top right */}
          <div className={s.controls}>
            <span className={s.source}>
              <Database className="h-3 w-3" />
              Source
              <span className={s.sourceValue}>
                {useDatasetSource
                  ? `Mapbox · ${datasetFeatures.length}`
                  : `Local · ${routes.length}`}
              </span>
            </span>

            <button
              type="button"
              onClick={() => setShowAirports(!showAirports)}
              className={`${s.control} ${showAirports ? s.controlOn : ''}`}
              aria-pressed={showAirports}
            >
              <MapPin />
              Airports
            </button>

            <button
              type="button"
              onClick={syncFlightsToDataset}
              disabled={syncing || loading}
              className={s.control}
            >
              {syncing ? (
                <>
                  <RefreshCw className={s.spin} />
                  Syncing
                </>
              ) : syncStatus === 'success' ? (
                <>
                  <Check className={s.ok} />
                  <span className={s.ok}>Synced</span>
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <AlertCircle className={s.bad} />
                  <span className={s.bad}>Retry</span>
                </>
              ) : (
                <>
                  <RefreshCw />
                  Sync
                </>
              )}
            </button>

            {datasetFeatures.length > 0 && (
              <button
                type="button"
                onClick={() => setUseDatasetSource(!useDatasetSource)}
                className={`${s.control} ${s.controlQuiet}`}
              >
                <Layers />
                Use {useDatasetSource ? 'local' : 'dataset'}
              </button>
            )}
          </div>

          {/* Routes index — bottom right */}
          {topRoutes.length > 0 && (
            <div className={`${s.panel} ${s.index}`}>
              <div className={s.panelHead}>
                <span className={s.panelTitle}>Pairs flown</span>
                <span className={s.panelCount}>{routes.length}</span>
              </div>
              <div className={s.indexBody}>
                {topRoutes.map((route) => {
                  const key = `${route.from}-${route.to}`
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`${s.indexRow} ${highlightedRoute === key ? s.indexRowActive : ''}`}
                      onMouseEnter={() => setHighlightedRoute(key)}
                      onMouseLeave={() => setHighlightedRoute(null)}
                      onFocus={() => setHighlightedRoute(key)}
                      onBlur={() => setHighlightedRoute(null)}
                    >
                      <span
                        className={s.indexTick}
                        style={{ background: getRouteColor(route.count) }}
                      />
                      <span className={s.indexPair}>
                        {route.from}
                        <span className={s.indexArrow}>→</span>
                        {route.to}
                      </span>
                      <span className={s.indexCount}>{route.count}×</span>
                    </button>
                  )
                })}
                {routes.length > topRoutes.length && (
                  <div className={s.indexMore}>
                    +{routes.length - topRoutes.length} more pairs
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={s.colophon}>
          <span className={s.tag}>MySky · Plate II</span>
          <p className={s.colophonNote}>
            Arcs are great circles between the filed airports, not the track actually
            flown. Base map and airport positions are supplied by third parties.
          </p>
        </div>
      </main>
    </div>
  )
}
