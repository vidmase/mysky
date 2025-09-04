import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeDelayIndex, fetchAirportWindowFromProvider } from '@/lib/services/delays'

export const dynamic = 'force-dynamic'

function getServerClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url) return { client: null as any, reason: 'Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL' }
  if (serviceKey) return { client: createClient(url, serviceKey, { auth: { persistSession: false } }), reason: null }
  if (anonKey) return { client: createClient(url, anonKey, { auth: { persistSession: false } }), reason: 'Using anon key (no service role key set)' }
  return { client: null as any, reason: 'Missing SUPABASE keys (service and anon)' }
}

export async function GET(req: NextRequest) {
  try {
    const { client: supabase, reason } = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: `Server not configured: ${reason}` }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const iata = (searchParams.get('iata') || 'BRS').toUpperCase()
    const windowStr = searchParams.get('window') || '60m'
    const source = (searchParams.get('source') || '').toLowerCase() as 'market' | 'rapidapi' | 'db' | ''

    const now = new Date()
    const windowMs = (() => {
      if (windowStr.endsWith('m')) return parseInt(windowStr) * 60 * 1000
      if (windowStr.endsWith('h')) return parseInt(windowStr) * 60 * 60 * 1000
      if (windowStr.endsWith('d')) return parseInt(windowStr) * 24 * 60 * 60 * 1000
      if (windowStr.endsWith('mo')) return parseInt(windowStr) * 30 * 24 * 60 * 60 * 1000 // approx months
      return 60 * 60 * 1000
    })()
    const from = new Date(now.getTime() - windowMs)

    // If forced to provider, skip DB and return live
    if (source === 'market' || source === 'rapidapi') {
      const providerSnapshot = await fetchAirportWindowFromProvider(iata, from, now)
      if (!providerSnapshot) {
        return NextResponse.json({ airport: iata, window: windowStr, snapshot: null, source })
      }
      const delay_index = computeDelayIndex(providerSnapshot)
      return NextResponse.json({ airport: iata, window: windowStr, snapshot: { ...providerSnapshot, delay_index }, source })
    }

    const { data, error } = await supabase
      .from('airport_delay_snapshots')
      .select('*')
      .eq('airport_iata', iata)
      .gte('ts', from.toISOString())
      .lte('ts', now.toISOString())
      .order('ts', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      if (source === 'db') {
        return NextResponse.json({ airport: iata, window: windowStr, snapshot: null, source: 'db' })
      }
      // default: fallback to provider
      const providerSnapshot = await fetchAirportWindowFromProvider(iata, from, now)
      if (!providerSnapshot) {
        return NextResponse.json({ airport: iata, window: windowStr, snapshot: null, source: 'none' })
      }
      const delay_index = computeDelayIndex(providerSnapshot)
      // reflect current provider env when falling back
      const provider = (process.env.AERODATABOX_PROVIDER || '').toLowerCase() === 'rapidapi' ? 'rapidapi' : 'api-market'
      return NextResponse.json({ airport: iata, window: windowStr, snapshot: { ...providerSnapshot, delay_index }, source: provider })
    }

    // Aggregate over window
    type Agg = { scheduled_total: number; departing_total: number; arriving_total: number; delayed_15m: number; delayed_30m: number; delayed_60m: number; canceled: number; _depSum: number; _depCnt: number; _arrSum: number; _arrCnt: number }
    const agg = data.reduce((acc: Agg, s: any) => {
      acc.scheduled_total += s.scheduled_total || 0
      acc.departing_total += s.departing_total || 0
      acc.arriving_total += s.arriving_total || 0
      acc.delayed_15m += s.delayed_15m || 0
      acc.delayed_30m += s.delayed_30m || 0
      acc.delayed_60m += s.delayed_60m || 0
      acc.canceled += s.canceled || 0
      if (s.avg_dep_delay_min != null) { acc._depSum += s.avg_dep_delay_min; acc._depCnt += 1 }
      if (s.avg_arr_delay_min != null) { acc._arrSum += s.avg_arr_delay_min; acc._arrCnt += 1 }
      return acc
    }, { scheduled_total: 0, departing_total: 0, arriving_total: 0, delayed_15m: 0, delayed_30m: 0, delayed_60m: 0, canceled: 0, _depSum: 0, _depCnt: 0, _arrSum: 0, _arrCnt: 0 } as Agg)

    const snapshot = {
      airport_iata: iata,
      ts: now.toISOString(),
      scheduled_total: agg.scheduled_total,
      departing_total: agg.departing_total,
      arriving_total: agg.arriving_total,
      delayed_15m: agg.delayed_15m,
      delayed_30m: agg.delayed_30m,
      delayed_60m: agg.delayed_60m,
      canceled: agg.canceled,
      avg_dep_delay_min: agg._depCnt ? Math.round(agg._depSum / agg._depCnt) : null,
      avg_arr_delay_min: agg._arrCnt ? Math.round(agg._arrSum / agg._arrCnt) : null,
      provider_meta: { aggregated_points: data.length }
    }

    const delay_index = computeDelayIndex(snapshot)
    return NextResponse.json({ airport: iata, window: windowStr, snapshot: { ...snapshot, delay_index } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch airport delays' }, { status: 500 })
  }
}
