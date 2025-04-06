"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useNotification } from "@/contexts/notification-context"
import { FlightForm } from "@/components/flight-form"
import { format } from "date-fns"
import { enUS } from 'date-fns/locale'
import { Plane, Building, Clock, CreditCard, User, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { use } from "react"

// Add formatTime helper function after the imports
const formatTime = (timeStr: string) => {
  try {
    // Parse time string and ensure it's in HH:MM format
    const [hours, minutes] = timeStr.split(':').map(num => num.padStart(2, '0'))
    return `${hours}:${minutes}`
  } catch (error) {
    return timeStr // Return original string if parsing fails
  }
}

export default function EditFlightPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { showSuccess, showError } = useNotification()
  const [flight, setFlight] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFlight = async () => {
      try {
        const response = await fetch(`/api/flights/${resolvedParams.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch flight')
        }
        const data = await response.json()
        setFlight(data)
      } catch (error) {
        console.error('Error fetching flight:', error)
        showError('Failed to load flight details')
        router.push('/flights')
      } finally {
        setLoading(false)
      }
    }

    fetchFlight()
  }, [resolvedParams.id, router, showError])

  const handleSubmit = async (formData: any) => {
    try {
      const response = await fetch(`/api/flights/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update flight')
      }

      showSuccess('Flight updated successfully! ✈️')
      router.push('/flights')
    } catch (error) {
      console.error('Error updating flight:', error)
      showError('Failed to update flight. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flight"></div>
        </div>
      </div>
    )
  }

  if (!flight) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              size="icon"
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-3xl font-bold">Edit Flight</h1>
          </div>
        </div>

        {/* Flight Summary Card */}
        <Card className="border-t-4 border-t-flight mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Flight Date */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1 text-flight" />
                  Flight Date
                </div>
                <div className="font-medium">
                  {format(new Date(flight.departure_date), "MMM d, yyyy", { locale: enUS })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(flight.departure_date), "EEEE", { locale: enUS })}
                </div>
              </div>

              {/* Passenger */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4 mr-1 text-flight" />
                  Passenger
                </div>
                <div className="font-medium">{flight.passenger_name}</div>
                <div className="text-sm text-muted-foreground">
                  Seat {flight.seat || 'Not assigned'}
                </div>
              </div>

              {/* Reservation & Flight Details */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Plane className="h-4 w-4 mr-1 text-flight" />
                  Flight Details
                </div>
                <div className="font-medium">
                  {flight.airline} {flight.flight_number}
                </div>
                <Badge variant="outline" className="bg-muted/30 text-foreground">
                  {flight.reservation_number}
                </Badge>
              </div>

              {/* Purchase Info */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <CreditCard className="h-4 w-4 mr-1 text-flight" />
                  Purchase Info
                </div>
                <div className="font-medium">{flight.total_receipt}</div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(flight.purchased_date), "MMM d, yyyy", { locale: enUS })}
                </div>
              </div>

              {/* Departure */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Building className="h-4 w-4 mr-1 text-flight" />
                  Departure
                </div>
                <div className="font-medium">
                  <Badge variant="outline" className="bg-airport/10 text-airport border-airport/20 px-1 py-0">
                    {flight.departure_iata || flight.departure_airport}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {flight.departure_airport}
                </div>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatTime(flight.departure_time)}
                </div>
              </div>

              {/* Arrival */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Building className="h-4 w-4 mr-1 text-flight" />
                  Arrival
                </div>
                <div className="font-medium">
                  <Badge variant="outline" className="bg-airport/10 text-airport border-airport/20 px-1 py-0">
                    {flight.arrival_iata || flight.arrival_airport}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {flight.arrival_airport}
                  {flight.arrival_country && ` (${flight.arrival_country})`}
                </div>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatTime(flight.arrival_time)}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1 text-flight" />
                  Duration
                </div>
                <div className="font-medium">
                  {calculateDuration(flight.departure_time, flight.arrival_time)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <FlightForm
          initialData={flight}
          onSubmit={handleSubmit}
          submitLabel="Update Flight"
        />
      </div>
    </div>
  )
}

// Helper function to calculate duration
function calculateDuration(departureTime: string, arrivalTime: string): string {
  const getMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
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