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

export interface SearchOptions {
  query: string
  maxResults?: number
  dateRange?: {
    start?: string // YYYY-MM-DD
    end?: string   // YYYY-MM-DD
  }
  includeAttachments?: boolean
  batchSize?: number
}

export interface RateLimitConfig {
  requestsPerMinute: number
  requestsPerHour: number
  burstLimit: number
  cooldownPeriod: number
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

export interface SearchResult {
  messages: GmailMessage[]
  totalFound: number
  processingTime: number
  queriesUsed: string[]
  rateLimitHits: number
  retryCount: number
}

class RateLimiter {
  private requests: number[] = []
  private burstRequests: number = 0
  private lastReset: number = Date.now()

  constructor(private config: RateLimitConfig) {}

  async wait(): Promise<void> {
    const now = Date.now()
    
    // Reset counters every minute
    if (now - this.lastReset > 60000) {
      this.requests = []
      this.burstRequests = 0
      this.lastReset = now
    }

    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => now - time < 60000)

    // Check burst limit
    if (this.burstRequests >= this.config.burstLimit) {
      await this.delay(this.config.cooldownPeriod)
      this.burstRequests = 0
    }

    // Check per-minute limit
    if (this.requests.length >= this.config.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = 60000 - (now - oldestRequest)
      if (waitTime > 0) {
        await this.delay(waitTime)
      }
    }

    // Record this request
    this.requests.push(now)
    this.burstRequests++
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export class ResilientGmailClient {
  private rateLimiter: RateLimiter
  private retryConfig: RetryConfig
  private gmailClient: any

  constructor(
    gmailClient: any,
    rateLimitConfig: Partial<RateLimitConfig> = {},
    retryConfig: Partial<RetryConfig> = {}
  ) {
    this.gmailClient = gmailClient
    
    this.rateLimiter = new RateLimiter({
      requestsPerMinute: 250, // Gmail API limit is 250/minute
      requestsPerHour: 1000000, // 1M per day = ~41k per hour
      burstLimit: 10,
      cooldownPeriod: 1000,
      ...rateLimitConfig
    })

    this.retryConfig = {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryableErrors: [
        'rateLimitExceeded',
        'quotaExceeded', 
        'backendError',
        'internalError',
        'serviceUnavailable',
        'timeout'
      ],
      ...retryConfig
    }
  }

  async searchMessages(options: SearchOptions): Promise<SearchResult> {
    const startTime = Date.now()
    let totalFound = 0
    let rateLimitHits = 0
    let retryCount = 0
    const queriesUsed: string[] = []
    const allMessages = new Map<string, GmailMessage>()

    // Generate multiple search queries for comprehensive coverage
    const searchQueries = this.generateSearchQueries(options)

    for (const query of searchQueries) {
      queriesUsed.push(query)
      
      try {
        const batchResult = await this.searchWithQuery(query, options)
        
        // Merge results, avoiding duplicates
        for (const message of batchResult.messages) {
          if (!allMessages.has(message.id)) {
            allMessages.set(message.id, message)
          }
        }
        
        totalFound += batchResult.totalFound
        rateLimitHits += batchResult.rateLimitHits
        retryCount += batchResult.retryCount

        // Stop if we have enough results
        if (options.maxResults && allMessages.size >= options.maxResults) {
          break
        }

      } catch (error) {
        console.warn(`Search query failed: ${query}`, error)
        // Continue with next query instead of failing completely
      }
    }

    return {
      messages: Array.from(allMessages.values()).slice(0, options.maxResults),
      totalFound,
      processingTime: Date.now() - startTime,
      queriesUsed,
      rateLimitHits,
      retryCount
    }
  }

  private async searchWithQuery(
    query: string, 
    options: SearchOptions
  ): Promise<SearchResult> {
    const messages: GmailMessage[] = []
    let pageToken: string | undefined
    let rateLimitHits = 0
    let retryCount = 0
    const batchSize = options.batchSize || 100

    while (true) {
      try {
        await this.rateLimiter.wait()

        const result = await this.withRetry(async () => {
          return await this.gmailClient.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: Math.min(batchSize, (options.maxResults || 500) - messages.length),
            pageToken
          })
        })

        const messageIds = result.data.messages?.map((m: any) => m.id) || []
        
        if (messageIds.length === 0) break

        // Fetch message details in parallel batches
        const messageDetails = await this.fetchMessagesBatch(messageIds, options.includeAttachments)
        messages.push(...messageDetails.messages)
        retryCount += messageDetails.retryCount

        pageToken = result.data.nextPageToken
        
        if (!pageToken || (options.maxResults && messages.length >= options.maxResults)) {
          break
        }

      } catch (error) {
        if (this.isRateLimitError(error)) {
          rateLimitHits++
          await this.handleRateLimit(error)
          continue
        }
        throw error
      }
    }

