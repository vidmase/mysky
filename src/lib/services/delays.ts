import 'server-only'
import { DateTime } from 'luxon'

const PROVIDER = (process.env.AERODATABOX_PROVIDER || '').toLowerCase()
const MARKET_BASE = process.env.AERODATABOX_MARKET_BASE || 'https://prod.api.market/api/v1/aedbx/aerodatabox'
// Accept a few possible env names just in case
const MARKET_KEY = process.env.AERODATABOX_MARKET_KEY
  || process.env.API_MARKET_KEY
  || process.env.MARKET_KEY
// RapidAPI support (AeroDataBox via RapidAPI)
const RAPIDAPI_HOST = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.AERODATABOX_RAPIDAPI_KEY

export type AirportDelaySnapshot = {
  airport_iata: string
  ts: string // ISO
  scheduled_total: number
  departing_total: number
  arriving_total: number
  delayed_15m: number
  delayed_30m: number
  delayed_60m: number
  canceled: number
  avg_dep_delay_min: number | null
  avg_arr_delay_min: number | null
  provider_meta?: any
}

export type DelayIndexResult = AirportDelaySnapshot & { delay_index: number }

export function computeDelayIndex(s: AirportDelaySnapshot): number {
  const total = Math.max(1, s.scheduled_total || 0)
  const p15 = (s.delayed_15m || 0) / total
  const p30 = (s.delayed_30m || 0) / total
  const p60 = (s.delayed_60m || 0) / total
  const pcx = (s.canceled || 0) / total
  const idx = 100 * (0.3 * p15 + 0.3 * p30 + 0.2 * p60 + 0.2 * pcx)
  return Math.round(idx)
}

// Fetches and aggregates airport delay stats for a time window [start, end)
export async function fetchAirportWindowFromProvider(iata: string, start: Date, end: Date): Promise<AirportDelaySnapshot | null> {
  const useMarket = PROVIDER === 'market' && !!MARKET_KEY
  const useRapid = PROVIDER === 'rapidapi' && !!RAPIDAPI_KEY
  if (!useMarket && !useRapid) {
    console.warn('Delay provider not configured: set AERODATABOX_PROVIDER=(rapidapi|market) and corresponding key')
    return null
  }

  // NOTE: The exact AeroDataBox endpoints on API Market may vary. This is a conservative placeholder
  // that attempts to query arrivals and departures and aggregate delay/cancel metrics.
  // Adjust paths/params to match your plan/contract.

  const startIso = DateTime.fromJSDate(start).toUTC().toISO()
  const endIso = DateTime.fromJSDate(end).toUTC().toISO()

  async function call(path: string, params: Record<string, string>): Promise<any[] | null> {
    const sp = new URLSearchParams(params as any)

    if (useRapid) {
      const url = `https://${RAPIDAPI_HOST}${path}?${sp.toString()}`
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY as string,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
          'Accept': 'application/json',
        },
        next: { revalidate: 300 }
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.warn('Delay provider (rapidapi) error', res.status, body)
        return null
      }
      const json = await res.json().catch(() => null)
      if (!json) return null
      return Array.isArray(json) ? json : (Array.isArray(json.flights) ? json.flights : [])
    }

    // market
    const url = `${MARKET_BASE}${path}?${sp.toString()}`
    const headerAttempts: Record<string, string>[] = [
      { 'x-api-market-key': MARKET_KEY as string, 'x-magicapi-key': MARKET_KEY as string, 'Accept': 'application/json' },
      { 'x-api-key': MARKET_KEY as string, 'Accept': 'application/json' },
      { 'authorization': `Bearer ${MARKET_KEY}`, 'Accept': 'application/json' },
    ]
    for (const headers of headerAttempts) {
      const res = await fetch(url, { headers, next: { revalidate: 300 } })
      if (res.ok) {
        const json = await res.json().catch(() => null)
        if (!json) return null
        return Array.isArray(json) ? json : (Array.isArray(json.flights) ? json.flights : [])
      }
      const body = await res.text().catch(() => '')
      console.warn('Delay provider (market) error', res.status, body || '(no body)', 'using headers:', Object.keys(headers))
    }
    return null
  }

  // Placeholder endpoints; same path schema used for both providers here
  const deps = await call(`/flights/airports/${encodeURIComponent(iata)}/departures`, {
    from: startIso!,
    to: endIso!,
    withStatus: 'true',
  })
  const arrs = await call(`/flights/airports/${encodeURIComponent(iata)}/arrivals`, {
    from: startIso!,
    to: endIso!,
    withStatus: 'true',
  })

  const all = [...(deps || []), ...(arrs || [])]
  if (!all.length) {
    return {
      airport_iata: iata,
      ts: DateTime.fromJSDate(end).toUTC().toISO()!,
      scheduled_total: 0,
      departing_total: deps?.length || 0,
      arriving_total: arrs?.length || 0,
      delayed_15m: 0,
      delayed_30m: 0,
      delayed_60m: 0,
      canceled: 0,
      avg_dep_delay_min: null,
      avg_arr_delay_min: null,
      provider_meta: { note: 'empty' }
    }
  }

  let scheduled = 0
  let delayed15 = 0
  let delayed30 = 0
  let delayed60 = 0
  let canceled = 0
  let depDelaySum = 0
  let depDelayCnt = 0
  let arrDelaySum = 0
  let arrDelayCnt = 0

  const getDelayMin = (sched?: string | null, actual?: string | null): number | null => {
    if (!sched || !actual) return null
    try {
      const s = DateTime.fromISO(sched)
      const a = DateTime.fromISO(actual)
      if (!s.isValid || !a.isValid) return null
      return Math.round(a.diff(s, 'minutes').minutes)
    } catch { return null }
  }

  for (const f of all) {
    scheduled += 1
    const status = (f?.status || f?.flightStatus || '').toLowerCase()
    if (status.includes('cancel')) canceled += 1

    const depSched = f?.departure?.scheduledTimeLocal || f?.departure?.scheduledTime
    const depActual = f?.departure?.actualTimeLocal || f?.departure?.actualTime
    const arrSched = f?.arrival?.scheduledTimeLocal || f?.arrival?.scheduledTime
    const arrActual = f?.arrival?.actualTimeLocal || f?.arrival?.actualTime

    const depDelay = getDelayMin(depSched, depActual)
    const arrDelay = getDelayMin(arrSched, arrActual)

    const delayForBucket = Math.max(depDelay ?? 0, arrDelay ?? 0)
    if (delayForBucket >= 15) delayed15 += 1
    if (delayForBucket >= 30) delayed30 += 1
    if (delayForBucket >= 60) delayed60 += 1

    if (depDelay != null) { depDelaySum += depDelay; depDelayCnt += 1 }
    if (arrDelay != null) { arrDelaySum += arrDelay; arrDelayCnt += 1 }
  }

  return {
    airport_iata: iata,
    ts: DateTime.fromJSDate(end).toUTC().toISO()!,
    scheduled_total: scheduled,
    departing_total: deps?.length || 0,
    arriving_total: arrs?.length || 0,
    delayed_15m: delayed15,
    delayed_30m: delayed30,
    delayed_60m: delayed60,
    canceled,
    avg_dep_delay_min: depDelayCnt ? Math.round(depDelaySum / depDelayCnt) : null,
    avg_arr_delay_min: arrDelayCnt ? Math.round(arrDelaySum / arrDelayCnt) : null,
    provider_meta: { source: 'api-market' }
  }
}
