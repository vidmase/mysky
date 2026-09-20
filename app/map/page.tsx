"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useToast } from '@/hooks/use-toast'
import { MapPin, PlaneTakeoff } from 'lucide-react'
import { getGreatCirclePoints, haversineDistance } from '@/lib/utils'
import { PaperNav } from '@/app/components/paper-nav'
import {
  BASEMAPS,
  ROUTE_COLORS,
  ROUTE_STEPS,
  isDarkBasemap,
  prefersReducedMotion,
  routeColor,
  type BasemapId,
} from './atlas-config'
import type { AtlasAirport, AtlasRoute } from './RouteAtlas'
import s from './map.module.css'

// Leaflet reaches for `window` as it loads, so the canvas is client-only.
const RouteAtlas = dynamic(() => import('./RouteAtlas'), { ssr: false })

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

/**
 * getGreatCirclePoints normalises every longitude into [-180, 180], which makes
 * a Pacific arc jump the full width of the plate. Leaflet is happy with
 * longitudes outside that range, so the jumps are unwound back into one
 * continuous run before the arc is drawn.
 */
function toLeafletPath(points: [number, number][]): [number, number][] {
  const path: [number, number][] = []
  let offset = 0
  for (let i = 0; i < points.length; i++) {
    const [lng, lat] = points[i]
    if (i > 0) {
      const previous = points[i - 1][0]
      if (lng - previous > 180) offset -= 360
      else if (previous - lng > 180) offset += 360
    }
    path.push([lat, lng + offset])
  }
  return path
}

/** Great-circle length of a pair — only used to break ties between equal counts. */
function routeSpanKm(route: AtlasRoute): number {
  const [lat1, lng1] = route.path[0]
  const [lat2, lng2] = route.path[route.path.length - 1]
  return haversineDistance([lng1, lat1], [lng2, lat2])
}

