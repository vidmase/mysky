import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET session status and details
export async function GET(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { sessionId } = params

    // Query session from database
    const { data: session, error } = await supabase
      .from('gmail_import_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      phase: session.current_phase,
      totalEmails: session.total_emails,
      processedEmails: session.processed_emails,
      successfullyParsed: session.successfully_parsed,
      duplicatesFound: session.duplicates_found,
      errors: session.errors,
      startTime: session.created_at,
      lastUpdate: session.updated_at,
      estimatedTimeRemaining: session.estimated_time_remaining,
      processingRate: session.processing_rate,
      errorDetails: session.error_details || []
    })

  } catch (e: any) {
    console.error('Session status error:', e)
    return NextResponse.json({
      error: 'server_error',
      message: e?.message || 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE session (cancel)
export async function DELETE(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { sessionId } = params

    // Update session status to cancelled
    const { error } = await supabase
      .from('gmail_import_sessions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: 'cancel_failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Session cancelled successfully'
    })

  } catch (e: any) {
    console.error('Session cancel error:', e)
    return NextResponse.json({
      error: 'server_error',
      message: e?.message || 'Unknown error'
    }, { status: 500 })
  }
}
