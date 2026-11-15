import { NextResponse } from 'next/server'
import { resolveSupabaseUserId } from '@/lib/supabase-server'
import { scanGmailForFlights } from '@/lib/email-flights/gmail-scan'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/** Finds flights in the user's confirmation emails for departures in [start, end]. Writes nothing. */
export async function POST(req: Request) {
  const ownerId = await resolveSupabaseUserId()
  if (!ownerId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const result = await scanGmailForFlights(ownerId, String(body?.start ?? ''), String(body?.end ?? ''))
  if (!result.ok) {
    const status = result.reason === 'gmail_not_connected' ? 401 : result.reason === 'bad_dates' ? 400 : 502
    return NextResponse.json(result, { status })
  }
  return NextResponse.json(result)
}
