import 'server-only'

// AeroDataBox via RapidAPI
// Docs examples: GET /flights/number/KL682/2025-02-02?dateLocalRole=Departure

const RAPIDAPI_HOST = process.env.AERODATABOX_RAPIDAPI_HOST || 'aerodatabox.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.AERODATABOX_RAPIDAPI_KEY
// API Market (API.market) provider
const PROVIDER = (process.env.AERODATABOX_PROVIDER || '').toLowerCase() as 'market'|'rapidapi'|''
const MARKET_BASE = process.env.AERODATABOX_MARKET_BASE || 'https://prod.api.market/api/v1/aedbx/aerodatabox'
const MARKET_KEY = process.env.AERODATABOX_MARKET_KEY


export type FlightStatusRecord = {
  number?: string
  airline?: string
  status?: string // "Scheduled", "Delayed", "On Time", "Cancelled", etc.
  departure?: {
    airport?: { iata?: string; name?: string }
    scheduledTimeLocal?: string | null
    actualTimeLocal?: string | null
    estimatedTimeLocal?: string | null
    scheduledTimeUtc?: string | null
    actualTimeUtc?: string | null
    estimatedTimeUtc?: string | null
    delayMinutes?: number | null
  }
  arrival?: {
    airport?: { iata?: string; name?: string }
    scheduledTimeLocal?: string | null
    actualTimeLocal?: string | null
    estimatedTimeLocal?: string | null
    scheduledTimeUtc?: string | null
    actualTimeUtc?: string | null
    estimatedTimeUtc?: string | null
    delayMinutes?: number | null
  }
}

/**
 * A refusal from the provider — bad key, no subscription, quota exhausted.
 *
 * These are indistinguishable from "this flight has no data" at the call site,
 * because the lookup returns null for both. Callers that render a whole page of
 * results need to tell the two apart, otherwise a provider outage looks exactly
 * like a log with nothing in it. The last refusal is recorded here so a route
 * can report the real reason instead of a screen of "No data".
 */
export type ProviderError = {
  status: number
  message: string
  /** Config or billing problem the operator must fix, vs. a transient limit. */
  kind: 'configuration' | 'rate-limit' | 'upstream'
  at: number
}

function providerErrorSlot(): { current: ProviderError | null; openUntil: number } {
  // @ts-ignore persist across module reloads in dev, like the cache above
  if (!globalThis.__flightStatusError) globalThis.__flightStatusError = { current: null, openUntil: 0 }
  // @ts-ignore
  return globalThis.__flightStatusError
}

export function getLastProviderError(): ProviderError | null {
  return providerErrorSlot().current
}

/**
 * True while lookups are being skipped because of an earlier refusal. Callers
 * need this to keep reporting the cause: during a pause no fresh request is
 * made, so the recorded error is older than the current run even though it is
 * still exactly why the page has no data.
 */
export function isProviderPaused(): boolean {
  return providerErrorSlot().openUntil > Date.now()
}

/**
 * How long to stop calling the provider after it refuses us.
 *
 * A bad key or a lapsed subscription fails identically for every flight, so
 * once one request comes back that way there is nothing to learn from the next
 * two hundred — they only burn latency, quota and log space. A rate limit is
 * transient, so it gets a much shorter pause.
 */
const BREAKER_MS: Record<ProviderError['kind'], number> = {
  configuration: 5 * 60 * 1000,
  'rate-limit': 60 * 1000,
  upstream: 30 * 1000,
}

/** Placeholders that reach the provider as a literal key and always 400. */
function looksLikePlaceholder(key: string | undefined): boolean {
  if (!key) return false
  return /^(<.*>|your[-_ ]?key.*|changeme|xxx+|todo)$/i.test(key.trim())
}

function recordProviderError(status: number, body: string) {
  let message = body?.trim() || `Provider returned ${status}`
  try {
    const parsed = JSON.parse(body)
    if (parsed?.message) message = String(parsed.message)
  } catch {
    /* not JSON — keep the raw body */
  }
  const kind: ProviderError['kind'] =
    status === 429 ? 'rate-limit'
      : status === 400 || status === 401 || status === 403 ? 'configuration'
        : 'upstream'
  const slot = providerErrorSlot()
  slot.current = { status, message, kind, at: Date.now() }
  slot.openUntil = Date.now() + BREAKER_MS[kind]
  console.warn(
    `[flight-status] provider refused (${status}): ${message} — pausing lookups for ${Math.round(BREAKER_MS[kind] / 1000)}s`
  )
}

