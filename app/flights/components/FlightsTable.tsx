"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowRight, Clock, Pencil, Trash2, Building, Loader2, RotateCcw } from "lucide-react"
import { calculateDuration, formatTimeToHHMM, getAirlineLogo } from "@/app/flights/lib/flight-utils"
import { DateTime } from "luxon"
import { AIRPORT_TIMEZONES } from "@/lib/airport-timezones"
import type { Flight } from "@/types/flight"

export interface FlightsTableProps {
  loading: boolean
  flights: Flight[]
  onEdit: (flight: Flight) => void
  onDeleteRequest: (flight: Flight) => void
  onFlyAgain?: (flight: Flight) => void
  onRowClick: (flight: Flight) => void
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

  if (loading) return (
    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
  )
  if (delta == null || !actualText) return (
    <span className="text-[10px] px-1 py-0.5 rounded bg-muted/30 text-muted-foreground/80">—</span>
  )
  // Compose: show actual/estimated time chip, then delta chip
  const timeChip = (
    <span className="text-[10px] px-1 py-0.5 rounded bg-muted/30 text-muted-foreground/90 mr-1">
      {isEstimated ? 'est ' : ''}{actualText}
    </span>
  )
  if (delta === 0) {
    return (
      <>
        {timeChip}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">on time</span>
      </>
    )
  }
  const late = delta > 0
  const cls = late ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-green-500/15 text-green-600 dark:text-green-400'
  return (
    <>
      {timeChip}
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{late ? '+' : ''}{delta}m</span>
    </>
  )
}

export function FlightsTable({ loading, flights, onEdit, onDeleteRequest, onFlyAgain, onRowClick }: FlightsTableProps) {
  return (
    <div className="hidden lg:block rounded-md border shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[160px]">Flight Date</TableHead>
            <TableHead className="w-[140px]">Passenger</TableHead>
            <TableHead>Reservation</TableHead>
            <TableHead>Flight Details</TableHead>
            <TableHead>Departure</TableHead>
            <TableHead>Arrival</TableHead>
            <TableHead className="w-[80px]">Duration</TableHead>
            <TableHead>Purchase Info</TableHead>
            <TableHead className="w-[50px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-8 w-8 mb-2 animate-pulse text-flight rotate-180" />
                  <p>Loading flights...</p>
                </div>
              </TableCell>
            </TableRow>
          ) : flights.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-8 w-8 mb-2 text-muted-foreground/50 rotate-180" />
                  <p>No flights found. Try adjusting your search or filters.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            flights.map((flight) => (
              <TableRow
                key={flight.id}
                className="hover:bg-muted/30 cursor-pointer group"
                onClick={() => onRowClick(flight)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-medium">
                        {format(new Date(flight.departure_date), "MMM d, yyyy", { locale: enUS })}
                      </span>
                      {isUpcoming(flight.departure_date) && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/30 transition-colors px-1.5 py-0 text-[0.65rem]"
                        >
                          ✈️Upcoming
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] leading-tight text-muted-foreground">
                      {format(new Date(flight.departure_date), "EEEE", { locale: enUS })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="max-w-[120px]">
                          <span className="block truncate font-medium">
                            {flight.passenger_name}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{flight.passenger_name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <Badge variant="outline" className="w-fit bg-muted/30 text-foreground">
                      {flight.reservation_number}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 relative">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative w-8 h-8 rounded-md overflow-hidden flex items-center justify-center">
                              {(flight.airline || flight.flight_number) ? (
                                <Image
                                  src={getAirlineLogo(flight.airline, flight.flight_number)}
                                  alt={`${flight.airline ?? flight.flight_number ?? 'Airline'} logo`}
                                  width={flight.airline?.toLowerCase() === 'easyjet' ? 40 : 28}
                                  height={flight.airline?.toLowerCase() === 'easyjet' ? 40 : 28}
                                  className={`object-contain p-0.5 ${flight.airline?.toLowerCase() === 'easyjet' ? 'scale-125' : ''}`}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden')
                                  }}
                                />
                              ) : (
                                <Building className="h-5 w-5 text-muted-foreground" />
                              )}
                              <Building className="h-5 w-5 text-muted-foreground absolute fallback-icon hidden" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="font-medium">
                            {flight.airline || "Unknown Airline"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1.5">
                          <Badge
                            variant="outline"
                            className="bg-flight/10 text-flight border-flight/20 px-1.5 py-0 text-[0.7rem] font-medium"
                          >
                            {flight.flight_number}
                          </Badge>
                        </div>
                        {flight.seat && (
                          <span className="text-xs text-muted-foreground">
                            Seat {flight.seat}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium flex items-center">
                      <Badge variant="outline" className="mr-1 bg-airport/10 text-airport border-airport/20 px-1 py-0">
                        {flight.departure_iata || flight.departure_airport}
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">{flight.departure_airport}</span>
                    <span className="text-xs text-muted-foreground flex items-center mt-1 gap-1.5">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatTimeToHHMM(flight.departure_time)}
                      <DeltaBadge flight={flight} kind="dep" />
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium flex items-center">
                      <Badge variant="outline" className="mr-1 bg-airport/10 text-airport border-airport/20 px-1 py-0">
                        {flight.arrival_iata || flight.arrival_airport}
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {flight.arrival_airport}
                      {flight.arrival_country && ` (${flight.arrival_country})`}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center mt-1 gap-1.5">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatTimeToHHMM(flight.arrival_time)}
                      <DeltaBadge flight={flight} kind="arr" />
                    </span>
                  </div>
                </TableCell>
                <TableCell className="w-[80px]">
                  <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm whitespace-nowrap">
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
                  </div>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col">
                          <span className="font-medium">{flight.total_receipt}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            Purchased: {format(new Date(flight.purchased_date), "MMM d, yyyy", { locale: enUS })}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="flex flex-col gap-1">
                        <p className="font-medium">Purchase Details</p>
                        <div className="text-xs">
                          <p>Date: {format(new Date(flight.purchased_date), "MMMM d, yyyy", { locale: enUS })}</p>
                          <p>Time: {flight.purchase_time}</p>
                          <p>Total: {flight.total_receipt}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    {onFlyAgain && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Fly it again"
                        className="text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 rounded-full p-2 hover:scale-110 active:scale-95 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          onFlyAgain(flight)
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-flight hover:bg-flight/10 rounded-full p-2 hover:scale-110 active:scale-95 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(flight)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full p-2 hover:scale-110 active:scale-95 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteRequest(flight)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-flight hover:bg-flight/10 rounded-full p-2 hover:scale-110 active:scale-95 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRowClick(flight)
                      }}
                    >
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
