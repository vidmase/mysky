"use client"

import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { Clock, Plane, RotateCw } from "lucide-react"
import { useState } from "react"

import {
  airlineBrand,
  calculateDuration,
  formatTimeToHHMM,
  getAirlineLogo,
  resolveAirlineName,
} from "@/app/flights/lib/flight-utils"
import { allAirports } from "@/lib/airports"
import { getGreatCirclePoints, haversineDistance } from "@/lib/utils"

import s from "./boarding-pass.module.css"

/**
 * One leg of a booking, printed as the carrier's own boarding pass.
 *
 * Everything on it comes from the filed row. A real pass also carries a
 * sequence number, a cabin-bag allowance and a scannable code; none of those
 * are in the log, so rather than invent them the stub prints what is known —
 * seat, passenger and the booking reference — and the code strip is drawn
 * decoration with the reference spelled out beneath it.
 */
export type PassFlight = {
  id: string | number
  airline?: string | null
  flight_number?: string | null
  passenger_name?: string | null
  reservation_number?: string | null
  departure_airport?: string | null
  arrival_airport?: string | null
  departure_iata?: string | null
  arrival_iata?: string | null
  departure_date?: string | null
  departure_time?: string | null
  arrival_time?: string | null
  arrival_date?: string | null
  seat?: string | null
  total_receipt?: string | null
  extras_receipt?: string | null
  purchased_date?: string | null
  aircraft_registration?: string | null
  notes?: string | null
  cancelled?: boolean | null
}

/** Decorative bar widths — a drawn code, not an encoded one. */
const BARS = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2]

/** IATA if it was filed, otherwise the first three letters of the airport name. */
function code(iata?: string | null, airport?: string | null): string {
  const filed = (iata || "").trim().toUpperCase()
  if (filed && filed !== "NONE") return filed
  return (airport || "").trim().slice(0, 3).toUpperCase() || "???"
}

/** A window/aisle read off the seat letter. A/F are windows, C/D aisles on a 3-3. */
function seatKind(seat?: string | null): string | null {
  const letter = (seat || "").trim().toUpperCase().match(/([A-F])$/)?.[1]
  if (!letter) return null
  if (letter === "A" || letter === "F") return "Window"
  if (letter === "C" || letter === "D") return "Aisle"
  return "Middle"
}

function dash(value?: string | null): string {
  const v = (value || "").trim()
  return v && v.toLowerCase() !== "none" ? v : "—"
}

/* ── the back of the pass ──────────────────────────────────
   The route as it was flown, drawn from the atlas rather than fetched: the
   detail page already carries a real map on its own tab, and a pass prints
   once per leg, so a tile map here would mean a request and a map instance
   per card to show a picture too small to read. ─────────── */

type Point = [number, number]

/** The panel the chart is drawn in. The padding leaves room for the end labels. */
const CHART = { w: 340, h: 138, pad: 34 }

/** Grid spacings to choose from, coarse enough that a short hop still gets lines. */
const GRATICULE_STEPS = [1, 2, 5, 10, 20, 30]

/** Where the atlas puts an airport. Null when it does not hold one. */
function coordsFor(iata?: string | null, airport?: string | null): Point | null {
  const code = (iata || "").trim().toUpperCase()
  if (code && code !== "NONE") {
    const filed = allAirports.find((a) => a.iata === code)
    if (filed?.coordinates) return filed.coordinates as Point
  }
  // A row with no IATA still names the airport, which is how the duration
  // resolves its timezone, so the chart reads it the same way.
  const name = (airport || "").trim().toLowerCase()
  if (!name) return null
  const byName = allAirports.find(
    (a) => name.includes(a.city.toLowerCase()) || name.includes(a.name.toLowerCase())
  )
  return (byName?.coordinates as Point) ?? null
}

/**
 * The great circle between two airports, fitted to the panel.
 *
 * Longitude is squeezed by the cosine of the route's latitude so a degree east
 * covers the ground it really does, and the fitted box is scaled evenly, so the
 * arc keeps its shape instead of being stretched into the corners. Everything
 * comes back in panel coordinates, ready to draw.
 */
