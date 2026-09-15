"use client"

import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { Clock, Plane } from "lucide-react"
import { useState } from "react"

import {
  airlineBrand,
  formatTimeToHHMM,
  getAirlineLogo,
  resolveAirlineName,
} from "@/app/flights/lib/flight-utils"

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
  seat?: string | null
  total_receipt?: string | null
  extras_receipt?: string | null
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

export function BoardingPass({ flight }: { flight: PassFlight }) {
  const brand = airlineBrand(flight.airline, flight.flight_number)
  const carrier = resolveAirlineName(flight.airline, flight.flight_number) || "Unknown airline"
  const kind = seatKind(flight.seat)

  // The mark is what makes the card read as that airline's ticket, but the
  // logo host answers for carriers it knows and 404s for the rest, so the
  // name set in type stays as the fallback rather than an empty band.
  const logo = getAirlineLogo(flight.airline ?? null, flight.flight_number)
  const [logoBroken, setLogoBroken] = useState(false)

  const date = flight.departure_date ? new Date(flight.departure_date) : null
  const dateLabel =
    date && !isNaN(date.getTime()) ? format(date, "EEE, d MMM yyyy", { locale: enUS }) : "—"

  return (
    <article
      className={`${s.pass} ${flight.cancelled ? s.cancelled : ""}`}
      style={
        {
          "--band": brand.band,
          "--on-band": brand.onBand,
          "--accent": brand.accent,
          "--on-accent": brand.onAccent,
        } as React.CSSProperties
      }
    >
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
      </footer>
    </article>
  )
}
