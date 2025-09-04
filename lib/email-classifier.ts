export interface EmailMetadata {
  senderDomain: string
  hasFlightKeywords: boolean
  hasAirlineKeywords: boolean
  hasBookingKeywords: boolean
  hasAttachments: boolean
  contentLength: number
  isHtml: boolean
  hasStructuredData: boolean
  estimatedAirline?: string
  estimatedEmailType?: 'confirmation' | 'itinerary' | 'cancellation' | 'modification' | 'other'
}

export interface ClassificationResult {
  isFlightRelated: boolean
  confidence: number
  suggestedParser: 'structured_data' | 'common_patterns' | 'airline_specific' | 'llm_enhanced' | 'skip'
  metadata: EmailMetadata
  reasons: string[]
  processingPriority: 'high' | 'medium' | 'low' | 'skip'
}

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
  }>
}

export class EmailClassifier {
  private readonly FLIGHT_KEYWORDS = [
    'flight', 'booking', 'itinerary', 'reservation', 'confirmation',
    'boarding', 'departure', 'arrival', 'gate', 'seat', 'terminal',
    'check-in', 'baggage', 'airline', 'aircraft', 'pilot'
  ]

  private readonly AIRLINE_KEYWORDS = [
    'ryanair', 'easyjet', 'british airways', 'lufthansa', 'united',
    'delta', 'american airlines', 'emirates', 'klm', 'air france',
    'virgin', 'southwest', 'jetblue', 'alaska airlines', 'spirit'
  ]

  private readonly BOOKING_KEYWORDS = [
    'confirmation', 'confirmed', 'booked', 'reserved', 'purchased',
    'ticket', 'e-ticket', 'boarding pass', 'travel document',
    'pnr', 'locator', 'reference number'
  ]

  private readonly AIRLINE_DOMAINS = [
    'ryanair.com', 'easyjet.com', 'britishairways.com', 'ba.com',
    'lufthansa.com', 'united.com', 'delta.com', 'aa.com',
    'emirates.com', 'klm.com', 'airfrance.com', 'virgin.com',
    'southwest.com', 'jetblue.com', 'alaskaair.com', 'spirit.com'
  ]

  private readonly TRAVEL_AGENCY_DOMAINS = [
    'expedia.com', 'booking.com', 'kayak.com', 'skyscanner.com',
    'priceline.com', 'orbitz.com', 'travelocity.com', 'momondo.com'
  ]

  private readonly EXCLUSION_KEYWORDS = [
    'newsletter', 'promotion', 'offer', 'deal', 'sale', 'discount',
    'unsubscribe', 'marketing', 'advertisement', 'survey', 'feedback'
  ]

  classifyEmail(email: GmailMessage): ClassificationResult {
    const metadata = this.extractMetadata(email)
    const scores = this.calculateScores(email, metadata)
    const confidence = this.calculateOverallConfidence(scores)
    
    const isFlightRelated = confidence >= 0.3 && !this.isExcluded(email)
    const suggestedParser = this.selectOptimalParser(scores, metadata)
    const processingPriority = this.determinePriority(confidence, metadata)
    const reasons = this.generateReasons(scores, metadata, isFlightRelated)

    return {
      isFlightRelated,
      confidence,
      suggestedParser,
      metadata,
      reasons,
      processingPriority
    }
  }

  private extractMetadata(email: GmailMessage): EmailMetadata {
    const senderDomain = this.extractDomain(email.sender)
    const contentLower = email.content.toLowerCase()
    const subjectLower = email.subject.toLowerCase()
    const combinedText = `${subjectLower} ${contentLower}`

    return {
      senderDomain,
      hasFlightKeywords: this.hasKeywords(combinedText, this.FLIGHT_KEYWORDS),
      hasAirlineKeywords: this.hasKeywords(combinedText, this.AIRLINE_KEYWORDS),
      hasBookingKeywords: this.hasKeywords(combinedText, this.BOOKING_KEYWORDS),
      hasAttachments: Boolean(email.attachments && email.attachments.length > 0),
      contentLength: email.content.length,
      isHtml: email.content.includes('<html') || email.content.includes('<!DOCTYPE'),
      hasStructuredData: this.hasStructuredData(email.content),
      estimatedAirline: this.estimateAirline(combinedText, senderDomain),
      estimatedEmailType: this.estimateEmailType(combinedText)
    }
  }

  private calculateScores(email: GmailMessage, metadata: EmailMetadata) {
    return {
      senderScore: this.scoreSender(email.sender, metadata.senderDomain),
      subjectScore: this.scoreSubject(email.subject),
      contentScore: this.scoreContent(email.content, metadata),
      attachmentScore: this.scoreAttachments(email.attachments),
      structureScore: this.scoreStructure(metadata),
      keywordScore: this.scoreKeywords(metadata)
    }
  }

