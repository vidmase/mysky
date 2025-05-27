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
import * as React from 'react'
import dynamic from 'next/dynamic'
import { DateTime } from 'luxon'


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
  total_receipt: string
  purchased_date: string
  purchase_time: string
  airline: string | null
  arrival_country: string | null
  arrival_iata: string | null
  departure_iata: string | null
  seat: string | null
  notes: string | null
}

function getAirlineLogo(airline: string | null): string {
  if (!airline) return ""

  // Special cases for airlines with local logos
  const airlineName = airline.toLowerCase()
  if (airlineName === 'ryanair') {
    return '/ryanair.png'
  }
  if (airlineName === 'wizzair') {
    return '/wizzair.png'
  }
  if (airlineName === 'easyjet') {
    return '/easyjet.png'
  }

  // Clean airline name for URL
  const cleanAirlineName = airlineName
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  // Return logo URL from logo.clearbit.com (fallback to null if no airline)
  return `https://logo.clearbit.com/${cleanAirlineName}.com`
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

export default function FlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { id } = React.use(params)

  useEffect(() => {
    const fetchFlightData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/flights/${id}`)
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
        setLoading(false)
      }
    }

    fetchFlightData()
  }, [id])

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

  const calculateDuration = () => {
    try {
      if (
        !flight ||
        !flight.departure_date ||
        !flight.departure_time ||
        !flight.arrival_time ||
        !flight.departure_iata ||
        !flight.arrival_iata
      ) {
        return "Duration N/A"
      }
      const depTz = airportTimeZones[flight.departure_iata];
      const arrTz = airportTimeZones[flight.arrival_iata];
      if (!depTz || !arrTz) return "Duration N/A";
      const [depYear, depMonth, depDay] = flight.departure_date.split("-").map(Number);
      const [depHour, depMin] = flight.departure_time.split(":").map(Number);
      const [arrHour, arrMin] = flight.arrival_time.split(":").map(Number);
      const dep = DateTime.fromObject({ year: depYear, month: depMonth, day: depDay, hour: depHour, minute: depMin }, { zone: depTz });
      let arr = DateTime.fromObject({ year: depYear, month: depMonth, day: depDay, hour: arrHour, minute: arrMin }, { zone: arrTz });
      if (arr < dep) arr = arr.plus({ days: 1 });
      const diff = arr.toUTC().diff(dep.toUTC(), ["hours", "minutes"]);
      const hours = Math.floor(diff.hours);
      const minutes = Math.round(diff.minutes);
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
    } catch (error) {
      return "Duration N/A"
    }
  }

  // Get airline color (fallback to default)
  const airlineColor = flight.airline ? airlineColors[flight.airline.replace(/\s+/g, '').toLowerCase()] || '#38bdf8' : '#38bdf8';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
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
        </div>

        <div
          className="relative rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-lg"
          style={{ border: `3px solid ${airlineColor}` }}
        >
          {/* Modernized Flight Card Visuals: glassmorphism, gradient, animated border, airline branding */}
          <div className="absolute inset-0 z-0 animate-gradient-x bg-gradient-to-r from-flight/30 via-airport/20 to-stats/30 blur-[2px] opacity-70" />
          <div className="absolute inset-0 z-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[8px]" />
          <div className="absolute inset-0 z-10 rounded-xl border-2 border-flight/30 dark:border-airport/30 animate-border-glow pointer-events-none" />
          <div
            className="p-4 text-white relative z-20"
            style={{
              background: `linear-gradient(90deg, ${airlineColor} 0%, #38bdf8 100%)`,
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative w-8 h-8 rounded-md overflow-hidden flex items-center justify-center">
                        {flight.airline ? (
                          <Image
                            src={getAirlineLogo(flight.airline)}
                            alt={`${flight.airline} logo`}
                            width={flight.airline.toLowerCase() === 'easyjet' ? 40 : 28}
                            height={flight.airline.toLowerCase() === 'easyjet' ? 40 : 28}
                            className={`object-contain p-0.5 ${flight.airline.toLowerCase() === 'easyjet' ? 'scale-125' : ''}`}
                            onError={(e) => {
                              // On error, show the Building icon
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden')
                            }}
                          />
                        ) : (
                          <Building className="h-5 w-5 text-white" />
                        )}
                        <Building className="h-5 w-5 text-white absolute fallback-icon hidden" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-medium">
                      {flight.airline || "Unknown Airline"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="text-lg font-semibold">{flight.airline}</span>
              </div>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                {flight.flight_number}
              </Badge>
            </div>
          </div>

          <div className="p-6 relative z-20">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-r-full"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-l-full"></div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left space-y-2">
                <div className="text-5xl font-bold tracking-tight text-flight">
                  {flight.departure_iata || flight.departure_airport.substring(0, 3)}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{flight.departure_airport}</div>
                  <div className="text-2xl font-semibold">{formatTime(flight.departure_time)}</div>
                  <div className="text-sm text-muted-foreground">{format(new Date(flight.departure_date), "MMM d, yyyy")}</div>
                </div>
              </div>

              <div className="flex flex-col items-center w-full max-w-xs md:max-w-sm">
                <div className="relative w-full h-8 flex items-center justify-center">
                  <div className="absolute left-0 right-0 top-1/2 h-2 bg-gradient-to-r from-flight via-blue-400 to-airport rounded-full shadow-inner" style={{ transform: 'translateY(-50%)' }} />
                  {(() => {
                    let progress = 0;
                    try {
                      const depIata = flight.departure_iata;
                      const arrIata = flight.arrival_iata;
                      if (depIata && arrIata) {
                        const depTz = airportTimeZones[depIata];
                        const arrTz = airportTimeZones[arrIata];
                        if (depTz && arrTz) {
                          const datePart = flight.departure_date.split('T')[0];
                          const dep = DateTime.fromISO(`${datePart}T${flight.departure_time}`, { zone: depTz });
                          const arr = DateTime.fromISO(`${datePart}T${flight.arrival_time}`, { zone: arrTz });
                          let arrAdjusted = arr;
                          if (arr < dep) arrAdjusted = arr.plus({ days: 1 });
                          const now = DateTime.now().setZone(depTz);
                          if (now < dep) progress = 0;
                          else if (now > arrAdjusted) progress = 1;
                          else {
                            const total = arrAdjusted.toUTC().toMillis() - dep.toUTC().toMillis();
                            const elapsed = now.toUTC().toMillis() - dep.toUTC().toMillis();
                            progress = total > 0 ? elapsed / total : 0;
                          }
                          progress = Math.max(0, Math.min(1, progress));
                        }
                      }
                    } catch {}
                    const left = `calc(${progress * 100}% - 16px)`;
                    return (
                      <div
                        className="absolute top-1/2 animate-plane-float"
                        style={{
                          left,
                          filter: 'drop-shadow(0 4px 12px rgba(56,189,248,0.25)) drop-shadow(0 0 8px #a855f7aa)',
                          zIndex: 30,
                          transform: 'translateY(-50%)',
                        }}
                      >
                        <PlaneIcon
                          className={`h-9 w-9 text-airline transition-all duration-700 ${progress === 0 ? 'opacity-60' : progress === 1 ? 'opacity-60' : 'opacity-100'}`}
                        />
                      </div>
                    );
                  })()}
                  <div className="absolute left-0 top-1/2 w-4 h-4 bg-flight rounded-full border-2 border-white shadow" style={{ transform: 'translateY(-50%)' }} />
                  <div className="absolute right-0 top-1/2 w-4 h-4 bg-airport rounded-full border-2 border-white shadow" style={{ transform: 'translateY(-50%)' }} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground font-medium text-center">
                  {calculateDuration()}
                </div>
              </div>

              <div className="text-center md:text-right space-y-2">
                <div className="text-5xl font-bold tracking-tight text-airport">
                  {flight.arrival_iata || flight.arrival_airport.substring(0, 3)}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {flight.arrival_airport}
                    {flight.arrival_country && ` (${flight.arrival_country})`}
                  </div>
                  <div className="text-2xl font-semibold">{formatTime(flight.arrival_time)}</div>
                  <div className="text-sm text-muted-foreground">{format(new Date(flight.departure_date), "MMM d, yyyy")}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-dashed">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Passenger</div>
                  <div className="font-medium">{flight.passenger_name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Reservation</div>
                  <div className="font-medium">{flight.reservation_number}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Seat</div>
                  <div className="font-medium">
                    {flight.seat ? (
                      <Badge variant="outline" className="bg-airline/10 text-airline border-airline/20">
                        {flight.seat}
                      </Badge>
                    ) : (
                      "Not Assigned"
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-muted-foreground flex justify-between items-center">
              <div>Purchased: {format(new Date(flight.purchased_date), "MMM d, yyyy")} {flight.purchase_time}</div>
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4" />
                <Utensils className="h-4 w-4" />
              </div>
            </div>
          </div>
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
                      <div className="font-medium">{formatTime(flight.departure_time)}</div>
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
                      <div className="font-medium">{formatTime(flight.arrival_time)}</div>
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
      </div>
    </div>
  )
}

