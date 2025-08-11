import { Flight } from '@/app/flights/FlightsClient'

export interface CalendarFlightEvent {
  id: number
  title: string // e.g., "LH441 FRA → JFK"
  start: Date // departure datetime
  end: Date // arrival datetime
  flightNumber: string
  route: string // e.g., "FRA → JFK"
  airline: string | null
  color: string // airline brand color
  status: 'upcoming' | 'completed'
  metadata: {
    passengerName: string
    reservationNumber: string
    departureAirport: string
    arrivalAirport: string
    departureIata: string | null
    arrivalIata: string | null
    seat: string | null
    notes: string | null
    totalReceipt: string
  }
}

export interface CalendarViewType {
  month: 'month'
  week: 'week'
  day: 'day'
  agenda: 'agenda'
}

export interface CalendarFilters {
  airlines: string[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
  status: ('upcoming' | 'completed')[]
}

export interface CalendarStats {
  totalFlights: number
  upcomingFlights: number
  completedFlights: number
  uniqueDestinations: number
  totalDistance?: number // Future enhancement
  carbonFootprint?: number // Future enhancement
}

// Utility type for calendar event colors
export interface AirlineColorMap {
  [airlineCode: string]: {
    primary: string
    secondary: string
    text: string
  }
}

// Calendar view configuration
export interface CalendarViewConfig {
  view: keyof CalendarViewType
  date: Date
  filters: CalendarFilters
}
