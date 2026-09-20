"use client"

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BASEMAPS, prefersReducedMotion, routeColor, type BasemapId } from './atlas-config'
import { flyRoute } from './route-flight'

export type AtlasAirport = {
  iata: string
  name: string
  city: string
  country: string
  latitude: number
  longitude: number
  flightCount: number
}

export type AtlasRoute = {
  key: string
  from: string
  to: string
  fromCity: string
  toCity: string
  count: number
  /** great-circle points as Leaflet [lat, lng], unwrapped across the date line */
  path: [number, number][]
}

// --- PAPER PALETTE (mirrors app/styles/paper.css) ---
const PAPER = '#f2ece1'
const INK = '#17130e'

function haloWidth(count: number): number {
  if (count >= 10) return 8
  if (count >= 5) return 6
  return 4
}

function lineWidth(count: number): number {
  if (count >= 10) return 2.2
  if (count >= 5) return 1.6
  return 1
}

function dotRadius(flightCount: number): number {
  if (flightCount >= 50) return 6
  if (flightCount >= 10) return 4.5
  return 3.2
}

function glowRadius(flightCount: number): number {
  if (flightCount >= 50) return 18
  if (flightCount >= 10) return 13
  return 8
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  )
}

type RouteLayers = {
  halo: L.Polyline
  line: L.Polyline
  dash: L.Polyline
  hit: L.Polyline
  /** widths and colour to fall back to when the pair stops being highlighted */
  base: { haloWeight: number; lineWeight: number; color: string }
}

/* One rule for how a pair is inked, so hover, highlight and the arriving flight
   cannot disagree about a line's weight or colour. `hold` is the flight's claim
   on a pair: its arc stays back until the plane has drawn it. */
function styleRoute(
  layers: RouteLayers,
  { on, hold, dark }: { on: boolean; hold: boolean; dark: boolean }
) {
  layers.line.setStyle({
    weight: on ? 2.6 : layers.base.lineWeight,
    opacity: hold ? 0 : on ? 1 : 0.85,
    color: on ? routeColor(5, dark) : layers.base.color,
  })
  layers.halo.setStyle({
    weight: on ? 9 : layers.base.haloWeight,
    // The faint impression in the stock is held back with the ink: the plane is
    // meant to draw the pair, not trace a line that was already there.
    opacity: hold ? 0 : dark ? 0.35 : 0.09,
  })
  layers.dash.setStyle({ opacity: hold ? 0 : on ? 0.85 : 0.55 })
  if (on) {
    layers.halo.bringToFront()
    layers.line.bringToFront()
    layers.dash.bringToFront()
  }
}

type Props = {
  className?: string
  airports: AtlasAirport[]
  routes: AtlasRoute[]
  showAirports: boolean
  basemap: BasemapId
  highlighted: string | null
  onHighlight: (key: string | null) => void
  /** the pair the plate flies in on; bump `flightToken` to fly it again */
  flightKey?: string | null
  flightToken?: number
}

