import { Flight } from '@/app/flights/FlightsClient'
import { CalendarFlightEvent, AirlineColorMap } from '@/types/calendar'
import { format, parse, addHours, isAfter } from 'date-fns'

// Airline color mapping for calendar events
export const AIRLINE_COLORS: AirlineColorMap = {
  // European Airlines
  'LH': { primary: '#05164D', secondary: '#F9BA00', text: '#FFFFFF' }, // Lufthansa
  'BA': { primary: '#075AAA', secondary: '#E6002B', text: '#FFFFFF' }, // British Airways
  'AF': { primary: '#002157', secondary: '#00A1DE', text: '#FFFFFF' }, // Air France
  'KL': { primary: '#00A1C9', secondary: '#0066CC', text: '#FFFFFF' }, // KLM
  'VS': { primary: '#E10A17', secondary: '#FFFFFF', text: '#FFFFFF' }, // Virgin Atlantic
  'FR': { primary: '#073590', secondary: '#F1C933', text: '#FFFFFF' }, // Ryanair
  'U2': { primary: '#FF6900', secondary: '#FFFFFF', text: '#000000' }, // easyJet
  'WF': { primary: '#722F87', secondary: '#FFFFFF', text: '#FFFFFF' }, // Widerøe
  'SK': { primary: '#003580', secondary: '#FFFFFF', text: '#FFFFFF' }, // SAS
  'AY': { primary: '#0045AD', secondary: '#FFFFFF', text: '#FFFFFF' }, // Finnair
  'IB': { primary: '#C41E3A', secondary: '#FFFFFF', text: '#FFFFFF' }, // Iberia
  'LX': { primary: '#E30613', secondary: '#FFFFFF', text: '#FFFFFF' }, // Swiss
  'OS': { primary: '#E40521', secondary: '#FFFFFF', text: '#FFFFFF' }, // Austrian
  
  // Middle Eastern Airlines
  'EK': { primary: '#D71921', secondary: '#FFD700', text: '#FFFFFF' }, // Emirates
  'QR': { primary: '#5C0A3B', secondary: '#FFFFFF', text: '#FFFFFF' }, // Qatar Airways
  'TK': { primary: '#C70025', secondary: '#FFFFFF', text: '#FFFFFF' }, // Turkish Airlines
  'EY': { primary: '#7B2C3E', secondary: '#F4B942', text: '#FFFFFF' }, // Etihad
  
  // Asian Airlines
  'SQ': { primary: '#003366', secondary: '#FFD700', text: '#FFFFFF' }, // Singapore Airlines
  'CX': { primary: '#00A651', secondary: '#FFFFFF', text: '#FFFFFF' }, // Cathay Pacific
  'NH': { primary: '#1E3A8A', secondary: '#FFFFFF', text: '#FFFFFF' }, // ANA
  'JL': { primary: '#DC143C', secondary: '#FFFFFF', text: '#FFFFFF' }, // JAL
  'TG': { primary: '#7B2C85', secondary: '#FFFFFF', text: '#FFFFFF' }, // Thai Airways
  'MH': { primary: '#004B87', secondary: '#FFFFFF', text: '#FFFFFF' }, // Malaysia Airlines
  'AI': { primary: '#FF6600', secondary: '#FFFFFF', text: '#FFFFFF' }, // Air India
  
  // North American Airlines
  'UA': { primary: '#0E4F8C', secondary: '#FFFFFF', text: '#FFFFFF' }, // United
  'DL': { primary: '#003366', secondary: '#CE0037', text: '#FFFFFF' }, // Delta
  'AA': { primary: '#C4122F', secondary: '#FFFFFF', text: '#FFFFFF' }, // American Airlines
  'AC': { primary: '#FF0000', secondary: '#FFFFFF', text: '#FFFFFF' }, // Air Canada
  'WN': { primary: '#304CB2', secondary: '#FFB612', text: '#FFFFFF' }, // Southwest
  'B6': { primary: '#00318C', secondary: '#FFFFFF', text: '#FFFFFF' }, // JetBlue
  
  // Low-cost carriers
  'W6': { primary: '#A21F6A', secondary: '#FFFFFF', text: '#FFFFFF' }, // Wizz Air
  'VY': { primary: '#FFCC00', secondary: '#000000', text: '#000000' }, // Vueling
  'PC': { primary: '#F39800', secondary: '#FFFFFF', text: '#FFFFFF' }, // Pegasus
  
  // Default fallback
  'DEFAULT': { primary: '#6B7280', secondary: '#F3F4F6', text: '#FFFFFF' }
}

/**
 * Get airline color scheme for calendar events
 */
export function getAirlineColor(airline: string | null): { primary: string; secondary: string; text: string } {
  if (!airline) return AIRLINE_COLORS.DEFAULT
  
  // Extract airline code (first 2-3 characters typically)
  const airlineCode = airline.toUpperCase().substring(0, 2)
  
  return AIRLINE_COLORS[airlineCode] || AIRLINE_COLORS.DEFAULT
}

/**
 * Parse time string and combine with date to create full datetime
 */
