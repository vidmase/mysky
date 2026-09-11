import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Scrapes are slow, especially round trips; allow the proxy to wait for them.
export const maxDuration = 60

const UPSTREAM_TIMEOUT_MS = 45_000

function getFlightsApiBase(): string {
  const raw = process.env.FLIGHTS_API_URL?.trim() || 'https://gfscrape-git-main-vidmases-projects.vercel.app'
  return raw.replace(/\/+$/, '')
}

function upstreamHeaders(base: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (base.includes('loca.lt')) {
    headers['bypass-tunnel-reminder'] = 'true'
    headers['User-Agent'] = 'Mozilla/5.0'
  }
  return headers
}

/**
 * Pull a human-readable reason out of an upstream error body. The chain is
 * mysky -> gfscrape (Next) -> FastAPI backend, and each hop has its own shape:
 * FastAPI uses `detail`, gfscrape forwards non-JSON bodies as a bare string.
 */
function upstreamReason(data: unknown): string | null {
  if (typeof data === 'string') return data.slice(0, 300) || null
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    for (const key of ['detail', 'message', 'error']) {
      const value = obj[key]
      if (typeof value === 'string' && value.trim()) return value.slice(0, 300)
    }
  }
  return null
}

/** True when the response body is a usable search result rather than an error */
function isSearchResult(data: unknown): boolean {
  return Boolean(data && typeof data === 'object' && 'flights' in (data as object))
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const base = getFlightsApiBase()
    const url = `${base}/api/search`

    let upstream: Response
    try {
      upstream = await fetch(url, {
        method: 'POST',
        headers: upstreamHeaders(base),
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      })
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'TimeoutError'
      console.error('live-search upstream fetch failed:', err)
      return NextResponse.json(
        {
          error: 'Live search service unavailable',
          message: timedOut
            ? `The flight scraper did not respond within ${UPSTREAM_TIMEOUT_MS / 1000}s. Try again, or narrow the search.`
            : err instanceof Error
              ? err.message
              : 'Failed to reach flights search API',
          upstream_status: timedOut ? 504 : 502,
        },
        { status: timedOut ? 504 : 502 }
      )
    }

    const raw = await upstream.text()
    let data: unknown = raw
    try {
      data = JSON.parse(raw)
    } catch {
      // keep raw text; the reason extractor handles strings
    }

    if (upstream.ok && isSearchResult(data)) {
      return NextResponse.json(data, { status: 200 })
    }

    // Every hop forwards the status it received, so a 502/503/504 here means the
    // scraper backend behind gfscrape (a local FastAPI service) is not reachable.
    const offline = [502, 503, 504].includes(upstream.status)
    const reason = upstreamReason(data)
    return NextResponse.json(
      {
        error: offline ? 'Flight scraper backend is offline' : 'Live search failed',
        message: offline
          ? `The scraper service behind the live search is not responding (upstream ${upstream.status}).${
              reason ? ` Upstream said: ${reason}` : ''
            }`
          : reason || `Live search failed (upstream ${upstream.status})`,
        upstream_status: upstream.status,
      },
      { status: upstream.status || 502 }
    )
  } catch (error) {
    console.error('Error in POST /api/live-search:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
