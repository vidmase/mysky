"use client"

import { useRouter } from "next/navigation"
import { format, parse, parseISO } from "date-fns"
import { useEffect, useState, Suspense } from "react"
import { use } from "react"
import {
  ArrowLeft,
  Clock,
  CloudSun,
  MapPin,
  Plane,
  Building,
  User,
  CreditCard,
  FileText,
  Wifi,
  Utensils,
  Loader2,
  Save,
  Edit2,
  X,
  RotateCcw,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import { PlaneIcon } from "@/app/components/PlaneIcon"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { LiveSearchDrawer } from "@/components/live-search/LiveSearchDrawer"
import { defaultSearchDate } from "@/components/live-search/mapOfferToFlight"
import * as React from 'react'
import dynamic from 'next/dynamic'
import { DateTime } from 'luxon'
import { calculateDuration as sharedCalculateDuration, formatTimeToHHMM } from '@/app/flights/lib/flight-utils'
import { groupFlightsIntoBookings } from '@/lib/statistics/booking-spend'
import { BoardingPass } from '@/app/flights/components/BoardingPass'
import bp from '@/app/flights/components/boarding-pass.module.css'



interface Flight {
  id: number
  passenger_name: string
  reservation_number: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_date: string
  departure_time: string
  arrival_time: string
  arrival_date?: string | null
  total_receipt: string
  /** Part of total_receipt spent on seats, bags, priority — not an addition to it. */
  extras_receipt?: string | null
  purchased_date: string
  purchase_time: string
  airline: string | null
  arrival_country: string | null
  arrival_iata: string | null
  departure_iata: string | null
  seat: string | null
  notes: string | null
  aircraft_registration?: string | null
}

// Robust airline logo resolver supporting codes and names
function getAirlineLogo(airline: string | null, flightNumber?: string | null): string {
  // Local overrides for common airlines we ship assets for
  const localByCode: Record<string, string> = {
    FR: '/ryanair.png',   // Ryanair
    W6: '/wizzair.png',   // Wizz Air
    U2: '/easyjet.png',   // easyJet
    BT: '/airbaltic.png', // airBaltic
  }

  const nameToCode: Record<string, string> = {
    ryanair: 'FR',
    'wizz air': 'W6',
    wizzair: 'W6',
    easyjet: 'U2',
    'airbaltic': 'BT',
    'air baltic': 'BT',
  }

  // Try to determine IATA/ICAO code
  let code: string | null = null

  const norm = (s: string) => s.trim().toLowerCase()

  if (airline) {
    const a = airline.trim()
    // If provided value looks like a code (2-3 alphanumerics, often uppercase)
    if (/^[A-Z0-9]{2,3}$/.test(a) || /^[A-Z0-9]{2,3}$/.test(a.toUpperCase())) {
      code = a.toUpperCase()
    } else {
      const name = norm(a)
      if (nameToCode[name]) {
        code = nameToCode[name]
      }
    }
  }

  // If still no code, try to extract from flight number prefix (e.g., FR6821, U2 1234, BT-123)
  if (!code && flightNumber) {
    const m = flightNumber.trim().toUpperCase().match(/^([A-Z]{2,3}|[A-Z]\d)\s?-?\d+/)
    if (m) code = m[1]
  }

  // Use local asset if we have it
  if (code && localByCode[code]) {
    return localByCode[code]
  }

  // Fallback to public airline logos by IATA code via aviasales CDN
  if (code) {
    // 200x50 generally looks crisp in our 28-40px box
    return `https://pics.avs.io/200/50/${code}.png`
  }

  // Last resort: if we only have a name, try Clearbit domain heuristic (best-effort)
  if (airline) {
    const cleanAirlineName = norm(airline)
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    return `https://logo.clearbit.com/${cleanAirlineName}.com`
  }

  return ''
}

// Import FlightMap dynamically to avoid SSR issues with Leaflet
const FlightMap = dynamic(
  () => import('@/app/components/FlightMap'),
  { ssr: false }
)

// Minimal IATA to timezone mapping (expand as needed)
const airportTimeZones: Record<string, string> = {
  // United Kingdom
  LHR: "Europe/London", // London Heathrow
  LGW: "Europe/London", // London Gatwick
  STN: "Europe/London", // London Stansted
  LTN: "Europe/London", // London Luton
  LCY: "Europe/London", // London City
  MAN: "Europe/London", // Manchester
  BHX: "Europe/London", // Birmingham
  EDI: "Europe/London", // Edinburgh
  GLA: "Europe/London", // Glasgow
  BRS: "Europe/London", // Bristol
  NCL: "Europe/London", // Newcastle

  // Ireland
  DUB: "Europe/Dublin", // Dublin
  SNN: "Europe/Dublin", // Shannon
  ORK: "Europe/Dublin", // Cork

  // France
  CDG: "Europe/Paris", // Paris Charles de Gaulle
  ORY: "Europe/Paris", // Paris Orly
  NCE: "Europe/Paris", // Nice
  LYS: "Europe/Paris", // Lyon
  MRS: "Europe/Paris", // Marseille
  TLS: "Europe/Paris", // Toulouse

  // Germany
  FRA: "Europe/Berlin", // Frankfurt
  MUC: "Europe/Berlin", // Munich
  BER: "Europe/Berlin", // Berlin Brandenburg
  DUS: "Europe/Berlin", // Dusseldorf
  HAM: "Europe/Berlin", // Hamburg
  CGN: "Europe/Berlin", // Cologne

  // Spain
  MAD: "Europe/Madrid", // Madrid
  BCN: "Europe/Madrid", // Barcelona
  PMI: "Europe/Madrid", // Palma de Mallorca
  ALC: "Europe/Madrid", // Alicante
  AGP: "Europe/Madrid", // Malaga
  IBZ: "Europe/Madrid", // Ibiza

  // Italy
  FCO: "Europe/Rome", // Rome Fiumicino
  MXP: "Europe/Rome", // Milan Malpensa
  VCE: "Europe/Rome", // Venice
  NAP: "Europe/Rome", // Naples
  BGY: "Europe/Rome", // Milan Bergamo
  PSA: "Europe/Rome", // Pisa

  // Netherlands
  AMS: "Europe/Amsterdam", // Amsterdam Schiphol
  RTM: "Europe/Amsterdam", // Rotterdam
  EIN: "Europe/Amsterdam", // Eindhoven

  // Belgium
  BRU: "Europe/Brussels", // Brussels
  CRL: "Europe/Brussels", // Charleroi

  // Switzerland
  ZRH: "Europe/Zurich", // Zurich
  GVA: "Europe/Zurich", // Geneva
  BSL: "Europe/Zurich", // Basel

  // Austria
  VIE: "Europe/Vienna", // Vienna
  SZG: "Europe/Vienna", // Salzburg

  // Portugal
  LIS: "Europe/Lisbon", // Lisbon
  OPO: "Europe/Lisbon", // Porto
  FAO: "Europe/Lisbon", // Faro

  // Denmark
  CPH: "Europe/Copenhagen", // Copenhagen
  BLL: "Europe/Copenhagen", // Billund

  // Sweden
  ARN: "Europe/Stockholm", // Stockholm Arlanda
  GOT: "Europe/Stockholm", // Gothenburg
  MMX: "Europe/Stockholm", // Malmo

  // Norway
  OSL: "Europe/Oslo", // Oslo
  BGO: "Europe/Oslo", // Bergen
  TRD: "Europe/Oslo", // Trondheim

  // Finland
  HEL: "Europe/Helsinki", // Helsinki
  TMP: "Europe/Helsinki", // Tampere

  // Poland
  WAW: "Europe/Warsaw", // Warsaw
  KRK: "Europe/Warsaw", // Krakow
  GDN: "Europe/Warsaw", // Gdansk
  WRO: "Europe/Warsaw", // Wroclaw
  POZ: "Europe/Warsaw", // Poznan

  // Hungary
  BUD: "Europe/Budapest", // Budapest

  // Czech Republic
  PRG: "Europe/Prague", // Prague

  // Greece
  ATH: "Europe/Athens", // Athens
  HER: "Europe/Athens", // Heraklion
  RHO: "Europe/Athens", // Rhodes
  SKG: "Europe/Athens", // Thessaloniki

  // Malta
  MLA: "Europe/Malta", // Malta

  // Lithuania
  VNO: "Europe/Vilnius", // Vilnius
  KUN: "Europe/Vilnius", // Kaunas
  PLQ: "Europe/Vilnius", // Palanga

  // Latvia
  RIX: "Europe/Riga", // Riga

  // Estonia
  TLL: "Europe/Tallinn", // Tallinn

  // Iceland
  KEF: "Atlantic/Reykjavik", // Keflavik

  // Add more as needed
}

// Airline color mapping (expand as needed)
const airlineColors: Record<string, string> = {
  wizzair: '#c6007e',
  ryanair: '#073590',
  easyjet: '#ff6600',
  lufthansa: '#05164d',
  britishairways: '#075aaa',
  turkishairlines: '#e30a17',
  airbaltic: '#b7d900',
  lot: '#1a2a6c',
  // Add more as needed
}

/** What to call a leg above its pass. Two legs are a there-and-back; more are numbered. */
function legCaption(index: number, total: number): string {
  if (total <= 1) return 'Boarding pass'
  if (total === 2) return index === 0 ? 'Outbound' : 'Return'
  return `Leg ${index + 1} of ${total}`
}

export default function FlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  /** Every leg of this booking, earliest first — the flight opened plus its siblings. */
  const [legs, setLegs] = useState<Flight[]>([])
  const [statusLoading, setStatusLoading] = useState(false)
  const [actualTimes, setActualTimes] = useState<{
    depActual: string | null
    arrActual: string | null
    depScheduled: string | null
    arrScheduled: string | null
    depDelayMinutes: number | null
    arrDelayMinutes: number | null
    status: string | null
    aircraftRegistration: string | null
  } | null>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [liveSearchOpen, setLiveSearchOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { id } = React.use(params)

  // Until the siblings arrive — and for a booking that has none — the flight
  // opened is the whole booking, so it prints on its own.
  const passLegs = legs.length > 0 ? legs : flight ? [flight] : []

  // Aircraft photo feature removed: no registration editor state

  useEffect(() => {
    const fetchFlightData = async () => {
      let leaving = false
      try {
        setLoading(true)
        const response = await fetch(`/api/flights/${id}`)
        // A flight can be opened by someone who is not signed in here — the code
        // on the back of the pass is meant to be scanned on a phone that never
        // has been — so the visitor is sent to sign in and brought back to this
        // flight, rather than shown the status code and a way back to nowhere.
        if (response.status === 401) {
          leaving = true
          router.replace(`/auth?next=${encodeURIComponent(`/flights/${id}`)}`)
          return
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setFlight(data)
        setNotes(data.notes || "")
      } catch (err) {
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load flight')
      } finally {
        // The page keeps loading while the browser is on its way to the sign-in
        // form; letting it finish would flash "Flight not found" on the way out.
        if (!leaving) setLoading(false)
      }
    }

    fetchFlightData()
  }, [id, router])

  // A return is filed as one row per leg sharing a reservation reference, so the
  // other legs come from the same list the logbook reads and are grouped by the
  // shared rule — reproducing "what counts as one booking" here would be a
  // second copy of it, and placeholder references would collapse the wrong rows.
  useEffect(() => {
    if (!flight) return
    let alive = true

    ;(async () => {
      try {
        const res = await fetch('/api/flights')
        if (!res.ok) return
        const payload = await res.json()
        const all: Flight[] = payload.data ?? payload ?? []
        if (!Array.isArray(all)) return

        const booking = groupFlightsIntoBookings(all).find((b) =>
          b.legs.some((leg) => String(leg.id) === String(flight.id))
        )
        // A single-leg booking needs no second pass; the flight itself is enough.
        if (alive && booking && booking.legs.length > 1) setLegs(booking.legs)
      } catch (err) {
        // The passes are a nicer view of a flight already on screen, so a failed
        // lookup falls back to printing the one leg rather than surfacing an error.
        console.error('Could not load the other legs of this booking:', err)
      }
    })()

    return () => {
      alive = false
    }
  }, [flight])

  // Fetch real-time/historical actual times by flight number and date
  useEffect(() => {
    const loadStatus = async () => {
      if (!flight?.flight_number || !flight?.departure_date) return
      setStatusLoading(true)
      try {
        const baseDate = flight.departure_date.slice(0, 10)
        const roles: Array<'Departure'|'Arrival'|'Both'> = ['Departure', 'Arrival', 'Both']
        const offsets = [0, -1, 1] // try same day, previous day, next day

        let chosen: any | null = null

        for (const off of offsets) {
          const dt = DateTime.fromISO(baseDate).plus({ days: off }).toISODate()!
          for (const role of roles) {
            const url = `/api/flight-status?flightNumber=${encodeURIComponent(flight.flight_number)}&date=${encodeURIComponent(dt)}&dateLocalRole=${role}`
            const res = await fetch(url)
            if (!res.ok) continue
            const json = await res.json()
            const flightsArr: any[] = json?.flights || []
            if (!flightsArr.length) continue
            // Prefer match by IATA pair, otherwise take the first
            const m = flightsArr.find((f: any) => (
              (f?.departure?.airport?.iata && flight.departure_iata && f.departure.airport.iata === flight.departure_iata) ||
              (f?.arrival?.airport?.iata && flight.arrival_iata && f.arrival.airport.iata === flight.arrival_iata)
            )) || flightsArr[0]
            if (m) {
              chosen = m
              // If this attempt includes a registration, stop early
              if (m?.aircraft?.reg || m?.aircraft?.registration) break
            }
          }
          if (chosen?.aircraft?.reg || chosen?.aircraft?.registration) break
        }

        if (chosen) {
          setActualTimes({
            depActual: chosen?.departure?.actualTimeLocal ?? chosen?.departure?.estimatedTimeLocal ?? null,
            arrActual: chosen?.arrival?.actualTimeLocal ?? chosen?.arrival?.estimatedTimeLocal ?? null,
            depScheduled: chosen?.departure?.scheduledTimeLocal ?? null,
            arrScheduled: chosen?.arrival?.scheduledTimeLocal ?? null,
            depDelayMinutes: chosen?.departure?.delayMinutes ?? null,
            arrDelayMinutes: chosen?.arrival?.delayMinutes ?? null,
            status: chosen?.status ?? null,
            aircraftRegistration: chosen?.aircraft?.reg ?? chosen?.aircraft?.registration ?? null,
          })
        }
      } catch {
        // ignore
      } finally {
        setStatusLoading(false)
      }
    }
    loadStatus()
  }, [flight?.flight_number, flight?.departure_date, flight?.departure_iata, flight?.arrival_iata])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/flights/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete flight')
      }

      toast.success('✈️ Flight deleted! Time to plan your next adventure! 🎉')
      router.push('/flights')
    } catch (error) {
      toast.error('Oops! The flight seems to be stuck in turbulence. Try again! 🌪️')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!flight) return

    setIsSavingNotes(true)
    try {
      const response = await fetch(`/api/flights/${id}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        throw new Error('Failed to save notes')
      }

      const updatedFlight = await response.json()
      setFlight(updatedFlight)
      setIsEditingNotes(false)
      toast.success('📝 Notes saved! Your memory is now as sharp as a pilot\'s eyes! 👀')
    } catch (error) {
      toast.error('Oops! Your notes got lost in the clouds. Try again! ☁️')
    } finally {
      setIsSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-flight" />
          <p className="text-muted-foreground">Loading flight details...</p>
        </div>
      </div>
    )
  }

  if (error || !flight) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-4">
          <Plane className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">{error || 'Flight not found'}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const formatTime = (timeStr: string) => {
    try {
      // Parse time string and ensure it's in HH:MM format
      const [hours, minutes] = timeStr.split(':').map(num => num.padStart(2, '0'))
      return `${hours}:${minutes}`
    } catch (error) {
      return timeStr // Return original string if parsing fails
    }
  }

  const renderDuration = () => {
    if (!flight) return 'Duration N/A'
    const result = sharedCalculateDuration(
      flight.departure_time,
      flight.arrival_time,
      {
        departureDate: flight.departure_date,
        arrivalDate: flight.arrival_date ?? undefined,
        departureIata: flight.departure_iata,
        arrivalIata: flight.arrival_iata,
        departureAirportName: flight.departure_airport,
        arrivalAirportName: flight.arrival_airport,
      }
    )
    return result || 'Duration N/A'
  }

  // Show delay/early vs scheduled in minutes
  const renderDelta = (scheduledTime: string, actualLocal?: string | null, iata?: string | null) => {
    if (!actualLocal) return null
    try {
      const tz = iata ? airportTimeZones[iata] : undefined
      if (!tz || !flight) return null
      const date = flight.departure_date?.slice(0,10) || ''
      const sched = DateTime.fromISO(`${date}T${formatTime(scheduledTime)}`, { zone: tz })
      const actual = DateTime.fromISO(actualLocal, { zone: tz })
      if (!sched.isValid || !actual.isValid) return null
      const diffMin = Math.round(actual.diff(sched, 'minutes').minutes)
      if (diffMin === 0) return <span className="text-xs text-muted-foreground">On time</span>
      const sign = diffMin > 0 ? '+' : ''
      const cls = diffMin > 0 ? 'text-[var(--vermillion-dk)]' : 'text-[var(--jade)]'
      return <span className={`text-xs font-medium ${cls}`}>{sign}{diffMin}m {diffMin>0?'late':'early'}</span>
    } catch { return null }
  }

  // Format provider's actual local timestamp (ISO with zone) to HH:mm in airport's IANA tz
  const formatActualLocal = (actualLocal?: string | null, iata?: string | null) => {
    if (!actualLocal || !iata) return null
    const tz = airportTimeZones[iata]
    if (!tz) return null
    const dt = DateTime.fromISO(actualLocal, { zone: tz })
    return dt.isValid ? dt.toFormat('HH:mm') : null
  }

  // Get airline color (fallback to default)
  const airlineColor = flight.airline ? airlineColors[flight.airline.replace(/\s+/g, '').toLowerCase()] || '#38bdf8' : '#38bdf8';

  // Aircraft photo feature removed: no registration inference

  // Aircraft photo feature removed: no registration logic or handlers

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Flights
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Plane className="h-5 w-5 mr-2 text-flight" />
                Flight Details
              </h1>
              <p className="text-muted-foreground">
                {flight.departure_airport} to {flight.arrival_airport} • {format(new Date(flight.departure_date), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <Button
            className="gap-2 bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--vermillion)]"
            onClick={() => setLiveSearchOpen(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Fly it again
          </Button>
        </div>

        {/* ── THE PASSES ──────────────────────────────────────
            One per leg of the booking, in the carrier's own colours. A return
            prints both halves, which is the thing a single card could not show. */}
        <div className="space-y-5">
          {passLegs.map((leg, i) => (
            <div key={leg.id}>
              <div
                className={`${bp.legLabel} ${
                  String(leg.id) === String(flight.id) ? bp.legLabelCurrent : ''
                }`}
              >
                <span>{legCaption(i, passLegs.length)}</span>
                {String(leg.id) === String(flight.id) && passLegs.length > 1 && (
                  <span>· this leg</span>
                )}
              </div>
              <BoardingPass flight={leg} />
            </div>
          ))}
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Plane className="h-4 w-4" />
              Flight Details
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Aircraft photo feature removed */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-t-4 border-t-flight shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-flight">
                    <MapPin className="h-5 w-5 mr-2" />
                    Departure
                  </CardTitle>
                  <CardDescription>{format(new Date(flight.departure_date), "EEEE, MMMM d, yyyy")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                      <MapPin className="h-4 w-4 text-flight" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {flight.departure_airport}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {flight.departure_airport}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                      <Clock className="h-4 w-4 text-flight" />
                    </div>
                    <div>
                      <div className="font-medium">{formatTime(flight.departure_time)} <span className="text-xs text-muted-foreground ml-2">Scheduled</span></div>
                      {actualTimes?.depActual && (
                        <div className="text-sm">
                          <span className="font-medium">Actual:</span> {formatActualLocal(actualTimes.depActual, flight.departure_iata) || '—'}
                          <span className="ml-2">{renderDelta(flight.departure_time, actualTimes.depActual, flight.departure_iata)}</span>
                        </div>
                      )}
                      {!actualTimes?.depActual && statusLoading && (
                        <div className="text-xs text-muted-foreground">Fetching live status…</div>
                      )}
                      <div className="text-sm text-muted-foreground">Local time</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                      <CloudSun className="h-4 w-4 text-flight" />
                    </div>
                    <div>
                      <div className="font-medium">{flight.airline}</div>
                      <div className="text-sm text-muted-foreground">Weather at departure</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-airport shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center text-airport">
                    <MapPin className="h-5 w-5 mr-2" />
                    Arrival
                  </CardTitle>
                  <CardDescription>{format(new Date(flight.departure_date), "EEEE, MMMM d, yyyy")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-airport/10 flex items-center justify-center mt-0.5">
                      <MapPin className="h-4 w-4 text-airport" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {flight.arrival_airport}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {flight.arrival_airport}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-airport/10 flex items-center justify-center mt-0.5">
                      <Clock className="h-4 w-4 text-airport" />
                    </div>
                    <div>
                      <div className="font-medium">{formatTime(flight.arrival_time)} <span className="text-xs text-muted-foreground ml-2">Scheduled</span></div>
                      {actualTimes?.arrActual && (
                        <div className="text-sm">
                          <span className="font-medium">Actual:</span> {formatActualLocal(actualTimes.arrActual, flight.arrival_iata) || '—'}
                          <span className="ml-2">{renderDelta(flight.arrival_time, actualTimes.arrActual, flight.arrival_iata)}</span>
                        </div>
                      )}
                      {!actualTimes?.arrActual && statusLoading && (
                        <div className="text-xs text-muted-foreground">Fetching live status…</div>
                      )}
                      <div className="text-sm text-muted-foreground">Local time</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-airport/10 flex items-center justify-center mt-0.5">
                      <CloudSun className="h-4 w-4 text-airport" />
                    </div>
                    <div>
                      <div className="font-medium">{flight.airline}</div>
                      <div className="text-sm text-muted-foreground">Weather at arrival</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="map">
            <Card className="border-t-4 border-t-airport shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-airport">
                  <MapPin className="h-5 w-5 mr-2" />
                  Flight Path
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FlightMap
                  departureAirport={flight.departure_airport}
                  arrivalAirport={flight.arrival_airport}
                  departureIata={flight.departure_iata}
                  arrivalIata={flight.arrival_iata}
                />

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center p-4 rounded-md bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-flight/10 flex items-center justify-center mr-3">
                      <MapPin className="h-5 w-5 text-flight" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {flight.departure_airport}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {flight.departure_airport}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center p-4 rounded-md bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-airport/10 flex items-center justify-center mr-3">
                      <MapPin className="h-5 w-5 text-airport" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {flight.arrival_airport}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {flight.arrival_airport}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card className="border-t-4 border-t-stats shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center text-stats">
                    <FileText className="h-5 w-5 mr-2" />
                    Notes
                  </div>
                  {!isEditingNotes && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Notes
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditingNotes ? (
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Add your notes here..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[200px] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingNotes(false)
                          setNotes(flight?.notes || "")
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                      >
                        {isSavingNotes ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Notes
                      </Button>
                    </div>
                  </div>
                ) : (
                  flight?.notes ? (
                    <div className="p-4 rounded-md bg-muted/30 border">
                      <p className="whitespace-pre-wrap">{flight.notes}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">No notes added for this flight.</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setIsEditingNotes(true)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Add Notes
                      </Button>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      <LiveSearchDrawer
        open={liveSearchOpen}
        onOpenChange={setLiveSearchOpen}
        initialFrom={(flight.departure_iata || flight.departure_airport || "").trim()}
        initialTo={(flight.arrival_iata || flight.arrival_airport || "").trim()}
        initialDate={defaultSearchDate()}
      />

      </div>
    </div>
  )
}