export default function RouteAtlas({
  className,
  airports,
  routes,
  showAirports,
  basemap,
  highlighted,
  onHighlight,
  flightKey = null,
  flightToken = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const routeGroupRef = useRef<L.LayerGroup | null>(null)
  const airportGroupRef = useRef<L.LayerGroup | null>(null)
  const routeLayersRef = useRef<Map<string, RouteLayers>>(new Map())
  const hoverPopupRef = useRef<L.Popup | null>(null)
  // Read inside Leaflet event handlers, which are bound once per route render.
  const highlightRef = useRef<(key: string | null) => void>(onHighlight)
  highlightRef.current = onHighlight

  const dark = BASEMAPS.find((b) => b.id === basemap)?.dark ?? false

  // The flight reads these instead of depending on them: a refetch or a basemap
  // switch must not teleport a plane that is already in the air. `flightActive`
  // is the pair the flight has claimed, held back from the plate until it lands.
  const routesRef = useRef(routes)
  routesRef.current = routes
  const darkRef = useRef(dark)
  darkRef.current = dark
  const highlightedRef = useRef(highlighted)
  highlightedRef.current = highlighted
  const flightActiveRef = useRef<string | null>(null)

  // --- MAP INITIALISATION ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [50, 10],
      zoom: 4,
      minZoom: 2,
      // A printed plate carries no buttons; the plate is panned and pinched.
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: true,
    })
    mapRef.current = map
    routeGroupRef.current = L.layerGroup().addTo(map)
    airportGroupRef.current = L.layerGroup().addTo(map)

    // IATA labels are drawn for every airport, so below the opening zoom they
    // would overprint each other. CSS hides them until the plate is opened up.
    const syncLabelVisibility = () => {
      containerRef.current?.setAttribute('data-labels', map.getZoom() >= 4 ? 'on' : 'off')
    }
    syncLabelVisibility()
    map.on('zoomend', syncLabelVisibility)

    return () => {
      map.off('zoomend', syncLabelVisibility)
      map.remove()
      mapRef.current = null
      tileRef.current = null
      routeGroupRef.current = null
      airportGroupRef.current = null
      routeLayersRef.current.clear()
      hoverPopupRef.current = null
    }
  }, [])

  // --- BASEMAP ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const spec = BASEMAPS.find((b) => b.id === basemap) ?? BASEMAPS[0]

    if (tileRef.current) {
      map.removeLayer(tileRef.current)
      tileRef.current = null
    }
    tileRef.current = L.tileLayer(spec.url, {
      subdomains: spec.subdomains,
      maxZoom: spec.maxZoom,
      attribution: spec.attribution,
    }).addTo(map)
    // The tint that turns a stock basemap into paper stock lives in CSS.
    containerRef.current?.setAttribute('data-basemap', spec.id)
  }, [basemap])

  // --- FLIGHT PATHS ---
  useEffect(() => {
    const map = mapRef.current
    const group = routeGroupRef.current
    if (!map || !group) return

    group.clearLayers()
    routeLayersRef.current.clear()

    const hoverPopup = L.popup({
      closeButton: false,
      autoPan: false,
      className: 'map-popup-paper',
      offset: [0, -6],
    })
    hoverPopupRef.current = hoverPopup

    for (const route of routes) {
      // The impression the plate leaves in the stock.
      const halo = L.polyline(route.path, {
        color: dark ? '#000000' : INK,
        weight: haloWidth(route.count),
        opacity: dark ? 0.35 : 0.09,
        interactive: false,
      })

      // The printed arc.
      const line = L.polyline(route.path, {
        color: routeColor(route.count, dark),
        weight: lineWidth(route.count),
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false,
      })

      // A travelling dash in the paper's own colour, animated in CSS.
      const dash = L.polyline(route.path, {
        color: dark ? '#0b0d11' : PAPER,
        weight: Math.max(0.8, lineWidth(route.count) * 0.7),
        opacity: 0.55,
        className: 'atlas-dash',
        interactive: false,
      })

      // A wide, invisible band so a hairline arc stays hoverable. SVG's
      // `visiblePainted` hit-testing skips a stroke whose opacity is exactly 0,
      // so the band is kept a hair above it: invisible, but still hoverable.
      const hit = L.polyline(route.path, {
        color: INK,
        weight: 14,
        opacity: 0.001,
        interactive: true,
      })

      const describe = () => `
        <div class="mp mp-route">
          <div class="mp-head">
            <span class="mp-label">${route.count} leg${route.count > 1 ? 's' : ''} on this pair</span>
            <span class="mp-tick" style="background:${routeColor(route.count, dark)}"></span>
          </div>
          <div class="mp-pair">
            <div class="mp-end">
              <div class="mp-iata">${escapeHtml(route.from)}</div>
              <div class="mp-sub">${escapeHtml(route.fromCity)}</div>
            </div>
            <svg class="mp-arc" viewBox="0 0 60 18" aria-hidden="true">
              <path d="M1 15 C 16 2, 44 2, 59 15" />
            </svg>
            <div class="mp-end">
              <div class="mp-iata">${escapeHtml(route.to)}</div>
              <div class="mp-sub">${escapeHtml(route.toCity)}</div>
            </div>
          </div>
        </div>
      `

      hit.on('mouseover', (e: L.LeafletMouseEvent) => {
        hoverPopup.setLatLng(e.latlng).setContent(describe()).openOn(map)
        highlightRef.current(route.key)
      })
      hit.on('mousemove', (e: L.LeafletMouseEvent) => {
        hoverPopup.setLatLng(e.latlng)
      })
      hit.on('mouseout', () => {
        map.closePopup(hoverPopup)
        highlightRef.current(null)
      })

      group.addLayer(halo)
      group.addLayer(line)
      group.addLayer(dash)
      group.addLayer(hit)
      routeLayersRef.current.set(route.key, {
        halo,
        line,
        dash,
        hit,
        base: {
          haloWeight: haloWidth(route.count),
          lineWeight: lineWidth(route.count),
          color: routeColor(route.count, dark),
        },
      })
    }

    return () => {
      map.closePopup(hoverPopup)
    }
  }, [routes, dark])

  // --- HIGHLIGHT (restyle in place; rebuilding every arc on hover is wasteful) ---
  useEffect(() => {
    const flying = flightActiveRef.current
    for (const [key, layers] of routeLayersRef.current) {
      styleRoute(layers, { on: key === highlighted, hold: key === flying, dark })
    }
  }, [highlighted, dark, routes])

  // --- THE ARRIVING FLIGHT ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !flightKey || prefersReducedMotion()) return

    const route = routesRef.current.find((r) => r.key === flightKey)
    if (!route) return

    // The plane draws this pair's arc, so the plate holds its own ink back for
    // the length of the hop — and gets it straight back if the flight is called
    // off half way.
    const held = routeLayersRef.current.get(flightKey)
    const release = () => {
      flightActiveRef.current = null
      if (held) {
        styleRoute(held, {
          on: highlightedRef.current === flightKey,
          hold: false,
          dark: darkRef.current,
        })
      }
    }

    flightActiveRef.current = flightKey
    if (held) styleRoute(held, { on: false, hold: true, dark: darkRef.current })

    const flight = flyRoute(map, route, { dark: darkRef.current, onDone: release })

    return () => {
      flight.cancel()
      release()
    }
  }, [flightKey, flightToken])

  // --- AIRPORTS ---
  useEffect(() => {
    const map = mapRef.current
    const group = airportGroupRef.current
    if (!map || !group) return

    group.clearLayers()
    if (!showAirports) return

    for (const airport of airports) {
      const position: [number, number] = [airport.latitude, airport.longitude]

      // A soft ring around the airports you use most.
      L.circleMarker(position, {
        radius: glowRadius(airport.flightCount),
        stroke: false,
        fillColor: '#ce3b1e',
        fillOpacity: dark ? 0.18 : 0.12,
        interactive: false,
      }).addTo(group)

      // The node itself — paper centre, ink rule, as on the landing plate.
      const dot = L.circleMarker(position, {
        radius: dotRadius(airport.flightCount),
        color: dark ? '#f2ece1' : INK,
        weight: 1.4,
        fillColor: dark ? '#0b0d11' : '#e8dfcd',
        fillOpacity: 1,
      }).addTo(group)

      dot.bindTooltip(escapeHtml(airport.iata), {
        permanent: true,
        direction: 'bottom',
        offset: [0, 4],
        className: 'atlas-label',
        interactive: false,
      })

      dot.bindPopup(
        `
        <div class="mp">
          <div class="mp-head">
            <span class="mp-iata">${escapeHtml(airport.iata)}</span>
          </div>
          <div class="mp-name">${escapeHtml(airport.name)}</div>
          ${airport.city
          ? `<div class="mp-sub">${escapeHtml(airport.city)}${airport.country ? ', ' + escapeHtml(airport.country) : ''}</div>`
          : ''
        }
          <div class="mp-foot">${airport.flightCount} leg${airport.flightCount !== 1 ? 's' : ''} filed</div>
        </div>
      `,
        { className: 'map-popup-paper', closeButton: true, offset: [0, -6] }
      )
    }
  }, [airports, showAirports, dark])

  // --- FIT BOUNDS TO ROUTES ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || airports.length === 0) return
    const bounds = L.latLngBounds(airports.map((a) => [a.latitude, a.longitude] as [number, number]))
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 6, animate: true, duration: 1.2 })
  }, [airports])

  return <div ref={containerRef} className={className} data-basemap={basemap} />
}
