import { parseEmail } from './gmail-parser'
import { extractFlightsFromTextLLM } from './llm-extract'

export interface GmailMessage {
  id: string
  subject: string
  sender: string
  receivedAt: string
  content: string
  headers: Record<string, string>
  attachments?: Array<{
    filename: string
    size: number
    mimeType: string
    data?: string
  }>
}

export interface FlightData {
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
  airline?: string
  arrival_iata?: string
  departure_iata?: string
  seat?: string
  notes?: string
  arrival_date?: string
  confidence?: number
  extraction_method?: string
}

export interface ParseResult {
  success: boolean
  flights: FlightData[]
  confidence: number
  method: string
  errors?: string[]
  metadata?: {
    processingTime: number
    strategiesAttempted: string[]
    fallbackReason?: string
  }
}

export class RobustGmailParser {
  private readonly CONFIDENCE_THRESHOLD = 0.6
  private readonly MAX_PROCESSING_TIME = 30000 // 30 seconds max per email

  async parseEmail(email: GmailMessage): Promise<ParseResult> {
    const startTime = Date.now()
    const strategiesAttempted: string[] = []
    
    // Timeout protection
    const timeoutPromise = new Promise<ParseResult>((_, reject) => {
      setTimeout(() => reject(new Error('Parsing timeout')), this.MAX_PROCESSING_TIME)
    })

    const parsePromise = this.executeParsingStrategies(email, strategiesAttempted)
    
    try {
      const result = await Promise.race([parsePromise, timeoutPromise])
      result.metadata = {
        processingTime: Date.now() - startTime,
        strategiesAttempted
      }
      return result
    } catch (error) {
      return {
        success: false,
        flights: [],
        confidence: 0,
        method: 'timeout',
        errors: [error instanceof Error ? error.message : 'Unknown timeout error'],
        metadata: {
          processingTime: Date.now() - startTime,
          strategiesAttempted
        }
      }
    }
  }

  private async executeParsingStrategies(email: GmailMessage, strategiesAttempted: string[]): Promise<ParseResult> {
    const strategies = [
      { name: 'structured_data', fn: () => this.parseStructuredData(email) },
      { name: 'common_patterns', fn: () => this.parseCommonPatterns(email) },
      { name: 'airline_specific', fn: () => this.parseAirlineSpecific(email) },
      { name: 'llm_enhanced', fn: () => this.parseLLMEnhanced(email) },
      { name: 'heuristic', fn: () => this.parseHeuristic(email) }
    ]

    for (const strategy of strategies) {
      strategiesAttempted.push(strategy.name)
      
      try {
        const result = await strategy.fn()
        
        if (result.success && result.confidence >= this.CONFIDENCE_THRESHOLD) {
          return {
            ...result,
            method: strategy.name
          }
        }
      } catch (error) {
        // Log but continue to next strategy
        console.warn(`Strategy ${strategy.name} failed:`, error)
      }
    }

    // If all strategies fail, return best attempt
    return {
      success: false,
      flights: [],
      confidence: 0,
      method: 'all_failed',
      errors: ['All parsing strategies failed']
    }
  }

