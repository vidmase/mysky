import { NextResponse } from 'next/server'

import {
  describeAttempts,
  fetchUpstream,
  UpstreamUnavailable,
  warnIfEphemeralInProduction,
  type UpstreamAttempt,
} from '@/lib/live-search-upstream'

export const dynamic = 'force-dynamic'

/** Which upstream answered, and which ones did not have to. */
function tag(response: NextResponse, base: string, attempts: UpstreamAttempt[]): NextResponse {
  response.headers.set('x-live-search-upstream', base)
  if (attempts.length > 0) {
    response.headers.set('x-live-search-failover', attempts.map((a) => a.base).join(' '))
  }
  return response
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    let call: Awaited<ReturnType<typeof fetchUpstream>>
    try {
      call = await fetchUpstream('/api/search', {
        method: 'POST',
        json: true,
        body: JSON.stringify(body),
      })
    } catch (err) {
      if (!(err instanceof UpstreamUnavailable)) throw err
      // Every attempt is logged — each reason carries the syscall detail the
      // message shown in the drawer is built from.
      console.error('live-search upstream fetch failed:', err.message)
      return NextResponse.json(
        {
          error: 'Live search service unavailable',
          message: describeAttempts(err.attempts),
          attempts: err.attempts,
        },
        { status: 502 }
      )
    }

    const { response: upstream, base, attempts } = call
    if (attempts.length > 0) {
      // Worth a line in the logs: the address in the environment is not the one
      // that answered, which is how a stale FLIGHTS_API_URL shows up early.
      console.warn(
        `live-search: ${attempts.map((a) => a.base).join(', ')} did not answer; using ${base}`
      )
    }
    warnIfEphemeralInProduction(base)

    const contentType = upstream.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await upstream.json()
      return tag(NextResponse.json(data, { status: upstream.status }), base, attempts)
    }

    const text = await upstream.text()
    return tag(
      NextResponse.json(
        {
          error: 'Unexpected response from live search service',
          message: text.slice(0, 500),
        },
        { status: upstream.ok ? 200 : upstream.status || 502 }
      ),
      base,
      attempts
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
