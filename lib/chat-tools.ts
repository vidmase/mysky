import { getFlightStatusByNumberAndDate, getLastProviderError } from '@/src/lib/services/flight-status'

// Read-only tools for the chat assistant, besides the email scan. Filtering
// and counting happen here, in code: the model only picks the filters, so a
// count it reports is one this function made, not a tally of prompt lines.

/** One flight as the model reads it, in the system prompt and in tool results. */
export function formatFlightLine(f: any): string {
    return (
        `${f.departure_date || '????-??-??'} ${f.departure_iata || '???'}->${f.arrival_iata || '???'} ` +
        `passenger ${f.passenger_name || 'unknown'}, ` +
        `${f.departure_airport || ''} to ${f.arrival_airport || ''}, ` +
        `${f.airline || 'unknown airline'} ${f.flight_number || ''}, ` +
        `${f.departure_time || '??'}-${f.arrival_time || '??'}, ` +
        `duration ${f.calculated_duration || 'unknown'}, seat ${f.seat || 'n/a'}, ` +
        `fare ${f.total_receipt || 'n/a'}, ref ${f.reservation_number || 'n/a'}` +
        // Without this the model sums a cancelled fare into spending, which is
        // the opposite of what the rest of the app shows.
        (f.cancelled ? ', CANCELLED (fare was paid but the trip did not happen)' : '')
    )
}

export const QUERY_FLIGHTS_TOOL = {
    type: 'function',
    function: {
        name: 'query_flights',
        description:
            "Filter the user's own flight log and get an exact count plus the matching flights. Use it for any question " +
            'that counts or lists flights by passenger, airline, airport, route, flight number or date range. ' +
            'All filters are optional and combine with AND.',
        parameters: {
            type: 'object',
            properties: {
                passenger: { type: 'string', description: 'Part of the passenger name, any case, e.g. "patricija".' },
                airline: { type: 'string', description: 'Part of the airline name, e.g. "ryanair".' },
                airport: { type: 'string', description: 'IATA code or part of an airport name; matches departure or arrival.' },
                from: { type: 'string', description: 'Departure IATA code, e.g. "VNO".' },
                to: { type: 'string', description: 'Arrival IATA code, e.g. "LTN".' },
                flight_number: { type: 'string', description: 'Flight number, e.g. "FR2341".' },
                date_from: { type: 'string', description: 'First departure date to include, YYYY-MM-DD.' },
                date_to: { type: 'string', description: 'Last departure date to include, YYYY-MM-DD.' },
                cancelled: {
                    type: 'string',
                    enum: ['exclude', 'include', 'only'],
                    description: 'Cancelled bookings were never flown. Default "exclude".',
                },
            },
        },
    },
} as const

const MAX_LISTED = 50

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const norm = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const compact = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toUpperCase()

/** Flights are expected newest first, as the chat route loads them. */
export function queryFlights(flights: any[], args: Record<string, unknown>): string {
    const passenger = norm(args.passenger)
    const airline = norm(args.airline)
    const airport = norm(args.airport)
    const from = compact(args.from)
    const to = compact(args.to)
    const flightNumber = compact(args.flight_number)
    const dateFrom = text(args.date_from)
    const dateTo = text(args.date_to)
    const cancelled = args.cancelled === 'include' || args.cancelled === 'only' ? args.cancelled : 'exclude'

    const matches = flights.filter((f) => {
        // Trimmed: at least one row is stored as ' 2014-03-16'.
        const date = String(f.departure_date ?? '').trim().slice(0, 10)
        if (cancelled === 'exclude' && f.cancelled) return false
        if (cancelled === 'only' && !f.cancelled) return false
        if (passenger && !norm(f.passenger_name).includes(passenger)) return false
        if (airline && !norm(f.airline).includes(airline)) return false
        if (from && compact(f.departure_iata) !== from) return false
        if (to && compact(f.arrival_iata) !== to) return false
        if (flightNumber && compact(f.flight_number) !== flightNumber) return false
        if (airport) {
            const hit = [f.departure_iata, f.arrival_iata, f.departure_airport, f.arrival_airport]
                .some((v) => norm(v) === airport || (airport.length > 3 && norm(v).includes(airport)))
            if (!hit) return false
        }
        // Undated flights cannot be placed in a range, so a range excludes them.
        if ((dateFrom || dateTo) && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
        if (dateFrom && date < dateFrom) return false
        if (dateTo && date > dateTo) return false
        return true
    })

    if (matches.length === 0) return 'No flights match these filters.'
    const listed = matches.slice(0, MAX_LISTED).map(formatFlightLine).join('\n')
    const more = matches.length > MAX_LISTED ? `\n(Listing the ${MAX_LISTED} most recent of ${matches.length}.)` : ''
    return `${matches.length} flight${matches.length === 1 ? '' : 's'} match. Use this count directly.\n${listed}${more}`
}

export const FLIGHT_STATUS_TOOL = {
    type: 'function',
    function: {
        name: 'get_flight_status',
        description:
            'Look up the live or scheduled status of one flight (delays, gate times, cancellation) from the flight data ' +
            'provider. Use it when the user asks whether a flight is on time, delayed or cancelled, usually for today or ' +
            'an upcoming flight. Not for past flights in their log, which are already known.',
        parameters: {
            type: 'object',
            properties: {
                flight_number: { type: 'string', description: 'Flight number, e.g. "FR2341".' },
                date: { type: 'string', description: 'Local departure date, YYYY-MM-DD.' },
            },
            required: ['flight_number', 'date'],
        },
    },
} as const

export async function getFlightStatusForModel(args: Record<string, unknown>): Promise<string> {
    const flightNumber = compact(args.flight_number)
    const date = text(args.date)
    if (!flightNumber || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return 'The lookup did not run: it needs a flight number and a date as YYYY-MM-DD.'
    }
    let records
    try {
        records = await getFlightStatusByNumberAndDate(flightNumber, date)
    } catch (e: any) {
        return `The flight status provider failed: ${e?.message || 'unknown error'}. Tell the user plainly.`
    }
    if (records === null) {
        // null means "provider refused or is not configured", not "no such flight".
        const err = getLastProviderError()
        return `Flight status is unavailable right now${err ? ` (${err.message})` : ''}. Tell the user plainly; do not guess a status.`
    }
    if (records.length === 0) return `The provider has no data for ${flightNumber} on ${date}.`
    const time = (s?: { scheduledTimeLocal?: string | null; estimatedTimeLocal?: string | null; actualTimeLocal?: string | null; delayMinutes?: number | null }) =>
        [
            s?.scheduledTimeLocal && `scheduled ${s.scheduledTimeLocal}`,
            s?.estimatedTimeLocal && `estimated ${s.estimatedTimeLocal}`,
            s?.actualTimeLocal && `actual ${s.actualTimeLocal}`,
            s?.delayMinutes ? `delay ${s.delayMinutes} min` : null,
        ].filter(Boolean).join(', ') || 'no times'
    return records
        .map((r) =>
            `${r.number || flightNumber} ${r.airline || ''}: status ${r.status || 'unknown'}. ` +
            `Departs ${r.departure?.airport?.iata || '?'} (${time(r.departure)}); ` +
            `arrives ${r.arrival?.airport?.iata || '?'} (${time(r.arrival)}).`
        )
        .join('\n')
}
