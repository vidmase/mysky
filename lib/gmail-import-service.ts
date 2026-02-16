import { GmailFilteringSystem, GmailFilterConfig, GmailFilterPresets } from './gmail-filtering'
import { extractFlightsFromTextLLM } from './llm-extract'
import { parseEmail } from './gmail-parser'

export interface GmailImportOptions {
  filterConfig?: GmailFilterConfig
  useLLM?: boolean
  forceLLM?: boolean
  retryFailed?: boolean
  maxRetries?: number
  batchSize?: number
  concurrency?: number
  onProgress?: (progress: ImportProgress) => void
  onError?: (error: ImportError) => void
}

export interface ImportProgress {
  stage: 'searching' | 'fetching' | 'parsing' | 'filtering' | 'importing'
  current: number
  total: number
  message?: string
  percentage: number
}

export interface ImportError {
  messageId?: string
  stage: string
  error: string
  retryCount: number
  maxRetries: number
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  duplicates: number
  errors: number
  processingTime: number
  stats: {
    totalMessages: number
    validMessages: number
    filteredMessages: number
    duplicateMessages: number
    errorMessages: number
  }
  errors: ImportError[]
}

export interface GmailMessage {
  id: string
  subject: string
  sender: string
  receivedAt: string
  content: string
  headers: Record<string, string>
}

export class GmailImportService {
  private filterSystem: GmailFilteringSystem
  private options: GmailImportOptions
  private gmailClient: any
  private supabaseClient: any

  constructor(
    gmailClient: any,
    supabaseClient: any,
    options: GmailImportOptions = {}
  ) {
    this.gmailClient = gmailClient
    this.supabaseClient = supabaseClient
    this.options = {
      useLLM: true,
      forceLLM: false,
      retryFailed: true,
      maxRetries: 3,
      batchSize: 50,
      concurrency: 5,
      ...options
    }

    // Initialize filtering system
    const filterConfig = options.filterConfig || GmailFilterPresets.comprehensive()
    this.filterSystem = new GmailFilteringSystem(filterConfig)
  }