  // Strategy 1: Parse structured data (JSON-LD, microdata)
  private async parseStructuredData(email: GmailMessage): Promise<ParseResult> {
    const flights: FlightData[] = []
    let confidence = 0

    // Look for JSON-LD structured data
    const jsonLdMatches = email.content.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis)
    
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, '').trim()
          const data = JSON.parse(jsonContent)
          
          if (data['@type'] === 'FlightReservation' || data.reservationFor?.['@type'] === 'Flight') {
            const flight = this.extractFromJsonLd(data)
            if (flight) {
              flights.push(flight)
              confidence = 0.95
            }
          }
        } catch (error) {
          // Invalid JSON, continue
        }
      }
    }

    // Look for microdata attributes
    const microdataFlights = this.extractMicrodata(email.content)
    flights.push(...microdataFlights)
    if (microdataFlights.length > 0) {
      confidence = Math.max(confidence, 0.85)
    }

    return {
      success: flights.length > 0,
      flights,
      confidence,
      method: 'structured_data'
    }
  }

  // Strategy 2: Universal flight patterns
  private async parseCommonPatterns(email: GmailMessage): Promise<ParseResult> {
    const text = `${email.subject}\n\n${email.content}`
    const flights: FlightData[] = []
    
    // Universal patterns that work across airlines
    const patterns = {
      flightNumber: /\b([A-Z]{2,3})\s*(\d{3,4}[A-Z]?)\b/g,
      iataCode: /\b([A-Z]{3})\b/g,
      date: /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi,
      time: /\b([01]?\d|2[0-3]):([0-5]\d)\b/g,
      bookingRef: /(?:booking|reservation|confirmation|reference|pnr)[\s:]*([A-Z0-9]{5,8})/gi
    }

    const flightNumbers = Array.from(text.matchAll(patterns.flightNumber))
    const iataCodes = Array.from(text.matchAll(patterns.iataCode))
    const dates = Array.from(text.matchAll(patterns.date))
    const times = Array.from(text.matchAll(patterns.time))
    const bookingRefs = Array.from(text.matchAll(patterns.bookingRef))

    if (flightNumbers.length > 0 && iataCodes.length >= 2) {
      const flight: FlightData = {
        passenger_name: this.extractPassengerName(text) || '',
        reservation_number: bookingRefs[0]?.[1] || '',
        flight_number: `${flightNumbers[0][1]}${flightNumbers[0][2]}`,
        departure_airport: iataCodes[0]?.[1] || '',
        arrival_airport: iataCodes[1]?.[1] || '',
        departure_iata: iataCodes[0]?.[1] || '',
        arrival_iata: iataCodes[1]?.[1] || '',
        departure_date: this.normalizeDateFormat(dates[0]?.[1] || ''),
        departure_time: times[0]?.[0] || '',
        arrival_time: times[1]?.[0] || '',
        total_receipt: this.extractPrice(text) || '',
        purchased_date: this.normalizeDateFormat(email.receivedAt) || '',
        purchase_time: this.normalizeTimeFormat(email.receivedAt) || '',
        airline: this.inferAirlineFromFlightNumber(flightNumbers[0][1]),
        confidence: 0.75,
        extraction_method: 'common_patterns'
      }

      flights.push(flight)
    }

    return {
      success: flights.length > 0,
      flights,
      confidence: flights.length > 0 ? 0.75 : 0,
      method: 'common_patterns'
    }
  }

  // Strategy 3: Airline-specific parsing (enhanced existing logic)
  private async parseAirlineSpecific(email: GmailMessage): Promise<ParseResult> {
    const text = `${email.subject}\n\n${email.content}`
    
    // Use existing gmail-parser but with enhanced error handling
    try {
      const result = parseEmail(email.subject, email.content)
      
      if (result) {
        const flight: FlightData = {
          ...result,
          confidence: 0.8,
          extraction_method: 'airline_specific',
          purchased_date: result.purchased_date || this.normalizeDateFormat(email.receivedAt) || '',
          purchase_time: result.purchase_time || this.normalizeTimeFormat(email.receivedAt) || ''
        }

        return {
          success: true,
          flights: [flight],
          confidence: 0.8,
          method: 'airline_specific'
        }
      }
    } catch (error) {
      // Fall through to next strategy
    }

    return {
      success: false,
      flights: [],
      confidence: 0,
      method: 'airline_specific'
    }
  }

  // Strategy 4: LLM-enhanced parsing with validation
  private async parseLLMEnhanced(email: GmailMessage): Promise<ParseResult> {
    try {
      const text = `${email.subject}\n\n${email.content}`
      const flights = await extractFlightsFromTextLLM(text, {
        subject: email.subject,
        receivedAt: email.receivedAt
      })

      if (flights && flights.length > 0) {
        // Validate LLM results
        const validatedFlights = flights
          .map(flight => ({
            ...flight,
            confidence: this.calculateFlightConfidence(flight),
            extraction_method: 'llm_enhanced'
          }))
          .filter(flight => flight.confidence > 0.5)

        return {
          success: validatedFlights.length > 0,
          flights: validatedFlights,
          confidence: validatedFlights.length > 0 ? 0.7 : 0,
          method: 'llm_enhanced'
        }
      }
    } catch (error) {
      // LLM failed, continue to heuristic
    }

    return {
      success: false,
      flights: [],
      confidence: 0,
      method: 'llm_enhanced'
    }
  }

  // Strategy 5: Heuristic extraction (last resort)
  private async parseHeuristic(email: GmailMessage): Promise<ParseResult> {
    const text = `${email.subject}\n\n${email.content}`
    const flights: FlightData[] = []

    // Very basic pattern matching for absolute minimum extraction
    const flightMatch = text.match(/([A-Z]{2}\d{3,4})/i)
    const dateMatch = text.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i)
    const timeMatch = text.match(/(\d{1,2}:\d{2})/i)

    if (flightMatch) {
      const flight: FlightData = {
        passenger_name: '',
        reservation_number: '',
        flight_number: flightMatch[1],
        departure_airport: '',
        arrival_airport: '',
        departure_date: dateMatch?.[1] ? this.normalizeDateFormat(dateMatch[1]) : '',
        departure_time: timeMatch?.[1] || '',
        arrival_time: '',
        total_receipt: '',
        purchased_date: this.normalizeDateFormat(email.receivedAt) || '',
        purchase_time: this.normalizeTimeFormat(email.receivedAt) || '',
        confidence: 0.3,
        extraction_method: 'heuristic'
      }

      flights.push(flight)
    }

    return {
      success: flights.length > 0,
      flights,
      confidence: flights.length > 0 ? 0.3 : 0,
      method: 'heuristic'
    }
  }

  // Helper methods
  private extractFromJsonLd(data: any): FlightData | null {
    try {
      const reservation = data.reservationFor || data
      const flight = reservation.flight || reservation

      return {
        passenger_name: data.underName?.name || '',
        reservation_number: data.reservationNumber || '',
        flight_number: flight.flightNumber || '',
        departure_airport: flight.departureAirport?.name || '',
        arrival_airport: flight.arrivalAirport?.name || '',
        departure_iata: flight.departureAirport?.iataCode || '',
        arrival_iata: flight.arrivalAirport?.iataCode || '',
        departure_date: this.normalizeDateFormat(flight.departureTime) || '',
        departure_time: this.normalizeTimeFormat(flight.departureTime) || '',
        arrival_time: this.normalizeTimeFormat(flight.arrivalTime) || '',
        total_receipt: data.totalPrice?.toString() || '',
        purchased_date: this.normalizeDateFormat(data.bookingTime) || '',
        purchase_time: this.normalizeTimeFormat(data.bookingTime) || '',
        airline: flight.airline?.name || '',
        confidence: 0.95,
        extraction_method: 'json_ld'
      }
    } catch {
      return null
    }
  }

  private extractMicrodata(html: string): FlightData[] {
    const flights: FlightData[] = []
    // Implementation for microdata extraction would go here
    // This is a placeholder for the actual microdata parsing logic
    return flights
  }

  private extractPassengerName(text: string): string | null {
    const patterns = [
      /passenger[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /name[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /mr\.?\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
      /ms\.?\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  private extractPrice(text: string): string {
    const pricePatterns = [
      /(?:total|price|cost|amount)[:\s]*[£$€]?(\d+(?:\.\d{2})?)/i,
      /[£$€](\d+(?:\.\d{2})?)/g
    ]

    for (const pattern of pricePatterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }

    return ''
  }

  private inferAirlineFromFlightNumber(code: string): string {
    const airlineCodes: Record<string, string> = {
      'FR': 'Ryanair',
      'EZY': 'easyJet',
      'BA': 'British Airways',
      'LH': 'Lufthansa',
      'UA': 'United Airlines',
      'DL': 'Delta Air Lines',
      'AA': 'American Airlines'
    }

    return airlineCodes[code] || ''
  }

  private calculateFlightConfidence(flight: FlightData): number {
    let confidence = 0

    // Required fields scoring
    if (flight.flight_number) confidence += 0.3
    if (flight.departure_date) confidence += 0.2
    if (flight.departure_iata && flight.arrival_iata) confidence += 0.2
    if (flight.departure_time && flight.arrival_time) confidence += 0.1
    if (flight.reservation_number) confidence += 0.1
    if (flight.passenger_name) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  private normalizeDateFormat(dateStr: string): string {
    if (!dateStr) return ''
    
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      
      return date.toISOString().slice(0, 10) // YYYY-MM-DD
    } catch {
      return ''
    }
  }

  private normalizeTimeFormat(dateTimeStr: string): string {
    if (!dateTimeStr) return ''
    
    try {
      const date = new Date(dateTimeStr)
      if (isNaN(date.getTime())) return ''
      
      return date.toISOString().slice(11, 16) // HH:MM
    } catch {
      return ''
    }
  }

  // Validation method for extracted flights
  validateFlightData(flights: FlightData[]): boolean {
    return flights.every(flight => 
      flight.flight_number && 
      (flight.departure_iata || flight.departure_airport) &&
      (flight.arrival_iata || flight.arrival_airport)
    )
  }
}
