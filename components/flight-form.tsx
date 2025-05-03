"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plane, Building, Clock, CreditCard, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface FlightFormProps {
  initialData?: any
  onSubmit: (data: any) => void
  submitLabel?: string
}

export function FlightForm({ initialData, onSubmit, submitLabel = "Add Flight" }: FlightFormProps) {
  const [formData, setFormData] = useState({
    passenger_name: initialData?.passenger_name || "",
    reservation_number: initialData?.reservation_number || "",
    flight_number: initialData?.flight_number || "",
    departure_airport: initialData?.departure_airport || "",
    arrival_airport: initialData?.arrival_airport || "",
    departure_date: initialData?.departure_date ? new Date(initialData.departure_date) : new Date(),
    departure_time: initialData?.departure_time || "",
    arrival_time: initialData?.arrival_time || "",
    total_receipt: initialData?.total_receipt || "",
    purchased_date: initialData?.purchased_date ? new Date(initialData.purchased_date) : new Date(),
    purchase_time: initialData?.purchase_time || "",
    airline: initialData?.airline || "",
    seat: initialData?.seat || "",
    notes: initialData?.notes || ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-t-4 border-t-flight">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="passenger_name" className="flex items-center">
                <User className="h-4 w-4 mr-1 text-flight" />
                Passenger Name
              </Label>
              <Input
                id="passenger_name"
                name="passenger_name"
                value={formData.passenger_name}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reservation_number" className="flex items-center">
                <Plane className="h-4 w-4 mr-1 text-flight" />
                Reservation Number
              </Label>
              <Input
                id="reservation_number"
                name="reservation_number"
                value={formData.reservation_number}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flight_number" className="flex items-center">
                <Plane className="h-4 w-4 mr-1 text-flight" />
                Flight Number
              </Label>
              <Input
                id="flight_number"
                name="flight_number"
                value={formData.flight_number}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="airline" className="flex items-center">
                <Building className="h-4 w-4 mr-1 text-flight" />
                Airline
              </Label>
              <Input
                id="airline"
                name="airline"
                value={formData.airline}
                onChange={handleChange}
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure_airport" className="flex items-center">
                <Building className="h-4 w-4 mr-1 text-flight" />
                Departure Airport
              </Label>
              <Input
                id="departure_airport"
                name="departure_airport"
                value={formData.departure_airport}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival_airport" className="flex items-center">
                <Building className="h-4 w-4 mr-1 text-flight" />
                Arrival Airport
              </Label>
              <Input
                id="arrival_airport"
                name="arrival_airport"
                value={formData.arrival_airport}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seat" className="flex items-center">
                <Plane className="h-4 w-4 mr-1 text-flight" />
                Seat Number
              </Label>
              <Input
                id="seat"
                name="seat"
                value={formData.seat}
                onChange={handleChange}
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1 text-flight" />
                Departure Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-flight/20 hover:border-flight",
                      !formData.departure_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-flight" />
                    {formData.departure_date ? (
                      format(formData.departure_date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.departure_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, departure_date: date || new Date() }))}
                    initialFocus
                    className="border-flight/20"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1 text-flight" />
                Purchase Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-flight/20 hover:border-flight",
                      !formData.purchased_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-flight" />
                    {formData.purchased_date ? (
                      format(formData.purchased_date, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.purchased_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, purchased_date: date || new Date() }))}
                    initialFocus
                    className="border-flight/20"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="departure_time" className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-flight" />
                Departure Time
              </Label>
              <Input
                id="departure_time"
                name="departure_time"
                type="time"
                value={formData.departure_time}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="arrival_time" className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-flight" />
                Arrival Time
              </Label>
              <Input
                id="arrival_time"
                name="arrival_time"
                type="time"
                value={formData.arrival_time}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_time" className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-flight" />
                Purchase Time
              </Label>
              <Input
                id="purchase_time"
                name="purchase_time"
                type="time"
                value={formData.purchase_time}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_receipt" className="flex items-center">
                <CreditCard className="h-4 w-4 mr-1 text-flight" />
                Total Receipt
              </Label>
              <Input
                id="total_receipt"
                name="total_receipt"
                value={formData.total_receipt}
                onChange={handleChange}
                required
                className="border-flight/20 focus:border-flight"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-t-4 border-t-flight">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center">
              <Plane className="h-4 w-4 mr-1 text-flight" />
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="border-flight/20 focus:border-flight"
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full bg-flight hover:bg-flight/90">
        {submitLabel}
      </Button>
    </form>
  )
} 