export interface FlightData {
  id?: string
  confirmationNumber?: string
  airline?: string
  flightNumber?: string
  departure?: {
    airport?: string
    city?: string
    date?: string
    time?: string
  }
  arrival?: {
    airport?: string
    city?: string
    date?: string
    time?: string
  }
  passenger?: {
    name?: string
    email?: string
  }
  bookingReference?: string
  seat?: string
  gate?: string
  terminal?: string
  aircraft?: string
  duration?: string
  price?: {
    amount?: number
    currency?: string
  }
  status?: string
  source?: string
  confidence?: number
  rawData?: any
}

export interface DeduplicationConfig {
  similarityThreshold: number
  keyFields: string[]
  mergeStrategy: 'highest_confidence' | 'most_complete' | 'newest' | 'custom'
  customMerger?: (existing: FlightData, duplicate: FlightData) => FlightData
}

export interface DeduplicationResult {
  uniqueFlights: FlightData[]
  duplicatesFound: number
  mergedCount: number
  processingTime: number
  duplicateGroups: Array<{
    master: FlightData
    duplicates: FlightData[]
    similarity: number
  }>
}

export interface SimilarityMetrics {
  overall: number
  confirmationMatch: number
  flightNumberMatch: number
  routeMatch: number
  dateMatch: number
  passengerMatch: number
}

