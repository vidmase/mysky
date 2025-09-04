import { ResilientGmailClient, SearchOptions, GmailMessage } from './resilient-gmail-client'
import { EmailClassifier, ClassificationResult } from './email-classifier'
import { RobustGmailParser, ParsedFlightData } from './robust-gmail-parser'
import { DeduplicationEngine, FlightData, DeduplicationResult } from './deduplication-engine'
import { ErrorRecoveryManager, ErrorContext } from './error-recovery-manager'

export interface ImportCheckpoint {
  id: string
  sessionId: string
  timestamp: Date
  phase: 'search' | 'classify' | 'parse' | 'deduplicate' | 'save' | 'completed'
  progress: {
    totalEmails: number
    processedEmails: number
    successfullyParsed: number
    duplicatesFound: number
    errors: number
  }
  searchQuery: string
  lastProcessedMessageId?: string
  batchNumber: number
  metadata: Record<string, any>
}

export interface ImportSession {
  id: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  searchOptions: SearchOptions
  config: ImportConfig
  checkpoints: ImportCheckpoint[]
  results: ImportResults
  errors: Array<{ error: string; timestamp: Date; context?: any }>
}

export interface ImportConfig {
  batchSize: number
  maxConcurrency: number
  enableCheckpoints: boolean
  checkpointInterval: number // Save checkpoint every N processed emails
  enableDeduplication: boolean
  enableClassification: boolean
  classificationThreshold: number
  resumeOnFailure: boolean
  savePartialResults: boolean
  progressCallback?: (progress: ImportProgress) => void
}

export interface ImportProgress {
  sessionId: string
  phase: string
  totalEmails: number
  processedEmails: number
  successfullyParsed: number
  duplicatesFound: number
  errors: number
  currentBatch: number
  estimatedTimeRemaining?: number
  processingRate: number // emails per second
}

export interface ImportResults {
  totalEmailsFound: number
  totalEmailsProcessed: number
  successfullyParsed: number
  flightsExtracted: number
  duplicatesRemoved: number
  errors: number
  processingTime: number
  flights: FlightData[]
  skippedEmails: Array<{ id: string; reason: string }>
  errorDetails: Array<{ messageId: string; error: string; phase: string }>
}

export class ProgressiveImporter {
  private gmailClient: ResilientGmailClient
  private classifier: EmailClassifier
  private parser: RobustGmailParser
  private deduplicator: DeduplicationEngine
  private errorManager: ErrorRecoveryManager
  private activeSessions: Map<string, ImportSession> = new Map()
  private checkpointStorage: Map<string, ImportCheckpoint[]> = new Map()

  constructor(
    gmailClient: ResilientGmailClient,
    classifier: EmailClassifier,
    parser: RobustGmailParser,
    deduplicator: DeduplicationEngine,
    errorManager: ErrorRecoveryManager
  ) {
    this.gmailClient = gmailClient
    this.classifier = classifier
    this.parser = parser
    this.deduplicator = deduplicator
    this.errorManager = errorManager
  }

  async startImport(
    searchOptions: SearchOptions,
    config: Partial<ImportConfig> = {}
  ): Promise<string> {
    const sessionId = this.generateSessionId()
    
    const fullConfig: ImportConfig = {
      batchSize: 50,
      maxConcurrency: 3,
      enableCheckpoints: true,
      checkpointInterval: 10,
      enableDeduplication: true,
      enableClassification: true,
      classificationThreshold: 0.7,
      resumeOnFailure: true,
      savePartialResults: true,
      ...config
    }

    const session: ImportSession = {
      id: sessionId,
      startTime: new Date(),
      status: 'running',
      searchOptions,
      config: fullConfig,
      checkpoints: [],
      results: {
        totalEmailsFound: 0,
        totalEmailsProcessed: 0,
        successfullyParsed: 0,
        flightsExtracted: 0,
        duplicatesRemoved: 0,
        errors: 0,
        processingTime: 0,
        flights: [],
        skippedEmails: [],
        errorDetails: []
      },
      errors: []
    }

    this.activeSessions.set(sessionId, session)
    
    // Start import process asynchronously
    this.processImport(session).catch(error => {
      session.status = 'failed'
      session.errors.push({
        error: error.message,
        timestamp: new Date(),
        context: { phase: 'startup' }
      })
    })

    return sessionId
  }

  async resumeImport(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    if (session.status !== 'paused' && session.status !== 'failed') {
      throw new Error(`Cannot resume session in status: ${session.status}`)
    }

    session.status = 'running'
    
    try {
      await this.processImport(session)
      return true
    } catch (error) {
      session.status = 'failed'
      session.errors.push({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        context: { phase: 'resume' }
      })
      return false
    }
  }