function plotRoute(from: Point, to: Point) {
  const k = Math.cos((((from[1] + to[1]) / 2) * Math.PI) / 180) || 1
  const arc: Point[] = getGreatCirclePoints(from, to, 48).map(([lon, lat]) => [lon * k, -lat])

  const xs = arc.map((p) => p[0])
  const ys = arc.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  // A hop of a few kilometres would otherwise scale up until the grid is
  // meaningless, so the box never closes below a quarter of a degree.
  const spanX = Math.max(maxX - minX, 0.25)
  const spanY = Math.max(maxY - minY, 0.25)

  const innerW = CHART.w - CHART.pad * 2
  const innerH = CHART.h - CHART.pad * 2
  const scale = Math.min(innerW / spanX, innerH / spanY)
  const offX = CHART.pad + (innerW - spanX * scale) / 2 - minX * scale
  const offY = CHART.pad + (innerH - spanY * scale) / 2 - minY * scale
  const at = ([x, y]: Point): Point => [x * scale + offX, y * scale + offY]

  const drawn = arc.map(at)
  const path = drawn.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")

  // The marker sits at the halfway point, turned along the track it is on there.
  const half = Math.floor(drawn.length / 2)
  const [ax, ay] = drawn[Math.max(0, half - 1)]
  const [bx, by] = drawn[Math.min(drawn.length - 1, half + 1)]
  const heading = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI

  // The panel shows more ground than the route's own box — the fit is even and
  // centred — so the grid is drawn across what is on show, not just across the
  // track, and the spacing is picked to leave about half a dozen lines.
  const lonAt = (x: number) => (x - offX) / scale / k
  const latAt = (y: number) => -(y - offY) / scale
  const lonLo = lonAt(0)
  const lonHi = lonAt(CHART.w)
  const latLo = latAt(CHART.h)
  const latHi = latAt(0)
  // Both axes share a spacing, as a degree grid does, so the step follows the
  // shorter of the two spans — pick it off the longer one and the short axis
  // ends up with a single stray line through it.
  const step =
    GRATICULE_STEPS.find((s) => Math.min(lonHi - lonLo, latHi - latLo) / s <= 5) ?? 30
  const ticks = (lo: number, hi: number) => {
    const out: number[] = []
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v)
    return out
  }

  return {
    path,
    start: drawn[0],
    end: drawn[drawn.length - 1],
    middle: drawn[half],
    heading,
    meridians: ticks(lonLo, lonHi).map((lon) => at([lon * k, 0])[0]),
    parallels: ticks(latLo, latHi).map((lat) => at([0, -lat])[1]),
  }
}

