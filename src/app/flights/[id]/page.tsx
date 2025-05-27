"use client"

import { useRouter } from "next/navigation"
import { format } from "date-fns"
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
} from "lucide-react"
import { DateTime } from 'luxon'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Add a robust IATA to timezone mapping for major world airports
const airportTimeZones: Record<string, string> = {
  LHR: "Europe/London", JFK: "America/New_York", KUN: "Europe/Vilnius", LTN: "Europe/London",
  // Add more as needed
};

export default function FlightDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const flightId = params.id

  // In a real app, this would fetch the flight data based on the ID
  // For now, we'll use mock data
  const flight = {
    id: flightId,
    departureAirport: {
      code: "LHR",
      name: "London Heathrow Airport",
      city: "London",
      country: "United Kingdom",
      terminal: "5",
      gate: "A22",
    },
    arrivalAirport: {
      code: "JFK",
      name: "John F. Kennedy International Airport",
      city: "New York",
      country: "United States",
      terminal: "8",
      gate: "B12",
    },
    departureDate: new Date(2023, 5, 15, 10, 30),
    arrivalDate: new Date(2023, 5, 15, 18, 15),
    airline: "British Airways",
    flightNumber: "BA177",
    aircraft: "Boeing 777-300ER",
    seat: "23K",
    class: "Economy",
    duration: "7h 45m",
    distance: "5541 km",
    notes:
      "Smooth flight with minimal turbulence. Food was decent. Window seat with good views during takeoff and landing.",
    weather: {
      departure: "Sunny, 22°C",
      arrival: "Partly cloudy, 28°C",
    },
    amenities: ["Wi-Fi", "Power Outlets", "In-flight Entertainment", "Meal Service"],
  }

  const calculateDuration = () => {
    const depIata = flight.departureAirport.code;
    const arrIata = flight.arrivalAirport.code;
    const depTz = airportTimeZones[depIata];
    const arrTz = airportTimeZones[arrIata];
    if (!depTz || !arrTz) return "N/A";
    const depDate = flight.departureDate;
    const arrDate = flight.arrivalDate;
    const dep = DateTime.fromObject(
      { year: depDate.getFullYear(), month: depDate.getMonth() + 1, day: depDate.getDate(), hour: depDate.getHours(), minute: depDate.getMinutes() },
      { zone: depTz }
    );
    let arr = DateTime.fromObject(
      { year: arrDate.getFullYear(), month: arrDate.getMonth() + 1, day: arrDate.getDate(), hour: arrDate.getHours(), minute: arrDate.getMinutes() },
      { zone: arrTz }
    );
    if (arr < dep) arr = arr.plus({ days: 1 });
    const diff = arr.toUTC().diff(dep.toUTC(), ["hours", "minutes"]);
    const hours = Math.floor(diff.hours);
    const minutes = Math.round(diff.minutes);
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Plane className="h-5 w-5 mr-2 text-flight" />
              Flight Details
            </h1>
            <p className="text-muted-foreground">
              {flight.departureAirport.city} to {flight.arrivalAirport.city} •{" "}
              {format(flight.departureDate, "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="relative py-6 px-4 rounded-xl bg-gradient-to-r from-flight/10 to-airport/10 border shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left space-y-1">
              <div className="text-4xl font-bold text-flight">{flight.departureAirport.code}</div>
              <div className="text-sm text-muted-foreground">{flight.departureAirport.city}</div>
              <div className="text-lg font-medium">{format(flight.departureDate, "h:mm a")}</div>
            </div>

            <div className="flex flex-col items-center">
              <Badge className="mb-2 bg-airline text-white">{flight.flightNumber}</Badge>
              <div className="relative w-32 md:w-48 h-[2px] bg-muted-foreground/30 my-2">
                <div className="absolute top-1/2 left-0 right-0 flex justify-center">
                  <Plane className="h-5 w-5 text-flight -mt-2.5 rotate-90" />
                </div>
                <div className="absolute -top-1 left-0 w-2 h-2 rounded-full bg-flight"></div>
                <div className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-airport"></div>
              </div>
              <div className="text-sm text-muted-foreground">{flight.duration}</div>
            </div>

            <div className="text-center md:text-right space-y-1">
              <div className="text-4xl font-bold text-airport">{flight.arrivalAirport.code}</div>
              <div className="text-sm text-muted-foreground">{flight.arrivalAirport.city}</div>
              <div className="text-lg font-medium">{format(flight.arrivalDate, "h:mm a")}</div>
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
                  <CardDescription>{format(flight.departureDate, "EEEE, MMMM d, yyyy")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                      <MapPin className="h-4 w-4 text-flight" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {flight.departureAirport.name} ({flight.departureAirport.code})
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {flight.departureAirport.city}, {flight.departureAirport.country}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                      <Clock className="h-4 w-4 text-flight" />
                    </div>
                    <div>
                      <div className="font-medium">{format(flight.departureDate, "h:mm a")}</div>
                      <div className="text-sm text-muted-foreground">Local time</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                      <div className="text-xs font-bold text-flight">T</div>
                    </div>
                    <div>
                      <div className="font-medium">
                        Terminal {flight.departureAirport.terminal}, Gate {flight.departureAirport.gate}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Boarding time: {format(new Date(flight.departureDate.getTime() - 30 * 60000), "h:mm a")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-flight/10 flex items-center justify-center mt-0.5">
                      <CloudSun className="h-4 w-4 text-flight" />
                    </div>
                    <div>
                      <div className="font-medium">{flight.weather.departure}</div>
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
                  <CardDescription>{format(flight.arrivalDate, "EEEE, MMMM d, yyyy")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-airport/10 flex items-center justify-center mt-0.5">
                      <MapPin className="h-4 w-4 text-airport" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {flight.arrivalAirport.name} ({flight.arrivalAirport.code})
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {flight.arrivalAirport.city}, {flight.arrivalAirport.country}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-airport/10 flex items-center justify-center mt-0.5">
                      <Clock className="h-4 w-4 text-airport" />
                    </div>
                    <div>
                      <div className="font-medium">{format(flight.arrivalDate, "h:mm a")}</div>
                      <div className="text-sm text-muted-foreground">Local time</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-airport/10 flex items-center justify-center mt-0.5">
                      <div className="text-xs font-bold text-airport">T</div>
                    </div>
                    <div>
                      <div className="font-medium">
                        Terminal {flight.arrivalAirport.terminal}, Gate {flight.arrivalAirport.gate}
                      </div>
                      <div className="text-sm text-muted-foreground">Baggage claim information</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="h-8 w-8 rounded-full bg-airport/10 flex items-center justify-center mt-0.5">
                      <CloudSun className="h-4 w-4 text-airport" />
                    </div>
                    <div>
                      <div className="font-medium">{flight.weather.arrival}</div>
                      <div className="text-sm text-muted-foreground">Weather at arrival</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-t-4 border-t-airline shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center text-airline">
                  <Building className="h-5 w-5 mr-2" />
                  Flight Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-airline" />
                        <span className="text-sm text-muted-foreground">Airline</span>
                      </div>
                      <span className="font-medium">{flight.airline}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Plane className="h-4 w-4 mr-2 text-airline" />
                        <span className="text-sm text-muted-foreground">Flight Number</span>
                      </div>
                      <Badge className="bg-airline text-white">{flight.flightNumber}</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Plane className="h-4 w-4 mr-2 text-airline" />
                        <span className="text-sm text-muted-foreground">Aircraft</span>
                      </div>
                      <span className="font-medium">{flight.aircraft}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-airline" />
                        <span className="text-sm text-muted-foreground">Seat</span>
                      </div>
                      <Badge variant="outline" className="bg-airline/10 text-airline border-airline/20">
                        {flight.seat}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-airline" />
                        <span className="text-sm text-muted-foreground">Class</span>
                      </div>
                      <span className="font-medium">{flight.class}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-airline" />
                        <span className="text-sm text-muted-foreground">Duration</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{calculateDuration()}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-airline" />
                        <span className="text-sm text-muted-foreground">Distance</span>
                      </div>
                      <span className="font-medium">{flight.distance}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CloudSun className="h-4 w-4 mr-2 text-airline" />
                        <span className="text-sm text-muted-foreground">Weather</span>
                      </div>
                      <div className="flex items-center">
                        <CloudSun className="mr-1 h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{flight.weather.arrival}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3 flex items-center">
                    <Utensils className="h-4 w-4 mr-2 text-airline" />
                    Amenities
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {flight.amenities.map((amenity, index) => (
                      <Badge key={index} variant="outline" className="bg-airline/5 border-airline/20">
                        {amenity === "Wi-Fi" && <Wifi className="h-3 w-3 mr-1" />}
                        {amenity === "Meal Service" && <Utensils className="h-3 w-3 mr-1" />}
                        {amenity === "Power Outlets" && <div className="i-lucide-plug-zap h-3 w-3 mr-1" />}
                        {amenity === "In-flight Entertainment" && <div className="i-lucide-tv h-3 w-3 mr-1" />}
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
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
                <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center world-map-bg relative overflow-hidden">
                  <div className="absolute w-full h-full">
                    {/* This would be replaced with an actual map component in a real app */}
                    <div className="absolute left-[20%] top-[40%] transform -translate-x-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full bg-flight animate-pulse-slow"></div>
                      <div className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-md">
                        {flight.departureAirport.code}
                      </div>
                    </div>
                    <div className="absolute left-[80%] top-[35%] transform -translate-x-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full bg-airport animate-pulse-slow"></div>
                      <div className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-md">
                        {flight.arrivalAirport.code}
                      </div>
                    </div>
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M 20% 40% Q 50% 20%, 80% 35%"
                        fill="none"
                        stroke="hsl(var(--color-flight))"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        className="flight-path"
                      />
                    </svg>
                    <div className="absolute left-[50%] top-[30%] transform -translate-x-1/2 -translate-y-1/2">
                      <Plane className="h-6 w-6 text-flight rotate-45" />
                    </div>
                  </div>
                  <div className="text-center space-y-2 relative z-10 bg-background/80 px-4 py-2 rounded-md">
                    <p className="text-sm font-medium">
                      Flight path from {flight.departureAirport.city} to {flight.arrivalAirport.city}
                    </p>
                    <p className="text-xs text-muted-foreground">Distance: {flight.distance}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center p-4 rounded-md bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-flight/10 flex items-center justify-center mr-3">
                      <MapPin className="h-5 w-5 text-flight" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {flight.departureAirport.city}, {flight.departureAirport.country}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {flight.departureAirport.name} ({flight.departureAirport.code})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center p-4 rounded-md bg-muted/30">
                    <div className="h-10 w-10 rounded-full bg-airport/10 flex items-center justify-center mr-3">
                      <MapPin className="h-5 w-5 text-airport" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {flight.arrivalAirport.city}, {flight.arrivalAirport.country}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {flight.arrivalAirport.name} ({flight.arrivalAirport.code})
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
                <CardTitle className="flex items-center text-stats">
                  <FileText className="h-5 w-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {flight.notes ? (
                  <div className="p-4 rounded-md bg-muted/30 border">
                    <p>{flight.notes}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No notes added for this flight.</p>
                    <Button variant="outline" className="mt-4">
                      <FileText className="h-4 w-4 mr-2" />
                      Add Notes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

