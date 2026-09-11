import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getFlightsApiBase(): string {
  const raw = process.env.FLIGHTS_API_URL?.trim() || 'http://72.62.212.33:8000'
  return raw.replace(/\/+$/, '')
}

function upstreamHeaders(base: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  // Ephemeral tunnels used for smoke tests only — do not use in production.
  if (base.includes('loca.lt') || base.includes('cloudflare') || base.includes('trycloudflare')) {
    headers['bypass-tunnel-reminder'] = 'true'
    headers['User-Agent'] = 'Mozilla/5.0'
  }
  return headers
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
      })
    } catch (err) {
      console.error('live-search upstream fetch failed:', err)
      return NextResponse.json(
        {
          error: 'Live search service unavailable',
          message: err instanceof Error ? err.message : 'Failed to reach flights search API',
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
      {
        error: 'Unexpected response from live search service',
        message: text.slice(0, 500),
      },
      { status: upstream.ok ? 200 : upstream.status || 502 }
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
