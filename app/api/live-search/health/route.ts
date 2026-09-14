import { NextResponse } from 'next/server'

import {
  describeUpstreamFailure,
  flightsApiBase,
  isEphemeralTunnel,
  upstreamHeaders,
} from '@/lib/live-search-upstream'

export const dynamic = 'force-dynamic'

export async function GET() {
  const base = flightsApiBase()

  try {
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
          message: describeUpstreamFailure(err, base),
          // This endpoint exists to be read when something is wrong, so it says
          // what it tried to reach. The host is deployment config, not a secret.
          upstream: base,
          ephemeralTunnel: isEphemeralTunnel(base),
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
      { ok: upstream.ok, upstream: base, message: text.slice(0, 500) },
      { status: upstream.status }
    )
  } catch (error) {
    console.error('Error in GET /api/live-search/health:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        upstream: base,
      },
      { status: 500 }
    )
  }
}