  async pauseImport(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    if (session.status === 'running') {
      session.status = 'paused'
      return true
    }

    return false
  }

  async cancelImport(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.status = 'cancelled'
    session.endTime = new Date()
    return true
  }

  private async processImport(session: ImportSession): Promise<void> {
    const startTime = Date.now()

    try {
      // Phase 1: Search for emails
      await this.searchPhase(session)
      
      if (session.status !== 'running') return

      // Phase 2: Classify emails (if enabled)
      if (session.config.enableClassification) {
        await this.classifyPhase(session)
      }
      
      if (session.status !== 'running') return

      // Phase 3: Parse emails
      await this.parsePhase(session)
      
      if (session.status !== 'running') return

      // Phase 4: Deduplicate flights (if enabled)
      if (session.config.enableDeduplication) {
        await this.deduplicatePhase(session)
      }
      
      if (session.status !== 'running') return

      // Phase 5: Save results
      await this.savePhase(session)

      session.status = 'completed'
      session.endTime = new Date()
      session.results.processingTime = Date.now() - startTime

    } catch (error) {
      session.status = 'failed'
      session.endTime = new Date()
      session.errors.push({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        context: { phase: 'processing' }
      })

      if (session.config.resumeOnFailure) {
        session.status = 'paused'
      }
    }
  }

  private async searchPhase(session: ImportSession): Promise<void> {
    const checkpoint = this.createCheckpoint(session, 'search')
    
    try {
      const searchResult = await this.gmailClient.searchMessages(session.searchOptions)
      
      session.results.totalEmailsFound = searchResult.totalFound
      checkpoint.progress.totalEmails = searchResult.totalFound
      checkpoint.metadata.searchResult = {
        queriesUsed: searchResult.queriesUsed,
        processingTime: searchResult.processingTime,
        rateLimitHits: searchResult.rateLimitHits
      }

      // Store messages for processing
      checkpoint.metadata.messages = searchResult.messages

      this.saveCheckpoint(session, checkpoint)
      this.notifyProgress(session)

    } catch (error) {
      const recovery = await this.errorManager.handleError('gmail_search', error, {
        attemptNumber: 1,
        metadata: { searchOptions: session.searchOptions }
      })

      if (!recovery.success) {
        throw new Error(`Search failed: ${recovery.error}`)
      }
    }
  }

  private async classifyPhase(session: ImportSession): Promise<void> {
    const checkpoint = this.createCheckpoint(session, 'classify')
    const messages: GmailMessage[] = checkpoint.metadata.messages || []
    const classifiedMessages: Array<{ message: GmailMessage; classification: ClassificationResult }> = []

    for (let i = 0; i < messages.length; i++) {
      if (session.status !== 'running') break

      const message = messages[i]
      
      try {
        const classification = await this.classifier.classifyEmail({
          id: message.id,
          subject: message.subject,
          sender: message.sender,
          content: message.content,
          headers: message.headers,
          attachments: message.attachments
        })

        if (classification.confidence >= session.config.classificationThreshold) {
          classifiedMessages.push({ message, classification })
        } else {
          session.results.skippedEmails.push({
            id: message.id,
            reason: `Low classification confidence: ${classification.confidence}`
          })
        }

        checkpoint.progress.processedEmails = i + 1
        
        if ((i + 1) % session.config.checkpointInterval === 0) {
          this.saveCheckpoint(session, checkpoint)
          this.notifyProgress(session)
        }

      } catch (error) {
        session.results.errors++
        session.results.errorDetails.push({
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          phase: 'classify'
        })
      }
    }

    checkpoint.metadata.classifiedMessages = classifiedMessages
    this.saveCheckpoint(session, checkpoint)
    this.notifyProgress(session)
  }

