import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { sessionId } = params

    // Check if session exists and is paused
    const { data: session, error: fetchError } = await supabase
      .from('gmail_import_sessions')
      .select('status')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
    }

    if (session.status !== 'paused') {
      return NextResponse.json({
        error: 'invalid_status',
        message: `Cannot resume session with status: ${session.status}`
      }, { status: 400 })
    }

    // Update session status to running
    const { error } = await supabase
      .from('gmail_import_sessions')
      .update({
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) {
      return NextResponse.json({ error: 'resume_failed' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      status: 'running',
      message: 'Session resumed successfully'
    })

  } catch (e: any) {
    console.error('Session resume error:', e)
    return NextResponse.json({
      error: 'server_error',
      message: e?.message || 'Unknown error'
    }, { status: 500 })
  }
}
