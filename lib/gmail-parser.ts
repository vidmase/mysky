export type ParsedFlight = {
  passenger_name?: string
  reservation_number?: string
  flight_number?: string
  departure_airport?: string
  arrival_airport?: string
  departure_iata?: string
  arrival_iata?: string
  airline?: string
  seat?: string
  notes?: string
  departure_date?: string // ISO date or human text; caller will normalize
  arrival_date?: string
  departure_time?: string
  arrival_time?: string
}

const patterns = [
  // Ryanair
  {
    name: 'ryanair',
    match: (subject: string, text: string) => /ryanair|reservation|itinerary/i.test(subject + ' ' + text),
    parse: (text: string): ParsedFlight => {
      const flight = /Flight\s*([A-Z]{2}\d{2,4})/i.exec(text)?.[1]
      const dep = /(Depart(?:ure)?|From):?\s*([A-Za-z\s\-\(\)]+)\s*\(([A-Z]{3})\)/i.exec(text)
      const arr = /(Arriv(?:al|e)|To):?\s*([A-Za-z\s\-\(\)]+)\s*\(([A-Z]{3})\)/i.exec(text)
      const times = /(Departure|Departs)\s*[:\-]?\s*(\d{1,2}:\d{2})[\s\S]*?(Arrival|Arrives)\s*[:\-]?\s*(\d{1,2}:\d{2})/i.exec(text)
      const date = /(Date)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i.exec(text)?.[2]
      const pnr = /(Booking|Reservation|PNR)\s*(Code|Number)?\s*[:\-]?\s*([A-Z0-9]{5,8})/i.exec(text)?.[3]
      return {
        airline: 'Ryanair',
        flight_number: flight,
        departure_airport: dep?.[2]?.trim(),
        departure_iata: dep?.[3],
        arrival_airport: arr?.[2]?.trim(),
        arrival_iata: arr?.[3],
        departure_time: times?.[2],
        arrival_time: times?.[4],
        departure_date: date,
        reservation_number: pnr,
      }
    }
  },
  // easyJet
  {
    name: 'easyjet',
    match: (subject: string, text: string) => /easyjet|booking confirmation/i.test(subject + ' ' + text),
    parse: (text: string): ParsedFlight => {
      const flight = /(Flight|EZY)\s*([A-Z]{2}\d{2,4}|\d{3,4})/i.exec(text)?.[2]
      const dep = /From\s*([A-Za-z\s\-]+)\s*\(([A-Z]{3})\)/i.exec(text)
      const arr = /To\s*([A-Za-z\s\-]+)\s*\(([A-Z]{3})\)/i.exec(text)
      const times = /Depart(?:ure|s)?\s*(\d{1,2}:\d{2})[\s\S]*?Arriv(?:al|es)?\s*(\d{1,2}:\d{2})/i.exec(text)
      const date = /(Date)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i.exec(text)?.[2]
      const pnr = /(Booking|Reservation|PNR)\s*(Code|Number)?\s*[:\-]?\s*([A-Z0-9]{5,8})/i.exec(text)?.[3]
      return {
        airline: 'easyJet',
        flight_number: flight,
        departure_airport: dep?.[1]?.trim(),
        departure_iata: dep?.[2],
        arrival_airport: arr?.[1]?.trim(),
        arrival_iata: arr?.[2],
        departure_time: times?.[1],
        arrival_time: times?.[2],
        departure_date: date,
        reservation_number: pnr,
      }
    }
  },
  // British Airways
  {
    name: 'british_airways',
    match: (subject: string, text: string) => /british airways|ba booking/i.test(subject + ' ' + text),
    parse: (text: string): ParsedFlight => {
      const flight = /(BA)\s?(\d{2,4})/i.exec(text)
      const dep = /(From|Departing)\s*:?\s*([A-Za-z\s\-]+)\s*\(([A-Z]{3})\)/i.exec(text)
      const arr = /(To|Arriving)\s*:?\s*([A-Za-z\s\-]+)\s*\(([A-Z]{3})\)/i.exec(text)
      const times = /Depart(?:s|ure)?\s*(\d{1,2}:\d{2})[\s\S]*?Arriv(?:es|al)?\s*(\d{1,2}:\d{2})/i.exec(text)
      const date = /(Date)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i.exec(text)?.[2]
      const pnr = /(Booking|Reservation|PNR)\s*(Code|Number)?\s*[:\-]?\s*([A-Z0-9]{5,8})/i.exec(text)?.[3]
      const flightNumber = flight ? `${flight[1].toUpperCase()}${flight[2]}` : undefined
      return {
        airline: 'British Airways',
        flight_number: flightNumber,
        departure_airport: dep?.[2]?.trim(),
        departure_iata: dep?.[3],
        arrival_airport: arr?.[2]?.trim(),
        arrival_iata: arr?.[3],
        departure_time: times?.[1],
        arrival_time: times?.[2],
        departure_date: date,
        reservation_number: pnr,
      }
    }
  },
  // Generic fallback
  {
    name: 'generic',
    match: (_subject: string, text: string) => /flight|itinerary|booking|reservation/i.test(text),
    parse: (text: string): ParsedFlight => {
      const flight = /([A-Z]{2}\d{2,4})/i.exec(text)?.[1]
      const airports = /([A-Za-z\s\-]+)\s*\(([A-Z]{3})\)[\s\S]*?([A-Za-z\s\-]+)\s*\(([A-Z]{3})\)/i.exec(text)
      const times = /(\d{1,2}:\d{2}).{0,40}?(\d{1,2}:\d{2})/i.exec(text)
      const date = /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i.exec(text)?.[1]
      const pnr = /([A-Z0-9]{5,8})/i.exec(text)?.[1]
      return {
        flight_number: flight,
        departure_airport: airports?.[1]?.trim(),
        departure_iata: airports?.[2],
        arrival_airport: airports?.[3]?.trim(),
        arrival_iata: airports?.[4],
        departure_time: times?.[1],
        arrival_time: times?.[2],
        departure_date: date,
        reservation_number: pnr,
      }
    }
  }
]

export function parseEmail(subject: string, text: string): ParsedFlight | null {
  for (const p of patterns) {
    if (p.match(subject, text)) {
      const res = p.parse(text)
      // If at least a flight number and airports/time exist, accept
      if (res.flight_number || (res.departure_iata && res.arrival_iata)) return res
    }
  }
  return null
}