  private scoreSender(sender: string, domain: string): number {
    let score = 0
    const senderLower = sender.toLowerCase()

    // Direct airline domains get highest score
    if (this.AIRLINE_DOMAINS.some(d => domain.includes(d))) {
      score += 0.9
    }

    // Travel agency domains get high score
    if (this.TRAVEL_AGENCY_DOMAINS.some(d => domain.includes(d))) {
      score += 0.7
    }

    // Airline-specific email addresses
    if (senderLower.includes('itinerary') || senderLower.includes('booking') || 
        senderLower.includes('confirmation') || senderLower.includes('noreply')) {
      score += 0.6
    }

    // Flight-related sender names
    if (this.AIRLINE_KEYWORDS.some(keyword => senderLower.includes(keyword))) {
      score += 0.5
    }

    // Penalize obvious non-flight senders
    if (senderLower.includes('newsletter') || senderLower.includes('marketing') ||
        senderLower.includes('promotion') || senderLower.includes('support')) {
      score -= 0.3
    }

    return Math.max(0, Math.min(1, score))
  }

  private scoreSubject(subject: string): number {
    let score = 0
    const subjectLower = subject.toLowerCase()

    // High-value subject patterns
    if (subjectLower.includes('itinerary') || subjectLower.includes('confirmation')) {
      score += 0.8
    }

    if (subjectLower.includes('booking') || subjectLower.includes('reservation')) {
      score += 0.7
    }

    if (subjectLower.includes('flight') || subjectLower.includes('boarding')) {
      score += 0.6
    }

    // Flight number patterns
    if (/\b[A-Z]{2,3}\s?\d{3,4}\b/.test(subject)) {
      score += 0.5
    }

    // Date patterns suggesting travel
    if (/\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/.test(subject)) {
      score += 0.3
    }

    // Negative indicators
    if (subjectLower.includes('newsletter') || subjectLower.includes('offer') ||
        subjectLower.includes('promotion') || subjectLower.includes('deal')) {
      score -= 0.5
    }

    return Math.max(0, Math.min(1, score))
  }

  private scoreContent(content: string, metadata: EmailMetadata): number {
    let score = 0
    const contentLower = content.toLowerCase()

    // Keyword density scoring
    if (metadata.hasFlightKeywords) score += 0.4
    if (metadata.hasAirlineKeywords) score += 0.3
    if (metadata.hasBookingKeywords) score += 0.3

    // Flight number patterns
    const flightNumbers = (content.match(/\b[A-Z]{2,3}\s?\d{3,4}\b/g) || []).length
    score += Math.min(0.3, flightNumbers * 0.1)

    // IATA codes (airport codes)
    const iataCodes = (content.match(/\b[A-Z]{3}\b/g) || []).length
    if (iataCodes >= 2) score += 0.2

    // Time patterns
    const times = (content.match(/\b\d{1,2}:\d{2}\b/g) || []).length
    if (times >= 2) score += 0.2

    // Booking reference patterns
    if (/\b[A-Z0-9]{5,8}\b/.test(content)) score += 0.2

    // Content length consideration
    if (metadata.contentLength > 500 && metadata.contentLength < 10000) {
      score += 0.1 // Sweet spot for flight emails
    }

    // Structured data bonus
    if (metadata.hasStructuredData) score += 0.3

    return Math.max(0, Math.min(1, score))
  }

  private scoreAttachments(attachments?: Array<{ filename: string; mimeType: string }>): number {
    if (!attachments || attachments.length === 0) return 0

    let score = 0

    for (const attachment of attachments) {
      const filename = attachment.filename.toLowerCase()
      const mimeType = attachment.mimeType.toLowerCase()

      // PDF attachments are common for boarding passes/tickets
      if (mimeType.includes('pdf') || filename.endsWith('.pdf')) {
        score += 0.4
      }

      // Calendar files for flight itineraries
      if (mimeType.includes('calendar') || filename.endsWith('.ics')) {
        score += 0.3
      }

      // Flight-related filenames
      if (filename.includes('boarding') || filename.includes('ticket') ||
          filename.includes('itinerary') || filename.includes('confirmation')) {
        score += 0.3
      }
    }

    return Math.min(1, score)
  }

  private scoreStructure(metadata: EmailMetadata): number {
    let score = 0

    if (metadata.hasStructuredData) score += 0.5
    if (metadata.isHtml) score += 0.2
    if (metadata.contentLength > 200) score += 0.1

    return score
  }

  private scoreKeywords(metadata: EmailMetadata): number {
    let score = 0

    if (metadata.hasFlightKeywords) score += 0.3
    if (metadata.hasAirlineKeywords) score += 0.3
    if (metadata.hasBookingKeywords) score += 0.4

    return score
  }

