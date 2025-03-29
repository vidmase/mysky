"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format, isWithinInterval, isSameDay, addYears, subYears, setMonth, setYear, addMonths, subMonths } from "date-fns"
import { enUS } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { ArrowRight, Calendar, ChevronDown, Clock, Filter, Search, Plane, Building, Plus, User, CreditCard, ArrowUpDown, ArrowDownUp, X, ChevronLeft, ChevronRight } from "lucide-react"
import { DateRange } from "react-day-picker"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Define the Flight type based on the table schema
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

// Add currency conversion helper function at the top of the file, after the imports
const CURRENCY_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  PLN: 3.95,
  HUF: 350.50,
  RON: 4.60,
  CZK: 23.20,
  BGN: 1.80,
  HRK: 7.03,
  DKK: 6.87,
  SEK: 10.40,
  NOK: 10.60,
  ISK: 140.00,
  CHF: 0.90,
  TRY: 32.00,
  UAH: 39.00,
  MDL: 17.80,
  ALL: 95.00,
  MKD: 56.50,
  SRD: 35.00,
  BAM: 1.80,
  RSD: 107.00,
  KZT: 450.00,
  AZN: 1.70,
  GEL: 2.70,
  AMD: 400.00,
  KGS: 89.00,
  TJS: 10.90,
  UZS: 12500.00,
  TMT: 3.50,
  AFN: 71.00,
  IRR: 42000.00,
  IQD: 1300.00,
  SYP: 13000.00,
  LBP: 89000.00,
  JOD: 0.71,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  BHD: 0.38,
  KWD: 0.31,
  OMR: 0.38,
  ILS: 3.70,
  EGP: 31.00,
  DZD: 135.00,
  TND: 3.10,
  MAD: 10.00,
  LYD: 4.80,
  SDG: 600.00,
  ETB: 56.00,
  KES: 160.00,
  UGX: 3800.00,
  ZAR: 18.80,
  MUR: 45.00,
  SCR: 13.50,
  MVR: 15.40,
  BDT: 110.00,
  NPR: 133.00,
  PKR: 280.00,
  LKR: 320.00,
  MMK: 2100.00,
  KHR: 4100.00,
  LAK: 21000.00,
  VND: 24500.00,
  THB: 35.50,
  MYR: 4.80,
  SGD: 1.35,
  IDR: 15900.00,
  PHP: 56.50,
  KRW: 1330.00,
  JPY: 151.00,
  CNY: 7.20,
  HKD: 7.82,
  TWD: 31.80,
  MOP: 8.00,
  AUD: 1.52,
  NZD: 1.66,
  CAD: 1.35,
  BRL: 4.95,
  ARS: 870.00,
  CLP: 950.00,
  COP: 3900.00,
  MXN: 16.70,
  PEN: 3.70,
  UYU: 39.00,
  VES: 35.00,
  PYG: 7300.00,
  BOB: 6.90,
  CRC: 520.00,
  DOP: 58.00,
  GTQ: 7.80,
  HNL: 24.70,
  NIO: 36.80,
  PAB: 1.00,
  SVC: 8.75,
  TTD: 6.80,
  XCD: 2.70,
  ANG: 1.80,
  AWG: 1.80,
  BBD: 2.00,
  BSD: 1.00,
  CUP: 24.00,
  DJF: 178.00,
  ERN: 15.00,
  GMD: 65.00,
  GNF: 8600.00,
  HTG: 138.00,
  KMF: 450.00,
  LRD: 190.00,
  MWK: 1700.00,
  MZN: 64.00,
  NAD: 18.80,
  RWF: 1300.00,
  SLL: 22000.00,
  SOS: 570.00,
  SSP: 1300.00,
  STN: 22.50,
  SZL: 18.80,
  TZS: 2500.00,
  ZMW: 25.00,
  ZWL: 3200.00,
}

function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  const usdAmount = amount / CURRENCY_RATES[fromCurrency as keyof typeof CURRENCY_RATES]
  return usdAmount * CURRENCY_RATES[toCurrency as keyof typeof CURRENCY_RATES]
}

// Add currency type
type Currency = keyof typeof CURRENCY_RATES

