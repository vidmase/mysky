// The chat assistant's one tool: look through the user's Gmail for flights
// that are not in their log yet. It only finds and proposes; nothing is written
// here. The chat page shows what was found and the user adds it with a click,
// through the same /api/gmail/import the flights page uses.

export const SCAN_EMAIL_TOOL = {
    type: 'function',
    function: {
        name: 'scan_email_for_flights',
        description:
            "Search the user's Gmail for Ryanair booking itineraries whose flights depart in a date range, " +
            'and report the flights that are not in their log yet. Use it when the user asks to check, scan or ' +
            'import new flights from their email. Only Ryanair itinerary emails are read. This does not add ' +
            'anything: the user confirms in the app before flights are added.',
        parameters: {
            type: 'object',
            properties: {
                start: { type: 'string', description: 'First departure date to include, YYYY-MM-DD.' },
                end: { type: 'string', description: 'Last departure date to include, YYYY-MM-DD.' },
            },
            required: ['start', 'end'],
        },
    },
} as const

export type ProposedFlight = {
    emailId: string
    date: string | null
    flightNumber: string | null
    from: string | null
    to: string | null
    departs: string | null
    arrives: string | null
    fare: string | null
    reference: string | null
}

export type ScanOutcome =
    | { ok: true; flights: ProposedFlight[]; alreadyInLog: number }
    | { ok: false; reason: 'gmail_not_connected'; authUrl?: string }
    | { ok: false; reason: 'bad_dates' | 'scan_failed'; detail: string }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Runs the existing Gmail preview for the signed-in user. It is called over
 * HTTP with the user's own cookies, so it authenticates exactly as when the
 * flights page calls it, and the parsing stays in one place.
 */
export async function scanEmailForFlights(
    request: Request,
    args: { start?: unknown; end?: unknown }
): Promise<ScanOutcome> {
    const start = typeof args.start === 'string' ? args.start : ''
    const end = typeof args.end === 'string' ? args.end : ''
    if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
        return { ok: false, reason: 'bad_dates', detail: `start and end must be YYYY-MM-DD with start <= end (got ${start || '?'} to ${end || '?'})` }
    }

    const url = new URL('/api/gmail/preview', request.url)
    url.searchParams.set('start', start)
    url.searchParams.set('end', end)

    const res = await fetch(url, { headers: { cookie: request.headers.get('cookie') ?? '' }, cache: 'no-store' })
    const body: any = await res.json().catch(() => ({}))

    if (res.status === 401 && (body?.error === 'not_connected' || body?.error === 'reauthorize')) {
        return { ok: false, reason: 'gmail_not_connected', authUrl: typeof body.authUrl === 'string' ? body.authUrl : undefined }
    }
    if (!res.ok || !Array.isArray(body?.items)) {
        return { ok: false, reason: 'scan_failed', detail: body?.message || body?.error || `HTTP ${res.status}` }
    }

    const items: any[] = body.items
    const fresh = items.filter((i) => !i.duplicate && i.parsed)
    return {
        ok: true,
        alreadyInLog: items.length - fresh.length,
        flights: fresh.map((i) => {
            const p = i.parsed
            const s = (v: unknown) => (v == null || v === '' ? null : String(v))
            return {
                emailId: String(i.id),
                date: s(p.departure_date)?.slice(0, 10) ?? null,
                flightNumber: s(p.flight_number),
                from: s(p.departure_iata) ?? s(p.departure_airport),
                to: s(p.arrival_iata) ?? s(p.arrival_airport),
                departs: s(p.departure_time)?.slice(0, 5) ?? null,
                arrives: s(p.arrival_time)?.slice(0, 5) ?? null,
                fare: s(p.total_receipt),
                reference: s(p.reservation_number),
            }
        }),
    }
}

/** What the model reads back: short, and explicit that nothing was added. */
export function describeScanForModel(outcome: ScanOutcome): string {
    if (!outcome.ok) {
        if (outcome.reason === 'gmail_not_connected') {
            return 'Gmail is not connected for this user. Tell them to connect Gmail with the button shown under your reply, then ask again.'
        }
        return `The scan did not run: ${outcome.detail}. Tell the user plainly.`
    }
    if (outcome.flights.length === 0) {
        return `No new flights found. ${outcome.alreadyInLog} flight email(s) in that range are already in the log.`
    }
    const lines = outcome.flights.map(
        (f) => `${f.date ?? '?'} ${f.flightNumber ?? '?'} ${f.from ?? '?'}-${f.to ?? '?'} ${f.departs ?? ''}-${f.arrives ?? ''} ref ${f.reference ?? '?'} fare ${f.fare ?? '?'}`
    )
    return (
        `${outcome.flights.length} new flight email(s) found (not added yet); ${outcome.alreadyInLog} already in the log:\n` +
        lines.join('\n') +
        '\nSummarise these for the user and tell them to press "Add these flights" under your reply to add them. Do not say they were added.'
    )
}
