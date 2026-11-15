import { scanGmailForFlights, type GmailScanResult } from '@/lib/email-flights/gmail-scan'

// The chat assistant's one tool: the same Gmail scan the flights page uses. It
// only finds and proposes; the chat shows the review list and the user adds
// what they confirm, through /api/gmail/commit.

export const SCAN_EMAIL_TOOL = {
    type: 'function',
    function: {
        name: 'scan_email_for_flights',
        description:
            "Read the user's Ryanair, Wizz Air and easyJet booking confirmation emails for flights departing in a date range, " +
            'and report which are new, already in their log, or from a booking that has changed. Use it when the user asks to ' +
            'check, scan or import flights from their email. This does not add anything: the user confirms in the app.',
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

export type ScanOutcome = GmailScanResult

export function scanEmailForFlights(ownerId: string, args: { start?: unknown; end?: unknown }): Promise<ScanOutcome> {
    return scanGmailForFlights(ownerId, typeof args.start === 'string' ? args.start : '', typeof args.end === 'string' ? args.end : '')
}

/** What the model reads back: short, and explicit that nothing was added. */
export function describeScanForModel(outcome: ScanOutcome): string {
    if (!outcome.ok) {
        if (outcome.reason === 'gmail_not_connected') {
            return 'Gmail is not connected for this user. Tell them to connect Gmail with the button shown under your reply, then ask again.'
        }
        return `The scan did not run: ${outcome.detail}. Tell the user plainly.`
    }
    const line = (l: (typeof outcome.legs)[number]) =>
        `${l.display.date} ${l.display.flightNumber} ${l.display.from}-${l.display.to} ${l.display.departs}-${l.display.arrives} ${l.display.airline} ref ${l.display.reference}${l.note ? ` (${l.note})` : ''}`
    const group = (status: string, title: string) => {
        const ls = outcome.legs.filter((l) => l.status === status)
        return ls.length ? `${title} (${ls.length}):\n${ls.map(line).join('\n')}` : ''
    }
    const parts = [
        `Read ${outcome.emailsRead} confirmation email(s)${outcome.truncated ? ', the most recent 300 only' : ''}.`,
        group('new', 'New, not added yet'),
        group('changed', 'Booking changed since it was logged; the user decides'),
        group('in_log', 'Already in the log'),
        outcome.unreadable.length
            ? `Could not read ${outcome.unreadable.length} email(s), never added: ${outcome.unreadable.slice(0, 5).map((u) => `"${u.subject}"`).join(', ')}.`
            : '',
    ].filter(Boolean)
    const addable = outcome.legs.some((l) => l.status !== 'in_log')
    parts.push(
        addable
            ? 'Summarise this for the user. They add flights by ticking them in the list under your reply and pressing Add. Never say a flight was added.'
            : 'Summarise this for the user. There is nothing to add, so do not mention an add button.'
    )
    return parts.join('\n')
}
