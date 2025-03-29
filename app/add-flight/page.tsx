"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, Clock, Plane, MapPin, Building, User, CreditCard, FileText, ArrowLeft } from "lucide-react"
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

export default function AddFlightPage() {
  const router = useRouter()
  const [departureDate, setDepartureDate] = useState<Date>()
  const [arrivalDate, setArrivalDate] = useState<Date>()
  const [departureDateOpen, setDepartureDateOpen] = useState(false)
  const [arrivalDateOpen, setArrivalDateOpen] = useState(false)
  const today = new Date()

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

  const handleDepartureDateSelect = (date: Date | undefined) => {
    setDepartureDate(date)

    // If arrival date is before the new departure date, update it
    if (date && arrivalDate && isBefore(arrivalDate, date)) {
      setArrivalDate(date)
    }

    // If no arrival date is set, default to same day
    if (date && !arrivalDate) {
      setArrivalDate(date)
    }

    // Close the popover
    setDepartureDateOpen(false)
  }

  const handleArrivalDateSelect = (date: Date | undefined) => {
    if (date && departureDate && isBefore(date, departureDate)) {
      // Don't allow arrival date before departure date
      setArrivalDate(departureDate)
    } else {
      setArrivalDate(date)
    }

    // Close the popover
    setArrivalDateOpen(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would save the flight data
    // For now, just redirect to the flights page
    router.push("/flights")
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
          <TabsList className="grid w-full grid-cols-2 mb-6">
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
            <Card className="border-t-4 border-t-flight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-flight">
                  <Plane className="h-5 w-5 mr-2" />
                  Flight Details
                </CardTitle>
                <CardDescription>
                  Enter the details of your flight below. Fields marked with * are required.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmit} className="relative">
                {/* Main form content */}
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="departureAirport" className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-airport" />
                        Departure Airport *
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="departureAirport"
                          placeholder="IATA code or name (e.g., LHR)"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="arrivalAirport" className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-airport" />
                        Arrival Airport *
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="arrivalAirport"
                          placeholder="IATA code or name (e.g., JFK)"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            {departureDate ? format(departureDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="p-0">
                          <div className="bg-popover rounded-md border shadow-md">
                            <Calendar
                              mode="single"
                              selected={departureDate}
                              onSelect={handleDepartureDateSelect}
                              disabled={(date) => date < today}
                              initialFocus
                            />
                          </div>
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
                        <Input type="time" id="departureTime" className="pl-9" required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                            {arrivalDate ? format(arrivalDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="p-0">
                          <div className="bg-popover rounded-md border shadow-md">
                            <Calendar
                              mode="single"
                              selected={arrivalDate}
                              onSelect={handleArrivalDateSelect}
                              disabled={(date) => date < today || (departureDate ? date < departureDate : false)}
                              initialFocus
                            />
                          </div>
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
                        <Input type="time" id="arrivalTime" className="pl-9" required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="flightNumber" className="flex items-center">
                        <Plane className="h-4 w-4 mr-1 text-airline" />
                        Flight Number
                      </Label>
                      <div className="relative">
                        <Plane className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="flightNumber" placeholder="e.g., BA123" className="pl-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="airline" className="flex items-center">
                        <Building className="h-4 w-4 mr-1 text-airline" />
                        Airline
                      </Label>
                      <Select>
                        <SelectTrigger className="pl-9 relative">
                          <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Select airline" />
                        </SelectTrigger>
                        <SelectContent>
                          {airlines.map((airline) => (
                            <SelectItem key={airline} value={airline}>
                              {airline}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="seat" className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-muted-foreground" />
                        Seat
                      </Label>
                      <div className="relative">
                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input id="seat" placeholder="e.g., 12A" className="pl-9" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="class" className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-1 text-muted-foreground" />
                        Class
                      </Label>
                      <Select>
                        <SelectTrigger className="pl-9 relative">
                          <CreditCard className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="premium">Premium Economy</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="first">First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                      Notes
                    </Label>
                    <Textarea id="notes" placeholder="Any additional information about this flight" />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" type="button" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-flight hover:bg-flight/90">
                    <Plane className="mr-2 h-4 w-4" />
                    Save Flight
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="scan">
            <Card className="border-t-4 border-t-flight shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-flight">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Scan Boarding Pass
                </CardTitle>
                <CardDescription>
                  This feature is coming soon! You'll be able to scan your boarding pass to automatically fill in flight
                  details.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
                  <CreditCard className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Feature Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  We're working on adding the ability to scan your boarding pass or QR code to automatically fill in
                  your flight details.
                </p>
              </CardContent>
              <CardFooter className="justify-center">
                <Button variant="outline" onClick={() => router.back()}>
                  Go Back
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
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


