"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, Clock, Plane, MapPin, Building, User, CreditCard, FileText, ArrowLeft, X, Loader2, Check } from "lucide-react"
import { format, isBefore } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AirportSelector } from "@/components/airport-selector"
import { PassengerSelector } from "@/components/passenger-selector"
import { Airport } from "@/lib/airports"
import { Passenger } from "@/lib/passengers"
import { BoardingPassScanner } from "../components/boarding-pass-scanner"
import { europeanAirports } from "@/lib/airports"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface FormState {
  passenger_name: string
  reservation_number: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_date: Date
  departure_time: string
  arrival_time: string
  total_receipt: string
  purchased_date: string
  purchase_time: string
  airline: string | null
  arrival_iata: string | null
  departure_iata: string | null
  seat: string | null
  notes: string | null
  departure_country: string | null
  arrival_country: string | null
  departure_flag: string | null
  arrival_flag: string | null
  arrival_date: Date
  return_arrival_time: string | null
  // These will be set by the API
  departure_longitude?: number | null
  departure_latitude?: number | null
  arrival_longitude?: number | null
  arrival_latitude?: number | null
}

function getFlagEmoji(countryName: string): string {
  const countryToCode: { [key: string]: string } = {
    'United Kingdom': 'GB',
    'France': 'FR',
    'Germany': 'DE',
    'Spain': 'ES',
    'Italy': 'IT',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Portugal': 'PT',
    'Greece': 'GR',
    'Ireland': 'IE',
    'Sweden': 'SE',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Norway': 'NO',
    'Switzerland': 'CH',
    'Austria': 'AT',
    'Poland': 'PL',
    'Czech Republic': 'CZ',
    'Hungary': 'HU',
    'Croatia': 'HR',
    'Romania': 'RO',
    'Bulgaria': 'BG',
    'Slovakia': 'SK',
    'Slovenia': 'SI',
    'Estonia': 'EE',
    'Latvia': 'LV',
    'Lithuania': 'LT',
    'Cyprus': 'CY',
    'Malta': 'MT',
    'Luxembourg': 'LU',
    'Iceland': 'IS',
    'Egypt': 'EG'
  }

  const code = countryToCode[countryName] || ''
  if (!code) return ''

  // Convert country code to flag emoji
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))

  return String.fromCodePoint(...codePoints)
}

