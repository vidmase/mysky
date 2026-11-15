import { NextResponse } from 'next/server'
import { resolveSupabaseUserId } from '@/lib/supabase-server'
import { commitFlights } from '@/lib/email-flights/gmail-scan'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Saves the flights the user confirmed from a scan, exactly as they were shown. */
export async function POST(req: Request) {
  const ownerId = await resolveSupabaseUserId()
  if (!ownerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const tokens = Array.isArray(body?.tokens) ? body.tokens.filter((t: unknown) => typeof t === 'string').slice(0, 200) : []
  if (!tokens.length) return NextResponse.json({ error: 'nothing selected' }, { status: 400 })
  try {
    return NextResponse.json(await commitFlights(ownerId, tokens))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'could not save' }, { status: 500 })
  }
}
