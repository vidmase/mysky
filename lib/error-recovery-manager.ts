export interface ErrorContext {
  operation: string
  messageId?: string
  emailContent?: string
  originalError: any
  attemptNumber: number
  timestamp: Date
  metadata?: Record<string, any>
}

export interface RecoveryStrategy {
  name: string
  canHandle: (error: ErrorContext) => boolean
  recover: (error: ErrorContext) => Promise<RecoveryResult>
  priority: number
}

export interface RecoveryResult {
  success: boolean
  data?: any
  fallbackUsed?: string
  nextStrategy?: string
  shouldRetry?: boolean
  retryDelay?: number
  error?: string
}

export interface RecoveryConfig {
  maxRetries: number
  baseRetryDelay: number
  maxRetryDelay: number
  backoffMultiplier: number
  enableFallbacks: boolean
  logErrors: boolean
  strategies: RecoveryStrategy[]
}

export interface RecoveryStats {
  totalErrors: number
  recoveredErrors: number
  failedRecoveries: number
  strategiesUsed: Record<string, number>
  averageRecoveryTime: number
  mostCommonErrors: Array<{ error: string; count: number }>
}

export class ErrorRecoveryManager {
  private config: RecoveryConfig
  private stats: RecoveryStats
  private errorLog: ErrorContext[] = []

  constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseRetryDelay: 1000,
      maxRetryDelay: 30000,
      backoffMultiplier: 2,
      enableFallbacks: true,
      logErrors: true,
      strategies: [],
      ...config
    }

    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      failedRecoveries: 0,
      strategiesUsed: {},
      averageRecoveryTime: 0,
      mostCommonErrors: []
    }

    // Initialize default recovery strategies
    this.initializeDefaultStrategies()
  }

  private initializeDefaultStrategies(): void {
    this.config.strategies = [
      // Rate limit recovery
      {
        name: 'RateLimitRecovery',
        priority: 1,
        canHandle: (error) => this.isRateLimitError(error.originalError),
        recover: async (error) => this.handleRateLimit(error)
      },

      // Network/connectivity recovery
      {
        name: 'NetworkRecovery',
        priority: 2,
        canHandle: (error) => this.isNetworkError(error.originalError),
        recover: async (error) => this.handleNetworkError(error)
      },

      // Authentication recovery
      {
        name: 'AuthRecovery',
        priority: 3,
        canHandle: (error) => this.isAuthError(error.originalError),
        recover: async (error) => this.handleAuthError(error)
      },

      // Parsing fallback recovery
      {
        name: 'ParsingFallback',
        priority: 4,
        canHandle: (error) => error.operation.includes('parse') && error.emailContent,
        recover: async (error) => this.handleParsingFallback(error)
      },

      // Gmail API quota recovery
      {
        name: 'QuotaRecovery',
        priority: 5,
        canHandle: (error) => this.isQuotaError(error.originalError),
        recover: async (error) => this.handleQuotaError(error)
      },

      // Generic retry recovery
      {
        name: 'GenericRetry',
        priority: 10,
        canHandle: (error) => error.attemptNumber < this.config.maxRetries,
        recover: async (error) => this.handleGenericRetry(error)
      }
    ]

    // Sort strategies by priority
    this.config.strategies.sort((a, b) => a.priority - b.priority)
  }

  async handleError(
    operation: string,
    originalError: any,
    context: Partial<ErrorContext> = {}
  ): Promise<RecoveryResult> {
    const startTime = Date.now()
    
    const errorContext: ErrorContext = {
      operation,
      originalError,
      attemptNumber: context.attemptNumber || 1,
      timestamp: new Date(),
      messageId: context.messageId,
      emailContent: context.emailContent,
      metadata: context.metadata
    }

    this.stats.totalErrors++
    
    if (this.config.logErrors) {
      this.logError(errorContext)
    }

    // Try recovery strategies in priority order
    for (const strategy of this.config.strategies) {
      if (strategy.canHandle(errorContext)) {
        try {
          const result = await strategy.recover(errorContext)
          
          if (result.success) {
            this.stats.recoveredErrors++
            this.updateStrategyStats(strategy.name)
            this.updateAverageRecoveryTime(Date.now() - startTime)
            return result
          }

          // If strategy suggests retry with different approach
          if (result.nextStrategy) {
            const nextStrategy = this.config.strategies.find(s => s.name === result.nextStrategy)
            if (nextStrategy) {
              const nextResult = await nextStrategy.recover(errorContext)
              if (nextResult.success) {
                this.stats.recoveredErrors++
                this.updateStrategyStats(nextStrategy.name)
                this.updateAverageRecoveryTime(Date.now() - startTime)
                return nextResult
              }
            }
          }

        } catch (strategyError) {
          console.warn(`Recovery strategy ${strategy.name} failed:`, strategyError)
          continue
        }
      }
    }

    // All recovery strategies failed
    this.stats.failedRecoveries++
    return {
      success: false,
      error: `All recovery strategies failed for ${operation}: ${this.getErrorMessage(originalError)}`
    }
  }

  private async handleRateLimit(error: ErrorContext): Promise<RecoveryResult> {
    const retryAfter = this.extractRetryAfter(error.originalError)
    const delay = Math.min(retryAfter || 60000, this.config.maxRetryDelay)

    return {
      success: false,
      shouldRetry: true,
      retryDelay: delay,
      fallbackUsed: 'RateLimitWait'
    }
  }

  private async handleNetworkError(error: ErrorContext): Promise<RecoveryResult> {
    // Exponential backoff for network errors
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(this.config.backoffMultiplier, error.attemptNumber - 1),
      this.config.maxRetryDelay
    )

    // Check if we should try a different approach
    if (error.attemptNumber >= 2) {
      return {
        success: false,
        shouldRetry: true,
        retryDelay: delay,
        nextStrategy: 'ParsingFallback' // Try offline parsing if network fails
      }
    }

    return {
      success: false,
      shouldRetry: true,
      retryDelay: delay,
      fallbackUsed: 'NetworkRetry'
    }
  }

  private async handleAuthError(error: ErrorContext): Promise<RecoveryResult> {
    // Auth errors typically require user intervention
    // But we can try to refresh tokens if available
    
    return {
      success: false,
      error: 'Authentication failed. Please re-authenticate with Gmail.',
      fallbackUsed: 'AuthRefresh'
    }
  }

  private async handleParsingFallback(error: ErrorContext): Promise<RecoveryResult> {
    if (!error.emailContent) {
      return { success: false, error: 'No email content available for fallback parsing' }
    }

    try {
      // Try simple regex-based extraction as fallback
      const fallbackData = this.extractBasicFlightInfo(error.emailContent)
      
      if (fallbackData && Object.keys(fallbackData).length > 0) {
        return {
          success: true,
          data: {
            ...fallbackData,
            confidence: 0.3, // Low confidence for fallback parsing
            source: 'fallback_parser'
          },
          fallbackUsed: 'BasicRegexParser'
        }
      }

      // Try heuristic extraction
      const heuristicData = this.extractHeuristicFlightInfo(error.emailContent)
      
      if (heuristicData && Object.keys(heuristicData).length > 0) {
        return {
          success: true,
          data: {
            ...heuristicData,
            confidence: 0.2, // Very low confidence for heuristic parsing
            source: 'heuristic_parser'
          },
          fallbackUsed: 'HeuristicParser'
        }
      }

      return { success: false, error: 'Fallback parsing failed to extract any data' }

    } catch (fallbackError) {
      return { 
        success: false, 
        error: `Fallback parsing failed: ${this.getErrorMessage(fallbackError)}` 
      }
    }
  }

  private async handleQuotaError(error: ErrorContext): Promise<RecoveryResult> {
    // Quota errors require longer delays
    const delay = Math.min(300000, this.config.maxRetryDelay) // 5 minutes minimum

    return {
      success: false,
      shouldRetry: true,
      retryDelay: delay,
      fallbackUsed: 'QuotaWait'
    }
  }

  private async handleGenericRetry(error: ErrorContext): Promise<RecoveryResult> {
    if (error.attemptNumber >= this.config.maxRetries) {
      return { success: false, error: 'Maximum retry attempts exceeded' }
    }

    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(this.config.backoffMultiplier, error.attemptNumber - 1),
      this.config.maxRetryDelay
    )

    return {
      success: false,
      shouldRetry: true,
      retryDelay: delay,
      fallbackUsed: 'GenericRetry'
    }
  }

  private extractBasicFlightInfo(content: string): any {
    const flightInfo: any = {}

    // Extract confirmation number
    const confirmationPatterns = [
      /confirmation[:\s]+([A-Z0-9]{6,})/i,
      /booking[:\s]+([A-Z0-9]{6,})/i,
      /reference[:\s]+([A-Z0-9]{6,})/i
    ]

    for (const pattern of confirmationPatterns) {
      const match = content.match(pattern)
      if (match) {
        flightInfo.confirmationNumber = match[1]
        break
      }
    }

    // Extract flight number
    const flightPattern = /([A-Z]{2,3})\s*(\d{1,4})/g
    const flightMatch = content.match(flightPattern)
    if (flightMatch && flightMatch[0]) {
      flightInfo.flightNumber = flightMatch[0].replace(/\s/g, '')
    }

    // Extract airports (3-letter codes)
    const airportPattern = /\b([A-Z]{3})\b/g
    const airports = content.match(airportPattern) || []
    if (airports.length >= 2) {
      flightInfo.departure = { airport: airports[0] }
      flightInfo.arrival = { airport: airports[1] }
    }

    // Extract dates
    const datePatterns = [
      /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
      /\d{4}-\d{2}-\d{2}/g,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi
    ]

    for (const pattern of datePatterns) {
      const dates = content.match(pattern)
      if (dates && dates[0]) {
        if (!flightInfo.departure) flightInfo.departure = {}
        flightInfo.departure.date = dates[0]
        break
      }
    }

    return flightInfo
  }

  private extractHeuristicFlightInfo(content: string): any {
    const flightInfo: any = {}

    // Look for airline names and try to extract flight numbers nearby
    const airlines = [
      'ryanair', 'easyjet', 'british airways', 'lufthansa', 'klm', 'air france',
      'emirates', 'qatar', 'turkish airlines', 'american airlines', 'delta',
      'united', 'southwest', 'jetblue', 'alaska'
    ]

    const lowerContent = content.toLowerCase()
    
    for (const airline of airlines) {
      if (lowerContent.includes(airline)) {
        flightInfo.airline = airline
        
        // Look for flight numbers near the airline name
        const airlineIndex = lowerContent.indexOf(airline)
        const nearbyText = content.substring(
          Math.max(0, airlineIndex - 100),
          Math.min(content.length, airlineIndex + 200)
        )
        
        const flightMatch = nearbyText.match(/([A-Z]{2,3})\s*(\d{1,4})/i)
        if (flightMatch) {
          flightInfo.flightNumber = flightMatch[0].replace(/\s/g, '')
        }
        break
      }
    }

    // Extract any email addresses (passenger info)
    const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
    if (emailMatch && emailMatch[0]) {
      flightInfo.passenger = { email: emailMatch[0] }
    }

    return flightInfo
  }

  private isRateLimitError(error: any): boolean {
    const errorCode = error?.code || error?.response?.status
    const errorMessage = this.getErrorMessage(error).toLowerCase()
    
    return errorCode === 429 || 
           errorMessage.includes('rate limit') ||
           errorMessage.includes('too many requests')
  }

  private isNetworkError(error: any): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase()
    const networkErrors = [
      'network error', 'connection refused', 'timeout', 'enotfound',
      'econnreset', 'econnrefused', 'socket hang up'
    ]
    
    return networkErrors.some(err => errorMessage.includes(err))
  }

  private isAuthError(error: any): boolean {
    const errorCode = error?.code || error?.response?.status
    const errorMessage = this.getErrorMessage(error).toLowerCase()
    
    return errorCode === 401 || 
           errorCode === 403 ||
           errorMessage.includes('unauthorized') ||
           errorMessage.includes('invalid credentials') ||
           errorMessage.includes('token expired')
  }

  private isQuotaError(error: any): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase()
    
    return errorMessage.includes('quota exceeded') ||
           errorMessage.includes('daily limit exceeded') ||
           errorMessage.includes('usage limit exceeded')
  }

  private extractRetryAfter(error: any): number | null {
    const retryAfter = error?.response?.headers?.['retry-after']
    if (retryAfter) {
      const seconds = parseInt(retryAfter)
      return isNaN(seconds) ? null : seconds * 1000
    }
    return null
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.response?.data?.error?.message) return error.response.data.error.message
    if (error?.response?.statusText) return error.response.statusText
    return 'Unknown error'
  }

  private logError(error: ErrorContext): void {
    this.errorLog.push(error)
    
    // Keep only last 1000 errors to prevent memory issues
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000)
    }
    
    console.error(`Error in ${error.operation} (attempt ${error.attemptNumber}):`, {
      error: this.getErrorMessage(error.originalError),
      messageId: error.messageId,
      timestamp: error.timestamp
    })
  }

  private updateStrategyStats(strategyName: string): void {
    this.stats.strategiesUsed[strategyName] = (this.stats.strategiesUsed[strategyName] || 0) + 1
  }

  private updateAverageRecoveryTime(recoveryTime: number): void {
    const totalRecoveries = this.stats.recoveredErrors
    this.stats.averageRecoveryTime = 
      ((this.stats.averageRecoveryTime * (totalRecoveries - 1)) + recoveryTime) / totalRecoveries
  }

  // Public methods for monitoring and configuration
  
  getStats(): RecoveryStats {
    // Update most common errors
    const errorCounts = new Map<string, number>()
    
    for (const error of this.errorLog) {
      const errorMsg = this.getErrorMessage(error.originalError)
      errorCounts.set(errorMsg, (errorCounts.get(errorMsg) || 0) + 1)
    }
    
    this.stats.mostCommonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return { ...this.stats }
  }

  addCustomStrategy(strategy: RecoveryStrategy): void {
    this.config.strategies.push(strategy)
    this.config.strategies.sort((a, b) => a.priority - b.priority)
  }

  removeStrategy(strategyName: string): void {
    this.config.strategies = this.config.strategies.filter(s => s.name !== strategyName)
  }

  clearErrorLog(): void {
    this.errorLog = []
  }

  getRecentErrors(limit = 50): ErrorContext[] {
    return this.errorLog.slice(-limit)
  }

  // Health check for recovery system
  async healthCheck(): Promise<{
    healthy: boolean
    strategiesLoaded: number
    recentErrorRate: number
    recoveryRate: number
  }> {
    const recentErrors = this.errorLog.filter(
      e => Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    )
    
    const recentErrorRate = recentErrors.length / 5 // Errors per minute
    const recoveryRate = this.stats.totalErrors > 0 
      ? (this.stats.recoveredErrors / this.stats.totalErrors) * 100 
      : 100
    
    return {
      healthy: this.config.strategies.length > 0 && recoveryRate > 50,
      strategiesLoaded: this.config.strategies.length,
      recentErrorRate,
      recoveryRate
    }
  }
}
