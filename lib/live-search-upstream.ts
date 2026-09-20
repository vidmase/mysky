/**
 * Shared by /api/live-search and /api/live-search/health, which both proxy to
 * the flight-scraping service. The two routes previously carried their own
 * copies of the base URL and header rules; the failure reporting below is the
 * third thing they share, so it lives here rather than in triplicate.
 *
 * The upstream is a *list* of candidates, not one address. A single address is a
 * single point of failure, and the one in FLIGHTS_API_URL duly went stale: it
 * pointed at a quick tunnel whose hostname stopped resolving, which took live
 * search down until someone noticed. Candidates are tried in order, whichever
 * answered is remembered and preferred, and one that fails at the network level
 * is benched for a couple of minutes so every request does not pay the same
 * failure over again.
 */

/** Quick tunnels hand out a fresh random hostname per run and die with the process. */
const EPHEMERAL_TUNNEL_HOSTS = ['trycloudflare.com', 'loca.lt', 'ngrok.io', 'ngrok-free.app']

/**
 * Addresses expected to keep answering. Tried last, so a configured upstream
 * always wins while it works — but they hold live search up when the configured
 * one goes away, which is exactly how it broke.
 */
const DURABLE_UPSTREAMS = ['http://72.62.212.33:8000']

/** A network-level failure keeps a candidate out of the running for this long. */
const BENCH_MS = 120_000
/** A candidate that answered is preferred over its peers for this long. */
const PREFER_MS = 600_000
/** Ceiling for one upstream call: scraping is slow, but hanging is worse. */
const DEFAULT_TIMEOUT_MS = 90_000

type Candidate = { base: string; ephemeral: boolean }

export type UpstreamAttempt = {
  base: string
  ephemeral: boolean
  ok: boolean
  /** why this candidate did not answer, when it did not */
  reason?: string
}

const trimBase = (value: string) => value.trim().replace(/\/+$/, '')

export function isEphemeralTunnel(base: string): boolean {
  return EPHEMERAL_TUNNEL_HOSTS.some((host) => base.includes(host))
}

/**
 * Every address worth trying, in preference order: whatever the environment
 * names (FLIGHTS_API_URL, then any comma-separated FLIGHTS_API_URLS), then the
 * durable fallbacks. Duplicates collapse so a value given twice is not called
 * twice.
 */
export function flightsApiCandidates(): Candidate[] {
  const listed = [process.env.FLIGHTS_API_URL, ...(process.env.FLIGHTS_API_URLS ?? '').split(',')]
  const seen = new Set<string>()
  return [...listed, ...DURABLE_UPSTREAMS]
    .map((value) => (value ?? '').trim())
    .filter(Boolean)
    .map(trimBase)
    .filter((base) => !seen.has(base) && seen.add(base))
    .map((base) => ({ base, ephemeral: isEphemeralTunnel(base) }))
}

/** What this server instance has learned about the candidates so far. */
const memory = {
  preferred: null as { base: string; at: number } | null,
  benched: new Map<string, number>(),
}

function ordered(now = Date.now()): Candidate[] {
  const all = flightsApiCandidates()
  const live = all.filter((candidate) => (memory.benched.get(candidate.base) ?? 0) <= now)
  // Everything benched means the bench is the outdated opinion, not the list.
  const pool = live.length > 0 ? live : all
  const preferred = memory.preferred
  if (preferred && now - preferred.at < PREFER_MS) {
    pool.sort((a, b) => (a.base === preferred.base ? -1 : b.base === preferred.base ? 1 : 0))
  }
  return pool
}

function remember(base: string): void {
  memory.preferred = { base, at: Date.now() }
  memory.benched.delete(base)
}

function bench(base: string): void {
  memory.benched.set(base, Date.now() + BENCH_MS)
  if (memory.preferred?.base === base) memory.preferred = null
}

/** The address we would try first right now. */
export function flightsApiBase(): string {
  return ordered()[0].base
}

export class UpstreamUnavailable extends Error {
  readonly attempts: UpstreamAttempt[]

  constructor(attempts: UpstreamAttempt[]) {
    super(attempts.map((a) => `${a.base}: ${a.reason ?? 'no answer'}`).join('; '))
    this.name = 'UpstreamUnavailable'
    this.attempts = attempts
  }
}

export type UpstreamCall = Omit<RequestInit, 'signal' | 'cache'> & {
  /** send a JSON content type (the search route does) */
  json?: boolean
  timeoutMs?: number
}

