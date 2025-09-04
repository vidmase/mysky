import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DateTime } from 'luxon'
import { fetchAirportWindowFromProvider } from '@/src/lib/services/delays'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function roundTo15(dt: DateTime): DateTime {
  const minutes = Math.floor(dt.minute / 15) * 15
  return dt.set({ minute: minutes, second: 0, millisecond: 0 })
}

export async function POST(req: NextRequest) {
  // Simple auth for cron calls
  const secret = process.env.CRON_SECRET
  const provided = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '') || ''
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server not configured (SUPABASE_SERVICE_ROLE_KEY missing)' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const iata = (searchParams.get('iata') || 'BRS').toUpperCase()

  // Define window: previous 15-minute block ending at the last quarter
  const now = DateTime.utc()
  const end = roundTo15(now)
  const start = end.minus({ minutes: 15 })

  try {
    const snapshot = await fetchAirportWindowFromProvider(iata, start.toJSDate(), end.toJSDate())
    if (!snapshot) {
      return NextResponse.json({ error: 'Provider returned no data' }, { status: 502 })
    }

    const { error } = await supabase.from('airport_delay_snapshots').insert({
      airport_iata: snapshot.airport_iata,
      ts: snapshot.ts,
      scheduled_total: snapshot.scheduled_total,
      departing_total: snapshot.departing_total,
      arriving_total: snapshot.arriving_total,
      delayed_15m: snapshot.delayed_15m,
      delayed_30m: snapshot.delayed_30m,
      delayed_60m: snapshot.delayed_60m,
      canceled: snapshot.canceled,
      avg_dep_delay_min: snapshot.avg_dep_delay_min,
      avg_arr_delay_min: snapshot.avg_arr_delay_min,
      provider_meta: snapshot.provider_meta || null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Retention: keep 60 days
    const cutoff = end.minus({ days: 60 }).toISO()!
    await supabase.from('airport_delay_snapshots').delete().lt('ts', cutoff).eq('airport_iata', iata)

    return NextResponse.json({ ok: true, iata, window: { start: start.toISO(), end: end.toISO() } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to ingest airport delay snapshot' }, { status: 500 })
  }
}
