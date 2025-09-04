import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { sessionId } = params

    // Check if session exists and is running
    const { data: session, error: fetchError } = await supabase
      .from('gmail_import_sessions')
      .select('status')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !session) {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
    }

    if (session.status !== 'running') {
      return NextResponse.json({ 
        error: 'invalid_status', 
        message: `Cannot pause session with status: ${session.status}` 
      }, { status: 400 })
    }

    // Update session status to paused
    const { error } = await supabase
      .from('gmail_import_sessions')
      .update({ 
        status: 'paused',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'pause_failed' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      status: 'paused',
      message: 'Session paused successfully'
    })

  } catch (e: any) {
    console.error('Session pause error:', e)
    return NextResponse.json({ 
      error: 'server_error', 
      message: e?.message || 'Unknown error'
    }, { status: 500 })
  }
}
