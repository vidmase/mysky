"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowRight, Calendar, ChevronDown, Clock, Filter, Search, Plane, Building, Plus, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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

export default function FlightsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [airline, setAirline] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("")
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  const [airlines, setAirlines] = useState<string[]>([])

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

    // Date range filter
    let matchesDateRange = true
    if (dateRange === "last3months") {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      matchesDateRange = new Date(flight.departure_date) >= threeMonthsAgo
    } else if (dateRange === "last6months") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      matchesDateRange = new Date(flight.departure_date) >= sixMonthsAgo
    } else if (dateRange === "lastyear") {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      matchesDateRange = new Date(flight.departure_date) >= oneYearAgo
    }

    return matchesSearch && matchesAirline && matchesDateRange
  }) : []

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateRange" className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-flight" />
                      Date Range
                    </Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger id="dateRange" className="pl-9 relative">
                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="last3months">Last 3 months</SelectItem>
                        <SelectItem value="last6months">Last 6 months</SelectItem>
                        <SelectItem value="lastyear">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="airline" className="flex items-center">
                      <Building className="h-4 w-4 mr-1 text-airline" />
                      Airline
                    </Label>
                    <Select value={airline} onValueChange={setAirline}>
                      <SelectTrigger id="airline" className="pl-9 relative">
                        <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All airlines" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All airlines</SelectItem>
                        {airlines.map((airline) => (
                          <SelectItem key={airline} value={airline}>
                            {airline}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setDateRange("")
                        setAirline("")
                      }}
                    >
                      Clear Filters
                    </Button>
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
              ) : filteredFlights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <Plane className="h-8 w-8 mb-2 text-muted-foreground/50" />
                      <p>No flights found. Try adjusting your search or filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFlights.map((flight) => (
                  <TableRow
                    key={flight.id}
                    className="hover:bg-muted/30 cursor-pointer group"
                    onClick={() => (window.location.href = `/flights/${flight.id}`)}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {format(new Date(flight.departure_date), "MMM d, yyyy")}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:inline flex items-center">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {format(new Date(flight.departure_date), "EEEE")}
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
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-1 text-airline" />
                          <span>{flight.airline || "Unknown"}</span>
                        </div>
                        <Badge variant="outline" className="w-fit bg-flight/10 text-flight border-flight/20">
                          {flight.flight_number}
                        </Badge>
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
                    <TableCell className="hidden lg:table-cell">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col">
                              <span className="font-medium">{flight.total_receipt}</span>
                              <span className="text-xs text-muted-foreground truncate">
                                Purchased: {format(new Date(flight.purchased_date), "MMM d, yyyy")}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="flex flex-col gap-1">
                            <p className="font-medium">Purchase Details</p>
                            <div className="text-xs">
                              <p>Date: {format(new Date(flight.purchased_date), "MMMM d, yyyy")}</p>
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

