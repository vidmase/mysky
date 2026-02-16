import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const userId = await resolveSupabaseUserId()

    if (!userId) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 })
    }

    const supabase = createSupabaseServer()

    const body = await req.json().catch(() => ({}))
    const {
      action,
      metadata = null,
      context = null,
      page = '/flights',
    }: { action?: string; metadata?: any; context?: string | null; page?: string } = body

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    const { error } = await supabase.from('event_logs').insert({
      user_id: userId,
      action,
      metadata,
      context,
      page,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
