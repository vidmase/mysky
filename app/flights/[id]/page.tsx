"use client"

import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useEffect, useState } from "react"
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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

export default function FlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [flight, setFlight] = useState<Flight | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const resolvedParams = use(params)

  useEffect(() => {
    const fetchFlight = async () => {
      try {
        const response = await fetch(`/api/flights/${resolvedParams.id}`)
        if (!response.ok) {
          throw new Error('Flight not found')
        }
        const data = await response.json()
        setFlight(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load flight')
      } finally {
        setLoading(false)
      }
    }

    fetchFlight()
  }, [resolvedParams.id])

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

  const calculateDuration = () => {
    const diff = new Date(flight.arrival_time).getTime() - new Date(flight.departure_time).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
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
              {flight.departure_airport} to {flight.arrival_airport} • {flight.departure_date}
            </p>
          </div>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-lg">
          <div className="bg-gradient-to-r from-airline to-flight/80 p-4 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Building className="h-6 w-6" />
                <span className="text-lg font-semibold">{flight.airline}</span>
              </div>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                {flight.flight_number}
              </Badge>
            </div>
          </div>

          <div className="p-6 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-r-full"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-l-full"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="text-center md:text-left space-y-2">
                <div className="text-5xl font-bold tracking-tight text-flight">
                  {flight.departure_iata || flight.departure_airport.substring(0, 3)}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{flight.departure_airport}</div>
                  <div className="text-2xl font-semibold">{flight.departure_time}</div>
                  <div className="text-sm text-muted-foreground">{flight.departure_date}</div>
                </div>
              </div>

              <div className="flex flex-col items-center py-4">
                <div className="relative w-40 md:w-64">
                  <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-flight to-airport"></div>
                  <div className="absolute top-1/2 left-0 right-0 flex justify-center">
                    <div className="bg-white dark:bg-slate-900 p-2 -mt-4 rounded-full shadow-md">
                      <Plane className="h-6 w-6 text-airline rotate-90" />
                    </div>
                  </div>
                  <div className="absolute -top-2 left-0 w-3 h-3 rounded-full bg-flight shadow-md"></div>
                  <div className="absolute -top-2 right-0 w-3 h-3 rounded-full bg-airport shadow-md"></div>
                </div>
                <div className="mt-6 text-center">
                  <Badge variant="outline" className="bg-muted font-medium">
                    {calculateDuration()}
                  </Badge>
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
                  <div className="text-2xl font-semibold">{flight.arrival_time}</div>
                  <div className="text-sm text-muted-foreground">{flight.departure_date}</div>
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
              <div>Purchased: {flight.purchased_date} {flight.purchase_time}</div>
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
                      <div className="font-medium">{flight.departure_time}</div>
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
                      <div className="font-medium">{flight.arrival_time}</div>
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
                <div className="aspect-video bg-muted/50 rounded-md flex items-center justify-center world-map-bg relative overflow-hidden">
                  <div className="absolute w-full h-full">
                    {/* This would be replaced with an actual map component in a real app */}
                    <div className="absolute left-[20%] top-[40%] transform -translate-x-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full bg-flight animate-pulse-slow"></div>
                      <div className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-md">
                        {flight.departure_iata || flight.departure_airport}
                      </div>
                    </div>
                    <div className="absolute left-[80%] top-[35%] transform -translate-x-1/2 -translate-y-1/2">
                      <div className="h-4 w-4 rounded-full bg-airport animate-pulse-slow"></div>
                      <div className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 rounded text-xs font-medium shadow-md">
                        {flight.arrival_iata || flight.arrival_airport}
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
                      Flight path from {flight.departure_airport} to {flight.arrival_airport}
                    </p>
                    <p className="text-xs text-muted-foreground">Distance: {/* Distance would be fetched from the flight data */}</p>
                  </div>
                </div>

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