export default function AddFlightPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [selectedPassengers, setSelectedPassengers] = useState<Passenger[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [flightNumber, setFlightNumber] = useState('')
  const [airline, setAirline] = useState('')
  const [aircraft, setAircraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [departureDate, setDepartureDate] = useState<Date>()
  const [arrivalDate, setArrivalDate] = useState<Date>()
  const [departureDateOpen, setDepartureDateOpen] = useState(false)
  const [arrivalDateOpen, setArrivalDateOpen] = useState(false)
  const today = new Date()

  // Move these hooks to the top
  const [formData, setFormData] = useState<FormState>({
    passenger_name: '',
    reservation_number: '',
    flight_number: '',
    departure_airport: '',
    arrival_airport: '',
    departure_date: new Date(),
    departure_time: '',
    arrival_time: '',
    total_receipt: '',
    purchased_date: format(new Date(), 'yyyy-MM-dd'),
    purchase_time: format(new Date(), 'HH:mm'),
    airline: null,
    arrival_iata: null,
    departure_iata: null,
    seat: null,
    notes: null,
    departure_country: null,
    arrival_country: null,
    departure_flag: null,
    arrival_flag: null,
    arrival_date: new Date(),
    return_arrival_time: null,
    departure_longitude: null,
    departure_latitude: null,
    arrival_longitude: null,
    arrival_latitude: null
  })
  const [selectedDepartureAirport, setSelectedDepartureAirport] = useState<Airport>()
  const [selectedArrivalAirport, setSelectedArrivalAirport] = useState<Airport>()

  // Mock airlines for the dropdown
  const airlines = [
    "British Airways",
    "Lufthansa",
    "Delta",
    "United",
    "American Airlines",
    "Emirates",
    "Qatar Airways",
    "Singapore Airlines",
  ]

  // Ensure arrival date is not before departure date
  useEffect(() => {
    if (departureDate && arrivalDate && isBefore(arrivalDate, departureDate)) {
      setArrivalDate(departureDate)
    }
  }, [departureDate, arrivalDate])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }
    checkSession()
  }, [supabase])

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/auth")
    }
  }, [isAuthenticated, router])

  if (isAuthenticated === null || !isAuthenticated) {
    return null // or a spinner
  }

  const handleDepartureDateSelect = (date: Date | undefined) => {
    setDepartureDate(date)
    if (date) {
      setFormData(prev => ({
        ...prev,
        departure_date: date
      }))
    }

    // If arrival date is before the new departure date, update it
    if (date && arrivalDate && isBefore(arrivalDate, date)) {
      setArrivalDate(date)
      setFormData(prev => ({
        ...prev,
        arrival_date: date
      }))
    }

    // If no arrival date is set, default to same day
    if (date && !arrivalDate) {
      setArrivalDate(date)
      setFormData(prev => ({
        ...prev,
        arrival_date: date
      }))
    }

    // Close the popover
    setDepartureDateOpen(false)
  }

  const handleArrivalDateSelect = (date: Date | undefined) => {
    if (date && departureDate && isBefore(date, departureDate)) {
      // Don't allow arrival date before departure date
      setArrivalDate(departureDate)
      setFormData(prev => ({
        ...prev,
        arrival_date: departureDate
      }))
    } else if (date) {
      setArrivalDate(date)
      setFormData(prev => ({
        ...prev,
        arrival_date: date
      }))
    }

    // Close the popover
    setArrivalDateOpen(false)
  }

  const handleAirportSelect = (airport: Airport, type: 'departure' | 'arrival') => {
    if (type === 'departure') {
      setSelectedDepartureAirport(airport)
      setFormData(prev => ({
        ...prev,
        departure_airport: airport.name,
        departure_iata: airport.iata,
        departure_country: airport.country,
        departure_flag: getFlagEmoji(airport.country)
      }))
    } else {
      setSelectedArrivalAirport(airport)
      setFormData(prev => ({
        ...prev,
        arrival_airport: airport.name,
        arrival_iata: airport.iata,
        arrival_country: airport.country,
        arrival_flag: getFlagEmoji(airport.country)
      }))
    }
  }

  const handlePassengerSelect = (passenger: Passenger) => {
    if (!selectedPassengers.some(p => p.name === passenger.name)) {
      setSelectedPassengers(prev => [...prev, passenger])
      setFormData(prev => ({
        ...prev,
        passenger_name: passenger.title + ' ' + passenger.name
      }))
    }
  }

  const removePassenger = (passengerName: string) => {
    setSelectedPassengers(prev => prev.filter(p => p.name !== passengerName))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Gmail import button removed (available under Flights → Tools)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!formData.passenger_name) {
        throw new Error('Passenger name is required')
      }

      if (!selectedDepartureAirport || !selectedArrivalAirport) {
        throw new Error('Please select both departure and arrival airports')
      }

      // Fetch coordinates for departure airport
      const departureResponse = await fetch('/api/coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: selectedDepartureAirport.name,
          type: 'departure'
        }),
      })

      if (!departureResponse.ok) {
        throw new Error('Failed to fetch departure airport coordinates')
      }

      const departureData = await departureResponse.json()

      // Fetch coordinates for arrival airport
      const arrivalResponse = await fetch('/api/coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchQuery: selectedArrivalAirport.name,
          type: 'arrival'
        }),
      })

      if (!arrivalResponse.ok) {
        throw new Error('Failed to fetch arrival airport coordinates')
      }

      const arrivalData = await arrivalResponse.json()

      // Format dates as text to match database schema
      const flightData = {
        ...formData,
        departure_date: format(formData.departure_date, 'yyyy-MM-dd'),
        arrival_date: format(formData.arrival_date, 'yyyy-MM-dd'),
        departure_longitude: departureData.departure_longitude,
        departure_latitude: departureData.departure_latitude,
        arrival_longitude: arrivalData.arrival_longitude,
        arrival_latitude: arrivalData.arrival_latitude
      }

      const response = await fetch('/api/flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flightData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to add flight')
      }
      // Attempt to read created rows and log event (best-effort)
      try {
        const created = await response.json()
        const ids = Array.isArray(created) ? created.map((r: any) => r.id) : []
        void fetch('/api/event-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add_flight', metadata: { ids, source: 'client' }, page: '/flights' }),
          keepalive: true,
        })
      } catch {}

      router.push('/flights')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateForm = (data: FormState) => {
    const errors: { [key: string]: string } = {}

    if (!data.departure_airport) {
      errors.departure_airport = 'Departure airport is required'
    }

    if (!data.arrival_airport) {
      errors.arrival_airport = 'Arrival airport is required'
    }

    // ... rest of validation ...
    return errors
  }

  // Handle extracted boarding pass data
  const handleExtractedData = (data: any) => {
    // Convert string dates to Date objects
    const departureDateObj = data.departure_date ? new Date(data.departure_date) : new Date()
    const arrivalDateObj = data.arrival_date ? new Date(data.arrival_date) : departureDateObj

    // Find departure airport in europeanAirports
    const departureAirport = europeanAirports.find(
      (airport: Airport) => airport.iata === data.departure_iata ||
        airport.name.toLowerCase().includes(data.departure_airport.toLowerCase())
    )

    // Find arrival airport in europeanAirports
    const arrivalAirport = europeanAirports.find(
      (airport: Airport) => airport.iata === data.arrival_iata ||
        airport.name.toLowerCase().includes(data.arrival_airport.toLowerCase())
    )

    // Update selected airports
    if (departureAirport) {
      setSelectedDepartureAirport(departureAirport)
    }
    if (arrivalAirport) {
      setSelectedArrivalAirport(arrivalAirport)
    }

    // Update form state
    setFormData(prev => ({
      ...prev,
      passenger_name: data.passenger_name || '',
      reservation_number: data.reservation_number || '',
      flight_number: data.flight_number || '',
      departure_airport: departureAirport ? departureAirport.name : data.departure_airport || '',
      arrival_airport: arrivalAirport ? arrivalAirport.name : data.arrival_airport || '',
      departure_date: departureDateObj,
      departure_time: data.departure_time || '',
      arrival_time: data.arrival_time || '',
      total_receipt: data.total_receipt || '',
      airline: data.airline || null,
      arrival_iata: data.arrival_iata || null,
      departure_iata: data.departure_iata || null,
      seat: data.seat || null,
      notes: data.notes || null,
      departure_country: departureAirport ? departureAirport.country : data.departure_country || null,
      arrival_country: arrivalAirport ? arrivalAirport.country : data.arrival_country || null,
      departure_flag: data.departure_flag || null,
      arrival_flag: data.arrival_flag || null,
      arrival_date: arrivalDateObj,
      return_arrival_time: data.return_arrival_time || null
    }))

    // Update other state variables
    setDepartureDate(departureDateObj)
    setArrivalDate(arrivalDateObj)
    setFlightNumber(data.flight_number || '')
    setAirline(data.airline || '')

    // Update selected passengers if available
    if (data.passengers && data.passengers.length > 0) {
      setSelectedPassengers(data.passengers.map((p: any) => ({
        name: p.name,
        type: p.type || 'Adult',
        age: p.age
      })))
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Main Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("/plane5.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.3,
        }}
      />

      {/* Content with higher z-index */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Add New Flight</h1>
              <p className="text-muted-foreground">Record the details of your journey</p>
            </div>
          </div>

          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-background/70 backdrop-blur-sm">
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Scan Boarding Pass
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <Card className="border-t-4 border-t-flight shadow-md bg-background/60 backdrop-blur-sm">
                <CardHeader className="bg-background/80">
                  <CardTitle className="flex items-center text-flight">
                    <Plane className="h-5 w-5 mr-2" />
                    Flight Details
                  </CardTitle>
                  <CardDescription>
                    Enter the details of your flight below. Fields marked with * are required.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit} className="relative">
                  {error && (
                    <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md mb-4 mx-4">
                      {error}
                    </div>
                  )}
                  <CardContent className="space-y-6">
                    {/* 1. Passenger Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center text-flight">
                        <User className="h-5 w-5 mr-2" />
                        Passenger Information
                      </h3>
                      <div className="flex flex-col space-y-2">
                        <Label className="flex items-center">
                          <User className="h-4 w-4 mr-1 text-flight" />
                          Passengers *
                        </Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedPassengers.map((passenger) => (
                            <div
                              key={passenger.name}
                              className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm"
                            >
                              <span>{passenger.title} {passenger.name}</span>
                              <button
                                type="button"
                                onClick={() => removePassenger(passenger.name)}
                                className="hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove {passenger.name}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        <PassengerSelector
                          value={undefined}
                          onChange={handlePassengerSelect}
                          label="Add Passenger"
                          required={selectedPassengers.length === 0}
                        />
                      </div>
                    </div>

                    {/* 2. Flight Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center text-flight">
                        <Plane className="h-5 w-5 mr-2" />
                        Flight Details
                      </h3>
                      {/* Gmail import button intentionally removed; use Flights → Tools instead */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="flightNumber" className="flex items-center">
                            <Plane className="h-4 w-4 mr-1 text-flight" />
                            Flight Number *
                          </Label>
                          <div className="relative">
                            <Plane className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="flightNumber"
                              name="flight_number"
                              placeholder="e.g., BA123"
                              className="pl-9"
                              required
                              value={formData.flight_number}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reservationNumber" className="flex items-center">
                            <FileText className="h-4 w-4 mr-1 text-flight" />
                            Reservation Number *
                          </Label>
                          <div className="relative">
                            <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reservationNumber"
                              name="reservation_number"
                              placeholder="e.g., ABC123"
                              className="pl-9"
                              required
                              value={formData.reservation_number}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="seat" className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-muted-foreground" />
                            Seat
                          </Label>
                          <div className="relative">
                            <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="seat"
                              name="seat"
                              placeholder="e.g., 12A"
                              className="pl-9"
                              value={formData.seat || ''}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Departure Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center text-flight">
                        <MapPin className="h-5 w-5 mr-2" />
                        Departure Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AirportSelector
                          value={selectedDepartureAirport}
                          onChange={(airport) => handleAirportSelect(airport, 'departure')}
                          label="Departure Airport *"
                          required
                        />

                        <div className="space-y-2">
                          <Label htmlFor="departureDate" className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 text-flight" />
                            Departure Date *
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="departureDate"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !departureDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {departureDate ? format(departureDate, "yyyy-MM-dd") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="p-0">
                              <Calendar
                                mode="single"
                                selected={departureDate}
                                onSelect={handleDepartureDateSelect}
                                initialFocus
                                fromYear={2000}
                                toYear={new Date().getFullYear() + 1}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="departureTime" className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-flight" />
                            Departure Time *
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              id="departureTime"
                              name="departure_time"
                              className="pl-9"
                              required
                              value={formData.departure_time}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Arrival Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center text-flight">
                        <MapPin className="h-5 w-5 mr-2" />
                        Arrival Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AirportSelector
                          value={selectedArrivalAirport}
                          onChange={(airport) => handleAirportSelect(airport, 'arrival')}
                          label="Arrival Airport *"
                          required
                        />

                        <div className="space-y-2">
                          <Label htmlFor="arrivalDate" className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 text-flight" />
                            Arrival Date *
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="arrivalDate"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !arrivalDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {arrivalDate ? format(arrivalDate, "yyyy-MM-dd") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="p-0">
                              <Calendar
                                mode="single"
                                selected={arrivalDate}
                                onSelect={handleArrivalDateSelect}
                                disabled={(date) => departureDate ? date < departureDate : false}
                                initialFocus
                                fromYear={2000}
                                toYear={new Date().getFullYear() + 1}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="arrivalTime" className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-flight" />
                            Arrival Time *
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              id="arrivalTime"
                              name="arrival_time"
                              className="pl-9"
                              required
                              value={formData.arrival_time}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5. Booking Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center text-flight">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Booking Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="totalReceipt" className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-1 text-flight" />
                            Total Receipt *
                          </Label>
                          <div className="relative">
                            <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="totalReceipt"
                              name="total_receipt"
                              placeholder="e.g., 299.99"
                              className="pl-9"
                              required
                              value={formData.total_receipt}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="purchasedDate" className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 text-flight" />
                            Purchase Date *
                          </Label>
                          <div className="relative">
                            <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="date"
                              id="purchasedDate"
                              name="purchased_date"
                              className="pl-9"
                              required
                              value={formData.purchased_date}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="purchaseTime" className="flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-flight" />
                            Purchase Time *
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              id="purchaseTime"
                              name="purchase_time"
                              className="pl-9"
                              required
                              value={formData.purchase_time}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 6. Additional Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="flex items-center">
                        <FileText className="h-4 w-4 mr-1 text-flight" />
                        Additional Notes
                      </Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        placeholder="Add any additional notes about your flight experience..."
                        className="min-h-[100px]"
                        value={formData.notes || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-flight hover:bg-flight/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Plane className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plane className="mr-2 h-4 w-4" />
                          Save Flight
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="scan">
              <Card className="border-t-4 border-t-flight shadow-md bg-background/60 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center text-flight">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Scan Boarding Pass
                  </CardTitle>
                  <CardDescription>
                    Upload your boarding pass image and we'll automatically extract the flight details.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BoardingPassScanner onDataExtracted={handleExtractedData} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Updated global styles */}
      <style jsx global>{`
        .rdp {
          margin: 0;
        }
        
        .rdp-month {
          padding: 16px;
        }
        
        .rdp-day_selected:not([disabled]) { 
          background-color: hsl(var(--flight));
          color: white;
        }
        
        .rdp-day_selected:hover:not([disabled]) {
          background-color: hsl(var(--flight));
          opacity: 0.8;
        }
        
        .rdp-day:hover:not([disabled]) {
          background-color: hsl(var(--muted));
        }

        .rdp-day {
          color: hsl(var(--foreground));
        }

        .rdp-day_today:not(.rdp-day_selected) {
          color: hsl(var(--flight));
          font-weight: bold;
        }

        /* Remove z-index override as it's handled by Radix UI */
        [data-radix-popper-content-wrapper] {
          z-index: 50;
        }
      `}</style>
    </div>
  )
}


