import { ResilientGmailClient, SearchOptions } from './resilient-gmail-client'
import { EmailClassifier } from './email-classifier'
import { RobustGmailParser } from './robust-gmail-parser'
import { DeduplicationEngine, FlightData } from './deduplication-engine'
import { ErrorRecoveryManager } from './error-recovery-manager'
import { ProgressiveImporter, ImportConfig, ImportProgress as NewImportProgress, ImportSession } from './progressive-importer'
import { GmailImportService } from './gmail-import-service'

// Legacy interface compatibility
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
  errorDetails: ImportError[]
  // Enhanced fields
  sessionId?: string
  flights?: FlightData[]
  confidence?: number
  recoveryStats?: any
}

export interface EnhancedGmailImportOptions {
  searchQuery?: string
  importMode?: 'past' | 'future'
  dateRange?: {
    start?: string
    end?: string
  }
  maxResults?: number
  batchSize?: number
  concurrency?: number
  enableClassification?: boolean
  classificationThreshold?: number
  enableDeduplication?: boolean
  enableCheckpoints?: boolean
  resumeOnFailure?: boolean
  useLLM?: boolean
  forceLLM?: boolean
  useEnhancedSystem?: boolean
  checkpointInterval?: number
  filterConfig?: {
    preset?: string
    custom?: any
  }
  // Legacy compatibility
  retryFailed?: boolean
  maxRetries?: number
  onProgress?: (progress: ImportProgress) => void
  onError?: (error: ImportError) => void
  onEnhancedProgress?: (progress: NewImportProgress) => void
}

export class EnhancedGmailImportService {
  private gmailClient: any
  private supabaseClient: any
  private options: EnhancedGmailImportOptions

  // Enhanced components
  private resilientClient?: ResilientGmailClient
  private classifier?: EmailClassifier
  private parser?: RobustGmailParser
  private deduplicator?: DeduplicationEngine
  private errorManager?: ErrorRecoveryManager
  private progressiveImporter?: ProgressiveImporter

  constructor(
    gmailClient: any,
    supabaseClient: any,
    options: EnhancedGmailImportOptions = {}
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
      useEnhancedSystem: true,
      enableClassification: true,
      classificationThreshold: 0.7,
      enableDeduplication: true,
      enableCheckpoints: true,
      checkpointInterval: 10,
      resumeOnFailure: true,
      maxResults: 1000,
      ...options
    }