export class DeduplicationEngine {
  private config: DeduplicationConfig

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = {
      similarityThreshold: 0.85,
      keyFields: [
        'confirmationNumber',
        'flightNumber', 
        'departure.airport',
        'arrival.airport',
        'departure.date',
        'passenger.email'
      ],
      mergeStrategy: 'highest_confidence',
      ...config
    }
  }

  async deduplicate(flights: FlightData[]): Promise<DeduplicationResult> {
    const startTime = Date.now()
    const duplicateGroups: Array<{
      master: FlightData
      duplicates: FlightData[]
      similarity: number
    }> = []

    // Create a map to track processed flights
    const processed = new Set<number>()
    const uniqueFlights: FlightData[] = []

    for (let i = 0; i < flights.length; i++) {
      if (processed.has(i)) continue

      const currentFlight = flights[i]
      const duplicates: { flight: FlightData; index: number; similarity: number }[] = []

      // Find duplicates for current flight
      for (let j = i + 1; j < flights.length; j++) {
        if (processed.has(j)) continue

        const similarity = this.calculateSimilarity(currentFlight, flights[j])
        
        if (similarity.overall >= this.config.similarityThreshold) {
          duplicates.push({
            flight: flights[j],
            index: j,
            similarity: similarity.overall
          })
          processed.add(j)
        }
      }

      if (duplicates.length > 0) {
        // Merge duplicates with master flight
        const allFlights = [currentFlight, ...duplicates.map(d => d.flight)]
        const mergedFlight = this.mergeFlights(allFlights)
        
        duplicateGroups.push({
          master: mergedFlight,
          duplicates: duplicates.map(d => d.flight),
          similarity: Math.max(...duplicates.map(d => d.similarity))
        })
        
        uniqueFlights.push(mergedFlight)
      } else {
        uniqueFlights.push(currentFlight)
      }

      processed.add(i)
    }

    return {
      uniqueFlights,
      duplicatesFound: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      mergedCount: duplicateGroups.length,
      processingTime: Date.now() - startTime,
      duplicateGroups
    }
  }

  calculateSimilarity(flight1: FlightData, flight2: FlightData): SimilarityMetrics {
    const metrics: SimilarityMetrics = {
      overall: 0,
      confirmationMatch: 0,
      flightNumberMatch: 0,
      routeMatch: 0,
      dateMatch: 0,
      passengerMatch: 0
    }

    // Confirmation number match (highest weight)
    metrics.confirmationMatch = this.compareConfirmationNumbers(
      flight1.confirmationNumber,
      flight2.confirmationNumber
    )

    // Flight number match
    metrics.flightNumberMatch = this.compareFlightNumbers(
      flight1.flightNumber,
      flight2.flightNumber
    )

    // Route match (departure + arrival airports)
    metrics.routeMatch = this.compareRoutes(flight1, flight2)

    // Date match
    metrics.dateMatch = this.compareDates(
      flight1.departure?.date,
      flight2.departure?.date
    )

    // Passenger match
    metrics.passengerMatch = this.comparePassengers(flight1, flight2)

    // Calculate weighted overall similarity
    const weights = {
      confirmation: 0.35,
      flightNumber: 0.25,
      route: 0.20,
      date: 0.15,
      passenger: 0.05
    }

    metrics.overall = 
      metrics.confirmationMatch * weights.confirmation +
      metrics.flightNumberMatch * weights.flightNumber +
      metrics.routeMatch * weights.route +
      metrics.dateMatch * weights.date +
      metrics.passengerMatch * weights.passenger

    return metrics
  }

  private compareConfirmationNumbers(conf1?: string, conf2?: string): number {
    if (!conf1 || !conf2) return 0
    
    // Normalize confirmation numbers (remove spaces, hyphens, make uppercase)
    const normalize = (str: string) => str.replace(/[\s-]/g, '').toUpperCase()
    const norm1 = normalize(conf1)
    const norm2 = normalize(conf2)
    
    if (norm1 === norm2) return 1.0
    
    // Check if one is contained in the other (partial match)
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      return 0.8
    }
    
    // Calculate string similarity for close matches
    return this.stringSimilarity(norm1, norm2)
  }

  private compareFlightNumbers(flight1?: string, flight2?: string): number {
    if (!flight1 || !flight2) return 0
    
    // Normalize flight numbers (remove spaces, make uppercase)
    const normalize = (str: string) => str.replace(/\s/g, '').toUpperCase()
    const norm1 = normalize(flight1)
    const norm2 = normalize(flight2)
    
    if (norm1 === norm2) return 1.0
    
    // Extract airline code and number separately
    const parseFlightNumber = (fn: string) => {
      const match = fn.match(/^([A-Z]{2,3})(\d+)$/)
      return match ? { airline: match[1], number: match[2] } : null
    }
    
    const parsed1 = parseFlightNumber(norm1)
    const parsed2 = parseFlightNumber(norm2)
    
    if (parsed1 && parsed2) {
      if (parsed1.airline === parsed2.airline && parsed1.number === parsed2.number) {
        return 1.0
      }
      if (parsed1.airline === parsed2.airline) {
        return 0.6 // Same airline, different flight
      }
    }
    
    return this.stringSimilarity(norm1, norm2)
  }

  private compareRoutes(flight1: FlightData, flight2: FlightData): number {
    const dep1 = flight1.departure?.airport
    const arr1 = flight1.arrival?.airport
    const dep2 = flight2.departure?.airport
    const arr2 = flight2.arrival?.airport
    
    if (!dep1 || !arr1 || !dep2 || !arr2) return 0
    
    // Normalize airport codes
    const normalizeDep1 = this.normalizeAirportCode(dep1)
    const normalizeArr1 = this.normalizeAirportCode(arr1)
    const normalizeDep2 = this.normalizeAirportCode(dep2)
    const normalizeArr2 = this.normalizeAirportCode(arr2)
    
    // Exact route match
    if (normalizeDep1 === normalizeDep2 && normalizeArr1 === normalizeArr2) {
      return 1.0
    }
    
    // Reverse route match (return flight)
    if (normalizeDep1 === normalizeArr2 && normalizeArr1 === normalizeDep2) {
      return 0.3 // Low similarity for return flights
    }
    
    // Partial matches
    let score = 0
    if (normalizeDep1 === normalizeDep2) score += 0.5
    if (normalizeArr1 === normalizeArr2) score += 0.5
    
    return score
  }

  private compareDates(date1?: string, date2?: string): number {
    if (!date1 || !date2) return 0
    
    try {
      const d1 = new Date(date1)
      const d2 = new Date(date2)
      
      // Same date
      if (d1.toDateString() === d2.toDateString()) {
        return 1.0
      }
      
      // Within 1 day (might be timezone differences)
      const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays <= 1) {
        return 0.8
      }
      
      // Within a week (might be related flights)
      if (diffDays <= 7) {
        return 0.2
      }
      
      return 0
    } catch {
      return 0
    }
  }

  private comparePassengers(flight1: FlightData, flight2: FlightData): number {
    const email1 = flight1.passenger?.email
    const email2 = flight2.passenger?.email
    const name1 = flight1.passenger?.name
    const name2 = flight2.passenger?.name
    
    let score = 0
    let checks = 0
    
    if (email1 && email2) {
      checks++
      if (email1.toLowerCase() === email2.toLowerCase()) {
        score += 1.0
      }
    }
    
    if (name1 && name2) {
      checks++
      const normName1 = this.normalizeName(name1)
      const normName2 = this.normalizeName(name2)
      
      if (normName1 === normName2) {
        score += 1.0
      } else {
        score += this.stringSimilarity(normName1, normName2)
      }
    }
    
    return checks > 0 ? score / checks : 0
  }

  private mergeFlights(flights: FlightData[]): FlightData {
    if (flights.length === 1) return flights[0]
    
    switch (this.config.mergeStrategy) {
      case 'highest_confidence':
        return this.mergeByHighestConfidence(flights)
      case 'most_complete':
        return this.mergeByCompleteness(flights)
      case 'newest':
        return this.mergeByNewest(flights)
      case 'custom':
        if (this.config.customMerger) {
          return flights.reduce(this.config.customMerger)
        }
        return this.mergeByHighestConfidence(flights)
      default:
        return this.mergeByHighestConfidence(flights)
    }
  }

  private mergeByHighestConfidence(flights: FlightData[]): FlightData {
    // Sort by confidence (highest first)
    const sorted = flights.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    const master = { ...sorted[0] }
    
    // Fill in missing fields from other flights
    for (let i = 1; i < sorted.length; i++) {
      this.fillMissingFields(master, sorted[i])
    }
    
    return master
  }

  private mergeByCompleteness(flights: FlightData[]): FlightData {
    // Sort by completeness (most complete first)
    const sorted = flights.sort((a, b) => this.calculateCompleteness(b) - this.calculateCompleteness(a))
    const master = { ...sorted[0] }
    
    // Fill in missing fields from other flights
    for (let i = 1; i < sorted.length; i++) {
      this.fillMissingFields(master, sorted[i])
    }
    
    return master
  }

  private mergeByNewest(flights: FlightData[]): FlightData {
    // Assume flights with higher IDs or more recent source are newer
    const sorted = flights.sort((a, b) => {
      const aId = parseInt(a.id || '0')
      const bId = parseInt(b.id || '0')
      return bId - aId
    })
    
    const master = { ...sorted[0] }
    
    // Fill in missing fields from other flights
    for (let i = 1; i < sorted.length; i++) {
      this.fillMissingFields(master, sorted[i])
    }
    
    return master
  }

  private fillMissingFields(master: FlightData, source: FlightData): void {
    // Simple field merging
    Object.keys(source).forEach(key => {
      if (master[key as keyof FlightData] === undefined || master[key as keyof FlightData] === null || master[key as keyof FlightData] === '') {
        (master as any)[key] = (source as any)[key]
      }
    })
    
    // Special handling for nested objects
    if (source.departure && master.departure) {
      Object.keys(source.departure).forEach(key => {
        if (!master.departure![key as keyof typeof master.departure]) {
          (master.departure as any)[key] = (source.departure as any)[key]
        }
      })
    } else if (source.departure && !master.departure) {
      master.departure = { ...source.departure }
    }
    
    if (source.arrival && master.arrival) {
      Object.keys(source.arrival).forEach(key => {
        if (!master.arrival![key as keyof typeof master.arrival]) {
          (master.arrival as any)[key] = (source.arrival as any)[key]
        }
      })
    } else if (source.arrival && !master.arrival) {
      master.arrival = { ...source.arrival }
    }
    
    if (source.passenger && master.passenger) {
      Object.keys(source.passenger).forEach(key => {
        if (!master.passenger![key as keyof typeof master.passenger]) {
          (master.passenger as any)[key] = (source.passenger as any)[key]
        }
      })
    } else if (source.passenger && !master.passenger) {
      master.passenger = { ...source.passenger }
    }
    
    if (source.price && master.price) {
      Object.keys(source.price).forEach(key => {
        if (!master.price![key as keyof typeof master.price]) {
          (master.price as any)[key] = (source.price as any)[key]
        }
      })
    } else if (source.price && !master.price) {
      master.price = { ...source.price }
    }
  }

  private calculateCompleteness(flight: FlightData): number {
    const fields = [
      'confirmationNumber', 'airline', 'flightNumber',
      'departure.airport', 'departure.city', 'departure.date', 'departure.time',
      'arrival.airport', 'arrival.city', 'arrival.date', 'arrival.time',
      'passenger.name', 'passenger.email',
      'seat', 'gate', 'terminal', 'aircraft', 'duration'
    ]
    
    let filledFields = 0
    
    fields.forEach(field => {
      const value = this.getNestedValue(flight, field)
      if (value && value !== '') {
        filledFields++
      }
    })
    
    return filledFields / fields.length
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private normalizeAirportCode(code: string): string {
    return code.replace(/[^A-Z0-9]/g, '').toUpperCase().substring(0, 3)
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0
    if (str1.length === 0 || str2.length === 0) return 0
    
    // Levenshtein distance based similarity
    const matrix: number[][] = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length)
    return 1 - matrix[str2.length][str1.length] / maxLength
  }

  // Utility methods for analysis
  analyzeDataQuality(flights: FlightData[]): {
    averageCompleteness: number
    missingFields: Record<string, number>
    duplicateRate: number
  } {
    const completenessScores = flights.map(f => this.calculateCompleteness(f))
    const averageCompleteness = completenessScores.reduce((sum, score) => sum + score, 0) / flights.length
    
    const missingFields: Record<string, number> = {}
    const importantFields = [
      'confirmationNumber', 'flightNumber', 'departure.airport', 'arrival.airport',
      'departure.date', 'passenger.email'
    ]
    
    importantFields.forEach(field => {
      const missingCount = flights.filter(f => !this.getNestedValue(f, field)).length
      missingFields[field] = (missingCount / flights.length) * 100
    })
    
    // Estimate duplicate rate by comparing first 100 flights
    const sampleSize = Math.min(100, flights.length)
    let duplicates = 0
    
    for (let i = 0; i < sampleSize - 1; i++) {
      for (let j = i + 1; j < sampleSize; j++) {
        const similarity = this.calculateSimilarity(flights[i], flights[j])
        if (similarity.overall >= this.config.similarityThreshold) {
          duplicates++
          break
        }
      }
    }
    
    const duplicateRate = (duplicates / sampleSize) * 100
    
    return {
      averageCompleteness: Math.round(averageCompleteness * 100),
      missingFields,
      duplicateRate: Math.round(duplicateRate)
    }
  }
}
