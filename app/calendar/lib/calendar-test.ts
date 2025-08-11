import { Flight } from '@/app/flights/FlightsClient'
import { 
  transformFlightToCalendarEvent, 
  transformFlightsToCalendarEvents,
  calculateCalendarStats,
  getAirlineColor,
  parseFlightDateTime
} from './calendar-utils'

/**
 * Test the calendar utilities with sample flight data
 * This can be used to validate the transformation logic
 */
export function testCalendarUtils() {
  console.log('🧪 Testing Calendar Utilities...')
  
  // Sample flight data (matching your Flight interface)
  const sampleFlight: Flight = {
    id: 1,
    passenger_name: "John Doe",
    reservation_number: "ABC123",
    flight_number: "LH441",
    departure_airport: "Frankfurt Airport",
    arrival_airport: "John F. Kennedy International Airport",
    departure_date: "2024-03-15",
    departure_time: "14:30",
    arrival_time: "17:45",
    total_receipt: "€450.00",
    purchased_date: "2024-02-01",
    purchase_time: "10:00",
    airline: "LH",
    arrival_country: "United States",
    arrival_iata: "JFK",
    departure_iata: "FRA",
    seat: "12A",
    notes: "Business trip"
  }
  
  // Test single flight transformation
  console.log('📅 Testing single flight transformation:')
  const calendarEvent = transformFlightToCalendarEvent(sampleFlight)
  console.log('Original flight:', {
    flight_number: sampleFlight.flight_number,
    departure_date: sampleFlight.departure_date,
    departure_time: sampleFlight.departure_time,
    arrival_time: sampleFlight.arrival_time
  })
  console.log('Calendar event:', {
    title: calendarEvent.title,
    start: calendarEvent.start.toISOString(),
    end: calendarEvent.end.toISOString(),
    route: calendarEvent.route,
    color: calendarEvent.color,
    status: calendarEvent.status
  })
  
  // Test airline color mapping
  console.log('\n🎨 Testing airline colors:')
  const airlines = ['LH', 'BA', 'AF', 'EK', 'FR', null]
  airlines.forEach(airline => {
    const colors = getAirlineColor(airline)
    console.log(`${airline || 'NULL'}: ${colors.primary} (${colors.text} text)`)
  })
  
  // Test datetime parsing
  console.log('\n⏰ Testing datetime parsing:')
  const testTimes = ['14:30', '09:05', '1430', '905']
  testTimes.forEach(time => {
    const parsed = parseFlightDateTime('2024-03-15', time)
    console.log(`${time} -> ${parsed.toLocaleTimeString()}`)
  })
  
  // Test multiple flights
  const sampleFlights: Flight[] = [
    sampleFlight,
    {
      ...sampleFlight,
      id: 2,
      flight_number: 'BA123',
      airline: 'BA',
      departure_date: '2024-03-20',
      departure_time: '08:15',
      arrival_time: '11:30'
    }
  ]
  
  console.log('\n📊 Testing calendar statistics:')
  const events = transformFlightsToCalendarEvents(sampleFlights)
  const stats = calculateCalendarStats(events)
  console.log('Stats:', stats)
  
  console.log('\n✅ Calendar utilities test completed!')
  return { events, stats, calendarEvent }
}

/**
 * Validate calendar event data structure
 */
export function validateCalendarEvent(event: any): boolean {
  const required = ['id', 'title', 'start', 'end', 'flightNumber', 'route', 'color', 'status', 'metadata']
  const missing = required.filter(field => !(field in event))
  
  if (missing.length > 0) {
    console.error('❌ Missing required fields:', missing)
    return false
  }
  
  if (!(event.start instanceof Date) || !(event.end instanceof Date)) {
    console.error('❌ start and end must be Date objects')
    return false
  }
  
  if (event.start >= event.end) {
    console.error('❌ start time must be before end time')
    return false
  }
  
  console.log('✅ Calendar event validation passed')
  return true
}

// Export for use in development/debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testCalendarUtils = testCalendarUtils
  (window as any).validateCalendarEvent = validateCalendarEvent
}