  public async importFlights(userId: string): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      success: false,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      errors: 0,
      processingTime: 0,
      stats: {
        totalMessages: 0,
        validMessages: 0,
        filteredMessages: 0,
        duplicateMessages: 0,
        errorMessages: 0
      },
      errors: []
    }

    try {
      // Stage 1: Search for messages
      this.updateProgress('searching', 0, 0, 'Searching Gmail for flight emails...')
      const messageIds = await this.searchMessages()
      result.stats.totalMessages = messageIds.length

      if (messageIds.length === 0) {
        result.success = true
        result.processingTime = Date.now() - startTime
        return result
      }

      // Stage 2: Fetch message details
      this.updateProgress('fetching', 0, messageIds.length, 'Fetching message details...')
      const messages = await this.fetchMessages(messageIds)

      // Stage 3: Parse and filter messages
      this.updateProgress('parsing', 0, messages.length, 'Parsing and filtering messages...')
      const { results: filteredResults, stats: filterStats } = await this.filterSystem.filterMessages(
        await this.parseMessages(messages)
      )

      result.stats.validMessages = filterStats.validMessages
      result.stats.filteredMessages = filterStats.filteredMessages
      result.stats.duplicateMessages = filterStats.duplicateMessages
      result.stats.errorMessages = filterStats.errorMessages

      // Stage 4: Import valid flights
      this.updateProgress('importing', 0, filteredResults.length, 'Importing flights to database...')
      const importResult = await this.importToDatabase(userId, filteredResults)

      result.imported = importResult.imported
      result.skipped = importResult.skipped
      result.duplicates = importResult.duplicates
      result.errors = importResult.errors
      result.errors = importResult.importErrors

      result.success = true
      result.processingTime = Date.now() - startTime

      return result
    } catch (error) {
      result.errors.push({
        stage: 'import',
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        maxRetries: this.options.maxRetries!
      })
      result.processingTime = Date.now() - startTime
      return result
    }
  }

  private async searchMessages(): Promise<string[]> {
    const queries = this.filterSystem.generateSearchQueries()
    const allIds = new Set<string>()
    const seenIds = new Set<string>()

    for (const query of queries) {
      if (allIds.size >= (this.options.filterConfig?.maxMessages || 1000)) break

      let pageToken: string | undefined = undefined
      let totalFetched = 0

      while (allIds.size < (this.options.filterConfig?.maxMessages || 1000)) {
        try {
          const listResp = await this.gmailClient.users.messages.list({
            userId: 'me',
            q: query.query,
            maxResults: this.options.batchSize,
            pageToken
          })

          const ids = (listResp.data.messages as Array<{ id?: string | null }> | undefined)
            ?.map((m) => m.id as string)
            .filter(Boolean) as string[] || []

          pageToken = (listResp.data.nextPageToken as string | undefined) || undefined

          if (!ids.length) break

          let newIds = 0
          for (const id of ids) {
            if (allIds.size >= (this.options.filterConfig?.maxMessages || 1000)) break
            if (!seenIds.has(id)) {
              allIds.add(id)
              seenIds.add(id)
              newIds++
            }
          }

          totalFetched += ids.length

          if (!pageToken) break

          // Rate limiting protection
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          this.handleError({
            stage: 'search',
            error: error instanceof Error ? error.message : 'Search failed',
            retryCount: 0,
            maxRetries: this.options.maxRetries!
          })
          break
        }
      }
    }

    return Array.from(allIds)
  }

  private async fetchMessages(messageIds: string[]): Promise<GmailMessage[]> {
    const messages: GmailMessage[] = []
    const concurrency = this.options.concurrency || 5

    for (let i = 0; i < messageIds.length; i += concurrency) {
      const chunk = messageIds.slice(i, i + concurrency)
      const results = await Promise.allSettled(
        chunk.map(async (id) => {
          try {
            const msg = await this.gmailClient.users.messages.get({
              userId: 'me',
              id,
              format: 'full'
            })

            const headers = (msg.data.payload?.headers as Array<{ name?: string | null; value?: string | null }> | undefined) || []
            const headerMap: Record<string, string> = {}
            
            for (const header of headers) {
              if (header.name && header.value) {
                headerMap[header.name.toLowerCase()] = header.value
              }
            }

            return {
              id,
              subject: headerMap['subject'] || '',
              sender: headerMap['from'] || '',
              receivedAt: headerMap['date'] || '',
              content: this.extractPlainText(msg.data.payload),
              headers: headerMap
            }
          } catch (error) {
            throw new Error(`Failed to fetch message ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          messages.push(result.value)
        } else {
          this.handleError({
            stage: 'fetch',
            error: result.reason,
            retryCount: 0,
            maxRetries: this.options.maxRetries!
          })
        }
      }

      this.updateProgress('fetching', messages.length, messageIds.length)
      
      // Rate limiting protection
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return messages
  }

  private async parseMessages(messages: GmailMessage[]): Promise<Array<{
    id: string
    subject: string
    sender: string
    receivedAt: string
    content: string
    parsedData?: any
  }>> {
    const parsedMessages: Array<{
      id: string
      subject: string
      sender: string
      receivedAt: string
      content: string
      parsedData?: any
    }> = []

    const concurrency = this.options.concurrency || 5

    for (let i = 0; i < messages.length; i += concurrency) {
      const chunk = messages.slice(i, i + concurrency)
      const results = await Promise.allSettled(
        chunk.map(async (message) => {
          try {
            const combined = `${message.subject}\n\n${message.content}`
            let parsedData: any = null

            // Try different parsing strategies
            if (this.options.forceLLM) {
              const flights = await extractFlightsFromTextLLM(combined, {
                subject: message.subject,
                receivedAt: message.receivedAt
              })
              parsedData = flights.find(f => f.booking_type === 'OUTBOUND') || flights[0]
            } else {
              // Try regex parser first
              parsedData = parseEmail(message.subject, combined)
              
              // Fallback to LLM if regex fails or LLM is enabled
              if (!parsedData && this.options.useLLM) {
                const flights = await extractFlightsFromTextLLM(combined, {
                  subject: message.subject,
                  receivedAt: message.receivedAt
                })
                parsedData = flights.find(f => f.booking_type === 'OUTBOUND') || flights[0]
              }
            }

            return {
              id: message.id,
              subject: message.subject,
              sender: message.sender,
              receivedAt: message.receivedAt,
              content: message.content,
              parsedData
            }
          } catch (error) {
            throw new Error(`Failed to parse message ${message.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          parsedMessages.push(result.value)
        } else {
          this.handleError({
            stage: 'parse',
            error: result.reason,
            retryCount: 0,
            maxRetries: this.options.maxRetries!
          })
        }
      }

      this.updateProgress('parsing', parsedMessages.length, messages.length)
    }

    return parsedMessages
  }

  private async importToDatabase(
    userId: string,
    filteredResults: any[]
  ): Promise<{
    imported: number
    skipped: number
    duplicates: number
    errors: number
    importErrors: ImportError[]
  }> {
    let imported = 0
    let skipped = 0
    let duplicates = 0
    let errors = 0
    const importErrors: ImportError[] = []

    // Get existing flights for deduplication
    const { data: existingFlights } = await this.supabaseClient
      .from('vidmaflights')
      .select('id, reservation_number, flight_number, departure_date')
      .eq('owner_id', userId)

    const existingKeys = new Set(
      (existingFlights ?? []).map((f: any) => 
        `${(f.flight_number || '').trim()}|${(f.reservation_number || '').trim()}|${new Date(f.departure_date).toISOString().slice(0,10)}`
      )
    )

    const validResults = filteredResults.filter(result => 
      !result.isDuplicate && result.parsedData && result.confidence >= (this.options.filterConfig?.minConfidence || 0.7)
    )

    const insertRows: any[] = []

    for (const result of validResults) {
      try {
        const parsed = result.parsedData
        const depDate = parsed.departure_date ? new Date(parsed.departure_date) : null
        const depISO = depDate ? depDate.toISOString().slice(0,10) : null
        const key = `${(parsed.flight_number || '').trim()}|${(parsed.reservation_number || '').trim()}|${depISO || ''}`

        // Skip if missing required fields
        if (!parsed.flight_number || !parsed.reservation_number || !depISO) {
          skipped++
          continue
        }

        // Skip duplicates
        if (existingKeys.has(key)) {
          duplicates++
          continue
        }

        // Build database row
        const row = {
          owner_id: userId,
          passenger_name: parsed.passenger_name || 'Unknown',
          reservation_number: parsed.reservation_number,
          flight_number: parsed.flight_number,
          departure_airport: parsed.departure_airport || parsed.departure_iata || 'Unknown',
          arrival_airport: parsed.arrival_airport || parsed.arrival_iata || 'Unknown',
          departure_date: depISO,
          arrival_date: (parsed.arrival_date ? new Date(parsed.arrival_date).toISOString().slice(0,10) : depISO),
          departure_time: parsed.departure_time || '00:00',
          arrival_time: parsed.arrival_time || '00:00',
          total_receipt: parsed.total_receipt || '0',
          purchased_date: parsed.purchased_date || depISO,
          purchase_time: parsed.purchase_time || '00:00',
          airline: parsed.airline || 'Unknown',
          arrival_country: parsed.arrival_country || null,
          arrival_iata: parsed.arrival_iata || null,
          departure_iata: parsed.departure_iata || null,
          seat: parsed.seat || null,
          notes: parsed.notes || `Imported from Gmail message ${result.messageId}`,
        }

        insertRows.push(row)
        existingKeys.add(key)
      } catch (error) {
        errors++
        importErrors.push({
          messageId: result.messageId,
          stage: 'import',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount: 0,
          maxRetries: this.options.maxRetries!
        })
      }
    }

    // Batch insert
    if (insertRows.length > 0) {
      try {
        const { data, error } = await this.supabaseClient
          .from('vidmaflights')
          .insert(insertRows)
          .select()

        if (error) {
          throw new Error(`Database insert failed: ${error.message}`)
        }

        imported = data?.length || 0
      } catch (error) {
        errors += insertRows.length
        importErrors.push({
          stage: 'database',
          error: error instanceof Error ? error.message : 'Database insert failed',
          retryCount: 0,
          maxRetries: this.options.maxRetries!
        })
      }
    }

    return {
      imported,
      skipped,
      duplicates,
      errors,
      importErrors
    }
  }

  private extractPlainText(payload: any): string {
    if (!payload) return ''
    
    const mimeType = payload.mimeType
    if (mimeType === 'text/plain') return this.decodeBase64Url(payload.body?.data)
    
    if (mimeType === 'text/html') {
      const html = this.decodeBase64Url(payload.body?.data)
      const withBreaks = html
        .replace(/<\s*br\s*\/?\s*>/gi, '\n')
        .replace(/<\s*\/p\s*>/gi, '\n')
        .replace(/<\s*p\b[^>]*>/gi, '')
        .replace(/<\s*\/(tr|div|li|h\d)\s*>/gi, '\n')
        .replace(/<\s*(td|th)\b[^>]*>/gi, '\t')
        .replace(/<\s*\/(td|th)\s*>/gi, '\t')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&middot;/gi, '·')
      
      const text = withBreaks.replace(/<[^>]+>/g, ' ')
      return text
        .replace(/[\t ]+/g, ' ')
        .replace(/\s*\n\s*/g, '\n')
        .trim()
    }
    
    if (payload.parts && Array.isArray(payload.parts)) {
      const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain')
      if (plain) return this.extractPlainText(plain)
      
      const html = payload.parts.find((p: any) => p.mimeType === 'text/html')
      if (html) return this.extractPlainText(html)
      
      for (const p of payload.parts) {
        const text = this.extractPlainText(p)
        if (text) return text
      }
    }
    
    return ''
  }

  private decodeBase64Url(data?: string | null): string {
    if (!data) return ''
    const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    return buff.toString('utf8')
  }

  private updateProgress(stage: ImportProgress['stage'], current: number, total: number, message?: string): void {
    if (this.options.onProgress) {
      this.options.onProgress({
        stage,
        current,
        total,
        message,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0
      })
    }
  }

  private handleError(error: ImportError): void {
    if (this.options.onError) {
      this.options.onError(error)
    }
  }

  public updateFilterConfig(config: Partial<GmailFilterConfig>): void {
    this.filterSystem.updateFilterConfig(config)
  }

  public getFilterConfig(): GmailFilterConfig {
    return this.filterSystem.getFilterConfig()
  }

  public validateConfig(): { isValid: boolean; errors: string[] } {
    return this.filterSystem.validateConfig()
  }
}





