"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowRight, Calendar, ChevronDown, Clock, Filter, Search, Plane, Building, Plus } from "lucide-react"
import { DateTime } from 'luxon'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AirlineBadge } from "../../../app/components/ui/airline-badge"

// Mock flight data
const mockFlights = [
  {
    id: "1",
    date: new Date(2023, 5, 15),
    departureAirport: "LHR",
    departureCity: "London",
    arrivalAirport: "JFK",
    arrivalCity: "New York",
    departureTime: "10:00",
    arrivalTime: "13:45",
    duration: "7h 45m",
    airline: "British Airways",
    flightNumber: "BA177",
  },
  {
    id: "2",
    date: new Date(2025, 3, 19),
    departureAirport: "KUN",
    departureCity: "Kaunas",
    arrivalAirport: "LTN",
    arrivalCity: "London-Luton",
    departureTime: "11:10",
    arrivalTime: "12:05",
    duration: "2h 55m",
    airline: "Wizz Air",
    flightNumber: "W9 5450",
  },
  {
    id: "3",
    date: new Date(2023, 7, 5),
    departureAirport: "LAX",
    departureCity: "Los Angeles",
    arrivalAirport: "SFO",
    arrivalCity: "San Francisco",
    departureTime: "09:00",
    arrivalTime: "10:25",
    duration: "1h 25m",
    airline: "United",
    flightNumber: "UA456",
  },
  {
    id: "4",
    date: new Date(2023, 8, 10),
    departureAirport: "SFO",
    departureCity: "San Francisco",
    arrivalAirport: "LHR",
    arrivalCity: "London",
    departureTime: "16:00",
    arrivalTime: "10:15",
    duration: "10h 15m",
    airline: "British Airways",
    flightNumber: "BA284",
  },
  {
    id: "5",
    date: new Date(2023, 9, 18),
    departureAirport: "LHR",
    departureCity: "London",
    arrivalAirport: "CDG",
    arrivalCity: "Paris",
    departureTime: "14:00",
    arrivalTime: "16:15",
    duration: "1h 15m",
    airline: "Air France",
    flightNumber: "AF123",
  },
]

// Add a robust IATA to timezone mapping for major world airports
const airportTimeZones: Record<string, string> = {
  // Europe
  LHR: "Europe/London", LGW: "Europe/London", STN: "Europe/London", LTN: "Europe/London", LCY: "Europe/London", MAN: "Europe/London", BHX: "Europe/London", EDI: "Europe/London", GLA: "Europe/London", BRS: "Europe/London", NCL: "Europe/London",
  DUB: "Europe/Dublin", SNN: "Europe/Dublin", ORK: "Europe/Dublin",
  CDG: "Europe/Paris", ORY: "Europe/Paris", NCE: "Europe/Paris", LYS: "Europe/Paris", MRS: "Europe/Paris", TLS: "Europe/Paris",
  FRA: "Europe/Berlin", MUC: "Europe/Berlin", BER: "Europe/Berlin", DUS: "Europe/Berlin", HAM: "Europe/Berlin", CGN: "Europe/Berlin",
  MAD: "Europe/Madrid", BCN: "Europe/Madrid", PMI: "Europe/Madrid", ALC: "Europe/Madrid", AGP: "Europe/Madrid", IBZ: "Europe/Madrid",
  FCO: "Europe/Rome", MXP: "Europe/Rome", VCE: "Europe/Rome", NAP: "Europe/Rome", BGY: "Europe/Rome", PSA: "Europe/Rome",
  AMS: "Europe/Amsterdam", RTM: "Europe/Amsterdam", EIN: "Europe/Amsterdam",
  BRU: "Europe/Brussels", CRL: "Europe/Brussels",
  ZRH: "Europe/Zurich", GVA: "Europe/Zurich", BSL: "Europe/Zurich",
  VIE: "Europe/Vienna", SZG: "Europe/Vienna",
  LIS: "Europe/Lisbon", OPO: "Europe/Lisbon", FAO: "Europe/Lisbon",
  CPH: "Europe/Copenhagen", BLL: "Europe/Copenhagen",
  ARN: "Europe/Stockholm", GOT: "Europe/Stockholm", MMX: "Europe/Stockholm",
  OSL: "Europe/Oslo", BGO: "Europe/Oslo", TRD: "Europe/Oslo",
  HEL: "Europe/Helsinki", TMP: "Europe/Helsinki",
  WAW: "Europe/Warsaw", KRK: "Europe/Warsaw", GDN: "Europe/Warsaw", WRO: "Europe/Warsaw", POZ: "Europe/Warsaw",
  BUD: "Europe/Budapest",
  PRG: "Europe/Prague",
  ATH: "Europe/Athens", HER: "Europe/Athens", RHO: "Europe/Athens", SKG: "Europe/Athens",
  MLA: "Europe/Malta",
  VNO: "Europe/Vilnius", KUN: "Europe/Vilnius", PLQ: "Europe/Vilnius",
  RIX: "Europe/Riga",
  TLL: "Europe/Tallinn",
  KEF: "Atlantic/Reykjavik",
  // North America
  JFK: "America/New_York", EWR: "America/New_York", BOS: "America/New_York", IAD: "America/New_York", DCA: "America/New_York", MIA: "America/New_York", ORD: "America/Chicago", DFW: "America/Chicago", ATL: "America/New_York", LAX: "America/Los_Angeles", SFO: "America/Los_Angeles", SEA: "America/Los_Angeles", DEN: "America/Denver", PHX: "America/Phoenix", LAS: "America/Los_Angeles", SJC: "America/Los_Angeles", SAN: "America/Los_Angeles", SLC: "America/Denver", MSP: "America/Chicago", DTW: "America/Detroit", CLT: "America/New_York", MCO: "America/New_York", FLL: "America/New_York", TPA: "America/New_York", PHL: "America/New_York", IAH: "America/Chicago", HOU: "America/Chicago", DAL: "America/Chicago", AUS: "America/Chicago", MEX: "America/Mexico_City", CUN: "America/Cancun",
  // Add more as needed
};