    // Initialize enhanced components if enabled
    if (this.options.useEnhancedSystem) {
      this.initializeEnhancedComponents()
    }
  }

  private initializeEnhancedComponents(): void {
    try {
      console.log('Initializing enhanced components...')

      // Initialize resilient Gmail client
      this.resilientClient = new ResilientGmailClient(this.gmailClient)
      console.log('✓ ResilientGmailClient initialized')

      // Initialize email classifier
      this.classifier = new EmailClassifier()
      console.log('✓ EmailClassifier initialized')

      // Initialize robust parser
      this.parser = new RobustGmailParser()
      console.log('✓ RobustGmailParser initialized')

      // Initialize deduplication engine
      this.deduplicator = new DeduplicationEngine({
        similarityThreshold: 0.85,
        mergeStrategy: 'highest_confidence'
      })
      console.log('✓ DeduplicationEngine initialized')

      // Initialize error recovery manager
      this.errorManager = new ErrorRecoveryManager({
        maxRetries: this.options.maxRetries || 3,
        enableFallbacks: true,
        logErrors: true
      })
      console.log('✓ ErrorRecoveryManager initialized')

      // Initialize progressive importer
      this.progressiveImporter = new ProgressiveImporter(
        this.resilientClient,
        this.classifier,
        this.parser,
        this.deduplicator,
        this.errorManager
      )
      console.log('✓ ProgressiveImporter initialized')
      console.log('All enhanced components initialized successfully')

    } catch (error) {
      console.error('Failed to initialize enhanced components:', error)
      throw error
    }
  }

  public async importFlights(userId: string): Promise<ImportResult> {
    if (this.options.useEnhancedSystem && this.progressiveImporter) {
      return this.importFlightsEnhanced(userId)
    } else {
      return this.importFlightsLegacy(userId)
    }
  }

  private async importFlightsEnhanced(userId: string): Promise<ImportResult> {
    console.log('Enhanced import: delegating to core GmailImportService for user:', userId)
    return this.runCoreImport(userId)
  }

  private async importFlightsLegacy(userId: string): Promise<ImportResult> {
    console.log('Legacy import: delegating to core GmailImportService for user:', userId)
    return this.runCoreImport(userId)
  }

  /**
   * Delegates to the real, working GmailImportService which handles
   * Gmail search, message fetching, parsing, and database import.
   */
  private async runCoreImport(userId: string): Promise<ImportResult> {
    const startTime = Date.now()
    try {
      const coreService = new GmailImportService(
        this.gmailClient,
        this.supabaseClient,
        {
          useLLM: this.options.useLLM ?? true,
          forceLLM: this.options.forceLLM ?? false,
          retryFailed: this.options.retryFailed ?? true,
          maxRetries: this.options.maxRetries ?? 3,
          batchSize: this.options.batchSize ?? 50,
          concurrency: this.options.concurrency ?? 5,
          onProgress: this.options.onProgress,
          onError: this.options.onError,
        }
      )
      const coreResult = await coreService.importFlights(userId)

      // Map the core result into the EnhancedImportResult shape
      return {
        success: coreResult.success,
        imported: coreResult.imported,
        skipped: coreResult.skipped,
        duplicates: coreResult.duplicates,
        errors: coreResult.errors,
        processingTime: coreResult.processingTime,
        stats: coreResult.stats,
        errorDetails: (coreResult as any).errors ?? [],
      }
    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        duplicates: 0,
        errors: 1,
        processingTime: Date.now() - startTime,
        stats: {
          totalMessages: 0,
          validMessages: 0,
          filteredMessages: 0,
          duplicateMessages: 0,
          errorMessages: 1,
        },
        errorDetails: [{
          stage: 'core_import',
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount: 0,
          maxRetries: this.options.maxRetries || 3,
        }],
      }
    }
  }

  private buildDefaultSearchQuery(): string {
    const flightTerms = [
      'flight', 'booking', 'confirmation', 'itinerary', 'boarding pass',
      'reservation', 'ticket', 'travel', 'airline'
    ]

    const airlineDomains = [
      'ryanair.com', 'easyjet.com', 'britishairways.com', 'lufthansa.com',
      'klm.com', 'airfrance.com', 'emirates.com', 'qatarairways.com'
    ]

    const subjectTerms = flightTerms.map(term => `subject:${term}`).join(' OR ')
    const domainTerms = airlineDomains.map(domain => `from:${domain}`).join(' OR ')

    return `(${subjectTerms}) OR (${domainTerms})`
  }

  private createProgressAdapter(): (progress: NewImportProgress) => void {
    return (progress: NewImportProgress) => {
      // Convert enhanced progress to legacy format
      const legacyProgress: ImportProgress = {
        stage: this.mapPhaseToStage(progress.phase),
        current: progress.processedEmails,
        total: progress.totalEmails,
        message: `${progress.phase}: ${progress.processedEmails}/${progress.totalEmails} emails`,
        percentage: progress.totalEmails > 0 ? Math.round((progress.processedEmails / progress.totalEmails) * 100) : 0
      }

      // Call legacy progress callback
      if (this.options.onProgress) {
        this.options.onProgress(legacyProgress)
      }

      // Call enhanced progress callback
      if (this.options.onEnhancedProgress) {
        this.options.onEnhancedProgress(progress)
      }
    }
  }

  private mapPhaseToStage(phase: string): ImportProgress['stage'] {
    switch (phase) {
      case 'search': return 'searching'
      case 'classify': return 'fetching'
      case 'parse': return 'parsing'
      case 'deduplicate': return 'filtering'
      case 'save': return 'importing'
      default: return 'parsing'
    }
  }

  private async waitForCompletion(sessionId: string): Promise<ImportSession | null> {
    const maxWaitTime = 30 * 60 * 1000 // 30 minutes
    const checkInterval = 2000 // 2 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const session = this.progressiveImporter!.getSession(sessionId)

      if (!session) {
        return null
      }

      if (session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled') {
        return session
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }

    // Timeout - try to get final session state
    return this.progressiveImporter!.getSession(sessionId) || null
  }

  private async saveFlightsToDatabase(userId: string, flights: FlightData[]): Promise<{
    imported: number
    skipped: number
    duplicates: number
    errors: number
  }> {
    let imported = 0
    let skipped = 0
    let duplicates = 0
    let errors = 0

    if (!flights || flights.length === 0) {
      return { imported, skipped, duplicates, errors }
    }

    try {
      // Get existing flights for additional deduplication check
      const { data: existingFlights } = await this.supabaseClient
        .from('vidmaflights')
        .select('id, reservation_number, flight_number, departure_date')
        .eq('owner_id', userId)

      const existingKeys = new Set(
        (existingFlights ?? []).map((f: any) =>
          `${(f.flight_number || '').trim()}|${(f.reservation_number || '').trim()}|${new Date(f.departure_date).toISOString().slice(0, 10)}`
        )
      )

      const insertRows: any[] = []

      for (const flight of flights) {
        try {
          // Skip if missing required fields
          if (!flight.flightNumber || !flight.confirmationNumber || !flight.departure?.date) {
            skipped++
            continue
          }

          const depDate = new Date(flight.departure.date)
          const depISO = depDate.toISOString().slice(0, 10)
          const key = `${flight.flightNumber.trim()}|${flight.confirmationNumber.trim()}|${depISO}`

          // Skip duplicates
          if (existingKeys.has(key)) {
            duplicates++
            continue
          }

          // Build database row
          const row = {
            owner_id: userId,
            passenger_name: flight.passenger?.name || 'Unknown',
            reservation_number: flight.confirmationNumber,
            flight_number: flight.flightNumber,
            departure_airport: flight.departure?.airport || 'Unknown',
            arrival_airport: flight.arrival?.airport || 'Unknown',
            departure_date: depISO,
            arrival_date: flight.arrival?.date ? new Date(flight.arrival.date).toISOString().slice(0, 10) : depISO,
            departure_time: flight.departure?.time || '00:00',
            arrival_time: flight.arrival?.time || '00:00',
            total_receipt: flight.price?.amount?.toString() || '0',
            purchased_date: depISO,
            purchase_time: '00:00',
            airline: flight.airline || 'Unknown',
            arrival_country: flight.arrival?.country || null,
            departure_country: flight.departure?.country || null,
            arrival_iata: flight.arrival?.airport || null,
            departure_iata: flight.departure?.airport || null,
            seat: flight.seat || null,
            notes: `Enhanced Gmail import - Confidence: ${flight.confidence || 0}`,
          }

          insertRows.push(row)
          existingKeys.add(key)
        } catch (error) {
          errors++
          console.error('Error processing flight for database:', error)
        }
      }

      // Batch insert
      if (insertRows.length > 0) {
        const { data, error } = await this.supabaseClient
          .from('vidmaflights')
          .insert(insertRows)
          .select()

        if (error) {
          throw new Error(`Database insert failed: ${error.message}`)
        }

        imported = data?.length || 0
      }

    } catch (error) {
      console.error('Database save error:', error)
      errors += flights.length
    }

    return { imported, skipped, duplicates, errors }
  }

  private convertErrorDetails(errorDetails: Array<{ messageId: string; error: string; phase: string }>): ImportError[] {
    return errorDetails.map(detail => ({
      messageId: detail.messageId,
      stage: detail.phase,
      error: detail.error,
      retryCount: 0,
      maxRetries: this.options.maxRetries || 3
    }))
  }

  private calculateAverageConfidence(flights: FlightData[]): number {
    if (!flights || flights.length === 0) return 0

    const confidenceValues = flights
      .map(f => f.confidence || 0)
      .filter(c => c > 0)

    if (confidenceValues.length === 0) return 0

    return confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length
  }

  // Enhanced methods for session management
  public async resumeImport(sessionId: string): Promise<boolean> {
    if (!this.progressiveImporter) return false
    return this.progressiveImporter.resumeImport(sessionId)
  }

  public async pauseImport(sessionId: string): Promise<boolean> {
    if (!this.progressiveImporter) return false
    return this.progressiveImporter.pauseImport(sessionId)
  }

  public async cancelImport(sessionId: string): Promise<boolean> {
    if (!this.progressiveImporter) return false
    return this.progressiveImporter.cancelImport(sessionId)
  }

  public getImportProgress(sessionId: string): NewImportProgress | undefined {
    if (!this.progressiveImporter) return undefined
    return this.progressiveImporter.getSessionProgress(sessionId)
  }

  public getAllImportSessions(): ImportSession[] {
    if (!this.progressiveImporter) return []
    return this.progressiveImporter.getAllSessions()
  }

  public async getSystemHealth(): Promise<{
    gmailClient: boolean
    enhancedComponents: boolean
    activeImports: number
    errorRate: number
  }> {
    const health = {
      gmailClient: false,
      enhancedComponents: false,
      activeImports: 0,
      errorRate: 0
    }

    try {
      // Check Gmail client health
      if (this.resilientClient) {
        const gmailHealth = await this.resilientClient.healthCheck()
        health.gmailClient = gmailHealth.healthy
      }

      // Check enhanced components
      if (this.progressiveImporter) {
        const importerHealth = await this.progressiveImporter.healthCheck()
        health.enhancedComponents = importerHealth.healthy
        health.activeImports = importerHealth.activeSessions
        health.errorRate = importerHealth.failedSessions / Math.max(importerHealth.completedSessions + importerHealth.failedSessions, 1)
      }
    } catch (error) {
      console.error('Health check failed:', error)
    }

    return health
  }

  // Legacy compatibility methods
  public updateFilterConfig(config: any): void {
    // For compatibility - could integrate with classifier if needed
    console.warn('updateFilterConfig called on enhanced service - consider using enhanced configuration')
  }

  public getFilterConfig(): any {
    // For compatibility
    return {}
  }

  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.gmailClient) {
      errors.push('Gmail client not initialized')
    }

    if (!this.supabaseClient) {
      errors.push('Supabase client not initialized')
    }

    if (this.options.useEnhancedSystem && !this.progressiveImporter) {
      errors.push('Enhanced system enabled but components not initialized')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