    return {
      messages,
      totalFound: messages.length,
      processingTime: 0,
      queriesUsed: [query],
      rateLimitHits,
      retryCount
    }
  }

  private async fetchMessagesBatch(
    messageIds: string[], 
    includeAttachments = false
  ): Promise<{ messages: GmailMessage[], retryCount: number }> {
    const messages: GmailMessage[] = []
    let retryCount = 0
    const concurrency = 5 // Process 5 messages at a time

    for (let i = 0; i < messageIds.length; i += concurrency) {
      const batch = messageIds.slice(i, i + concurrency)
      
      const results = await Promise.allSettled(
        batch.map(async (id) => {
          try {
            await this.rateLimiter.wait()
            
            return await this.withRetry(async () => {
              const msg = await this.gmailClient.users.messages.get({
                userId: 'me',
                id,
                format: 'full'
              })
              
              return this.parseGmailMessage(msg.data, includeAttachments)
            })
          } catch (error) {
            retryCount++
            throw error
          }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          messages.push(result.value)
        }
      }
    }

    return { messages, retryCount }
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === this.retryConfig.maxAttempts) {
          throw error
        }

        if (!this.isRetryableError(error)) {
          throw error
        }

        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        )

        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  private generateSearchQueries(options: SearchOptions): string[] {
    const queries: string[] = []
    const baseQuery = options.query
    const dateFilter = this.buildDateFilter(options.dateRange)

    // Primary query
    queries.push(`${baseQuery} ${dateFilter}`.trim())

    // Fallback queries for better coverage
    if (baseQuery.includes('from:')) {
      // Extract domain and create broader search
      const domainMatch = baseQuery.match(/from:([^@]*@)?([^\s]+)/)
      if (domainMatch) {
        const domain = domainMatch[2]
        queries.push(`from:${domain} (flight OR booking OR itinerary) ${dateFilter}`.trim())
      }
    }

    // Subject-based fallback
    if (!baseQuery.includes('subject:')) {
      queries.push(`subject:(flight OR booking OR confirmation OR itinerary) ${dateFilter}`.trim())
    }

    // Content-based fallback
    queries.push(`(flight OR booking OR reservation) ${dateFilter}`.trim())

    return queries.filter(q => q.length > 0)
  }

  private buildDateFilter(dateRange?: { start?: string; end?: string }): string {
    if (!dateRange) return ''

    const filters: string[] = []
    
    if (dateRange.start) {
      const startDate = new Date(dateRange.start + 'T00:00:00Z')
      filters.push(`after:${this.formatDateForGmail(startDate)}`)
    }
    
    if (dateRange.end) {
      const endDate = new Date(dateRange.end + 'T23:59:59Z')
      filters.push(`before:${this.formatDateForGmail(endDate)}`)
    }
    
    return filters.join(' ')
  }

