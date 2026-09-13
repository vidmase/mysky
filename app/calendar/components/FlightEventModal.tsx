"use client"

import { CalendarFlightEvent } from '@/types/calendar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  PlaneIcon, 
  MapPinIcon, 
  ClockIcon, 
  UserIcon, 
  TicketIcon,
  ArmchairIcon,
  NotebookPenIcon,
  CreditCardIcon,
  CalendarIcon,
  ArrowRightIcon,
  ExternalLinkIcon
} from 'lucide-react'
import { format, differenceInMinutes, differenceInHours } from 'date-fns'
import { getAirlineColor } from '@/app/calendar/lib/calendar-utils'

interface FlightEventModalProps {
  event: CalendarFlightEvent | null
  isOpen: boolean
  onClose: () => void
}

export function FlightEventModal({ event, isOpen, onClose }: FlightEventModalProps) {
  if (!event) return null

  const airlineColors = getAirlineColor(event.airline)
  const flightDuration = differenceInMinutes(event.end, event.start)
  const durationHours = Math.floor(flightDuration / 60)
  const durationMinutes = flightDuration % 60

  const formatDuration = () => {
    if (durationHours > 0) {
      return `${durationHours}h ${durationMinutes}m`
    }
    return `${durationMinutes}m`
  }

  const isMultiDay = event.start.getDate() !== event.end.getDate()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="paper-surface max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${airlineColors.primary}20` }}
            >
              <PlaneIcon 
                className="h-6 w-6" 
                style={{ color: airlineColors.primary }}
              />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {event.title}
                <Badge 
                  variant={event.status === 'upcoming' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {event.status}
                </Badge>
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {event.airline || 'Unknown Airline'} • Flight Duration: {formatDuration()}
                {isMultiDay && (
                  <span className="ml-2 text-orange-500">• Multi-day flight</span>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Flight Route and Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Departure */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-green-500" />
                Departure
              </h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {event.metadata.departureIata || 'N/A'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {format(event.start, 'EEE')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.metadata.departureAirport}
                </p>
                <div className="flex items-center gap-2 text-lg font-mono">
                  <ClockIcon className="h-4 w-4" />
                  {format(event.start, 'HH:mm')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(event.start, 'MMMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Arrival */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-red-500" />
                Arrival
              </h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {event.metadata.arrivalIata || 'N/A'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {format(event.end, 'EEE')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.metadata.arrivalAirport}
                </p>
                <div className="flex items-center gap-2 text-lg font-mono">
                  <ClockIcon className="h-4 w-4" />
                  {format(event.end, 'HH:mm')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(event.end, 'MMMM d, yyyy')}
                  {isMultiDay && (
                    <span className="ml-1 text-orange-500">(+1 day)</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Flight Route Visualization */}
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="font-mono text-lg font-bold">
                  {event.metadata.departureIata || 'DEP'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(event.start, 'HH:mm')}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-px bg-border flex-1 w-20"></div>
                <PlaneIcon className="h-4 w-4 text-muted-foreground rotate-90" />
                <div className="h-px bg-border flex-1 w-20"></div>
              </div>
              <div className="text-center">
                <div className="font-mono text-lg font-bold">
                  {event.metadata.arrivalIata || 'ARR'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(event.end, 'HH:mm')}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passenger and Booking Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Passenger Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{event.metadata.passengerName}</span>
                </div>
                {event.metadata.seat && (
                  <div className="flex items-center gap-3">
                    <ArmchairIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Seat {event.metadata.seat}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TicketIcon className="h-5 w-5" />
                Booking Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <TicketIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{event.metadata.reservationNumber}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{event.metadata.totalReceipt}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {event.metadata.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <NotebookPenIcon className="h-5 w-5" />
                  Notes
                </h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{event.metadata.notes}</p>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`/flights`} 
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  View in Flights
                </a>
              </Button>
            </div>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
