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
  // Ryanair - Enhanced parser with multiple patterns
  {
    name: 'ryanair',
    match: (subject: string, text: string) => /ryanair|reservation|itinerary|travel itinerary|flight confirmation/i.test(subject + ' ' + text),
    parse: (text: string): ParsedFlight => {
      // Flight number patterns - FR followed by 3-5 digits
      const flight = /\b(FR\s?\d{3,5})\b/i.exec(text)?.[1]?.replace(/\s/g, '').toUpperCase() ||
                     /Flight\s*([A-Z]{2}\s?\d{2,5})/i.exec(text)?.[1]?.replace(/\s/g, '').toUpperCase()
      
      // Departure patterns - various formats
      const dep = /(Depart(?:ure)?|From|Outbound):?\s*([A-Za-z\s\-\(\)]+)\s*\(([A-Z]{3})\)/i.exec(text) ||
                  /([A-Za-z\s\-]+)\s*\(([A-Z]{3})\)\s*→/i.exec(text)
      
      // Arrival patterns
      const arr = /(Arriv(?:al|e)|To|Inbound):?\s*([A-Za-z\s\-\(\)]+)\s*\(([A-Z]{3})\)/i.exec(text) ||
                  /→\s*([A-Za-z\s\-]+)\s*\(([A-Z]{3})\)/i.exec(text)
      
      // Time patterns - various formats
      const times = /(Departure|Departs|Dep\.?)\s*[:\-]?\s*(\d{1,2}:\d{2})[\s\S]*?(Arrival|Arrives|Arr\.?)\s*[:\-]?\s*(\d{1,2}:\d{2})/i.exec(text) ||
                    /(\d{1,2}:\d{2})\s*→\s*(\d{1,2}:\d{2})/i.exec(text)
      
      // Date patterns - multiple formats
      const datePatterns = [
        /(Date)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
        /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i,
        /([A-Za-z]{3},?\s+\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i,
        /(\d{4}[-/]\d{2}[-/]\d{2})/,
        /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/
      ]
      let date: string | undefined
      for (const pattern of datePatterns) {
        const match = pattern.exec(text)
        if (match) {
          date = match[2] || match[1]
          break
        }
      }
      
      // PNR patterns
      const pnr = /(Booking|Reservation|PNR|Reference)\s*(Code|Number|Ref\.?)?\s*[:\-]?\s*([A-Z0-9]{5,8})/i.exec(text)?.[3] ||
                  /\b([A-Z0-9]{6})\b/.exec(text)?.[1]
      
      // Extract IATA codes from simple route format like "RIX → STN"
      const simpleRoute = /\b([A-Z]{3})\s*→\s*([A-Z]{3})\b/.exec(text)
      
      return {
        airline: 'Ryanair',
        flight_number: flight,
        departure_airport: dep?.[2]?.trim() || dep?.[1]?.trim(),
        departure_iata: dep?.[3] || dep?.[2] || simpleRoute?.[1],
        arrival_airport: arr?.[2]?.trim() || arr?.[1]?.trim(),
        arrival_iata: arr?.[3] || arr?.[2] || simpleRoute?.[2],
        departure_time: times?.[2] || times?.[1],
        arrival_time: times?.[4] || times?.[2],
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