// --- COMPONENT ---
export default function MapPage() {
  const [loading, setLoading] = useState(true)
  const [vidmaFlights, setVidmaFlights] = useState<VidmaFlight[]>([])
  const [airports, setAirports] = useState<Airport[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [highlightedRoute, setHighlightedRoute] = useState<string | null>(null)
  const [showAirports, setShowAirports] = useState(true)
  const [basemap, setBasemap] = useState<BasemapId>('paper')
  const { toast } = useToast()

  // The arriving flight: which pair the plane flies in on, and a token so the
  // same pair can be flown again without the state looking unchanged.
  const [flightKey, setFlightKey] = useState<string | null>(null)
  const [flightToken, setFlightToken] = useState(0)
  const fly = useCallback((key: string) => {
    setFlightKey(key)
    setFlightToken((token) => token + 1)
  }, [])

  const dark = isDarkBasemap(basemap)

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchFlightData = async () => {
      setLoading(true)
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
  }, [toast])

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

  // --- AIRPORTS FOR THE PLATE ---
  const atlasAirports = useMemo((): AtlasAirport[] => {
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
      ...airport,
      flightCount: airportFlightCounts.get(airport.iata) || 0,
    }))
  }, [airports, vidmaFlights])

  // --- FLIGHT PATHS FOR THE PLATE ---
  const atlasRoutes = useMemo((): AtlasRoute[] => {
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
      return {
        key: `${route.from}-${route.to}`,
        from: route.from,
        to: route.to,
        fromCity: route.fromAirport.city,
        toCity: route.toAirport.city,
        count: route.count,
        path: toLeafletPath(points as [number, number][]),
      }
    })
  }, [routes])

  // --- THE ARRIVING FLIGHT ---
  /* The pair the plate flies in on: the one you fly most, with the longest hop
     as the tie-break, so even a fresh log gets a line worth watching. */
  const signatureRoute = useMemo((): AtlasRoute | null => {
    if (atlasRoutes.length === 0) return null
    return [...atlasRoutes].sort(
      (a, b) => b.count - a.count || routeSpanKm(b) - routeSpanKm(a)
    )[0]
  }, [atlasRoutes])

  // Flown once per session, unasked — after that the plane is on call from the
  // control in the corner and from any pair in the index. The short wait lets
  // the plate finish settling to your airports before the plane leaves.
  useEffect(() => {
    if (!signatureRoute || flightKey || prefersReducedMotion()) return
    let seen = false
    try {
      seen = window.sessionStorage.getItem('atlas-flight') === '1'
    } catch {
      // No session storage to remember it by: fly it rather than not at all.
      seen = false
    }
    if (seen) return

    const timer = window.setTimeout(() => {
      fly(signatureRoute.key)
      try {
        window.sessionStorage.setItem('atlas-flight', '1')
      } catch {
        /* nothing to remember it by */
      }
    }, 700)

    return () => window.clearTimeout(timer)
  }, [signatureRoute, flightKey, fly])

  // --- RENDER ---
  const topRoutes = [...routes].sort((a, b) => b.count - a.count).slice(0, 20)
  const legendColors = dark ? ROUTE_COLORS.dark : ROUTE_COLORS.light

  return (
    <div className={s.page}>
      <style jsx global>{`
        /* The plate's own stock shows through wherever a tile has not landed */
        .atlas-canvas.leaflet-container {
          background: var(--paper-2);
          font-family: var(--body);
        }
        .atlas-canvas[data-basemap='midnight'].leaflet-container,
        .atlas-canvas[data-basemap='satellite'].leaflet-container {
          background: #0b0d11;
        }

        /* Paper and Midnight are the same OpenStreetMap tiles, printed two ways.
           OSM's stock style is far more colourful than a plate wants, so it is
           flattened to grey before the warm tint lands, which keeps the result
           predictable whatever colour the source happened to be. */
        .atlas-canvas[data-basemap='paper'] .leaflet-tile-pane {
          filter: grayscale(1) sepia(0.55) saturate(1.35) hue-rotate(-10deg)
            brightness(1.08) contrast(0.82);
          mix-blend-mode: multiply;
          opacity: 0.92;
        }
        /* Inverting the same sheet gives a night plate with no second provider */
        .atlas-canvas[data-basemap='midnight'] .leaflet-tile-pane {
          filter: invert(1) hue-rotate(180deg) grayscale(0.7) brightness(0.82)
            contrast(1.05);
        }
        .atlas-canvas[data-basemap='satellite'] .leaflet-tile-pane {
          filter: saturate(0.8) contrast(1.06) brightness(0.98);
        }

        /* A paper-coloured dash travelling the arc */
        .atlas-dash {
          stroke-dasharray: 3 7;
          animation: atlas-dash 2.2s linear infinite;
        }
        @keyframes atlas-dash {
          to {
            stroke-dashoffset: -20;
          }
        }

        /* ---- The arriving flight (ported from the nyc-paris-flight block).
           Every moving part is an inner element: Leaflet writes the marker's own
           transform to place it there, so an animation on the marker element
           itself would fight the map for the plane's position. ---- */
        .atlas-flight-glow {
          filter: blur(3px);
        }
        .atlas-plane,
        .atlas-tick,
        .atlas-doodle,
        .atlas-pop,
        .atlas-stamp {
          background: none;
          border: 0;
        }
        .atlas-plane-tilt,
        .atlas-plane-scale {
          display: block;
          width: 100%;
          height: 100%;
          transform-origin: 50% 50%;
          will-change: transform;
        }
        .atlas-plane svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
          filter: drop-shadow(0 3px 3px rgba(23, 19, 14, 0.26));
        }
        .atlas-plane-hull {
          fill: var(--flight-plate);
          stroke: rgba(23, 19, 14, 0.5);
          stroke-width: 2;
        }
        .atlas-canvas[data-basemap='midnight'] .atlas-plane-hull,
        .atlas-canvas[data-basemap='satellite'] .atlas-plane-hull {
          stroke: rgba(242, 236, 225, 0.45);
        }
        .atlas-plane-core {
          fill: var(--flight-ink);
        }
        .atlas-plane-dot {
          fill: var(--flight-plate);
          opacity: 0.95;
        }
        .atlas-plane.is-landing .atlas-plane-scale {
          animation: atlas-touchdown 520ms cubic-bezier(0.2, 1.5, 0.4, 1) both;
        }
        @keyframes atlas-touchdown {
          0% {
            transform: scale(1);
          }
          30% {
            transform: scale(1.24);
          }
          58% {
            transform: scale(0.92);
          }
          100% {
            transform: scale(1);
          }
        }
        .atlas-plane.is-fading,
        .atlas-doodle.is-fading,
        .atlas-pop.is-fading {
          opacity: 0;
          transition: opacity 620ms ease;
        }

        /* The ticks the plane prints as it passes */
        .atlas-tick span {
          display: block;
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: var(--paper);
          border: 1.5px solid var(--tick-ink, #ce3b1e);
          box-shadow: 0 1px 2px rgba(23, 19, 14, 0.18);
          transform-origin: 50% 50%;
        }

        /* The doodle ring: two scratches of the same pen, closed on arrival */
        .atlas-doodle svg {
          display: block;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .atlas-doodle path {
          fill: none;
          stroke: var(--flight-ring);
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .atlas-ring-main {
          stroke-width: 5.6;
          filter: drop-shadow(0 1px 2px rgba(23, 19, 14, 0.14));
        }
        .atlas-ring-echo {
          stroke-width: 2.6;
          opacity: 0.82;
        }

        .atlas-pop span {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 999px;
          border: 3px solid var(--flight-ring, #ce3b1e);
          animation: atlas-circle-pop 900ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
        }
        @keyframes atlas-circle-pop {
          0% {
            transform: scale(0.42);
            opacity: 0.85;
          }
          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        /* Arrival is stamped, not announced */
        .atlas-stamp-inner {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 6px 4px;
          background: var(--paper);
          border: 1px solid var(--vermillion);
          box-shadow: 2px 2px 0 rgba(23, 19, 14, 0.14);
          font-family: var(--code);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink);
          white-space: nowrap;
          transform: translate(22px, -52px) rotate(-3.5deg);
          transform-origin: 0 50%;
        }
        .atlas-stamp-rule {
          width: 10px;
          height: 2px;
          flex: none;
          background: var(--vermillion);
        }
        .atlas-stamp.is-in .atlas-stamp-inner {
          animation: atlas-stamp-in 420ms cubic-bezier(0.2, 1.4, 0.4, 1) both;
        }
        @keyframes atlas-stamp-in {
          0% {
            transform: translate(16px, -38px) rotate(-3.5deg) scale(0.84);
          }
          100% {
            transform: translate(22px, -52px) rotate(-3.5deg) scale(1);
          }
        }
        .atlas-stamp.is-out .atlas-stamp-inner {
          animation: none;
          opacity: 0;
          transition: opacity 620ms ease;
        }

        /* IATA labels, set as the plate sets them */
        .atlas-canvas .leaflet-tooltip.atlas-label {
          background: transparent;
          border: 0;
          box-shadow: none;
          padding: 0;
          margin: 0;
          font-family: var(--code);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: var(--ink-2);
          text-shadow:
            0 1px 0 var(--paper), 0 -1px 0 var(--paper),
            1px 0 0 var(--paper), -1px 0 0 var(--paper);
        }
        .atlas-canvas[data-basemap='midnight'] .leaflet-tooltip.atlas-label,
        .atlas-canvas[data-basemap='satellite'] .leaflet-tooltip.atlas-label {
          color: #efe7d8;
          text-shadow:
            0 1px 0 #0b0d11, 0 -1px 0 #0b0d11,
            1px 0 0 #0b0d11, -1px 0 0 #0b0d11;
        }
        .atlas-canvas .leaflet-tooltip.atlas-label::before {
          display: none;
        }
        /* Zoomed out, every label would overprint its neighbours */
        .atlas-canvas[data-labels='off'] .leaflet-tooltip.atlas-label {
          display: none;
        }

        /* Leaflet popups, reprinted on paper */
        .map-popup-paper .leaflet-popup-content-wrapper {
          background: transparent;
          padding: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .map-popup-paper .leaflet-popup-content {
          margin: 0;
          width: auto !important;
          line-height: 1.4;
        }
        .map-popup-paper .leaflet-popup-tip-container {
          display: none;
        }
        .map-popup-paper .leaflet-popup-close-button {
          color: var(--ink-3);
          font-size: 16px;
          padding: 4px 8px 0 0;
        }
        .map-popup-paper .leaflet-popup-close-button:hover {
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

        /* Leaflet's own chrome, toned down to hairlines */
        .atlas-canvas .leaflet-control-attribution {
          background: rgba(251, 247, 239, 0.85);
          font-family: var(--body);
          font-size: 10px;
          color: var(--ink-2);
        }
        .atlas-canvas .leaflet-control-attribution a {
          color: var(--ink-2);
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
              <dd className={`${s.ledgerValue} ${s.ledgerValueHot}`}>{routes.length}</dd>
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
          <RouteAtlas
            className={`${s.canvas} atlas-canvas`}
            airports={atlasAirports}
            routes={atlasRoutes}
            showAirports={showAirports}
            basemap={basemap}
            highlighted={highlightedRoute}
            onHighlight={setHighlightedRoute}
            flightKey={flightKey}
            flightToken={flightToken}
          />

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
              {ROUTE_STEPS.map((label, i) => (
                <div key={label} className={s.legendRow}>
                  <span className={s.legendRule} style={{ background: legendColors[i] }} />
                  <span className={s.legendLabel}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls — top right */}
          <div className={s.controls}>
            <div className={s.basemaps}>
              {BASEMAPS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setBasemap(option.id)}
                  className={`${s.control} ${s.controlQuiet} ${basemap === option.id ? s.controlOn : ''}`}
                  aria-pressed={basemap === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>

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
              onClick={() => signatureRoute && fly(signatureRoute.key)}
              disabled={!signatureRoute}
              className={`${s.control} ${s.controlQuiet}`}
              title={
                signatureRoute
                  ? `Fly ${signatureRoute.from} → ${signatureRoute.to} again`
                  : 'No pairs filed yet'
              }
            >
              <PlaneTakeoff />
              Fly again
            </button>
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
                      onClick={() => fly(key)}
                      title={`Fly ${route.from} → ${route.to}`}
                    >
                      <span
                        className={s.indexTick}
                        style={{ background: routeColor(route.count, dark) }}
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
