"use client"

import Image from "next/image"
import { Fragment, useEffect, useState } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { ArrowRight, Pencil, Trash2, Building, Loader2, RotateCcw, ChevronDown } from "lucide-react"
import { calculateDuration, formatTimeToHHMM, getAirlineLogo, resolveAirlineName } from "@/app/flights/lib/flight-utils"
import { DateTime } from "luxon"
import { AIRPORT_TIMEZONES } from "@/lib/airport-timezones"
import type { Flight } from "@/types/flight"
import type { Booking } from "@/lib/statistics/booking-spend"
import s from "@/app/flights/flights.module.css"

export interface FlightsTableProps {
  loading: boolean
  /** one entry per reservation; its legs are listed earliest departure first */
  bookings: Booking<Flight>[]
  onEdit: (flight: Flight) => void
  onDeleteRequest: (flight: Flight) => void
  onFlyAgain?: (flight: Flight) => void
  onRowClick: (flight: Flight) => void
}

/**
 * What the booking cost, printed in the currency it was filed in. When every leg
 * repeats the same fare the receipt is shown exactly as filed; only a booking
 * whose legs were priced separately needs its total composed from the parts.
 */
function formatBookingFare(booking: Booking<Flight>): string {
  if (booking.total == null) return "—"
  const filed = booking.legs.find((leg) => leg.total_receipt)?.total_receipt ?? ""
  const own = parseFloat(String(filed).replace(/[^0-9.-]/g, ""))
  if (!isNaN(own) && Math.abs(own - booking.total) < 0.01) return String(filed)
  const currency = String(filed).replace(/[\d.,\s-]+$/, "").trim()
  return `${currency ? currency + " " : ""}${booking.total.toFixed(2)}`
}

function isUpcoming(date: string) {
  const flightDate = new Date(date)
  flightDate.setHours(23, 59, 59, 999)
  return flightDate > new Date()
}

// Simple in-memory cache per tab to avoid duplicate fetches while browsing
const statusCache = new Map<string, any>()

