import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getFlightsApiBase(): string {
  const raw = process.env.FLIGHTS_API_URL?.trim() || 'http://72.62.212.33:8000'
  return raw.replace(/\/+$/, '')
}

function upstreamHeaders(base: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  // Ephemeral tunnels used for smoke tests only — do not use in production.
  if (base.includes('loca.lt') || base.includes('cloudflare') || base.includes('trycloudflare')) {
    headers['bypass-tunnel-reminder'] = 'true'
    headers['User-Agent'] = 'Mozilla/5.0'
  }
  return headers
}

export async function GET() {
  try {
    const base = getFlightsApiBase()
    const url = `${base}/api/health`

    let upstream: Response
    try {
      upstream = await fetch(url, {
        method: 'GET',
        headers: upstreamHeaders(base),
        cache: 'no-store',
      })
    } catch (err) {
      console.error('live-search health upstream fetch failed:', err)
      return NextResponse.json(
        {
          ok: false,
          error: 'Live search service unavailable',
          message: err instanceof Error ? err.message : 'Failed to reach flights health API',
        },
        { status: 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await upstream.json()
      return NextResponse.json(data, { status: upstream.status })
    }

    const text = await upstream.text()
    return NextResponse.json(
      { ok: upstream.ok, message: text.slice(0, 500) },
      { status: upstream.status }
    )
  } catch (error) {
    console.error('Error in GET /api/live-search/health:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
