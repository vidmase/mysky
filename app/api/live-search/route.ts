import { NextResponse } from 'next/server'

import {
  describeUpstreamFailure,
  flightsApiBase,
  upstreamHeaders,
  warnIfEphemeralInProduction,
} from '@/lib/live-search-upstream'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const base = flightsApiBase()
    warnIfEphemeralInProduction(base)
    const url = `${base}/api/search`

    let upstream: Response
    try {
      upstream = await fetch(url, {
        method: 'POST',
        headers: upstreamHeaders(base, true),
        body: JSON.stringify(body),
        cache: 'no-store',
      })
    } catch (err) {
      // The whole error is logged — `cause` carries the syscall detail that the
      // returned message is built from.
      console.error('live-search upstream fetch failed:', err)
      return NextResponse.json(
        {
          error: 'Live search service unavailable',
          message: describeUpstreamFailure(err, base),
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