function DeltaBadge({ flight, kind }: { flight: Flight; kind: 'dep' | 'arr' }) {
  const [delta, setDelta] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [actualText, setActualText] = useState<string | null>(null)
  const [isEstimated, setIsEstimated] = useState<boolean>(false)

  useEffect(() => {
    const fn = flight.flight_number?.trim()
    const date = flight.departure_date?.slice(0, 10)
    if (!fn || !date) return
    const cacheKey = `${fn}|${date}`
    const cached = statusCache.get(cacheKey)
    if (cached) {
      computeAndSet(cached)
      return
    }
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/flight-status?flightNumber=${encodeURIComponent(fn)}&date=${encodeURIComponent(date)}&dateLocalRole=Both`)
        if (!res.ok) { setDelta(null); return }
        const json = await res.json().catch(() => null)
        statusCache.set(cacheKey, json)
        if (alive) computeAndSet(json)
      } catch {
        if (alive) setDelta(null)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight.flight_number, flight.departure_date])

  const computeAndSet = (json: any) => {
    try {
      const items: any[] = json?.flights || []
      if (!items.length) { setDelta(null); return }
      const depIata = flight.departure_iata || undefined
      const arrIata = flight.arrival_iata || undefined
      const desiredDepDate = (flight.departure_date?.slice(0,10)) || ''
      const desiredArrDate = (flight.arrival_date?.slice(0,10)) || ''

      const getLocalDate = (iso?: string | null) => (iso ? iso.slice(0,10) : '')

      // Prefer exact same-date + IATA match, then same-date, then IATA, then fallback
      const sameDateIata = items.find((f: any) => {
        if (kind === 'dep') {
          const d = getLocalDate(f?.departure?.scheduledTimeLocal)
          return d === desiredDepDate && (!depIata || f?.departure?.airport?.iata === depIata)
        } else {
          const d = getLocalDate(f?.arrival?.scheduledTimeLocal)
          const wantDate = desiredArrDate || getLocalDate(f?.arrival?.scheduledTimeLocal)
          return d === wantDate && (!arrIata || f?.arrival?.airport?.iata === arrIata)
        }
      })
      const sameDate = sameDateIata || items.find((f: any) => {
        if (kind === 'dep') return getLocalDate(f?.departure?.scheduledTimeLocal) === desiredDepDate
        const wantDate = desiredArrDate || getLocalDate(f?.arrival?.scheduledTimeLocal)
        return getLocalDate(f?.arrival?.scheduledTimeLocal) === wantDate
      })
      const sameIata = sameDate || items.find((f: any) => {
        if (kind === 'dep') return depIata ? f?.departure?.airport?.iata === depIata : false
        return arrIata ? f?.arrival?.airport?.iata === arrIata : false
      })
      const match = sameIata || items[0]

      const tzCode = kind === 'dep' ? depIata : arrIata
      if (!tzCode) { setDelta(null); return }
      const tz = AIRPORT_TIMEZONES[tzCode]
      if (!tz) { setDelta(null); return }
      const schedRaw = kind === 'dep' ? flight.departure_time : flight.arrival_time
      const actualLocal = kind === 'dep' ? match?.departure?.actualTimeLocal : match?.arrival?.actualTimeLocal
      const estimatedLocal = kind === 'dep' ? match?.departure?.estimatedTimeLocal : match?.arrival?.estimatedTimeLocal
      // Prefer actual; fallback to estimated if actual missing
      const chosenLocal: string | null = actualLocal || estimatedLocal || null
      // Only compute/display when we have schedule and some real/estimated time
      if (!schedRaw || !chosenLocal) { setDelta(null); setActualText(null); setIsEstimated(false); return }
      const hhmm = formatTimeToHHMM(schedRaw) || schedRaw
      // Use the correct schedule date per side (arrival may be next day)
      const apiSchedLocal = kind === 'dep' ? match?.departure?.scheduledTimeLocal : match?.arrival?.scheduledTimeLocal
      const date = (kind === 'dep' ? desiredDepDate : (desiredArrDate || getLocalDate(apiSchedLocal))) || ''
      const [h, m] = hhmm.split(':').map(Number)
      const sched = DateTime.fromObject({
        year: Number(date.slice(0,4)), month: Number(date.slice(5,7)), day: Number(date.slice(8,10)), hour: h, minute: m
      }, { zone: tz })
      const actual = DateTime.fromISO(chosenLocal, { zone: tz })
      if (!sched.isValid || !actual.isValid) { setDelta(null); return }
      setDelta(Math.round(actual.diff(sched, 'minutes').minutes))
      // Display actual/estimated time in HH:mm
      setActualText(actual.toFormat('HH:mm'))
      setIsEstimated(!actualLocal && !!estimatedLocal)
    } catch { setDelta(null) }
  }

  if (loading) return <Loader2 className={s.spin} />
  if (delta == null || !actualText) return (
    <span className={`${s.chip} ${s.chipMuted}`}>—</span>
  )
  // Compose: show actual/estimated time chip, then delta chip
  const timeChip = (
    <span className={s.chip}>
      {isEstimated ? 'est ' : ''}{actualText}
    </span>
  )
  if (delta === 0) {
    return (
      <>
        {timeChip}
        <span className={`${s.chip} ${s.chipOnTime}`}>on time</span>
      </>
    )
  }
  const late = delta > 0
  return (
    <>
      {timeChip}
      <span className={`${s.chip} ${late ? s.chipLate : s.chipEarly}`}>
        {late ? '+' : ''}{delta}m
      </span>
    </>
  )
}

/** IATA when we have one, otherwise the first three letters of the airport. */
function iataOf(iata: string | null | undefined, airportName: string) {
  return iata && iata !== "None" ? iata : airportName.slice(0, 3).toUpperCase()
}

export function FlightsTable({ loading, bookings, onEdit, onDeleteRequest, onFlyAgain, onRowClick }: FlightsTableProps) {
  // Which bookings are showing their other legs. Keyed by reference, so the state
  // survives re-sorting and paging rather than tracking a row position.
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Route</th>
            <th scope="col">Flight</th>
            <th scope="col">Departs</th>
            <th scope="col">Arrives</th>
            <th scope="col">Block</th>
            <th scope="col">Fare</th>
            <th scope="col">Reference</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={9}>
                <div className={s.state}>
                  <h3 className={s.stateTitle}>Pulling the log</h3>
                  <p className={s.stateNote}>One moment.</p>
                </div>
              </td>
            </tr>
          ) : bookings.length === 0 ? (
            <tr>
              <td colSpan={9}>
                <div className={s.state}>
                  <h3 className={s.stateTitle}>Nothing filed under these terms</h3>
                  <p className={s.stateNote}>Adjust the search or clear a filter to widen the page.</p>
                </div>
              </td>
            </tr>
          ) : (
            bookings.map((booking, i) => {
              const outbound = booking.legs[0]
              const expanded = open.has(booking.key)
              const fareLabel = formatBookingFare(booking)
              return (
                <Fragment key={booking.key}>
                  <LegRow
                    flight={outbound}
                    index={i}
                    isLeg={false}
                    legCount={booking.legs.length}
                    fareLabel={fareLabel}
                    expanded={expanded}
                    onToggle={() => toggle(booking.key)}
                    onEdit={onEdit}
                    onDeleteRequest={onDeleteRequest}
                    onFlyAgain={onFlyAgain}
                    onRowClick={onRowClick}
                  />
                  {expanded &&
                    booking.legs.slice(1).map((leg) => (
                      <LegRow
                        key={leg.id}
                        flight={leg}
                        index={i}
                        isLeg
                        legCount={booking.legs.length}
                        fareLabel={fareLabel}
                        onEdit={onEdit}
                        onDeleteRequest={onDeleteRequest}
                        onFlyAgain={onFlyAgain}
                        onRowClick={onRowClick}
                      />
                    ))}
                </Fragment>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

type LegRowProps = {
  flight: Flight
  index: number
  /** true for a leg shown underneath its booking's outbound row */
  isLeg: boolean
  legCount: number
  fareLabel: string
  expanded?: boolean
  onToggle?: () => void
  onEdit: (flight: Flight) => void
  onDeleteRequest: (flight: Flight) => void
  onFlyAgain?: (flight: Flight) => void
  onRowClick: (flight: Flight) => void
}

function LegRow({
  flight,
  index,
  isLeg,
  legCount,
  fareLabel,
  expanded,
  onToggle,
  onEdit,
  onDeleteRequest,
  onFlyAgain,
  onRowClick,
}: LegRowProps) {
  return (
    <tr
      className={`${s.row} ${isLeg ? s.legRow : ""} ${flight.cancelled ? s.rowCancelled : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      onClick={() => onRowClick(flight)}
    >
      <td>
        <span className={s.date}>
          {format(new Date(flight.departure_date), "dd MMM yyyy", { locale: enUS })}
        </span>
        <span className={s.weekday}>
          {format(new Date(flight.departure_date), "EEEE", { locale: enUS })}
        </span>
        {flight.cancelled ? (
          <span className={s.cancelledTag}>Cancelled</span>
        ) : (
          isUpcoming(flight.departure_date) && <span className={s.upcoming}>Upcoming</span>
        )}
        {legCount > 1 && !isLeg && onToggle && (
          <button
            type="button"
            className={s.legToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide the other legs" : `Show the other ${legCount - 1} leg${legCount > 2 ? "s" : ""}`}
            onClick={(e) => { e.stopPropagation(); onToggle() }}
          >
            <ChevronDown className={expanded ? s.legChevronOpen : s.legChevron} />
            {expanded ? "Hide legs" : `+${legCount - 1} leg${legCount > 2 ? "s" : ""}`}
          </button>
        )}
      </td>

      <td>
        <span className={s.route}>
          {iataOf(flight.departure_iata, flight.departure_airport)}
          <svg
            className={s.routeArrow}
            width="18"
            height="8"
            viewBox="0 0 18 8"
            fill="none"
            aria-hidden="true"
          >
            <path d="M0 4h16M12.5 1L16 4l-3.5 3" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          {iataOf(flight.arrival_iata, flight.arrival_airport)}
        </span>
        <span className={s.routeNames}>
          {flight.departure_airport} — {flight.arrival_airport}
          {flight.arrival_country && flight.arrival_country !== "None"
            ? ` (${flight.arrival_country})`
            : ""}
        </span>
      </td>

      <td>
        <div className={s.flightCell}>
          <span className={s.logo}>
            {(flight.airline || flight.flight_number) ? (
              <Image
                src={getAirlineLogo(flight.airline, flight.flight_number)}
                alt=""
                width={22}
                height={22}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement
                    ?.querySelector('.fallback-icon')
                    ?.classList.remove('hidden')
                }}
              />
            ) : null}
            <Building className="fallback-icon hidden h-4 w-4" />
          </span>
          <span>
            <span className={s.flightNo}>{flight.flight_number}</span>
            <span className={s.airline}>
                {resolveAirlineName(flight.airline, flight.flight_number) || "Unknown airline"}
              </span>
            {flight.seat && <span className={s.seat}>Seat {flight.seat}</span>}
          </span>
        </div>
      </td>

      <td>
        <span className={s.time}>{formatTimeToHHMM(flight.departure_time) || "—"}</span>
        <span className={s.timeMeta}>
          <DeltaBadge flight={flight} kind="dep" />
        </span>
      </td>

      <td>
        <span className={s.time}>{formatTimeToHHMM(flight.arrival_time) || "—"}</span>
        <span className={s.timeMeta}>
          <DeltaBadge flight={flight} kind="arr" />
        </span>
      </td>

      <td>
        <span className={s.duration}>
          {calculateDuration(
            flight.departure_time,
            flight.arrival_time,
            {
              departureDate: flight.departure_date,
              arrivalDate: flight.arrival_date,
              departureIata: flight.departure_iata,
              arrivalIata: flight.arrival_iata,
              departureAirportName: flight.departure_airport,
              arrivalAirportName: flight.arrival_airport,
            }
          )}
        </span>
      </td>

      <td>
        {isLeg ? (
          <>
            <span className={s.fareIncluded}>incl. in {flight.reservation_number}</span>
            <span className={s.fareMeta}>{fareLabel}</span>
          </>
        ) : (
          <>
            <span className={s.fare}>{fareLabel}</span>
            <span className={s.fareMeta}>
              Bought {format(new Date(flight.purchased_date), "d MMM yyyy", { locale: enUS })}
              {legCount > 1 ? ` · ${legCount} legs` : ""}
            </span>
          </>
        )}
      </td>

      <td>
        <span className={s.ref}>{flight.reservation_number}</span>
        <span className={s.passenger} title={flight.passenger_name}>
          {flight.passenger_name}
        </span>
      </td>

      <td>
        <div className={s.actions}>
          {onFlyAgain && (
            <button
              type="button"
              className={s.iconBtn}
              aria-label="Fly it again"
              title="Fly it again"
              onClick={(e) => { e.stopPropagation(); onFlyAgain(flight) }}
            >
              <RotateCcw />
            </button>
          )}
          <button
            type="button"
            className={s.iconBtn}
            aria-label="Edit flight"
            onClick={(e) => { e.stopPropagation(); onEdit(flight) }}
          >
            <Pencil />
          </button>
          <button
            type="button"
            className={s.iconBtn}
            aria-label="Delete flight"
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(flight) }}
          >
            <Trash2 />
          </button>
          <button
            type="button"
            className={s.iconBtn}
            aria-label="Open flight"
            onClick={(e) => { e.stopPropagation(); onRowClick(flight) }}
          >
            <ArrowRight />
          </button>
        </div>
      </td>
              </tr>
  )
}