/**
 * Call `path` on the first candidate that answers, and report what was tried.
 * Throws `UpstreamUnavailable` (carrying every attempt) when none of them do.
 */
export async function fetchUpstream(
  path: string,
  init: UpstreamCall = {}
): Promise<{ response: Response; base: string; attempts: UpstreamAttempt[] }> {
  const {
    json = false,
    timeoutMs = Number(process.env.FLIGHTS_API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    headers,
    ...rest
  } = init
  const attempts: UpstreamAttempt[] = []

  for (const { base, ephemeral } of ordered()) {
    try {
      const response = await fetch(`${base}${path}`, {
        ...rest,
        headers: { ...upstreamHeaders(base, json), ...(headers as Record<string, string> | undefined) },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      })

      // A reachable host that answers *is* the upstream, even when the answer is
      // an error — that is the scraper talking, not a bad address. The exception
      // is a temporary tunnel answering with a gateway error, which is what a
      // closed quick tunnel looks like once something else holds its hostname.
      if (ephemeral && response.status >= 500) {
        attempts.push({ base, ephemeral, ok: false, reason: `HTTP ${response.status} from a temporary tunnel` })
        bench(base)
        continue
      }

      remember(base)
      return { response, base, attempts }
    } catch (err) {
      attempts.push({ base, ephemeral, ok: false, reason: describeUpstreamFailure(err, base) })
      bench(base)
    }
  }

  throw new UpstreamUnavailable(attempts)
}

export function upstreamHeaders(base: string, json = false): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (json) headers['Content-Type'] = 'application/json'

  // Quick tunnels serve an interstitial to anything that looks like a browser.
  if (isEphemeralTunnel(base)) {
    headers['bypass-tunnel-reminder'] = 'true'
    headers['User-Agent'] = 'Mozilla/5.0'
  }
  return headers
}

/**
 * `fetch` rejects with a bare "fetch failed" and hides the real reason one
 * level down in `cause`. Reporting only the top-level message is what made a
 * dead upstream look like an unexplained 502 — so unwrap it and say which host
 * failed and how.
 */
export function describeUpstreamFailure(err: unknown, base: string): string {
  const cause = (err as { cause?: { code?: string; hostname?: string; syscall?: string } })?.cause
  const code = cause?.code
  const host = cause?.hostname || base
  // Node reports "no such host" as ENOTFOUND and a resolver that could not be
  // reached as EAI_AGAIN; from here they are the same answer: the name does not
  // resolve.
  const dnsFailure = code === 'ENOTFOUND' || code === 'EAI_AGAIN'

  // The specific case worth naming: an expired quick tunnel. The hostname is
  // generated per run, so once the tunnel stops it stops resolving entirely and
  // no amount of retrying will help — the address has to be changed.
  if (dnsFailure && isEphemeralTunnel(base)) {
    return `temporary tunnel no longer resolves (${host})`
  }

  if (dnsFailure) return `host does not resolve (${host})`
  if (code === 'ECONNREFUSED') return `connection refused (${base})`
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') return `no answer in time (${base})`
  if ((err as { name?: string })?.name === 'TimeoutError') return `no answer within the timeout (${base})`
  if (code) return `${code} (${base})`

  return err instanceof Error ? err.message : `could not be reached (${base})`
}

/** One paragraph for a drawer: what was tried, and how each attempt ended. */
export function describeAttempts(attempts: UpstreamAttempt[]): string {
  if (attempts.length === 0) {
    return 'No live search service address is configured (set FLIGHTS_API_URL).'
  }
  const lines = attempts.map((a) => `${a.base} — ${a.reason ?? 'no answer'}`).join('; ')
  const tunnel = attempts.some((a) => a.ephemeral)
  return (
    `The live search service could not be reached on any known address (${lines}).` +
    (tunnel
      ? ' The configured address is a temporary tunnel, which stops working once that tunnel is closed.'
      : '')
  )
}

/**
 * A deployment left pointing at a quick tunnel works until the tunnel closes
 * and then fails with no warning, which is exactly what happened. Say so on the
 * way out rather than only once it is already broken.
 */
export function warnIfEphemeralInProduction(base: string): void {
  if (process.env.NODE_ENV === 'production' && isEphemeralTunnel(base)) {
    console.warn(
      `live-search: FLIGHTS_API_URL is a temporary tunnel (${base}). ` +
      `It will stop resolving as soon as the tunnel closes.`
    )
  }
}