  private async parsePhase(session: ImportSession): Promise<void> {
    const checkpoint = this.createCheckpoint(session, 'parse')
    const messages = checkpoint.metadata.classifiedMessages || checkpoint.metadata.messages || []
    const parsedFlights: FlightData[] = []

    // Process in batches
    for (let batchStart = 0; batchStart < messages.length; batchStart += session.config.batchSize) {
      if (session.status !== 'running') break

      const batch = messages.slice(batchStart, batchStart + session.config.batchSize)
      const batchPromises = batch.map(async (item, index) => {
        const message = item.message || item
        const actualIndex = batchStart + index

        try {
          const parsedData = await this.parser.parseEmail({
            id: message.id,
            subject: message.subject,
            sender: message.sender,
            content: message.content,
            headers: message.headers,
            attachments: message.attachments
          })

          if (parsedData && parsedData.flights && parsedData.flights.length > 0) {
            parsedFlights.push(...parsedData.flights.map(flight => ({
              ...flight,
              source: 'gmail_import',
              id: `${message.id}_${flight.confirmationNumber || actualIndex}`
            })))
            
            checkpoint.progress.successfullyParsed++
          }

          checkpoint.progress.processedEmails = actualIndex + 1
          checkpoint.lastProcessedMessageId = message.id

        } catch (error) {
          const recovery = await this.errorManager.handleError('email_parse', error, {
            messageId: message.id,
            emailContent: message.content,
            attemptNumber: 1
          })

          if (recovery.success && recovery.data) {
            parsedFlights.push({
              ...recovery.data,
              source: 'gmail_import_fallback',
              id: `${message.id}_fallback`
            })
            checkpoint.progress.successfullyParsed++
          } else {
            session.results.errors++
            session.results.errorDetails.push({
              messageId: message.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              phase: 'parse'
            })
          }
        }
      })

      // Process batch with concurrency limit
      const concurrencyLimit = Math.min(session.config.maxConcurrency, batch.length)
      for (let i = 0; i < batchPromises.length; i += concurrencyLimit) {
        const concurrentBatch = batchPromises.slice(i, i + concurrencyLimit)
        await Promise.allSettled(concurrentBatch)
      }

      checkpoint.batchNumber++
      this.saveCheckpoint(session, checkpoint)
      this.notifyProgress(session)
    }

    checkpoint.metadata.parsedFlights = parsedFlights
    session.results.successfullyParsed = checkpoint.progress.successfullyParsed
    this.saveCheckpoint(session, checkpoint)
  }

  private async deduplicatePhase(session: ImportSession): Promise<void> {
    const checkpoint = this.createCheckpoint(session, 'deduplicate')
    const parsedFlights: FlightData[] = checkpoint.metadata.parsedFlights || []

    try {
      const deduplicationResult = await this.deduplicator.deduplicate(parsedFlights)
      
      checkpoint.metadata.deduplicationResult = deduplicationResult
      checkpoint.progress.duplicatesFound = deduplicationResult.duplicatesFound
      
      session.results.duplicatesRemoved = deduplicationResult.duplicatesFound
      session.results.flightsExtracted = deduplicationResult.uniqueFlights.length

      this.saveCheckpoint(session, checkpoint)
      this.notifyProgress(session)

    } catch (error) {
      // Deduplication failure shouldn't stop the import
      console.warn('Deduplication failed, proceeding with original flights:', error)
      checkpoint.metadata.deduplicationResult = {
        uniqueFlights: parsedFlights,
        duplicatesFound: 0,
        mergedCount: 0,
        processingTime: 0,
        duplicateGroups: []
      }
    }
  }

  private async savePhase(session: ImportSession): Promise<void> {
    const checkpoint = this.createCheckpoint(session, 'save')
    const deduplicationResult = checkpoint.metadata.deduplicationResult
    const flights = deduplicationResult?.uniqueFlights || []

    session.results.flights = flights
    session.results.totalEmailsProcessed = checkpoint.progress.processedEmails
    session.results.flightsExtracted = flights.length

    // Here you would typically save to your database
    // For now, we'll just mark as completed
    checkpoint.phase = 'completed'
    this.saveCheckpoint(session, checkpoint)
    this.notifyProgress(session)
  }

  private createCheckpoint(session: ImportSession, phase: ImportCheckpoint['phase']): ImportCheckpoint {
    const lastCheckpoint = session.checkpoints[session.checkpoints.length - 1]
    
    return {
      id: `${session.id}_${Date.now()}`,
      sessionId: session.id,
      timestamp: new Date(),
      phase,
      progress: lastCheckpoint ? { ...lastCheckpoint.progress } : {
        totalEmails: 0,
        processedEmails: 0,
        successfullyParsed: 0,
        duplicatesFound: 0,
        errors: 0
      },
      searchQuery: session.searchOptions.query,
      batchNumber: lastCheckpoint ? lastCheckpoint.batchNumber : 0,
      metadata: lastCheckpoint ? { ...lastCheckpoint.metadata } : {}
    }
  }

