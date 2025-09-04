export interface GmailFilterConfig {
  // Date range filtering
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  dateField?: 'received' | 'departure' | 'both'
  
  // Sender filtering
  senders?: string[]
  senderPatterns?: RegExp[]
  excludeSenders?: string[]
  
  // Subject filtering
  subjectKeywords?: string[]
  subjectPatterns?: RegExp[]
  excludeSubjectKeywords?: string[]
  
  // Content filtering
  contentKeywords?: string[]
  contentPatterns?: RegExp[]
  excludeContentKeywords?: string[]
  
  // Airline-specific filtering
  airlines?: string[]
  excludeAirlines?: string[]
  
  // Flight-specific filtering
  hasFlightNumber?: boolean
  hasReservationNumber?: boolean
  hasValidDate?: boolean
  
  // Processing limits
  maxMessages?: number
  maxConcurrency?: number
  
  // Search strategy
  searchStrategy?: 'comprehensive' | 'targeted' | 'fallback' | 'custom'
  customQueries?: string[]
  
  // Deduplication
  deduplicationStrategy?: 'strict' | 'flexible' | 'none'
  duplicateThreshold?: number // similarity percentage
  
  // Quality filters
  minConfidence?: number
  requireValidAirports?: boolean
  requireValidTimes?: boolean
  
  // Error handling
  retryFailed?: boolean
  maxRetries?: number
  skipInvalidEmails?: boolean

  // NEW: Advanced filtering options
  // Email metadata filtering
  hasAttachments?: boolean
  attachmentTypes?: string[] // ['pdf', 'png', 'jpg', etc.]
  minAttachmentSize?: number // in bytes
  maxAttachmentSize?: number // in bytes
  
  // Email priority and importance
  isImportant?: boolean
  isStarred?: boolean
  hasLabels?: string[]
  excludeLabels?: string[]
  
  // Time-based filtering
  timeOfDay?: {
    start: string // HH:MM format
    end: string // HH:MM format
  }
  dayOfWeek?: number[] // 0-6 (Sunday-Saturday)
  excludeWeekends?: boolean
  excludeHolidays?: boolean
  
  // Content length and complexity
  minContentLength?: number
  maxContentLength?: number
  requireHtmlContent?: boolean
  requirePlainTextContent?: boolean
  
  // Language and locale filtering
  language?: string[] // ['en', 'es', 'fr', etc.]
  locale?: string[] // ['en-US', 'en-GB', etc.]
  
  // Email thread and conversation filtering
  isThreadStart?: boolean
  hasReplies?: boolean
  threadSize?: {
    min?: number
    max?: number
  }
  
  // Domain and TLD filtering
  allowedDomains?: string[] // ['ryanair.com', 'easyjet.com']
  excludedDomains?: string[] // ['spam.com', 'malware.com']
  allowedTLDs?: string[] // ['.com', '.co.uk', '.ie']
  excludedTLDs?: string[] // ['.ru', '.cn']
  
  // Email format and structure
  hasInlineImages?: boolean
  hasExternalLinks?: boolean
  hasTrackingPixels?: boolean
  hasUnsubscribeLink?: boolean
  
  // Business logic filtering
  isBookingConfirmation?: boolean
  isItinerary?: boolean
  isCancellation?: boolean
  isModification?: boolean
  isRefund?: boolean
  
  // Confidence and validation filters
  requireValidPassengerName?: boolean
  requireValidPrice?: boolean
  requireValidSeat?: boolean
  requireValidBookingClass?: boolean
  
  // Advanced content analysis
  sentimentFilter?: 'positive' | 'negative' | 'neutral' | 'any'
  urgencyFilter?: 'high' | 'medium' | 'low' | 'any'
  formalityFilter?: 'formal' | 'informal' | 'any'
  
  // Custom regex patterns
  customRegexPatterns?: {
    field: 'subject' | 'content' | 'sender' | 'all'
    pattern: RegExp
    required?: boolean
  }[]
  
  // Batch and processing filters
  processInBatches?: boolean
  batchSize?: number
  skipProcessedEmails?: boolean
  processedEmailIds?: string[]
  
  // Rate limiting and throttling
  maxEmailsPerMinute?: number
  maxEmailsPerHour?: number
  cooldownPeriod?: number // in milliseconds
  
  // Advanced search operators
  useAdvancedSearch?: boolean
  searchOperators?: {
    has?: string[]
    hasnot?: string[]
    larger?: number
    smaller?: number
    filename?: string[]
    label?: string[]
    category?: string[]
  }
}

export interface GmailSearchQuery {
  query: string
  priority: number
  description: string
  expectedResults?: number
}

export interface GmailFilterResult {
  messageId: string
  subject: string
  sender: string
  receivedAt: string
  confidence: number
  matchedFilters: string[]
  parsedData?: any
  errors?: string[]
  isDuplicate?: boolean
  duplicateReason?: string
}

export interface GmailFilterStats {
  totalMessages: number
  filteredMessages: number
  validMessages: number
  duplicateMessages: number
  errorMessages: number
  processingTime: number
  searchQueriesUsed: string[]
  filterBreakdown: Record<string, number>
}