function formatTimeToHHMM(time: string): string {
  if (!time) return '';
  
  // Handle different time formats
  const timeStr = time.toString().trim();
  
  // Try to parse the time string
  let hours: string;
  let minutes: string;
  
  // Check if time is in HH:MM format
  if (timeStr.includes(':')) {
    [hours, minutes] = timeStr.split(':');
  } else {
    // Assume it's in HHMM format
    hours = timeStr.slice(0, 2);
    minutes = timeStr.slice(2, 4);
  }
  
  // Ensure hours and minutes are two digits
  hours = hours.padStart(2, '0');
  minutes = minutes.padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

function calculateDuration(departureTime: string, arrivalTime: string): string {
  // Convert times to minutes since midnight
  const getMinutes = (time: string) => {
    const [hours, minutes] = formatTimeToHHMM(time).split(':').map(Number)
    return hours * 60 + minutes
  }

  let depMinutes = getMinutes(departureTime)
  let arrMinutes = getMinutes(arrivalTime)

  // Handle overnight flights
  if (arrMinutes < depMinutes) {
    arrMinutes += 24 * 60 // Add 24 hours
  }

  const durationMinutes = arrMinutes - depMinutes
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
}

// Add airline logo helper function
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

export default function FlightsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [airline, setAirline] = useState("all")
  const [priceRange, setPriceRange] = useState("all")
  const [tripType, setTripType] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  const [airlines, setAirlines] = useState<string[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD")
  
  // Ensure consistent initial date
  const [initialDate] = useState(() => new Date())

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const response = await fetch('/api/flights')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setFlights(data)
          // Extract unique airlines for the filter dropdown
          const uniqueAirlines = Array.from(new Set(data.map(f => f.airline).filter(Boolean))) as string[]
          setAirlines(uniqueAirlines)
        } else if (data.error) {
          console.error('API error:', data.error)
          setFlights([])
          setAirlines([])
        } else {
          console.error('Expected array of flights but got:', data)
          setFlights([])
          setAirlines([])
        }
      } catch (error) {
        console.error('Error fetching flights:', error)
        setFlights([])
        setAirlines([])
      } finally {
        setLoading(false)
      }
    }

    fetchFlights()
  }, [])

  // Filter flights based on search term and filters
  const filteredFlights = Array.isArray(flights) ? flights.filter((flight: Flight) => {
    const matchesSearch =
      flight.departure_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.arrival_airport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.departure_iata?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.arrival_iata?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.airline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.flight_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.reservation_number.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAirline = airline === "all" || airline === "" || flight.airline === airline

    // Date range filter using react-day-picker's DateRange
    let matchesDateRange = true
    if (dateRange?.from || dateRange?.to) {
      const flightDate = new Date(flight.departure_date)
      if (dateRange.from && dateRange.to) {
        matchesDateRange = isWithinInterval(flightDate, { start: dateRange.from, end: dateRange.to })
      } else if (dateRange.from) {
        matchesDateRange = isSameDay(flightDate, dateRange.from)
      }
    }

    // Price range filter
    let matchesPriceRange = true
    if (priceRange !== "all") {
      const price = parseFloat(flight.total_receipt.replace(/[^0-9.]/g, ''))
      switch (priceRange) {
        case "under100":
          matchesPriceRange = price < 100
          break
        case "100to500":
          matchesPriceRange = price >= 100 && price <= 500
          break
        case "500to1000":
          matchesPriceRange = price >= 500 && price <= 1000
          break
        case "over1000":
          matchesPriceRange = price > 1000
          break
      }
    }

    // Trip type filter (based on departure and arrival airports)
    let matchesTripType = true
    if (tripType !== "all") {
      const isRoundTrip = flights.some(
        (otherFlight: Flight) =>
          otherFlight.id !== flight.id &&
          otherFlight.departure_airport === flight.arrival_airport &&
          otherFlight.arrival_airport === flight.departure_airport
      )
      matchesTripType = tripType === "roundtrip" ? isRoundTrip : !isRoundTrip
    }

    return matchesSearch && matchesAirline && matchesDateRange && matchesPriceRange && matchesTripType
  }) : []

  // Sort filtered flights
  const sortedFlights = [...filteredFlights].sort((a, b) => {
    switch (sortBy) {
      case "date":
        const dateA = new Date(a.departure_date)
        const dateB = new Date(b.departure_date)
        return sortOrder === "desc" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
      case "price":
        const priceA = parseFloat(a.total_receipt.replace(/[^0-9.]/g, ''))
        const priceB = parseFloat(b.total_receipt.replace(/[^0-9.]/g, ''))
        return sortOrder === "desc" ? priceB - priceA : priceA - priceB
      case "airline":
        const airlineA = a.airline || ""
        const airlineB = b.airline || ""
        return sortOrder === "desc" ? airlineB.localeCompare(airlineA) : airlineA.localeCompare(airlineB)
      default:
        return 0
    }
  })

  // Add isUpcoming helper function at the top of the component
  const isUpcoming = (date: string) => {
    const flightDate = new Date(date)
    flightDate.setHours(23, 59, 59, 999) // End of the flight day
    return flightDate > new Date()
  }

  // Update the price range filter logic
  const getPriceRangeLabel = (range: string) => {
    const baseAmounts: Record<string, number> = {
      'under100': 100,
      '100to500': 500,
      '500to1000': 1000,
      'over1000': 1000
    }
    
    const baseAmount = baseAmounts[range] || 0

    if (range === "all") return "All prices"
    if (range === "under100") return `Under ${selectedCurrency} ${Math.round(convertCurrency(baseAmount, "USD", selectedCurrency))}`
    if (range === "100to500") return `${selectedCurrency} ${Math.round(convertCurrency(100, "USD", selectedCurrency))} - ${Math.round(convertCurrency(baseAmount, "USD", selectedCurrency))}`
    if (range === "500to1000") return `${selectedCurrency} ${Math.round(convertCurrency(500, "USD", selectedCurrency))} - ${Math.round(convertCurrency(baseAmount, "USD", selectedCurrency))}`
    return `Over ${selectedCurrency} ${Math.round(convertCurrency(baseAmount, "USD", selectedCurrency))}`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Plane className="h-6 w-6 mr-2 text-flight" />
              Flight History
            </h1>
            <p className="text-muted-foreground">Browse and search your past flights</p>
          </div>
          <Button asChild className="bg-flight hover:bg-flight/90">
            <Link href="/add-flight" className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Add New Flight
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flights..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="sm:w-auto w-full">
            <Filter className="mr-2 h-4 w-4" />
            Filters
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </Button>
        </div>

        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="animate-slide-up">
            <Card className="border-t-4 border-t-flight">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-flight" />
                      Date Range
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${!dateRange && "text-muted-foreground"}`}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">From</span>
                                    <span className="font-medium">{format(dateRange.from, "MMM dd, yyyy", { locale: enUS })}</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">To</span>
                                    <span className="font-medium">{format(dateRange.to, "MMM dd, yyyy", { locale: enUS })}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">Selected Date</span>
                                  <span className="font-medium">{format(dateRange.from, "MMM dd, yyyy", { locale: enUS })}</span>
                                </div>
                              )
                            ) : (
                              <span>Select date range</span>
                            )}
                            {dateRange && (
                              <X
                                className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer ml-auto"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDateRange(undefined)
                                }}
                              />
                            )}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 border-b">
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium">Select Range</h4>
                            <p className="text-xs text-muted-foreground">
                              Pick a start and end date for your search
                            </p>
                          </div>
                        </div>
                        <CalendarComponent
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from || initialDate}
                          selected={dateRange}
                          onSelect={(range: DateRange | undefined) => setDateRange(range)}
                          numberOfMonths={2}
                          className="p-3"
                          showOutsideDays={false}
                          fixedWeeks
                          locale={enUS}
                          formatters={{
                            formatCaption: (date, options) => format(date, "MMMM yyyy", { locale: enUS }),
                          }}
                          classNames={{
                            months: "flex space-x-4",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-medium",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-muted transition-colors rounded-md",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-muted rounded-md transition-colors",
                            day_range_start: "day-range-start",
                            day_range_end: "day-range-end",
                            day_selected: "bg-flight text-primary-foreground hover:bg-flight hover:text-primary-foreground focus:bg-flight focus:text-primary-foreground",
                            day_today: "bg-accent text-accent-foreground",
                            day_outside: "text-muted-foreground opacity-50",
                            day_disabled: "text-muted-foreground opacity-50",
                            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                            day_hidden: "invisible",
                          }}
                          components={{
                            IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                            IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                          }}
                        />
                        {dateRange?.from && (
                          <div className="p-3 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground"
                              onClick={() => setDateRange(undefined)}
                            >
                              Clear Selection
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="airline" className="flex items-center">
                      <Building className="h-4 w-4 mr-1 text-flight" />
                      Airline
                    </Label>
                    <Select value={airline} onValueChange={setAirline}>
                      <SelectTrigger id="airline" className="pl-9 relative">
                        <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All airlines" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All airlines</SelectItem>
                        {Array.from(new Set(flights?.map(f => f.airline).filter(Boolean))).map(airline => (
                          <SelectItem key={airline} value={airline || ""}>
                            {airline}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priceRange" className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-1 text-flight" />
                      Price Range
                    </Label>
                    <div className="flex gap-2">
                      <Select value={priceRange} onValueChange={setPriceRange}>
                        <SelectTrigger id="priceRange" className="pl-9 relative">
                          <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="All prices" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All prices</SelectItem>
                          <SelectItem value="under100">{getPriceRangeLabel("under100")}</SelectItem>
                          <SelectItem value="100to500">{getPriceRangeLabel("100to500")}</SelectItem>
                          <SelectItem value="500to1000">{getPriceRangeLabel("500to1000")}</SelectItem>
                          <SelectItem value="over1000">{getPriceRangeLabel("over1000")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedCurrency} onValueChange={(value: Currency) => setSelectedCurrency(value)}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(CURRENCY_RATES).map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tripType" className="flex items-center">
                      <Plane className="h-4 w-4 mr-1 text-flight" />
                      Trip Type
                    </Label>
                    <Select value={tripType} onValueChange={setTripType}>
                      <SelectTrigger id="tripType" className="pl-9 relative">
                        <Plane className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All trips" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All trips</SelectItem>
                        <SelectItem value="oneway">One-way</SelectItem>
                        <SelectItem value="roundtrip">Round-trip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sortBy" className="flex items-center">
                      <ArrowUpDown className="h-4 w-4 mr-1 text-flight" />
                      Sort By
                    </Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sortBy" className="pl-9 relative">
                        <ArrowUpDown className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="airline">Airline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sortOrder" className="flex items-center">
                      <ArrowDownUp className="h-4 w-4 mr-1 text-flight" />
                      Sort Order
                    </Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger id="sortOrder" className="pl-9 relative">
                        <ArrowDownUp className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Sort order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <div className="rounded-md border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[120px]">Flight Date</TableHead>
                <TableHead className="w-[140px]">Passenger</TableHead>
                <TableHead>Reservation</TableHead>
                <TableHead>Flight Details</TableHead>
                <TableHead className="hidden md:table-cell">Departure</TableHead>
                <TableHead className="hidden md:table-cell">Arrival</TableHead>
                <TableHead className="hidden md:table-cell w-[80px]">Duration</TableHead>
                <TableHead className="hidden lg:table-cell">Purchase Info</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Plane className="h-8 w-8 mb-2 animate-pulse text-flight" />
                      <p>Loading flights...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedFlights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Plane className="h-8 w-8 mb-2 text-muted-foreground/50" />
                      <p>No flights found. Try adjusting your search or filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedFlights.map((flight) => (
                  <TableRow
                    key={flight.id}
                    className="hover:bg-muted/30 cursor-pointer group"
                    onClick={() => (window.location.href = `/flights/${flight.id}`)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 relative">
                          <span className="font-medium">
                            {format(new Date(flight.departure_date), "MMM d, yyyy", { locale: enUS })}
                          </span>
                          {isUpcoming(flight.departure_date) && (
                            <Badge 
                              variant="secondary" 
                              className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/30 transition-colors px-1.5 py-0 text-[0.65rem] absolute -top-5 left-0 font-medium"
                            >
                               ✈️Upcoming
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:inline flex items-center">
                          <Calendar className="inline h-3 w-3 mr-1" />
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
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center">
                          <Badge variant="outline" className="mr-1 bg-airport/10 text-airport border-airport/20 px-1 py-0">
                            {flight.departure_iata || flight.departure_airport}
                          </Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">{flight.departure_airport}</span>
                        <span className="text-xs text-muted-foreground flex items-center mt-1">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatTimeToHHMM(flight.departure_time)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
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
                        <span className="text-xs text-muted-foreground flex items-center mt-1">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatTimeToHHMM(flight.arrival_time)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell w-[80px]">
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm whitespace-nowrap">
                          {calculateDuration(flight.departure_time, flight.arrival_time)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Link href={`/flights/${flight.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

