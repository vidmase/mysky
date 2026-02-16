import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { getAuthUrl, getGmailClient, getUserOAuth2Client } from '@/lib/google'
import { EnhancedGmailImportService } from '@/lib/enhanced-gmail-import-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Ensure user session
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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

    // Extract enhanced import options from request
    const {
      startDate,
      endDate,
      importMode = 'past',
      maxMessages = 1000,
      useLLM = true,
      batchSize = 50,
      concurrency = 3
    } = requestBody

    // Initialize enhanced import service
    const importService = new EnhancedGmailImportService(gmail, supabase, {
      importMode,
      dateRange: { start: startDate, end: endDate },
      maxResults: maxMessages,
      useLLM,
      batchSize,
      concurrency,
      useEnhancedSystem: true
    })

    // Execute enhanced import
    const result = await importService.importFlights(userId)

    // Return session ID for tracking progress
    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      message: 'Enhanced import started successfully'
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

// GET endpoint to preview available configuration options
export async function GET() {
  try {
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Return enhanced import configuration options
    return NextResponse.json({
      importModes: {
        past: {
          name: 'Past Flights',
          description: 'Import historical flight bookings and confirmations'
        },
        future: {
          name: 'Future Flights',
          description: 'Import upcoming flight bookings and check-in reminders'
        }
      },
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
        dateRange: {
          startDate: 'YYYY-MM-DD format (optional)',
          endDate: 'YYYY-MM-DD format (optional)'
        },
        processing: {
          maxMessages: 'Maximum number of messages to process (default: 1000)',
          concurrency: 'Number of concurrent operations (default: 3)',
          batchSize: 'Batch size for API calls (default: 50)',
          useLLM: 'Use LLM for enhanced parsing (default: true)'
        },
        features: {
          useEnhancedSystem: 'Use enhanced reliability system (recommended: true)',
          enableClassification: 'Pre-filter emails intelligently (default: true)',
          enableDeduplication: 'Remove duplicate flights (default: true)',
          enableCheckpoints: 'Enable resumable imports (default: true)'
        }
      }
    })

  } catch (e: any) {
    const message = e?.message || 'Unknown error'
    console.error('Enhanced import configuration error:', e)

    return NextResponse.json({
      error: 'server_error',
      message
    }, { status: 500 })
  }
}