export class GmailFilteringSystem {
  private config: GmailFilterConfig
  private airlinePatterns!: Map<string, RegExp[]>
  private commonSenders!: Map<string, string[]>
  private processedEmailIds: Set<string>
  private rateLimitTracker: {
    lastRequest: number
    requestsThisMinute: number
    requestsThisHour: number
  }
  
  constructor(config: GmailFilterConfig = {}) {
    this.config = {
      maxMessages: 1000,
      maxConcurrency: 5,
      searchStrategy: 'comprehensive',
      deduplicationStrategy: 'strict',
      duplicateThreshold: 85,
      minConfidence: 0.7,
      requireValidAirports: true,
      requireValidTimes: true,
      retryFailed: true,
      maxRetries: 3,
      skipInvalidEmails: true,
      processInBatches: false,
      batchSize: 50,
      maxEmailsPerMinute: 60,
      maxEmailsPerHour: 1000,
      cooldownPeriod: 1000,
      useAdvancedSearch: false,
      ...config
    }
    
    this.initializePatterns()
    this.processedEmailIds = new Set(config.processedEmailIds || [])
    this.rateLimitTracker = {
      lastRequest: 0,
      requestsThisMinute: 0,
      requestsThisHour: 0
    }
  }

  private initializePatterns(): void {
    // Airline-specific patterns for better filtering
    this.airlinePatterns = new Map([
      ['ryanair', [
        /ryanair\.com/i,
        /itinerary@ryanair\.com/i,
        /booking@ryanair\.com/i,
        /FR\s?\d{3,5}/i,
        /ryanair/i
      ]],
      ['easyjet', [
        /easyjet\.com/i,
        /booking@easyjet\.com/i,
        /EZY\s?\d{3,5}/i,
        /easyjet/i
      ]],
      ['british_airways', [
        /britishairways\.com/i,
        /ba\.com/i,
        /BA\s?\d{3,5}/i,
        /british\s*airways/i
      ]],
      ['lufthansa', [
        /lufthansa\.com/i,
        /LH\s?\d{3,5}/i,
        /lufthansa/i
      ]],
      ['united', [
        /united\.com/i,
        /UA\s?\d{3,5}/i,
        /united\s*airlines/i
      ]],
      ['delta', [
        /delta\.com/i,
        /DL\s?\d{3,5}/i,
        /delta\s*airlines/i
      ]],
      ['american', [
        /aa\.com/i,
        /americanairlines\.com/i,
        /AA\s?\d{3,5}/i,
        /american\s*airlines/i
      ]]
    ])

    // Common sender patterns
    this.commonSenders = new Map([
      ['ryanair', ['itinerary@ryanair.com', 'booking@ryanair.com', 'noreply@ryanair.com']],
      ['easyjet', ['booking@easyjet.com', 'noreply@easyjet.com']],
      ['british_airways', ['booking@britishairways.com', 'noreply@ba.com']],
      ['lufthansa', ['booking@lufthansa.com', 'noreply@lufthansa.com']],
      ['united', ['booking@united.com', 'noreply@united.com']],
      ['delta', ['booking@delta.com', 'noreply@delta.com']],
      ['american', ['booking@aa.com', 'noreply@aa.com']]
    ])
  }

  public generateSearchQueries(): GmailSearchQuery[] {
    const queries: GmailSearchQuery[] = []
    const dateFilter = this.buildDateFilter()
    const advancedFilters = this.buildAdvancedSearchFilters()

    // Strategy 1: Comprehensive search (default)
    if (this.config.searchStrategy === 'comprehensive' || this.config.searchStrategy === 'targeted') {
      // Primary airline-specific queries
      if (this.config.airlines && this.config.airlines.length > 0) {
        for (const airline of this.config.airlines) {
          const senders = this.commonSenders.get(airline.toLowerCase()) || []
          const patterns = this.airlinePatterns.get(airline.toLowerCase()) || []
          
          for (const sender of senders) {
            queries.push({
              query: `from:${sender} ${dateFilter} ${advancedFilters}`,
              priority: 1,
              description: `Direct ${airline} sender`,
              expectedResults: 50
            })
          }
          
          // Subject-based search for airline
          queries.push({
            query: `subject:"${airline}" ${dateFilter} ${advancedFilters}`,
            priority: 2,
            description: `${airline} subject search`,
            expectedResults: 30
          })
        }
      }

      // Generic flight-related queries
      queries.push({
        query: `(subject:"itinerary" OR subject:"booking" OR subject:"confirmation") ${dateFilter} ${advancedFilters}`,
        priority: 3,
        description: 'Generic flight confirmation',
        expectedResults: 100
      })

      queries.push({
        query: `(subject:"flight" OR subject:"reservation") ${dateFilter} ${advancedFilters}`,
        priority: 4,
        description: 'Flight/reservation subjects',
        expectedResults: 80
      })
    }

    // Strategy 2: Fallback search
    if (this.config.searchStrategy === 'fallback' || this.config.searchStrategy === 'comprehensive') {
      queries.push({
        query: `(from:*.com subject:"*flight*" OR from:*.com subject:"*booking*") ${dateFilter} ${advancedFilters}`,
        priority: 5,
        description: 'Broad airline search',
        expectedResults: 200
      })
    }

    // Strategy 3: Custom queries
    if (this.config.searchStrategy === 'custom' && this.config.customQueries) {
      for (const customQuery of this.config.customQueries) {
        queries.push({
          query: `${customQuery} ${dateFilter} ${advancedFilters}`,
          priority: 1,
          description: 'Custom query',
          expectedResults: 50
        })
      }
    }

    // Sort by priority
    return queries.sort((a, b) => a.priority - b.priority)
  }

