import type { FlightData } from './llm-extract'

export interface RyanairFlightSegment {
  departure_time?: string
  arrival_time?: string
  departure_airport?: string
  arrival_airport?: string
  departure_iata?: string
  arrival_iata?: string
  departure_date?: string
  flight_number?: string
  route_info?: string
}

/**
 * Ryanair-specific template parser that extracts flight data from structured email content
 * Uses precise patterns to match Ryanair's email format
 */
export function parseRyanairEmail(htmlContent: string, textContent: string): FlightData[] {
  const results: FlightData[] = []
  
  // Combine both HTML and text for comprehensive extraction
  const combinedContent = `${htmlContent}\n\n${textContent}`
  
  // Extract reservation/booking reference
  const reservationPatterns = [
    /Reservation:\s*([A-Z0-9]{5,8})/i,
    /Booking reference:\s*([A-Z0-9]{5,8})/i,
    /PNR:\s*([A-Z0-9]{5,8})/i,
    /([A-Z0-9]{5,8})/g // Fallback for any 5-8 char alphanumeric codes
  ]
  
  let reservationNumber = ''
  for (const pattern of reservationPatterns) {
    const match = pattern.exec(combinedContent)
    if (match && /^[A-Z0-9]{5,8}$/.test(match[1])) {
      reservationNumber = match[1]
      break
    }
  }
  
  // Extract passenger name
  const passengerPatterns = [
    /Passenger[s]?:\s*([A-Za-z\s\-'\.]+)/i,
    /(Mr|Mrs|Ms|Miss)\s+([A-Za-z\s\-'\.]+)/i,
    /Name:\s*([A-Za-z\s\-'\.]+)/i
  ]
  
  let passengerName = ''
  for (const pattern of passengerPatterns) {
    const match = pattern.exec(combinedContent)
    if (match) {
      passengerName = (match[2] || match[1]).trim()
      break
    }
  }
  
  // Extract flight segments using Ryanair's specific patterns
  const flightSegments = extractRyanairFlightSegments(combinedContent)
  
  // Convert segments to FlightData format
  for (const segment of flightSegments) {
    if (segment.flight_number && segment.departure_time && segment.arrival_time) {
      results.push({
        passenger_name: passengerName,
        reservation_number: reservationNumber,
        flight_number: segment.flight_number,
        departure_airport: segment.departure_airport || segment.departure_iata || '',
        arrival_airport: segment.arrival_airport || segment.arrival_iata || '',
        departure_date: segment.departure_date || '',
        departure_time: segment.departure_time,
        arrival_time: segment.arrival_time,
        total_receipt: extractTotalReceipt(combinedContent),
        purchased_date: extractPurchaseDate(combinedContent),
        purchase_time: extractPurchaseTime(combinedContent),
        airline: 'Ryanair',
        arrival_iata: segment.arrival_iata,
        departure_iata: segment.departure_iata,
        seat: extractSeat(combinedContent),
        notes: `Extracted via Ryanair template parser`,
        arrival_date: segment.departure_date, // Same day unless specified
        flight_duration: calculateDuration(segment.departure_time, segment.arrival_time),
        is_direct: true,
        booking_type: results.length === 0 ? 'OUTBOUND' : 'RETURN'
      })
    }
  }
  
  return results
}

function extractRyanairFlightSegments(content: string): RyanairFlightSegment[] {
  const segments: RyanairFlightSegment[] = []
  
  // New approach: Look for complete flight information blocks that contain both departure and arrival times
  // This is much more targeted and avoids picking up random content
  
  // Find all occurrences of "Departure time - XX:XX" and "Arrival time - XX:XX"
  const departureTimeMatches = Array.from(content.matchAll(/Departure time\s*-\s*(\d{1,2}:\d{2})/gi))
  const arrivalTimeMatches = Array.from(content.matchAll(/Arrival time\s*-\s*(\d{1,2}:\d{2})/gi))
  
  // For each departure time, find the corresponding flight information
  for (let i = 0; i < departureTimeMatches.length; i++) {
    const depMatch = departureTimeMatches[i]
    const depTime = depMatch[1]
    const depIndex = depMatch.index || 0
    
    // Look for arrival time that comes after this departure time
    const correspondingArrival = arrivalTimeMatches.find(arrMatch => 
      (arrMatch.index || 0) > depIndex && 
      (arrMatch.index || 0) < depIndex + 500 // Within reasonable distance
    )
    
    if (!correspondingArrival) continue
    
    const arrTime = correspondingArrival[1]
    
    // Extract the content around these times to get flight details
    const sectionStart = Math.max(0, depIndex - 300)
    const sectionEnd = Math.min(content.length, (correspondingArrival.index || 0) + 100)
    const sectionContent = content.substring(sectionStart, sectionEnd)
    
    // Skip if this section contains non-flight indicators
    if (isNonFlightContent(sectionContent)) {
      continue
    }
    
    // Extract flight number from this section
    const flightNumberMatch = /(FR\d{3,4})/i.exec(sectionContent)
    if (!flightNumberMatch) continue // Must have a flight number
    
    const segment: RyanairFlightSegment = {
      flight_number: flightNumberMatch[1],
      departure_time: depTime,
      arrival_time: arrTime
    }
    
    // Extract route information (e.g., "Kaunas - Bristol")
    const routeMatch = /([A-Za-z\s]+)\s*-\s*([A-Za-z\s]+)/i.exec(sectionContent)
    if (routeMatch) {
      segment.departure_airport = routeMatch[1].trim()
      segment.arrival_airport = routeMatch[2].trim()
    }
    
    // Extract date
    const datePatterns = [
      /([A-Za-z]{3},?\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})/i,
      /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})/i,
      /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4})/i
    ]
    
    for (const pattern of datePatterns) {
      const dateMatch = pattern.exec(sectionContent)
      if (dateMatch) {
        segment.departure_date = normalizeDateString(dateMatch[1])
        break
      }
    }
    
    // Extract airport IATA codes from parentheses
    const iataMatches = Array.from(sectionContent.matchAll(/\(([A-Z]{3})\)/g))
    if (iataMatches.length >= 2) {
      segment.departure_iata = iataMatches[0][1]
      segment.arrival_iata = iataMatches[1][1]
    }
    
    segments.push(segment)
  }
  
  return segments
}

function isNonFlightContent(sectionContent: string): boolean {
  // Detect content that's clearly not flight information
  const nonFlightIndicators = [
    /car\s*rental/i,
    /hotel/i,
    /accommodation/i,
    /hertz|avis|budget|enterprise/i,
    /booking\.com|hotels\.com/i,
    /advertisement|promotion|offer/i,
    /unsubscribe|privacy|terms/i,
    /social\s*media|facebook|twitter|instagram/i,
    /download\s*app/i,
    /customer\s*service/i,
    /contact\s*us/i,
    /newsletter/i,
    /marketing/i
  ]
  
  // Check if section contains non-flight indicators
  for (const indicator of nonFlightIndicators) {
    if (indicator.test(sectionContent)) {
      return true
    }
  }
  
  // Also check if section lacks essential flight elements
  const hasFlightTime = /Departure time\s*-|Arrival time\s*-/i.test(sectionContent)
  const hasRoute = /\s*-\s*/.test(sectionContent) && /[A-Za-z]{3,}/g.test(sectionContent)
  
  // If it doesn't have flight times or route info, it's probably not a flight section
  if (!hasFlightTime && !hasRoute) {
    return true
  }
  
  return false
}

function extractTotalReceipt(content: string): string {
  const patterns = [
    /Total[:\s]*([€£$]\s?\d+[.,]\d{2})/i,
    /Price[:\s]*([€£$]\s?\d+[.,]\d{2})/i,
    /([€£$]\s?\d+[.,]\d{2})/g
  ]
  
  for (const pattern of patterns) {
    const match = pattern.exec(content)
    if (match) {
      return match[1]
    }
  }
  
  return ''
}

function extractPurchaseDate(content: string): string {
  // Look for booking/purchase date patterns
  const patterns = [
    /Booked on[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Purchase date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g
  ]
  
  for (const pattern of patterns) {
    const match = pattern.exec(content)
    if (match) {
      return normalizeDateString(match[1])
    }
  }
  
  return ''
}

function extractPurchaseTime(content: string): string {
  // Look for time patterns near purchase/booking context
  const timePattern = /(\d{1,2}:\d{2})/g
  const match = timePattern.exec(content)
  return match ? match[1] : ''
}

function extractSeat(content: string): string {
  const seatPatterns = [
    /Seat[:\s]*([A-Z]?\d{1,3}[A-Z]?)/i,
    /([A-Z]?\d{1,3}[A-Z]?)\s*seat/i
  ]
  
  for (const pattern of seatPatterns) {
    const match = pattern.exec(content)
    if (match) {
      return match[1]
    }
  }
  
  return ''
}

function normalizeDateString(dateStr: string): string {
  try {
    // Handle various date formats and convert to ISO format
    let normalized = dateStr.trim()
    
    // Convert "29 Oct 25" to "29 Oct 2025"
    normalized = normalized.replace(/(\d{1,2}\s+[A-Za-z]{3}\s+)(\d{2})$/, '$12025')
    
    // Convert "Wed, 29 Oct 25" to "29 Oct 2025"
    normalized = normalized.replace(/[A-Za-z]{3},?\s+(\d{1,2}\s+[A-Za-z]{3}\s+)(\d{2})$/, '$12025')
    
    const date = new Date(normalized)
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 10) // YYYY-MM-DD
    }
  } catch (e) {
    // Fallback: return original string
  }
  
  return dateStr
}

function calculateDuration(depTime: string, arrTime: string): string {
  if (!depTime || !arrTime) return ''
  
  try {
    const depMatch = depTime.match(/(\d{1,2}):(\d{2})/)
    const arrMatch = arrTime.match(/(\d{1,2}):(\d{2})/)
    
    if (!depMatch || !arrMatch) return ''
    
    const depMinutes = parseInt(depMatch[1]) * 60 + parseInt(depMatch[2])
    let arrMinutes = parseInt(arrMatch[1]) * 60 + parseInt(arrMatch[2])
    
    // Handle overnight flights
    if (arrMinutes < depMinutes) {
      arrMinutes += 24 * 60
    }
    
    const durationMinutes = arrMinutes - depMinutes
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    
    return `${hours}h ${minutes}m`
  } catch (e) {
    return ''
  }
}
