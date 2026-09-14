/**
 * Shared by /api/live-search and /api/live-search/health, which both proxy to
 * the flight-scraping service. The two routes previously carried their own
 * copies of the base URL and header rules; the failure reporting below is the
 * third thing they share, so it lives here rather than in triplicate.
 */

/** Quick tunnels hand out a fresh random hostname per run and die with the process. */
const EPHEMERAL_TUNNEL_HOSTS = ['trycloudflare.com', 'loca.lt', 'ngrok.io', 'ngrok-free.app']

export function flightsApiBase(): string {
  const raw = process.env.FLIGHTS_API_URL?.trim() || 'http://72.62.212.33:8000'
  return raw.replace(/\/+$/, '')
}

export function isEphemeralTunnel(base: string): boolean {
  return EPHEMERAL_TUNNEL_HOSTS.some((host) => base.includes(host))
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

  // The specific case worth naming: an expired quick tunnel. The hostname is
  // generated per run, so once the tunnel stops it stops resolving entirely and
  // no amount of retrying will help — the address has to be changed.
  if (code === 'ENOTFOUND' && isEphemeralTunnel(base)) {
    return (
      `The live search service address no longer resolves (${host}). ` +
      `FLIGHTS_API_URL points at a temporary tunnel, which stops working once ` +
      `that tunnel is closed. Point it at the scraper's current address.`
    )
  }

  if (code === 'ENOTFOUND') return `Could not resolve the live search service host (${host}).`
  if (code === 'ECONNREFUSED') return `The live search service refused the connection (${base}).`
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT') {
    return `The live search service did not answer in time (${base}).`
  }
  if (code) return `Could not reach the live search service (${base}): ${code}.`

  return err instanceof Error ? err.message : `Could not reach the live search service (${base}).`
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