// Utility to calculate duration between two airports with time zones
const calculateDuration = (depIata: string, arrIata: string, depDate: Date, depTime: string, arrTime: string) => {
  const depTz = airportTimeZones[depIata];
  const arrTz = airportTimeZones[arrIata];
  if (!depTz || !arrTz) return "N/A";
  const [depHour, depMin] = depTime.split(":").map(Number);
  const [arrHour, arrMin] = arrTime.split(":").map(Number);
  const year = depDate.getFullYear();
  const month = depDate.getMonth() + 1;
  const day = depDate.getDate();
  // Parse as local time in the correct zone
  const dep = DateTime.fromObject(
    { year, month, day, hour: depHour, minute: depMin },
    { zone: depTz }
  );
  let arr = DateTime.fromObject(
    { year, month, day, hour: arrHour, minute: arrMin },
    { zone: arrTz }
  );
  if (arr < dep) arr = arr.plus({ days: 1 });
  const diff = arr.toUTC().diff(dep.toUTC(), ["hours", "minutes"]);
  const hours = Math.floor(diff.hours);
  const minutes = Math.round(diff.minutes);
  return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
};

// Utility function to get airline logo path
const getAirlineLogo = (airline: string) => {
  if (!airline) return "/placeholder-logo.png";
  const key = airline.toLowerCase().replace(/\s/g, "");
  const known = ["ryanair", "wizzair", "easyjet", "airbaltic"];
  if (known.includes(key)) return `/${key}.png`;
  return "/placeholder-logo.png";
};

export default function FlightsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [airline, setAirline] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("")

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

  // Filter flights based on search term and filters
  const filteredFlights = mockFlights.filter((flight) => {
    const matchesSearch =
      flight.departureAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.arrivalAirport.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.departureCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.arrivalCity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.airline.toLowerCase().includes(searchTerm.toLowerCase()) ||
      flight.flightNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAirline = airline === "all" || airline === "" || flight.airline === airline

    // Simple date range filter for demo purposes
    let matchesDateRange = true
    if (dateRange === "last3months") {
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      matchesDateRange = flight.date >= threeMonthsAgo
    } else if (dateRange === "last6months") {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      matchesDateRange = flight.date >= sixMonthsAgo
    } else if (dateRange === "lastyear") {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      matchesDateRange = flight.date >= oneYearAgo
    }

    return matchesSearch && matchesAirline && matchesDateRange
  })

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
                        <SelectItem value="British Airways">British Airways</SelectItem>
                        <SelectItem value="Delta">Delta</SelectItem>
                        <SelectItem value="United">United</SelectItem>
                        <SelectItem value="Air France">Air France</SelectItem>
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
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Route</TableHead>
                <TableHead className="hidden md:table-cell">Airline</TableHead>
                <TableHead className="hidden md:table-cell">Flight</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{format(flight.date, "MMM d, yyyy")}</span>
                        <span className="text-xs text-muted-foreground hidden sm:inline flex items-center">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {format(flight.date, "EEEE")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center">
                            <Badge
                              variant="outline"
                              className="mr-1 bg-airport/10 text-airport border-airport/20 px-1 py-0"
                            >
                              {flight.departureAirport}
                            </Badge>
                          </span>
                          <span className="text-xs text-muted-foreground">{flight.departureCity}</span>
                        </div>
                        <ArrowRight className="mx-2 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center">
                            <Badge
                              variant="outline"
                              className="mr-1 bg-airport/10 text-airport border-airport/20 px-1 py-0"
                            >
                              {flight.arrivalAirport}
                            </Badge>
                          </span>
                          <span className="text-xs text-muted-foreground">{flight.arrivalCity}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <AirlineBadge airline={flight.airline} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <AirlineBadge airline={flight.airline} />
                      <Badge variant="outline" className="bg-flight/10 text-flight border-flight/20">
                        {flight.flightNumber}
                      </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                        {calculateDuration(
                          flight.departureAirport,
                          flight.arrivalAirport,
                          flight.date,
                          flight.departureTime,
                          flight.arrivalTime
                        )}
                      </div>
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

