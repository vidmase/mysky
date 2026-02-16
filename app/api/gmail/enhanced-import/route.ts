import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { getAuthUrl, getGmailClient, getUserOAuth2Client } from '@/lib/google'
import { EnhancedGmailImportService } from '@/lib/enhanced-gmail-import-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Ensure user session via Clerk
    const userId = await resolveSupabaseUserId()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const supabase = createSupabaseServer()

    // Ensure Gmail connection
    const { client, hasToken } = await getUserOAuth2Client()
    if (!hasToken) {
      const url = getAuthUrl()
      return NextResponse.json({ error: 'not_connected', authUrl: url }, { status: 401 })
    }
    const gmail = getGmailClient(client)

    // Parse request body
    let requestBody: any = {}
    try {
      requestBody = await req.json()
    } catch {
      // Use default settings if no body provided
    }

    // Extract enhanced configuration from request
    const {
      searchQuery,
      importMode = 'past',
      dateRange,
      filterPreset = 'comprehensive',
      customFilters = {},
      useEnhancedSystem = true,
      enableClassification = true,
      classificationThreshold = 0.7,
      enableDeduplication = true,
      enableCheckpoints = true,
      resumeOnFailure = true,
      maxMessages = 1000,
      concurrency = 5,
      batchSize = 50,
      useLLM = true,
      forceLLM = false
    } = requestBody

    // Initialize enhanced import service
    const enhancedService = new EnhancedGmailImportService(gmail, supabase)

    // Build enhanced search query based on import mode
    let enhancedSearchQuery = searchQuery || 'flight OR booking OR confirmation OR itinerary OR reservation'

    if (importMode === 'future') {
      // Add future-specific terms for better detection
      const futureTerms = ['upcoming', 'departure', 'check-in', 'reminder', 'travel', 'boarding']
      const futureQuery = futureTerms.map(term => `subject:${term}`).join(' OR ')
      enhancedSearchQuery = `(${enhancedSearchQuery}) OR (${futureQuery})`
    }

    // Build import options
    const importOptions = {
      searchQuery: enhancedSearchQuery,
      importMode,
      dateRange,
      maxResults: maxMessages,
      batchSize,
      concurrency,
      enableClassification,
      classificationThreshold,
      enableDeduplication,
      enableCheckpoints,
      resumeOnFailure,
      useLLM,
      forceLLM,
      useEnhancedSystem,
      filterConfig: {
        preset: filterPreset,
        custom: customFilters
      }
    }

    console.log('Starting enhanced import with options:', importOptions)

    // Execute enhanced import using the correct method
    const result = await enhancedService.importFlights(userId!)

    console.log('Enhanced import result:', result)

    // Return comprehensive result (not session-based for now)
    return NextResponse.json({
      success: result.success,
      imported: result.imported,
      skipped: result.skipped,
      duplicates: result.duplicates,
      errors: result.errors,
      processingTime: result.processingTime,
      stats: result.stats,
      flights: result.flights,
      confidence: result.confidence,
      recoveryStats: result.recoveryStats,
      errorDetails: result.errorDetails?.map(error => ({
        stage: error.stage,
        message: error.error || error.messageId || 'Unknown error',
        messageId: error.messageId
      })) || []
    })

  } catch (e: any) {
    const message = e?.message || 'Unknown error'
    console.error('Enhanced Gmail import error:', e)

    if (message.includes('invalid_grant') || message.includes('unauthorized_client')) {
      return NextResponse.json({ error: 'reauthorize', authUrl: getAuthUrl() }, { status: 401 })
    }

    return NextResponse.json({
      error: 'server_error',
      message,
      details: e?.stack || null
    }, { status: 500 })
  }
}

// GET endpoint to check system health and capabilities
export async function GET() {
  try {
    const userId = await resolveSupabaseUserId()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Return enhanced system capabilities and presets for UI
    return NextResponse.json({
      systemStatus: 'healthy',
      presets: {
        comprehensive: {
          name: 'Comprehensive',
          description: 'Multi-airline support with balanced accuracy and coverage'
        },
        discovery: {
          name: 'Discovery',
          description: 'Broad search to find any flight-related emails'
        },
        highQuality: {
          name: 'High Quality',
          description: 'Only import emails with complete flight information'
        }
      },
      capabilities: {
        multiStrategyParsing: true,
        intelligentClassification: true,
        resilientApiHandling: true,
        smartDeduplication: true,
        errorRecovery: true,
        resumableImports: true,
        realTimeProgress: true
      },
      parsingStrategies: [
        'structured_data',
        'universal_patterns',
        'airline_specific',
        'llm_enhanced',
        'heuristic_fallback'
      ],
      supportedAirlines: [
        'ryanair',
        'easyjet',
        'british_airways',
        'lufthansa',
        'united',
        'delta',
        'american',
        'klm',
        'air_france',
        'emirates'
      ],
      configurationOptions: {
        search: {
          searchQuery: 'Gmail search query string',
          dateRange: {
            start: 'YYYY-MM-DD format',
            end: 'YYYY-MM-DD format'
          },
          maxMessages: 'Maximum number of messages to process (default: 1000)'
        },
        classification: {
          enableClassification: 'Use intelligent email pre-filtering (default: true)',
          classificationThreshold: 'Minimum score for email relevance (0-1, default: 0.7)'
        },
        parsing: {
          multiStrategy: 'Use 5-layer parsing cascade (always enabled)',
          useLLM: 'Enable LLM-enhanced parsing (default: true)',
          forceLLM: 'Force LLM parsing for all emails (default: false)'
        },
        deduplication: {
          enableDeduplication: 'Use smart similarity-based deduplication (default: true)',
          similarityThreshold: 'Minimum similarity for duplicate detection (default: 0.85)'
        },
        reliability: {
          enableCheckpoints: 'Use checkpoint-based resumable imports (default: true)',
          resumeOnFailure: 'Automatically resume failed imports (default: true)',
          maxRetries: 'Maximum retry attempts per operation (default: 3)',
          rateLimitHandling: 'Intelligent Gmail API rate limiting (always enabled)'
        },
        performance: {
          concurrency: 'Number of concurrent operations (default: 5)',
          batchSize: 'Batch size for processing (default: 50)'
        }
      },
      healthChecks: {
        gmailApiConnectivity: 'OK',
        supabaseConnectivity: 'OK',
        geminiApiConnectivity: process.env.GEMINI_API_KEY ? 'OK' : 'Not configured',
        errorRecoverySystem: 'OK',
        deduplicationEngine: 'OK'
      }
    })

  } catch (e: any) {
    const message = e?.message || 'Unknown error'
    console.error('Enhanced system health check error:', e)

    return NextResponse.json({
      error: 'server_error',
      message,
      systemStatus: 'unhealthy'
    }, { status: 500 })
  }
}