export async function getFlightStatusByNumberAndDate(
  flightNumber: string,
  date: string, // YYYY-MM-DD (local date of departure by default)
  opts?: { dateLocalRole?: 'Departure' | 'Arrival' | 'Both' }
): Promise<FlightStatusRecord[] | null> {
  // Ensure at least one provider is configured
  const useMarket = PROVIDER === 'market' || (!!MARKET_KEY && !RAPIDAPI_KEY)
  if (!useMarket && !RAPIDAPI_KEY) {
    console.warn('AERODATABOX_RAPIDAPI_KEY is not set and provider is not API Market. Flight status lookup disabled.')
    return null
  }
  if (useMarket && !MARKET_KEY) {
    console.warn('AERODATABOX_MARKET_KEY is not set for API Market provider. Flight status lookup disabled.')
    return null
  }
  // A placeholder key would be sent verbatim and rejected on every call. Name
  // the real problem once instead of failing two hundred times over.
  const activeKey = useMarket ? MARKET_KEY : RAPIDAPI_KEY
  const keyVar = useMarket ? 'AERODATABOX_MARKET_KEY' : 'AERODATABOX_RAPIDAPI_KEY'
  if (looksLikePlaceholder(activeKey)) {
    const slot = providerErrorSlot()
    if (!slot.current || slot.current.kind !== 'configuration') {
      console.warn(
        `[flight-status] ${keyVar} is the placeholder "${activeKey}". A shell or ` +
        `Windows environment variable of that name takes precedence over .env.local — ` +
        `clear it and restart the dev server. Lookups are disabled meanwhile.`
      )
      slot.current = {
        status: 0,
        message: `${keyVar} is set to the placeholder "${activeKey}"`,
        kind: 'configuration',
        at: Date.now(),
      }
    }
    // Open the breaker too, so callers batching over many flights stop pacing
    // requests they are never going to make.
    slot.openUntil = Date.now() + BREAKER_MS.configuration
    return null
  }

  // The provider has already refused us recently; every flight would fail the
  // same way, so skip the round trip rather than replay the failure per row.
  const breaker = providerErrorSlot()
  if (breaker.openUntil > Date.now()) return null
  // Normalize flight number (AeroDataBox accepts without spaces more reliably)
  const number = (flightNumber || '').replace(/\s+/g, '')
  const dateKey = date.slice(0,10)
  const role = opts?.dateLocalRole ?? 'Departure'
  const cacheKey = `${number}|${dateKey}|${role}`

  // Simple in-memory cache with TTL and in-flight request dedupe
  // Note: per-serverless-execution lifespan; adequate for dev and short-lived prod instances
  const ttlMs = 5 * 60 * 1000 // 5 minutes
  const cooldownMs = 60 * 1000 // 1 minute on 429
  // @ts-ignore attach to globalThis to persist across module reloads in dev
  if (!globalThis.__flightStatusCache) globalThis.__flightStatusCache = new Map<string, { expires: number; data: FlightStatusRecord[] | null }>()
  // @ts-ignore
  const cache: Map<string, { expires: number; data: FlightStatusRecord[] | null }> = globalThis.__flightStatusCache
  // @ts-ignore
  if (!globalThis.__flightStatusPending) globalThis.__flightStatusPending = new Map<string, Promise<FlightStatusRecord[] | null>>()
  // @ts-ignore
  const pending: Map<string, Promise<FlightStatusRecord[] | null>> = globalThis.__flightStatusPending

  const now = Date.now()
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > now) {
    return cached.data
  }
  const inFlight = pending.get(cacheKey)
  if (inFlight) return inFlight
  const params = new URLSearchParams()
  params.set('dateLocalRole', role)
  params.set('withLocation', 'true')

  const url = useMarket
    ? `${MARKET_BASE}/flights/number/${encodeURIComponent(number)}/${encodeURIComponent(date)}?${params.toString()}`
    : `https://${RAPIDAPI_HOST}/flights/number/${encodeURIComponent(number)}/${encodeURIComponent(date)}?${params.toString()}`

  const promise = (async (): Promise<FlightStatusRecord[] | null> => {
    
    const res = await fetch(url, {
      headers: useMarket
        ? {
            'x-api-market-key': MARKET_KEY as string,
            // Some API Market integrations also accept this alias header
            'x-magicapi-key': MARKET_KEY as string,
            'Accept': 'application/json'
          }
        : {
            'X-RapidAPI-Key': RAPIDAPI_KEY as string,
            'X-RapidAPI-Host': RAPIDAPI_HOST,
            'Accept': 'application/json'
          },
      // Cache a bit on server to avoid rate limits
      next: { revalidate: 300 }
    })

    if (!res.ok) {
      const body = await res.text()
      recordProviderError(res.status, body)
      // Apply short cooldown on 429 to prevent hammering
      if (res.status === 429) {
        cache.set(cacheKey, { expires: now + cooldownMs, data: null })
      }
      return null
    }

    // The provider is answering again; drop the refusal and close the breaker.
    const slot = providerErrorSlot()
    slot.current = null
    slot.openUntil = 0

    const data = await res.json().catch(() => null)
    if (!data) return null

    // API may return array directly or wrapped, normalize conservatively
    const items: any[] = Array.isArray(data) ? data : (Array.isArray(data.flights) ? data.flights : [])

    const mapped = items.map((it: any) => {
      // Helper function to calculate delay in minutes
      const calculateDelay = (scheduled: string | null, actual: string | null): number | null => {
        if (!scheduled || !actual) return null
        try {
          const scheduledTime = new Date(scheduled).getTime()
          const actualTime = new Date(actual).getTime()
          return Math.round((actualTime - scheduledTime) / (1000 * 60)) // minutes
        } catch {
          return null
        }
      }

      const depScheduled = it?.departure?.scheduledTimeLocal ?? it?.departure?.scheduledTime
      const depActual = it?.departure?.actualTimeLocal ?? it?.departure?.actualTime
      const depEstimated = it?.departure?.estimatedTimeLocal ?? it?.departure?.estimatedTime
      
      const arrScheduled = it?.arrival?.scheduledTimeLocal ?? it?.arrival?.scheduledTime
      const arrActual = it?.arrival?.actualTimeLocal ?? it?.arrival?.actualTime
      const arrEstimated = it?.arrival?.estimatedTimeLocal ?? it?.arrival?.estimatedTime

      return {
        number: it?.number || it?.flight?.number,
        airline: it?.airline?.name || it?.airline,
        status: it?.status || it?.flightStatus,
        aircraft: {
          reg: it?.aircraft?.reg || it?.aircraft?.registration || it?.reg || it?.registration,
          registration: it?.aircraft?.registration || it?.aircraft?.reg || it?.registration || it?.reg,
          model: it?.aircraft?.model,
          manufacturer: it?.aircraft?.manufacturer
        },
        departure: {
          airport: {
            iata: it?.departure?.airport?.iata || it?.departure?.airport?.iataCode,
            name: it?.departure?.airport?.name
          },
          scheduledTimeLocal: depScheduled,
          actualTimeLocal: depActual,
          estimatedTimeLocal: depEstimated,
          scheduledTimeUtc: it?.departure?.scheduledTimeUtc ?? null,
          actualTimeUtc: it?.departure?.actualTimeUtc ?? null,
          estimatedTimeUtc: it?.departure?.estimatedTimeUtc ?? null,
          delayMinutes: calculateDelay(depScheduled, depActual || depEstimated),
        },
        arrival: {
          airport: {
            iata: it?.arrival?.airport?.iata || it?.arrival?.airport?.iataCode,
            name: it?.arrival?.airport?.name
          },
          scheduledTimeLocal: arrScheduled,
          actualTimeLocal: arrActual,
          estimatedTimeLocal: arrEstimated,
          scheduledTimeUtc: it?.arrival?.scheduledTimeUtc ?? null,
          actualTimeUtc: it?.arrival?.actualTimeUtc ?? null,
          estimatedTimeUtc: it?.arrival?.estimatedTimeUtc ?? null,
          delayMinutes: calculateDelay(arrScheduled, arrActual || arrEstimated),
        }
      }
    })

    cache.set(cacheKey, { expires: Date.now() + ttlMs, data: mapped })
    return mapped
  })()

  pending.set(cacheKey, promise)
  try {
    const result = await promise
    return result
  } finally {
    pending.delete(cacheKey)
  }
}
