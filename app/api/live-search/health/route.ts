import { NextResponse } from 'next/server'

import {
  describeAttempts,
  fetchUpstream,
  flightsApiCandidates,
  isEphemeralTunnel,
  UpstreamUnavailable,
  warnIfEphemeralInProduction,
} from '@/lib/live-search-upstream'

export const dynamic = 'force-dynamic'

/** A health probe that takes longer than this has already told us what we need. */
const HEALTH_TIMEOUT_MS = 10_000

export async function GET() {
  const candidates = flightsApiCandidates().map((candidate) => candidate.base)

  try {
    let call: Awaited<ReturnType<typeof fetchUpstream>>
    try {
      call = await fetchUpstream('/api/health', { method: 'GET', timeoutMs: HEALTH_TIMEOUT_MS })
    } catch (err) {
      if (!(err instanceof UpstreamUnavailable)) throw err
      console.error('live-search health upstream fetch failed:', err.message)
      return NextResponse.json(
        {
          ok: false,
          error: 'Live search service unavailable',
          // This endpoint exists to be read when something is wrong, so it says
          // what it tried and how each attempt ended. The addresses are
          // deployment config, not secrets.
          message: describeAttempts(err.attempts),
          attempts: err.attempts,
          candidates,
        },
        { status: 502 }
      )
    }

    const { response: upstream, base, attempts } = call
    warnIfEphemeralInProduction(base)

    const contentType = upstream.headers.get('content-type') || ''
    const payload: unknown = contentType.includes('application/json')
      ? await upstream.json()
      : { message: (await upstream.text()).slice(0, 500) }

    const body = (payload && typeof payload === 'object' ? payload : { upstreamBody: payload }) as Record<
      string,
      unknown
    >

    return NextResponse.json(
      {
        ...body,
        // The scraper answers with `status: "ok"`; the two together are what the
        // monitor and the drawer read.
        ok: upstream.ok && (typeof body.status === 'string' ? body.status === 'ok' : true),
        upstream: base,
        ephemeralTunnel: isEphemeralTunnel(base),
        // Non-empty when the address named in the environment was not the one
        // that answered, which is the early warning this endpoint is for.
        failoverFrom: attempts.map((attempt) => attempt.base),
        candidates,
      },
      { status: upstream.status }
    )
  } catch (error) {
    console.error('Error in GET /api/live-search/health:', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        candidates,
      },
      { status: 500 }
    )
  }
}