  private formatDateForGmail(date: Date): string {
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}/${m}/${d}`
  }

  private parseGmailMessage(messageData: any, includeAttachments = false): GmailMessage {
    const headers = this.extractHeaders(messageData.payload?.headers || [])
    
    return {
      id: messageData.id,
      subject: headers.subject || '',
      sender: headers.from || '',
      receivedAt: headers.date || '',
      content: this.extractContent(messageData.payload),
      headers,
      attachments: includeAttachments ? this.extractAttachments(messageData.payload) : undefined
    }
  }

  private extractHeaders(headers: Array<{ name?: string; value?: string }>): Record<string, string> {
    const headerMap: Record<string, string> = {}
    
    for (const header of headers) {
      if (header.name && header.value) {
        headerMap[header.name.toLowerCase()] = header.value
      }
    }
    
    return headerMap
  }

  private extractContent(payload: any): string {
    if (!payload) return ''
    
    // Handle different MIME types
    if (payload.mimeType === 'text/plain') {
      return this.decodeBase64Url(payload.body?.data) || ''
    }
    
    if (payload.mimeType === 'text/html') {
      const html = this.decodeBase64Url(payload.body?.data) || ''
      return this.htmlToText(html)
    }
    
    // Handle multipart messages
    if (payload.parts && Array.isArray(payload.parts)) {
      // Try to find text/plain first
      const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
      if (textPart) {
        return this.extractContent(textPart)
      }
      
      // Fall back to text/html
      const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
      if (htmlPart) {
        return this.extractContent(htmlPart)
      }
      
      // Recursively search nested parts
      for (const part of payload.parts) {
        const content = this.extractContent(part)
        if (content) return content
      }
    }
    
    return ''
  }

  private extractAttachments(payload: any): Array<{ filename: string; size: number; mimeType: string }> {
    const attachments: Array<{ filename: string; size: number; mimeType: string }> = []
    
    if (!payload?.parts) return attachments
    
    for (const part of payload.parts) {
      if (part.filename && part.body?.size) {
        attachments.push({
          filename: part.filename,
          size: part.body.size,
          mimeType: part.mimeType || 'application/octet-stream'
        })
      }
      
      // Recursively check nested parts
      if (part.parts) {
        attachments.push(...this.extractAttachments(part))
      }
    }
    
    return attachments
  }

  private decodeBase64Url(data?: string): string {
    if (!data) return ''
    
    try {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
      return Buffer.from(base64, 'base64').toString('utf8')
    } catch {
      return ''
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '')
      .replace(/<\/(tr|div|li|h\d)>/gi, '\n')
      .replace(/<(td|th)\b[^>]*>/gi, '\t')
      .replace(/<\/(td|th)>/gi, '\t')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim()
  }

  private isRateLimitError(error: any): boolean {
    const errorCode = error?.code || error?.response?.data?.error?.code
    const errorMessage = error?.message || error?.response?.data?.error?.message || ''
    
    return errorCode === 429 || 
           errorMessage.toLowerCase().includes('rate limit') ||
           errorMessage.toLowerCase().includes('quota exceeded')
  }

  private isRetryableError(error: any): boolean {
    const errorCode = error?.code || error?.response?.data?.error?.code
    const errorMessage = error?.message || error?.response?.data?.error?.message || ''
    
    // Check specific error codes
    if (errorCode && this.retryConfig.retryableErrors.includes(errorCode.toString())) {
      return true
    }
    
    // Check error messages
    const retryableMessages = [
      'rate limit', 'quota exceeded', 'backend error', 
      'internal error', 'service unavailable', 'timeout',
      'temporarily unavailable', 'server error'
    ]
    
    return retryableMessages.some(msg => 
      errorMessage.toLowerCase().includes(msg)
    )
  }

  private async handleRateLimit(error: any): Promise<void> {
    // Extract retry-after header if present
    const retryAfter = error?.response?.headers?.['retry-after']
    let waitTime = 60000 // Default 1 minute

    if (retryAfter) {
      waitTime = parseInt(retryAfter) * 1000
    }

    // Cap wait time to prevent excessive delays
    waitTime = Math.min(waitTime, 300000) // Max 5 minutes

    console.log(`Rate limit hit, waiting ${waitTime}ms before retry`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  // Health check method
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const startTime = Date.now()
    
    try {
      await this.rateLimiter.wait()
      
      await this.gmailClient.users.getProfile({
        userId: 'me'
      })
      
      return {
        healthy: true,
        latency: Date.now() - startTime
      }
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Get rate limit status
  getRateLimitStatus(): { requestsThisMinute: number; canMakeRequest: boolean } {
    const now = Date.now()
    const recentRequests = this.rateLimiter['requests'].filter((time: number) => now - time < 60000)
    
    return {
      requestsThisMinute: recentRequests.length,
      canMakeRequest: recentRequests.length < this.rateLimiter['config'].requestsPerMinute
    }
  }
}