/** The route drawn as a chart: a graticule, the arc, and the two ends. */
function RouteChart({ from, to, fromCode, toCode }: { from: Point; to: Point; fromCode: string; toCode: string }) {
  const route = plotRoute(from, to)

  return (
    <svg
      className={s.chart}
      viewBox={`0 0 ${CHART.w} ${CHART.h}`}
      role="img"
      aria-label={`The great circle from ${fromCode} to ${toCode}`}
    >
      <g className={s.graticule}>
        {route.meridians.map((x, i) => (
          <line key={`m${i}`} x1={x} y1="0" x2={x} y2={CHART.h} />
        ))}
        {route.parallels.map((y, i) => (
          <line key={`p${i}`} x1="0" y1={y} x2={CHART.w} y2={y} />
        ))}
      </g>

      <path className={s.chartArc} d={route.path} />

      <g transform={`translate(${route.middle[0]} ${route.middle[1]}) rotate(${route.heading})`}>
        <path className={s.chartPlane} d="M-6 -4.5 L9 0 L-6 4.5 L-2.5 0 Z" />
      </g>

      {([
        [route.start, fromCode, route.end[0]],
        [route.end, toCode, route.start[0]],
      ] as [Point, string, number][]).map(([[x, y], label, otherX]) => {
        // Each code sits on the far side of its dot from the other end, so it
        // never comes to rest on the track running between them.
        const outward = x <= otherX ? -1 : 1
        return (
          <g key={label}>
            <circle className={s.chartStop} cx={x} cy={y} r="4.5" />
            <text
              className={s.chartLabel}
              x={x + outward * 9}
              y={y + 4}
              textAnchor={outward < 0 ? "end" : "start"}
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/**
 * The back: what the row knows about the flight itself rather than the boarding
 * of it. Anything the row does not hold is left off rather than guessed at.
 */
function PassBack({ flight, carrier }: { flight: PassFlight; carrier: string }) {
  const fromCode = code(flight.departure_iata, flight.departure_airport)
  const toCode = code(flight.arrival_iata, flight.arrival_airport)
  const from = coordsFor(flight.departure_iata, flight.departure_airport)
  const to = coordsFor(flight.arrival_iata, flight.arrival_airport)

  const km = from && to ? Math.round(haversineDistance(from, to)) : null
  const aloft =
    flight.departure_time && flight.arrival_time
      ? calculateDuration(flight.departure_time, flight.arrival_time, {
          departureDate: flight.departure_date ?? undefined,
          arrivalDate: flight.arrival_date,
          departureIata: flight.departure_iata,
          arrivalIata: flight.arrival_iata,
          departureAirportName: flight.departure_airport,
          arrivalAirportName: flight.arrival_airport,
        })
      : null

  const booked = flight.purchased_date ? new Date(flight.purchased_date) : null
  const bookedLabel =
    booked && !isNaN(booked.getTime()) ? format(booked, "d MMM yyyy", { locale: enUS }) : null

  return (
    <>
      <header className={s.band}>
        <span className={s.backTitle}>
          {fromCode} to {toCode}
        </span>
        <span className={s.tagline}>{carrier}</span>
      </header>

      <div className={s.backBody}>
        <div className={s.chartPanel}>
          {from && to ? (
            <RouteChart from={from} to={to} fromCode={fromCode} toCode={toCode} />
          ) : (
            /* The atlas is not complete, and a route drawn from a guess would be
               a lie about where the aeroplane went. */
            <p className={s.chartMissing}>
              The atlas has no position for {from ? toCode : fromCode}, so this leg is not charted.
            </p>
          )}
        </div>

        <aside className={s.backFacts}>
          <div>
            <div className={s.label}>Distance</div>
            <div className={s.factValue}>{km ? `${km.toLocaleString("en-GB")} km` : "—"}</div>
          </div>
          <div>
            <div className={s.label}>Time in the air</div>
            <div className={s.factValue}>{aloft || "—"}</div>
          </div>
          <div>
            <div className={s.label}>Aircraft</div>
            <div className={s.factValue}>{dash(flight.aircraft_registration)}</div>
          </div>
          <div>
            <div className={s.label}>Booked</div>
            <div className={s.factValue}>{bookedLabel || "—"}</div>
          </div>
        </aside>
      </div>

      {flight.notes?.trim() && (
        <div className={s.backNote}>
          <span className={s.label}>Note</span>
          <p>{flight.notes.trim()}</p>
        </div>
      )}
    </>
  )
}

export function BoardingPass({ flight }: { flight: PassFlight }) {
  const brand = airlineBrand(flight.airline, flight.flight_number)
  const carrier = resolveAirlineName(flight.airline, flight.flight_number) || "Unknown airline"
  const kind = seatKind(flight.seat)

  // The mark is what makes the card read as that airline's ticket, but the
  // logo host answers for carriers it knows and 404s for the rest, so the
  // name set in type stays as the fallback rather than an empty band.
  const logo = getAirlineLogo(flight.airline ?? null, flight.flight_number)
  const [logoBroken, setLogoBroken] = useState(false)
  const [flipped, setFlipped] = useState(false)

  const date = flight.departure_date ? new Date(flight.departure_date) : null
  const dateLabel =
    date && !isNaN(date.getTime()) ? format(date, "EEE, d MMM yyyy", { locale: enUS }) : "—"

  /* Both faces stay in the page so the card can turn between them; the one
     facing away is taken out of the reading order rather than left as a second
     copy of the flight underneath the first. */
  const flip = (side: "front" | "back") => (
    <button
      type="button"
      className={s.flip}
      onClick={() => setFlipped((was) => !was)}
      aria-pressed={flipped}
      /* The turned-away face is hidden from the reading order, so its copy of
         the control gives up its tab stop rather than being a focus trap in
         a card the reader cannot see. */
      tabIndex={(side === "front") === flipped ? -1 : undefined}
    >
      <RotateCw size={13} aria-hidden="true" />
      {flipped ? "Boarding pass" : "Route"}
    </button>
  )

  return (
    <div className={s.scene}>
      <article
        className={`${s.pass} ${flipped ? s.flipped : ""} ${flight.cancelled ? s.cancelled : ""}`}
        style={
          {
            "--band": brand.band,
            "--on-band": brand.onBand,
            "--accent": brand.accent,
            "--on-accent": brand.onAccent,
          } as React.CSSProperties
        }
      >
        <div className={`${s.face} ${s.front}`} aria-hidden={flipped}>
      <header className={s.band}>
        {logo && !logoBroken ? (
          <span className={s.logoPlate}>
            {/* On a white plate: these marks are drawn for light stock, and the
                band underneath is whatever colour the carrier paints it. */}
            <img src={logo} alt={carrier} onError={() => setLogoBroken(true)} />
          </span>
        ) : (
          <span className={s.wordmark}>{carrier}</span>
        )}
        <span className={s.bandTitle}>Boarding pass</span>
        <span className={s.tagline}>
          {brand.tagline}
          <Plane size={16} aria-hidden="true" />
        </span>
      </header>

      <div className={s.body}>
        <div className={s.route}>
          <div className={s.endpoints}>
            <div>
              <div className={s.label}>From</div>
              <div className={s.iata}>{code(flight.departure_iata, flight.departure_airport)}</div>
              <div className={s.city}>{dash(flight.departure_airport)}</div>
            </div>

            <div className={s.hop} aria-hidden="true">
              <span className={s.hopLine} />
              <Plane size={18} />
              <span className={s.hopLine} />
            </div>

            <div className={s.to}>
              <div className={s.label}>To</div>
              <div className={s.iata}>{code(flight.arrival_iata, flight.arrival_airport)}</div>
              <div className={s.city}>{dash(flight.arrival_airport)}</div>
            </div>
          </div>

          <dl className={s.facts}>
            <div>
              <dt className={s.label}>Date</dt>
              <dd className={s.factValue}>{dateLabel}</dd>
            </div>
            <div>
              <dt className={s.label}>Departure</dt>
              <dd className={s.factValue}>
                {flight.departure_time ? formatTimeToHHMM(flight.departure_time) : "—"}
              </dd>
            </div>
            <div>
              <dt className={s.label}>Arrival</dt>
              <dd className={s.factValue}>
                {flight.arrival_time ? formatTimeToHHMM(flight.arrival_time) : "—"}
              </dd>
            </div>
            <div>
              <dt className={s.label}>Flight</dt>
              <dd className={s.factValue}>{dash(flight.flight_number)}</dd>
            </div>
          </dl>
        </div>

        <aside className={s.stub}>
          <span className={`${s.notch} ${s.notchTop}`} aria-hidden="true" />
          <div>
            <div className={s.label}>Passenger</div>
            <div className={s.factValue}>{dash(flight.passenger_name)}</div>
          </div>

          <div className={s.seatRow}>
            <div>
              <div className={s.label}>Seat</div>
              <div className={s.factValue}>{dash(flight.seat)}</div>
              {kind && <span className={s.chip}>{kind}</span>}
            </div>
            <div>
              <div className={s.label}>Fare</div>
              <div className={s.factValue}>{dash(flight.total_receipt)}</div>
              {/* Extras came out of that fare, so they read as a share of it. */}
              {flight.extras_receipt && (
                <span className={s.chip}>+{flight.extras_receipt} extras</span>
              )}
            </div>
          </div>

          <div>
            <span className={s.code} aria-hidden="true">
              {BARS.map((w, i) => (
                <span key={i} style={{ width: `${w}px` }} />
              ))}
            </span>
            <div className={s.ref}>{dash(flight.reservation_number)}</div>
          </div>
          <span className={`${s.notch} ${s.notchBottom}`} aria-hidden="true" />
        </aside>
      </div>

      <footer className={s.foot}>
        {/* A real pass prints the bag allowance here; the log does not hold it,
            so the strip carries only what is true of every departure. */}
        <span className={s.footItem}>
          <Clock size={14} aria-hidden="true" />
          Be at the gate before departure
        </span>
        <span className={s.footBrand}>{brand.tagline}</span>
        {flip("front")}
      </footer>
        </div>

        <div className={`${s.face} ${s.back}`} aria-hidden={!flipped}>
          <PassBack flight={flight} carrier={carrier} />
          <footer className={s.foot}>
            <span className={s.footItem}>{dash(flight.flight_number)}</span>
            <span className={s.footBrand}>{dateLabel}</span>
            {flip("back")}
          </footer>
        </div>
      </article>
    </div>
  )
}