export function parseFlightDateTime(dateStr: string, timeStr: string): Date {
  try {
    const date = new Date(dateStr)
    
    // Handle different time formats (HH:mm, H:mm, HHmm)
    let hours = 0
    let minutes = 0
    
    if (timeStr.includes(':')) {
      const [h, m] = timeStr.split(':')
      hours = parseInt(h, 10)
      minutes = parseInt(m, 10)
    } else if (timeStr.length === 4) {
      hours = parseInt(timeStr.substring(0, 2), 10)
      minutes = parseInt(timeStr.substring(2, 4), 10)
    } else if (timeStr.length === 3) {
      hours = parseInt(timeStr.substring(0, 1), 10)
      minutes = parseInt(timeStr.substring(1, 3), 10)
    }
    
    date.setHours(hours, minutes, 0, 0)
    return date
  } catch (error) {
    console.error('Error parsing flight datetime:', { dateStr, timeStr, error })
    return new Date(dateStr) // Fallback to date only
  }
}

/**
 * Calculate flight end time considering potential next-day arrival
 */
export function calculateFlightEndTime(
  departureDate: string,
  departureTime: string,
  arrivalTime: string
): Date {
  const departureDateTime = parseFlightDateTime(departureDate, departureTime)
  const arrivalDateTime = parseFlightDateTime(departureDate, arrivalTime)
  
  // If arrival time is before departure time, assume next day arrival
  if (arrivalDateTime < departureDateTime) {
    return addHours(arrivalDateTime, 24)
  }
  
  return arrivalDateTime
}

/**
 * Create route string from airport codes or names
 */
export function createRouteString(
  departureIata: string | null,
  arrivalIata: string | null,
  departureAirport: string,
  arrivalAirport: string
): string {
  if (departureIata && arrivalIata) {
    return `${departureIata} → ${arrivalIata}`
  }
  
  // Fallback to airport names (truncated)
  const depShort = departureAirport.length > 15 
    ? departureAirport.substring(0, 12) + '...' 
    : departureAirport
  const arrShort = arrivalAirport.length > 15 
    ? arrivalAirport.substring(0, 12) + '...' 
    : arrivalAirport
    
  return `${depShort} → ${arrShort}`
}

/**
 * Transform Flight data to CalendarFlightEvent
 */
export function transformFlightToCalendarEvent(flight: Flight): CalendarFlightEvent {
  const startDateTime = parseFlightDateTime(flight.departure_date, flight.departure_time)
  const endDateTime = calculateFlightEndTime(
    flight.departure_date,
    flight.departure_time,
    flight.arrival_time
  )
  
  const route = createRouteString(
    flight.departure_iata,
    flight.arrival_iata,
    flight.departure_airport,
    flight.arrival_airport
  )
  
  const airlineColors = getAirlineColor(flight.airline)
  const now = new Date()
  const status = isAfter(startDateTime, now) ? 'upcoming' : 'completed'
  
  return {
    id: flight.id,
    title: `${flight.flight_number} ${route}`,
    start: startDateTime,
    end: endDateTime,
    flightNumber: flight.flight_number,
    route,
    airline: flight.airline,
    color: airlineColors.primary,
    status,
    metadata: {
      passengerName: flight.passenger_name,
      reservationNumber: flight.reservation_number,
      departureAirport: flight.departure_airport,
      arrivalAirport: flight.arrival_airport,
      departureIata: flight.departure_iata,
      arrivalIata: flight.arrival_iata,
      seat: flight.seat,
      notes: flight.notes,
      totalReceipt: flight.total_receipt
    }
  }
}

/**
 * Transform multiple flights to calendar events
 */
export function transformFlightsToCalendarEvents(flights: Flight[]): CalendarFlightEvent[] {
  return flights.map(transformFlightToCalendarEvent)
}

/**
 * Filter calendar events by date range
 */
export function filterEventsByDateRange(
  events: CalendarFlightEvent[],
  startDate: Date,
  endDate: Date
): CalendarFlightEvent[] {
  return events.filter(event => {
    return event.start >= startDate && event.start <= endDate
  })
}

/**
 * Group events by airline for statistics
 */
export function groupEventsByAirline(events: CalendarFlightEvent[]): Record<string, CalendarFlightEvent[]> {
  return events.reduce((acc, event) => {
    const airline = event.airline || 'Unknown'
    if (!acc[airline]) {
      acc[airline] = []
    }
    acc[airline].push(event)
    return acc
  }, {} as Record<string, CalendarFlightEvent[]>)
}

/**
 * Calculate calendar statistics
 */
export function calculateCalendarStats(events: CalendarFlightEvent[]) {
  const now = new Date()
  const upcoming = events.filter(e => isAfter(e.start, now))
  const completed = events.filter(e => !isAfter(e.start, now))
  
  const uniqueDestinations = new Set(
    events.map(e => e.metadata.arrivalIata || e.metadata.arrivalAirport)
  ).size
  
  return {
    totalFlights: events.length,
    upcomingFlights: upcoming.length,
    completedFlights: completed.length,
    uniqueDestinations
  }
}
