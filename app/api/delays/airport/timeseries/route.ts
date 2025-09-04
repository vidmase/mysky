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

type Bucket = '15m' | '1h' | '1d'

function floorToBucket(date: Date, bucket: Bucket): Date {
  const d = new Date(date)
  if (bucket === '15m') {
    d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0)
  } else if (bucket === '1h') {
    d.setMinutes(0, 0, 0)
  } else {
    d.setUTCHours(0, 0, 0, 0)
  }
  return d
}

export async function GET(req: NextRequest) {
  try {
    const { client: supabase, reason } = getServerClient()
    if (!supabase) {
      return NextResponse.json({ error: `Server not configured: ${reason}` }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const iata = (searchParams.get('iata') || 'BRS').toUpperCase()
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')
    const bucket = (searchParams.get('bucket') as Bucket) || '1h'
    const source = (searchParams.get('source') || '').toLowerCase() as 'market' | 'rapidapi' | 'db' | ''

    const to = toStr ? new Date(toStr) : new Date()
    const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 24 * 60 * 60 * 1000)

    // If forced to provider, skip DB
    if (source === 'market' || source === 'rapidapi') {
      const series: any[] = []
      let cursor = floorToBucket(from, bucket)
      const bucketsToMake: { start: Date; end: Date }[] = []
      while (cursor < to) {
        const start = new Date(cursor)
        const next = new Date(cursor)
        if (bucket === '15m') next.setMinutes(next.getMinutes() + 15)
        else if (bucket === '1h') next.setHours(next.getHours() + 1)
        else next.setDate(next.getDate() + 1)
        const end = next > to ? new Date(to) : next
        bucketsToMake.push({ start, end })
        cursor = next
      }
      if (bucketsToMake.length > 120) {
        return NextResponse.json({ error: `Range too large for live provider (${bucketsToMake.length} buckets). Reduce range or increase bucket size.` }, { status: 400 })
      }
      for (const b of bucketsToMake) {
        const s = await fetchAirportWindowFromProvider(iata, b.start, b.end)
        if (!s) continue
        const delay_index = computeDelayIndex(s as any)
        series.push({ ...s, ts: b.start.toISOString(), delay_index })
      }
      return NextResponse.json({ iata, bucket, series, source })
    }

    const { data, error } = await supabase
      .from('airport_delay_snapshots')
      .select('*')
      .eq('airport_iata', iata)
      .gte('ts', from.toISOString())
      .lte('ts', to.toISOString())
      .order('ts', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      if (source === 'db') {
        return NextResponse.json({ iata, bucket, series: [], source: 'db' })
      }
      // Fallback to provider: build buckets over the requested range and query each
      const bucketsToMake: { start: Date; end: Date }[] = []
      let cursor = floorToBucket(from, bucket)
      while (cursor < to) {
        const start = new Date(cursor)
        const next = new Date(cursor)
        if (bucket === '15m') next.setMinutes(next.getMinutes() + 15)
        else if (bucket === '1h') next.setHours(next.getHours() + 1)
        else next.setDate(next.getDate() + 1)
        const end = next > to ? new Date(to) : next
        bucketsToMake.push({ start, end })
        cursor = next
      }

      if (bucketsToMake.length > 120) {
        return NextResponse.json({ error: `Range too large for live provider fallback (${bucketsToMake.length} buckets). Reduce range or increase bucket size.` }, { status: 400 })
      }

      const series: any[] = []
      for (const b of bucketsToMake) {
        const s = await fetchAirportWindowFromProvider(iata, b.start, b.end)
        if (!s) continue
        const delay_index = computeDelayIndex(s as any)
        series.push({ ...s, ts: b.start.toISOString(), delay_index })
      }
      const provider = (process.env.AERODATABOX_PROVIDER || '').toLowerCase() === 'rapidapi' ? 'rapidapi' : 'api-market'
      return NextResponse.json({ iata, bucket, series, source: provider })
    }

    // Bucket snapshots client-side
    const buckets = new Map<string, any>()

    for (const s of data) {
      const bStart = floorToBucket(new Date(s.ts), bucket)
      const key = bStart.toISOString()
      const agg = buckets.get(key) || {
        airport_iata: iata,
        bucket_start: key,
        scheduled_total: 0,
        departing_total: 0,
        arriving_total: 0,
        delayed_15m: 0,
        delayed_30m: 0,
        delayed_60m: 0,
        canceled: 0,
        _depSum: 0, _depCnt: 0,
        _arrSum: 0, _arrCnt: 0,
      }
      agg.scheduled_total += s.scheduled_total || 0
      agg.departing_total += s.departing_total || 0
      agg.arriving_total += s.arriving_total || 0
      agg.delayed_15m += s.delayed_15m || 0
      agg.delayed_30m += s.delayed_30m || 0
      agg.delayed_60m += s.delayed_60m || 0
      agg.canceled += s.canceled || 0
      if (s.avg_dep_delay_min != null) { agg._depSum += s.avg_dep_delay_min; agg._depCnt += 1 }
      if (s.avg_arr_delay_min != null) { agg._arrSum += s.avg_arr_delay_min; agg._arrCnt += 1 }
      buckets.set(key, agg)
    }

    const series = Array.from(buckets.values())
      .sort((a, b) => a.bucket_start.localeCompare(b.bucket_start))
      .map(agg => {
        const snapshot = {
          airport_iata: iata,
          ts: agg.bucket_start,
          scheduled_total: agg.scheduled_total,
          departing_total: agg.departing_total,
          arriving_total: agg.arriving_total,
          delayed_15m: agg.delayed_15m,
          delayed_30m: agg.delayed_30m,
          delayed_60m: agg.delayed_60m,
          canceled: agg.canceled,
          avg_dep_delay_min: agg._depCnt ? Math.round(agg._depSum / agg._depCnt) : null,
          avg_arr_delay_min: agg._arrCnt ? Math.round(agg._arrSum / agg._arrCnt) : null,
        }
        const delay_index = computeDelayIndex(snapshot as any)
        return { ...snapshot, delay_index }
      })

    return NextResponse.json({ iata, bucket, series })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch timeseries' }, { status: 500 })
  }
}