  private buildDateFilter(): string {
    const filters: string[] = []
    
    if (this.config.startDate) {
      const startDate = new Date(this.config.startDate + 'T00:00:00Z')
      const startDateMinus = new Date(startDate)
      startDateMinus.setUTCDate(startDateMinus.getUTCDate() - 1)
      filters.push(`after:${this.formatForGmail(startDateMinus)}`)
    }
    
    if (this.config.endDate) {
      const endDate = new Date(this.config.endDate + 'T23:59:59Z')
      const endDatePlus = new Date(endDate)
      endDatePlus.setUTCDate(endDatePlus.getUTCDate() + 1)
      filters.push(`before:${this.formatForGmail(endDatePlus)}`)
    }
    
    return filters.join(' ')
  }

  private formatForGmail(date: Date): string {
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${y}/${m}/${day}`
  }

  private buildAdvancedSearchFilters(): string {
    const filters: string[] = []

    // Attachment filters
    if (this.config.hasAttachments) {
      filters.push('has:attachment')
    }

    if (this.config.attachmentTypes && this.config.attachmentTypes.length > 0) {
      const attachmentQuery = this.config.attachmentTypes
        .map(type => `filename:${type}`)
        .join(' OR ')
      filters.push(`(${attachmentQuery})`)
    }

    // Size filters
    if (this.config.minAttachmentSize) {
      filters.push(`larger:${this.config.minAttachmentSize}`)
    }

    if (this.config.maxAttachmentSize) {
      filters.push(`smaller:${this.config.maxAttachmentSize}`)
    }

    // Importance and starring
    if (this.config.isImportant) {
      filters.push('is:important')
    }

    if (this.config.isStarred) {
      filters.push('is:starred')
    }

    // Label filters
    if (this.config.hasLabels && this.config.hasLabels.length > 0) {
      const labelQuery = this.config.hasLabels
        .map(label => `label:${label}`)
        .join(' OR ')
      filters.push(`(${labelQuery})`)
    }

    if (this.config.excludeLabels && this.config.excludeLabels.length > 0) {
      const excludeLabelQuery = this.config.excludeLabels
        .map(label => `-label:${label}`)
        .join(' ')
      filters.push(excludeLabelQuery)
    }

    // Domain filters
    if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
      const domainQuery = this.config.allowedDomains
        .map(domain => `from:${domain}`)
        .join(' OR ')
      filters.push(`(${domainQuery})`)
    }

    if (this.config.excludedDomains && this.config.excludedDomains.length > 0) {
      const excludeDomainQuery = this.config.excludedDomains
        .map(domain => `-from:${domain}`)
        .join(' ')
      filters.push(excludeDomainQuery)
    }

    // TLD filters
    if (this.config.allowedTLDs && this.config.allowedTLDs.length > 0) {
      const tldQuery = this.config.allowedTLDs
        .map(tld => `from:*${tld}`)
        .join(' OR ')
      filters.push(`(${tldQuery})`)
    }

    if (this.config.excludedTLDs && this.config.excludedTLDs.length > 0) {
      const excludeTldQuery = this.config.excludedTLDs
        .map(tld => `-from:*${tld}`)
        .join(' ')
      filters.push(excludeTldQuery)
    }

    // Advanced search operators
    if (this.config.useAdvancedSearch && this.config.searchOperators) {
      const operators = this.config.searchOperators
      
      if (operators.has && operators.has.length > 0) {
        filters.push(operators.has.map(item => `has:${item}`).join(' '))
      }

      if (operators.hasnot && operators.hasnot.length > 0) {
        filters.push(operators.hasnot.map(item => `-has:${item}`).join(' '))
      }

      if (operators.larger) {
        filters.push(`larger:${operators.larger}`)
      }

      if (operators.smaller) {
        filters.push(`smaller:${operators.smaller}`)
      }

      if (operators.filename && operators.filename.length > 0) {
        const filenameQuery = operators.filename
          .map(file => `filename:${file}`)
          .join(' OR ')
        filters.push(`(${filenameQuery})`)
      }

      if (operators.label && operators.label.length > 0) {
        const labelQuery = operators.label
          .map(label => `label:${label}`)
          .join(' OR ')
        filters.push(`(${labelQuery})`)
      }

      if (operators.category && operators.category.length > 0) {
        const categoryQuery = operators.category
          .map(cat => `category:${cat}`)
          .join(' OR ')
        filters.push(`(${categoryQuery})`)
      }
    }

    return filters.join(' ')
  }

  public async filterMessages(
    messages: Array<{
      id: string
      subject: string
      sender: string
      receivedAt: string
      content: string
      parsedData?: any
      headers?: Record<string, string>
      attachments?: Array<{
        filename: string
        size: number
        mimeType: string
      }>
      labels?: string[]
      isImportant?: boolean
      isStarred?: boolean
      threadId?: string
      threadSize?: number
    }>
  ): Promise<{ results: GmailFilterResult[], stats: GmailFilterStats }> {
    const startTime = Date.now()
    const results: GmailFilterResult[] = []
    const stats: GmailFilterStats = {
      totalMessages: messages.length,
      filteredMessages: 0,
      validMessages: 0,
      duplicateMessages: 0,
      errorMessages: 0,
      processingTime: 0,
      searchQueriesUsed: [],
      filterBreakdown: {}
    }

    const seenKeys = new Set<string>()
    const duplicateChecker = new Map<string, string[]>()

    for (const message of messages) {
      try {
        // Skip if already processed
        if (this.config.skipProcessedEmails && this.processedEmailIds.has(message.id)) {
          stats.filteredMessages++
          continue
        }

        const filterResult = await this.applyAdvancedFilters(message)
        
        if (filterResult) {
          // Check for duplicates
          const duplicateCheck = this.checkDuplicate(filterResult, seenKeys, duplicateChecker)
          if (duplicateCheck.isDuplicate) {
            filterResult.isDuplicate = true
            filterResult.duplicateReason = duplicateCheck.reason
            stats.duplicateMessages++
          } else {
            seenKeys.add(duplicateCheck.key)
            if (duplicateChecker.has(duplicateCheck.key)) {
              duplicateChecker.get(duplicateCheck.key)!.push(message.id)
            } else {
              duplicateChecker.set(duplicateCheck.key, [message.id])
            }
          }

          results.push(filterResult)
          stats.validMessages++
          
          // Mark as processed
          this.processedEmailIds.add(message.id)
        }
        
        stats.filteredMessages++
      } catch (error) {
        stats.errorMessages++
        if (!this.config.skipInvalidEmails) {
          results.push({
            messageId: message.id,
            subject: message.subject,
            sender: message.sender,
            receivedAt: message.receivedAt,
            confidence: 0,
            matchedFilters: [],
            errors: [error instanceof Error ? error.message : 'Unknown error']
          })
        }
      }
    }

    stats.processingTime = Date.now() - startTime
    return { results, stats }
  }

  private async applyAdvancedFilters(message: {
    id: string
    subject: string
    sender: string
    receivedAt: string
    content: string
    parsedData?: any
    headers?: Record<string, string>
    attachments?: Array<{
      filename: string
      size: number
      mimeType: string
    }>
    labels?: string[]
    isImportant?: boolean
    isStarred?: boolean
    threadId?: string
    threadSize?: number
  }): Promise<GmailFilterResult | null> {
    const matchedFilters: string[] = []
    let confidence = 1.0

    // 1. Basic sender filtering (existing logic)
    if (this.config.senders && this.config.senders.length > 0) {
      const senderMatch = this.config.senders.some(sender => 
        message.sender.toLowerCase().includes(sender.toLowerCase())
      )
      if (!senderMatch) return null
      matchedFilters.push('sender_whitelist')
    }

    if (this.config.excludeSenders && this.config.excludeSenders.length > 0) {
      const senderExcluded = this.config.excludeSenders.some(sender => 
        message.sender.toLowerCase().includes(sender.toLowerCase())
      )
      if (senderExcluded) return null
    }

    // 2. Domain and TLD filtering
    if (this.config.allowedDomains && this.config.allowedDomains.length > 0) {
      const domainMatch = this.config.allowedDomains.some(domain => 
        message.sender.toLowerCase().includes(domain.toLowerCase())
      )
      if (!domainMatch) return null
      matchedFilters.push('allowed_domain')
    }

    if (this.config.excludedDomains && this.config.excludedDomains.length > 0) {
      const domainExcluded = this.config.excludedDomains.some(domain => 
        message.sender.toLowerCase().includes(domain.toLowerCase())
      )
      if (domainExcluded) return null
    }

    // 3. TLD filtering
    if (this.config.allowedTLDs && this.config.allowedTLDs.length > 0) {
      const tldMatch = this.config.allowedTLDs.some(tld => 
        message.sender.toLowerCase().endsWith(tld.toLowerCase())
      )
      if (!tldMatch) return null
      matchedFilters.push('allowed_tld')
    }

    if (this.config.excludedTLDs && this.config.excludedTLDs.length > 0) {
      const tldExcluded = this.config.excludedTLDs.some(tld => 
        message.sender.toLowerCase().endsWith(tld.toLowerCase())
      )
      if (tldExcluded) return null
    }

    // 4. Attachment filtering
    if (this.config.hasAttachments) {
      if (!message.attachments || message.attachments.length === 0) {
        return null
      }
      matchedFilters.push('has_attachments')
    }

    if (this.config.attachmentTypes && this.config.attachmentTypes.length > 0) {
      if (!message.attachments || message.attachments.length === 0) {
        return null
      }
      const hasValidAttachment = message.attachments.some(attachment => 
        this.config.attachmentTypes!.some(type => 
          attachment.filename.toLowerCase().endsWith(type.toLowerCase()) ||
          attachment.mimeType.toLowerCase().includes(type.toLowerCase())
        )
      )
      if (!hasValidAttachment) return null
      matchedFilters.push('valid_attachment_type')
    }

    if (this.config.minAttachmentSize && message.attachments) {
      const hasMinSize = message.attachments.some(attachment => 
        attachment.size >= this.config.minAttachmentSize!
      )
      if (!hasMinSize) return null
      matchedFilters.push('min_attachment_size')
    }

    if (this.config.maxAttachmentSize && message.attachments) {
      const hasMaxSize = message.attachments.some(attachment => 
        attachment.size <= this.config.maxAttachmentSize!
      )
      if (!hasMaxSize) return null
      matchedFilters.push('max_attachment_size')
    }

    // 5. Importance and starring filtering
    if (this.config.isImportant && !message.isImportant) {
      return null
    }

    if (this.config.isStarred && !message.isStarred) {
      return null
    }

    // 6. Label filtering
    if (this.config.hasLabels && this.config.hasLabels.length > 0) {
      if (!message.labels || message.labels.length === 0) {
        return null
      }
      const hasRequiredLabel = this.config.hasLabels.some(label => 
        message.labels!.includes(label)
      )
      if (!hasRequiredLabel) return null
      matchedFilters.push('required_label')
    }

    if (this.config.excludeLabels && this.config.excludeLabels.length > 0) {
      if (message.labels) {
        const hasExcludedLabel = this.config.excludeLabels.some(label => 
          message.labels!.includes(label)
        )
        if (hasExcludedLabel) return null
      }
    }

    // 7. Time-based filtering
    if (this.config.timeOfDay) {
      const receivedTime = new Date(message.receivedAt)
      const hour = receivedTime.getHours()
      const minute = receivedTime.getMinutes()
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      
      if (timeString < this.config.timeOfDay.start || timeString > this.config.timeOfDay.end) {
        return null
      }
      matchedFilters.push('time_of_day')
    }

    if (this.config.dayOfWeek && this.config.dayOfWeek.length > 0) {
      const receivedTime = new Date(message.receivedAt)
      const dayOfWeek = receivedTime.getDay()
      if (!this.config.dayOfWeek.includes(dayOfWeek)) {
        return null
      }
      matchedFilters.push('day_of_week')
    }

    if (this.config.excludeWeekends) {
      const receivedTime = new Date(message.receivedAt)
      const dayOfWeek = receivedTime.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        return null
      }
      matchedFilters.push('exclude_weekends')
    }

    // 8. Content length filtering
    if (this.config.minContentLength && message.content.length < this.config.minContentLength) {
      return null
    }

    if (this.config.maxContentLength && message.content.length > this.config.maxContentLength) {
      return null
    }

    // 9. Content type filtering
    if (this.config.requireHtmlContent) {
      if (!message.headers || !message.headers['content-type']?.includes('text/html')) {
        return null
      }
      matchedFilters.push('html_content')
    }

    if (this.config.requirePlainTextContent) {
      if (!message.headers || !message.headers['content-type']?.includes('text/plain')) {
        return null
      }
      matchedFilters.push('plain_text_content')
    }

    // 10. Thread and conversation filtering
    if (this.config.isThreadStart && message.threadId) {
      // This would need additional logic to determine if it's the first message in thread
      // For now, we'll skip this filter
    }

    if (this.config.hasReplies && message.threadSize && message.threadSize <= 1) {
      return null
    }

    if (this.config.threadSize && message.threadSize) {
      if (this.config.threadSize.min && message.threadSize < this.config.threadSize.min) {
        return null
      }
      if (this.config.threadSize.max && message.threadSize > this.config.threadSize.max) {
        return null
      }
      matchedFilters.push('thread_size')
    }

    // 11. Custom regex patterns
    if (this.config.customRegexPatterns && this.config.customRegexPatterns.length > 0) {
      for (const patternConfig of this.config.customRegexPatterns) {
        let textToMatch = ''
        
        switch (patternConfig.field) {
          case 'subject':
            textToMatch = message.subject
            break
          case 'content':
            textToMatch = message.content
            break
          case 'sender':
            textToMatch = message.sender
            break
          case 'all':
            textToMatch = `${message.subject} ${message.content} ${message.sender}`
            break
        }

        const matches = patternConfig.pattern.test(textToMatch)
        
        if (patternConfig.required && !matches) {
          return null
        }
        
        if (matches) {
          matchedFilters.push(`custom_regex_${patternConfig.field}`)
        }
      }
    }

    // 12. Business logic filtering
    if (this.config.isBookingConfirmation) {
      const isConfirmation = this.isBookingConfirmation(message.subject, message.content)
      if (!isConfirmation) return null
      matchedFilters.push('booking_confirmation')
    }

    if (this.config.isItinerary) {
      const isItinerary = this.isItinerary(message.subject, message.content)
      if (!isItinerary) return null
      matchedFilters.push('itinerary')
    }

    if (this.config.isCancellation) {
      const isCancellation = this.isCancellation(message.subject, message.content)
      if (!isCancellation) return null
      matchedFilters.push('cancellation')
    }

    if (this.config.isModification) {
      const isModification = this.isModification(message.subject, message.content)
      if (!isModification) return null
      matchedFilters.push('modification')
    }

    if (this.config.isRefund) {
      const isRefund = this.isRefund(message.subject, message.content)
      if (!isRefund) return null
      matchedFilters.push('refund')
    }

    // 13. Advanced validation filters
    if (this.config.requireValidPassengerName && message.parsedData) {
      if (!message.parsedData.passenger_name || message.parsedData.passenger_name === 'Unknown') {
        confidence *= 0.8
      }
    }

    if (this.config.requireValidPrice && message.parsedData) {
      if (!message.parsedData.total_receipt || message.parsedData.total_receipt === '0') {
        confidence *= 0.8
      }
    }

    if (this.config.requireValidSeat && message.parsedData) {
      if (!message.parsedData.seat) {
        confidence *= 0.8
      }
    }

    if (this.config.requireValidBookingClass && message.parsedData) {
      if (!message.parsedData.booking_class) {
        confidence *= 0.8
      }
    }

    // 14. Content analysis filters
    if (this.config.sentimentFilter && this.config.sentimentFilter !== 'any') {
      const sentiment = this.analyzeSentiment(message.content)
      if (sentiment !== this.config.sentimentFilter) {
        confidence *= 0.7
      }
    }

    if (this.config.urgencyFilter && this.config.urgencyFilter !== 'any') {
      const urgency = this.analyzeUrgency(message.subject, message.content)
      if (urgency !== this.config.urgencyFilter) {
        confidence *= 0.7
      }
    }

    if (this.config.formalityFilter && this.config.formalityFilter !== 'any') {
      const formality = this.analyzeFormality(message.content)
      if (formality !== this.config.formalityFilter) {
        confidence *= 0.7
      }
    }

    // 15. Email structure filters
    if (this.config.hasInlineImages) {
      const hasInlineImages = message.content.includes('<img') || message.content.includes('cid:')
      if (!hasInlineImages) return null
      matchedFilters.push('inline_images')
    }

    if (this.config.hasExternalLinks) {
      const hasExternalLinks = message.content.includes('http://') || message.content.includes('https://')
      if (!hasExternalLinks) return null
      matchedFilters.push('external_links')
    }

    if (this.config.hasTrackingPixels) {
      const hasTrackingPixels = message.content.includes('1x1') || message.content.includes('tracking')
      if (!hasTrackingPixels) return null
      matchedFilters.push('tracking_pixels')
    }

    if (this.config.hasUnsubscribeLink) {
      const hasUnsubscribe = message.content.toLowerCase().includes('unsubscribe')
      if (!hasUnsubscribe) return null
      matchedFilters.push('unsubscribe_link')
    }

    // 16. Rate limiting check
    if (!this.checkRateLimit()) {
      return null
    }

    // 17. Confidence threshold
    if (confidence < this.config.minConfidence!) {
      return null
    }

    return {
      messageId: message.id,
      subject: message.subject,
      sender: message.sender,
      receivedAt: message.receivedAt,
      confidence,
      matchedFilters,
      parsedData: message.parsedData
    }
  }

  // Helper methods for business logic filtering
  private isBookingConfirmation(subject: string, content: string): boolean {
    const confirmationKeywords = ['confirmation', 'confirmed', 'booking confirmed', 'reservation confirmed']
    const text = `${subject} ${content}`.toLowerCase()
    return confirmationKeywords.some(keyword => text.includes(keyword))
  }

  private isItinerary(subject: string, content: string): boolean {
    const itineraryKeywords = ['itinerary', 'travel itinerary', 'flight itinerary']
    const text = `${subject} ${content}`.toLowerCase()
    return itineraryKeywords.some(keyword => text.includes(keyword))
  }

  private isCancellation(subject: string, content: string): boolean {
    const cancellationKeywords = ['cancelled', 'cancellation', 'canceled', 'cancellation notice']
    const text = `${subject} ${content}`.toLowerCase()
    return cancellationKeywords.some(keyword => text.includes(keyword))
  }

  private isModification(subject: string, content: string): boolean {
    const modificationKeywords = ['modified', 'modification', 'changed', 'updated', 'amendment']
    const text = `${subject} ${content}`.toLowerCase()
    return modificationKeywords.some(keyword => text.includes(keyword))
  }

  private isRefund(subject: string, content: string): boolean {
    const refundKeywords = ['refund', 'refunded', 'reimbursement', 'money back']
    const text = `${subject} ${content}`.toLowerCase()
    return refundKeywords.some(keyword => text.includes(keyword))
  }

  // Content analysis methods
  private analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['thank', 'great', 'excellent', 'good', 'welcome', 'enjoy']
    const negativeWords = ['sorry', 'unfortunately', 'problem', 'issue', 'error', 'failed']
    
    const text = content.toLowerCase()
    const positiveCount = positiveWords.filter(word => text.includes(word)).length
    const negativeCount = negativeWords.filter(word => text.includes(word)).length
    
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  private analyzeUrgency(subject: string, content: string): 'high' | 'medium' | 'low' {
    const urgentWords = ['urgent', 'immediate', 'asap', 'emergency', 'critical']
    const text = `${subject} ${content}`.toLowerCase()
    
    const urgentCount = urgentWords.filter(word => text.includes(word)).length
    if (urgentCount > 0) return 'high'
    
    const hasExclamation = text.includes('!')
    if (hasExclamation) return 'medium'
    
    return 'low'
  }

  private analyzeFormality(content: string): 'formal' | 'informal' {
    const formalIndicators = ['dear', 'sincerely', 'regards', 'yours truly']
    const informalIndicators = ['hey', 'hi', 'thanks', 'cheers', 'bye']
    
    const text = content.toLowerCase()
    const formalCount = formalIndicators.filter(word => text.includes(word)).length
    const informalCount = informalIndicators.filter(word => text.includes(word)).length
    
    return formalCount > informalCount ? 'formal' : 'informal'
  }

  // Rate limiting methods
  private checkRateLimit(): boolean {
    const now = Date.now()
    
    // Reset counters if needed
    if (now - this.rateLimitTracker.lastRequest > 60000) { // 1 minute
      this.rateLimitTracker.requestsThisMinute = 0
    }
    
    if (now - this.rateLimitTracker.lastRequest > 3600000) { // 1 hour
      this.rateLimitTracker.requestsThisHour = 0
    }
    
    // Check limits
    if (this.rateLimitTracker.requestsThisMinute >= (this.config.maxEmailsPerMinute || 60)) {
      return false
    }
    
    if (this.rateLimitTracker.requestsThisHour >= (this.config.maxEmailsPerHour || 1000)) {
      return false
    }
    
    // Update counters
    this.rateLimitTracker.lastRequest = now
    this.rateLimitTracker.requestsThisMinute++
    this.rateLimitTracker.requestsThisHour++
    
    return true
  }

  private checkDuplicate(
    result: GmailFilterResult,
    seenKeys: Set<string>,
    duplicateChecker: Map<string, string[]>
  ): { isDuplicate: boolean; key: string; reason: string } {
    if (!result.parsedData) {
      return { isDuplicate: false, key: result.messageId, reason: '' }
    }

    const data = result.parsedData
    
    // Create multiple keys for different duplicate detection strategies
    const keys = [
      // Strict key: flight + reservation + date
      `${(data.flight_number || '').trim()}|${(data.reservation_number || '').trim()}|${data.departure_date || ''}`,
      // Flexible key: flight + date
      `${(data.flight_number || '').trim()}|${data.departure_date || ''}`,
      // Reservation key: reservation + date
      `${(data.reservation_number || '').trim()}|${data.departure_date || ''}`,
      // Route key: departure + arrival + date
      `${(data.departure_airport || '')}|${(data.arrival_airport || '')}|${data.departure_date || ''}`
    ]

    for (const key of keys) {
      if (seenKeys.has(key)) {
        const existingIds = duplicateChecker.get(key) || []
        if (existingIds.length > 0) {
          return {
            isDuplicate: true,
            key,
            reason: `Duplicate of message ${existingIds[0]}`
          }
        }
      }
    }

    return {
      isDuplicate: false,
      key: keys[0],
      reason: ''
    }
  }

  public getFilterConfig(): GmailFilterConfig {
    return { ...this.config }
  }

  public updateFilterConfig(updates: Partial<GmailFilterConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate date range
    if (this.config.startDate && this.config.endDate) {
      const start = new Date(this.config.startDate)
      const end = new Date(this.config.endDate)
      if (start > end) {
        errors.push('Start date cannot be after end date')
      }
    }

    // Validate numeric values
    if (this.config.minConfidence && (this.config.minConfidence < 0 || this.config.minConfidence > 1)) {
      errors.push('Confidence must be between 0 and 1')
    }

    if (this.config.duplicateThreshold && (this.config.duplicateThreshold < 0 || this.config.duplicateThreshold > 100)) {
      errors.push('Duplicate threshold must be between 0 and 100')
    }

    if (this.config.maxMessages && this.config.maxMessages <= 0) {
      errors.push('Max messages must be positive')
    }

    if (this.config.maxConcurrency && this.config.maxConcurrency <= 0) {
      errors.push('Max concurrency must be positive')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  public getProcessedEmailIds(): string[] {
    return Array.from(this.processedEmailIds)
  }

  public clearProcessedEmailIds(): void {
    this.processedEmailIds.clear()
  }

  public addProcessedEmailId(id: string): void {
    this.processedEmailIds.add(id)
  }
}

// Enhanced filter presets with new options
export const GmailFilterPresets = {
  // Strict Ryanair-only filter
  ryanairStrict: (): GmailFilterConfig => ({
    airlines: ['ryanair'],
    senders: ['itinerary@ryanair.com', 'booking@ryanair.com'],
    subjectKeywords: ['itinerary', 'booking', 'confirmation'],
    hasFlightNumber: true,
    hasReservationNumber: true,
    hasValidDate: true,
    requireValidAirports: true,
    requireValidTimes: true,
    minConfidence: 0.9,
    deduplicationStrategy: 'strict',
    searchStrategy: 'targeted',
    // New advanced options
    hasAttachments: true,
    attachmentTypes: ['pdf'],
    isBookingConfirmation: true,
    requireValidPassengerName: true,
    requireValidPrice: true,
    excludeWeekends: true
  }),

  // Comprehensive airline filter
  comprehensive: (): GmailFilterConfig => ({
    airlines: ['ryanair', 'easyjet', 'british_airways', 'lufthansa', 'united', 'delta', 'american'],
    subjectKeywords: ['itinerary', 'booking', 'confirmation', 'flight', 'reservation'],
    hasFlightNumber: true,
    hasValidDate: true,
    minConfidence: 0.7,
    deduplicationStrategy: 'flexible',
    searchStrategy: 'comprehensive',
    // New advanced options
    hasAttachments: false, // Allow emails without attachments
    allowedDomains: ['ryanair.com', 'easyjet.com', 'britishairways.com', 'lufthansa.com', 'united.com', 'delta.com', 'aa.com'],
    excludeWeekends: false,
    requireValidAirports: true
  }),

  // Loose filter for discovery
  discovery: (): GmailFilterConfig => ({
    subjectKeywords: ['flight', 'booking', 'itinerary', 'reservation', 'confirmation'],
    contentKeywords: ['flight', 'departure', 'arrival', 'airport'],
    minConfidence: 0.5,
    deduplicationStrategy: 'none',
    searchStrategy: 'fallback',
    maxMessages: 2000,
    // New advanced options
    hasAttachments: false,
    maxContentLength: 100000, // Limit to reasonable content size
    sentimentFilter: 'any',
    urgencyFilter: 'any'
  }),

  // High-quality filter
  highQuality: (): GmailFilterConfig => ({
    hasFlightNumber: true,
    hasReservationNumber: true,
    hasValidDate: true,
    requireValidAirports: true,
    requireValidTimes: true,
    minConfidence: 0.95,
    deduplicationStrategy: 'strict',
    searchStrategy: 'targeted',
    // New advanced options
    requireValidPassengerName: true,
    requireValidPrice: true,
    requireValidSeat: true,
    requireValidBookingClass: true,
    hasAttachments: true,
    attachmentTypes: ['pdf', 'png', 'jpg'],
    isBookingConfirmation: true,
    sentimentFilter: 'positive'
  }),

  // NEW: Business-focused filter
  business: (): GmailFilterConfig => ({
    airlines: ['british_airways', 'lufthansa', 'united', 'delta', 'american'],
    subjectKeywords: ['itinerary', 'booking', 'confirmation'],
    minConfidence: 0.8,
    deduplicationStrategy: 'strict',
    searchStrategy: 'targeted',
    // New advanced options
    allowedDomains: ['britishairways.com', 'lufthansa.com', 'united.com', 'delta.com', 'aa.com'],
    hasAttachments: true,
    attachmentTypes: ['pdf'],
    isImportant: true,
    formalityFilter: 'formal',
    requireValidPassengerName: true,
    requireValidPrice: true,
    excludeWeekends: true,
    timeOfDay: { start: '09:00', end: '17:00' }
  }),

  // NEW: Budget airline filter
  budget: (): GmailFilterConfig => ({
    airlines: ['ryanair', 'easyjet', 'wizzair'],
    subjectKeywords: ['itinerary', 'booking', 'confirmation'],
    minConfidence: 0.7,
    deduplicationStrategy: 'flexible',
    searchStrategy: 'targeted',
    // New advanced options
    allowedDomains: ['ryanair.com', 'easyjet.com', 'wizzair.com'],
    hasAttachments: false, // Budget airlines often don't send PDFs
    sentimentFilter: 'any',
    urgencyFilter: 'any',
    requireValidAirports: true,
    excludeWeekends: false
  }),

  // NEW: International travel filter
  international: (): GmailFilterConfig => ({
    subjectKeywords: ['itinerary', 'booking', 'confirmation', 'international'],
    contentKeywords: ['international', 'passport', 'visa', 'customs'],
    minConfidence: 0.6,
    deduplicationStrategy: 'flexible',
    searchStrategy: 'comprehensive',
    // New advanced options
    hasAttachments: true,
    attachmentTypes: ['pdf', 'doc', 'docx'],
    allowedTLDs: ['.com', '.co.uk', '.ie', '.de', '.fr', '.es', '.it'],
         excludedTLDs: ['.ru', '.cn'],
    requireValidPassengerName: true,
    requireValidPrice: true,
    sentimentFilter: 'any',
    urgencyFilter: 'any'
  })
}