  private calculateOverallConfidence(scores: Record<string, number>): number {
    const weights = {
      senderScore: 0.25,
      subjectScore: 0.20,
      contentScore: 0.30,
      attachmentScore: 0.10,
      structureScore: 0.10,
      keywordScore: 0.05
    }

    let weightedSum = 0
    let totalWeight = 0

    for (const [key, score] of Object.entries(scores)) {
      const weight = weights[key as keyof typeof weights] || 0
      weightedSum += score * weight
      totalWeight += weight
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }

  private selectOptimalParser(scores: Record<string, number>, metadata: EmailMetadata): ClassificationResult['suggestedParser'] {
    // If structured data is present, use that first
    if (metadata.hasStructuredData) {
      return 'structured_data'
    }

    // If sender is from known airline, use airline-specific parser
    if (scores.senderScore > 0.7) {
      return 'airline_specific'
    }

    // If strong flight indicators, use common patterns
    if (scores.contentScore > 0.6 || scores.subjectScore > 0.6) {
      return 'common_patterns'
    }

    // If moderate confidence, try LLM
    if (scores.contentScore > 0.3) {
      return 'llm_enhanced'
    }

    // Low confidence, skip processing
    return 'skip'
  }

  private determinePriority(confidence: number, metadata: EmailMetadata): ClassificationResult['processingPriority'] {
    if (confidence < 0.3) return 'skip'
    if (confidence > 0.8 || metadata.hasStructuredData) return 'high'
    if (confidence > 0.5) return 'medium'
    return 'low'
  }

  private generateReasons(scores: Record<string, number>, metadata: EmailMetadata, isFlightRelated: boolean): string[] {
    const reasons: string[] = []

    if (scores.senderScore > 0.7) {
      reasons.push(`Sender from known airline/travel domain (${metadata.senderDomain})`)
    }

    if (scores.subjectScore > 0.6) {
      reasons.push('Subject contains strong flight indicators')
    }

    if (metadata.hasStructuredData) {
      reasons.push('Contains structured flight data (JSON-LD/microdata)')
    }

    if (metadata.hasFlightKeywords && metadata.hasBookingKeywords) {
      reasons.push('Contains both flight and booking keywords')
    }

    if (scores.attachmentScore > 0.3) {
      reasons.push('Has flight-related attachments (PDF/ICS)')
    }

    if (metadata.estimatedAirline) {
      reasons.push(`Estimated airline: ${metadata.estimatedAirline}`)
    }

    if (!isFlightRelated) {
      if (this.isExcluded({ subject: '', content: '', sender: '' } as any)) {
        reasons.push('Contains exclusion keywords (newsletter, promotion, etc.)')
      } else {
        reasons.push('Low confidence score across all indicators')
      }
    }

    return reasons
  }

  // Helper methods
  private extractDomain(email: string): string {
    const match = email.match(/@([^>]+)/)
    return match ? match[1].toLowerCase() : ''
  }

  private hasKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()))
  }

  private hasStructuredData(content: string): boolean {
    return content.includes('application/ld+json') ||
           content.includes('itemscope') ||
           content.includes('schema.org') ||
           content.includes('"@type"')
  }

  private estimateAirline(text: string, domain: string): string | undefined {
    // Check domain first
    for (const airlineDomain of this.AIRLINE_DOMAINS) {
      if (domain.includes(airlineDomain)) {
        return this.domainToAirline(airlineDomain)
      }
    }

    // Check content for airline mentions
    for (const airline of this.AIRLINE_KEYWORDS) {
      if (text.includes(airline)) {
        return airline.charAt(0).toUpperCase() + airline.slice(1)
      }
    }

    return undefined
  }

  private estimateEmailType(text: string): EmailMetadata['estimatedEmailType'] {
    if (text.includes('confirmation') || text.includes('confirmed')) return 'confirmation'
    if (text.includes('itinerary') || text.includes('travel document')) return 'itinerary'
    if (text.includes('cancelled') || text.includes('cancellation')) return 'cancellation'
    if (text.includes('modified') || text.includes('changed') || text.includes('updated')) return 'modification'
    return 'other'
  }

  private domainToAirline(domain: string): string {
    const mapping: Record<string, string> = {
      'ryanair.com': 'Ryanair',
      'easyjet.com': 'easyJet',
      'britishairways.com': 'British Airways',
      'ba.com': 'British Airways',
      'lufthansa.com': 'Lufthansa',
      'united.com': 'United Airlines',
      'delta.com': 'Delta Air Lines',
      'aa.com': 'American Airlines'
    }
    return mapping[domain] || domain
  }

  private isExcluded(email: GmailMessage): boolean {
    const text = `${email.subject} ${email.content}`.toLowerCase()
    return this.EXCLUSION_KEYWORDS.some(keyword => text.includes(keyword))
  }

  // Batch classification for multiple emails
  classifyBatch(emails: GmailMessage[]): ClassificationResult[] {
    return emails.map(email => this.classifyEmail(email))
  }

  // Get processing statistics
  getClassificationStats(results: ClassificationResult[]) {
    const total = results.length
    const flightRelated = results.filter(r => r.isFlightRelated).length
    const highPriority = results.filter(r => r.processingPriority === 'high').length
    const skipped = results.filter(r => r.processingPriority === 'skip').length

    return {
      total,
      flightRelated,
      highPriority,
      skipped,
      flightRelatedPercentage: (flightRelated / total) * 100,
      processingReduction: (skipped / total) * 100
    }
  }
}