  private saveCheckpoint(session: ImportSession, checkpoint: ImportCheckpoint): void {
    if (!session.config.enableCheckpoints) return

    session.checkpoints.push(checkpoint)
    
    // Store checkpoint for recovery
    const sessionCheckpoints = this.checkpointStorage.get(session.id) || []
    sessionCheckpoints.push(checkpoint)
    this.checkpointStorage.set(session.id, sessionCheckpoints)

    // Keep only last 10 checkpoints per session
    if (sessionCheckpoints.length > 10) {
      this.checkpointStorage.set(session.id, sessionCheckpoints.slice(-10))
    }
  }

  private notifyProgress(session: ImportSession): void {
    if (!session.config.progressCallback) return

    const checkpoint = session.checkpoints[session.checkpoints.length - 1]
    if (!checkpoint) return

    const progress: ImportProgress = {
      sessionId: session.id,
      phase: checkpoint.phase,
      totalEmails: checkpoint.progress.totalEmails,
      processedEmails: checkpoint.progress.processedEmails,
      successfullyParsed: checkpoint.progress.successfullyParsed,
      duplicatesFound: checkpoint.progress.duplicatesFound,
      errors: checkpoint.progress.errors,
      currentBatch: checkpoint.batchNumber,
      processingRate: this.calculateProcessingRate(session),
      estimatedTimeRemaining: this.estimateTimeRemaining(session)
    }

    try {
      session.config.progressCallback(progress)
    } catch (error) {
      console.warn('Progress callback failed:', error)
    }
  }

  private calculateProcessingRate(session: ImportSession): number {
    const checkpoint = session.checkpoints[session.checkpoints.length - 1]
    if (!checkpoint || checkpoint.progress.processedEmails === 0) return 0

    const elapsedTime = (Date.now() - session.startTime.getTime()) / 1000
    return checkpoint.progress.processedEmails / elapsedTime
  }

  private estimateTimeRemaining(session: ImportSession): number | undefined {
    const checkpoint = session.checkpoints[session.checkpoints.length - 1]
    if (!checkpoint) return undefined

    const processingRate = this.calculateProcessingRate(session)
    if (processingRate === 0) return undefined

    const remainingEmails = checkpoint.progress.totalEmails - checkpoint.progress.processedEmails
    return remainingEmails / processingRate
  }

  private generateSessionId(): string {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public methods for monitoring and management

  getSession(sessionId: string): ImportSession | undefined {
    return this.activeSessions.get(sessionId)
  }

  getAllSessions(): ImportSession[] {
    return Array.from(this.activeSessions.values())
  }

  getSessionProgress(sessionId: string): ImportProgress | undefined {
    const session = this.activeSessions.get(sessionId)
    if (!session) return undefined

    const checkpoint = session.checkpoints[session.checkpoints.length - 1]
    if (!checkpoint) return undefined

    return {
      sessionId: session.id,
      phase: checkpoint.phase,
      totalEmails: checkpoint.progress.totalEmails,
      processedEmails: checkpoint.progress.processedEmails,
      successfullyParsed: checkpoint.progress.successfullyParsed,
      duplicatesFound: checkpoint.progress.duplicatesFound,
      errors: checkpoint.progress.errors,
      currentBatch: checkpoint.batchNumber,
      processingRate: this.calculateProcessingRate(session),
      estimatedTimeRemaining: this.estimateTimeRemaining(session)
    }
  }

  getCheckpoints(sessionId: string): ImportCheckpoint[] {
    return this.checkpointStorage.get(sessionId) || []
  }

  cleanupSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId)
    if (!session || session.status === 'running') return false

    this.activeSessions.delete(sessionId)
    this.checkpointStorage.delete(sessionId)
    return true
  }

  // Health check for the importer
  async healthCheck(): Promise<{
    healthy: boolean
    activeSessions: number
    completedSessions: number
    failedSessions: number
    averageProcessingRate: number
  }> {
    const sessions = Array.from(this.activeSessions.values())
    const activeSessions = sessions.filter(s => s.status === 'running').length
    const completedSessions = sessions.filter(s => s.status === 'completed').length
    const failedSessions = sessions.filter(s => s.status === 'failed').length

    const processingRates = sessions
      .filter(s => s.status === 'completed')
      .map(s => this.calculateProcessingRate(s))
      .filter(rate => rate > 0)

    const averageProcessingRate = processingRates.length > 0
      ? processingRates.reduce((sum, rate) => sum + rate, 0) / processingRates.length
      : 0

    return {
      healthy: failedSessions / Math.max(sessions.length, 1) < 0.5, // Less than 50% failure rate
      activeSessions,
      completedSessions,
      failedSessions,
      averageProcessingRate
    }
  }
}
