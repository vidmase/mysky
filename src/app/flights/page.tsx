"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowRight, Calendar, ChevronDown, Clock, Filter, Search, Plane, Building, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

// Mock flight data
const mockFlights = [
  {
    id: "1",
    date: new Date(2023, 5, 15),
    departureAirport: "LHR",
    departureCity: "London",
    arrivalAirport: "JFK",
    arrivalCity: "New York",
    duration: "7h 45m",
    airline: "British Airways",
    flightNumber: "BA177",
  },
  {
    id: "2",
    date: new Date(2023, 6, 22),
    departureAirport: "JFK",
    departureCity: "New York",
    arrivalAirport: "LAX",
    arrivalCity: "Los Angeles",
    duration: "5h 30m",
    airline: "Delta",
    flightNumber: "DL123",
  },
  {
    id: "3",
    date: new Date(2023, 7, 5),
    departureAirport: "LAX",
    departureCity: "Los Angeles",
    arrivalAirport: "SFO",
    arrivalCity: "San Francisco",
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
    duration: "1h 15m",
    airline: "Air France",
    flightNumber: "AF123",
  },
]

export default function FlightsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [airline, setAirline] = useState<string>("")
  const [dateRange, setDateRange] = useState<string>("")

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
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-1 text-airline" />
                        <span>{flight.airline}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="bg-flight/10 text-flight border-flight/20">
                        {flight.flightNumber}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                        {flight.duration}
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

