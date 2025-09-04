import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { sessionId } = await params

    // Query session progress from database
    const { data: session, error } = await supabase
      .from('gmail_import_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
    }

    // Calculate processing rate
    const startTime = new Date(session.created_at).getTime()
    const currentTime = Date.now()
    const elapsedSeconds = Math.max((currentTime - startTime) / 1000, 1)
    const processingRate = session.processed_emails / elapsedSeconds

    // Calculate estimated time remaining
    let estimatedTimeRemaining = null
    if (session.total_emails > 0 && session.processed_emails > 0 && processingRate > 0) {
      const remainingEmails = session.total_emails - session.processed_emails
      estimatedTimeRemaining = Math.round(remainingEmails / processingRate)
    }

    // Return real-time progress data
    return NextResponse.json({
      sessionId: session.id,
      phase: session.current_phase || 'search',
      totalEmails: session.total_emails || 0,
      processedEmails: session.processed_emails || 0,
      successfullyParsed: session.successfully_parsed || 0,
      duplicatesFound: session.duplicates_found || 0,
      errors: session.errors || 0,
      currentBatch: session.current_batch || 0,
      estimatedTimeRemaining,
      processingRate: Math.round(processingRate * 10) / 10,
      status: session.status,
      lastUpdate: session.updated_at,
      phaseDetails: {
        search: session.phase_search_complete || false,
        classify: session.phase_classify_complete || false,
        parse: session.phase_parse_complete || false,
        deduplicate: session.phase_deduplicate_complete || false,
        save: session.phase_save_complete || false
      },
      errorDetails: session.error_details || [],
      recoveryStats: session.recovery_stats || null
    })

  } catch (e: any) {
    console.error('Progress polling error:', e)
    return NextResponse.json({ 
      error: 'server_error', 
      message: e?.message || 'Unknown error'
    }, { status: 500 })
  }
}
