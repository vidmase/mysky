import assert from 'node:assert/strict'
import { describeScanForModel, scanEmailForFlights } from './lib/chat-email-scan'

const calls: { url: string; cookie: string | null }[] = []
let reply: { status: number; body: unknown } = { status: 200, body: { items: [] } }
globalThis.fetch = (async (url: any, init?: any) => {
  calls.push({ url: String(url), cookie: init?.headers?.cookie ?? null })
  return new Response(JSON.stringify(reply.body), { status: reply.status })
}) as typeof fetch

const req = new Request('https://mysky.example/api/chat', { headers: { cookie: '__session=abc' } })

;(async () => {
  // The scan reads Gmail as the signed-in user: the preview route authenticates
  // from the same session cookie, so it must be passed along.
  reply = {
    status: 200,
    body: {
      items: [
        { id: 'm1', duplicate: false, parsed: { departure_date: '2026-12-20T00:00:00Z', flight_number: 'FR8681', departure_iata: 'BRS', arrival_iata: 'KUN', departure_time: '06:05:00', arrival_time: '10:50:00', total_receipt: 'GBP 79.15', reservation_number: 'ABC123' } },
        { id: 'm2', duplicate: true, parsed: { departure_date: '2026-12-27', flight_number: 'FR8682', departure_iata: 'KUN', arrival_iata: 'BRS', departure_time: '15:45:00', arrival_time: '16:40:00' } },
        // The real misread from production: a Ryanair itinerary in the current
        // layout came back as DTD to DTD, 15:00-15:00, reference "Number".
        { id: 'm3', subject: 'Ryanair Travel Itinerary', duplicate: false, parsed: { departure_date: '2026-11-02', flight_number: 'FR8682', departure_iata: 'DTD', arrival_iata: 'DTD', departure_time: '15:00', arrival_time: '15:00', reservation_number: 'Number' } },
        // Already in the log under its real reference; the parse misread the
        // reference, so only date and flight number can recognise it.
        { id: 'm4', duplicate: false, parsed: { departure_date: '2026-11-04', flight_number: 'FR 4757', departure_iata: 'BRS', arrival_iata: 'LPA', departure_time: '13:35', arrival_time: '17:45', reservation_number: 'PUBLIC' } },
      ],
    },
  }
  const found = await scanEmailForFlights(req, { start: '2026-11-01', end: '2027-01-31' }, new Set(['2026-11-04|FR4757']))
  assert.equal(calls[0].cookie, '__session=abc')
  assert.match(calls[0].url, /\/api\/gmail\/preview\?start=2026-11-01&end=2027-01-31$/)

  // A flight already in the log must not be offered again, or "Add" would
  // propose something the user already has.
  assert.ok(found.ok)
  if (found.ok) {
    assert.equal(found.flights.length, 1)
    assert.equal(found.alreadyInLog, 2)
    // A misread email is never offered for adding; it is reported instead.
    assert.deepEqual(found.unreadable, [{ subject: 'Ryanair Travel Itinerary', problem: 'departure and arrival are both DTD' }])
    assert.deepEqual(found.flights[0], { emailId: 'm1', date: '2026-12-20', flightNumber: 'FR8681', from: 'BRS', to: 'KUN', departs: '06:05', arrives: '10:50', fare: 'GBP 79.15', reference: 'ABC123' })
  }

  // The model must never be told, or be able to tell the user, that flights were added: adding is the user's click.
  const text = describeScanForModel(found)
  assert.match(text, /not added yet/)
  assert.match(text, /Do not say they were added/)

  // Model-supplied dates are checked before any email is read.
  calls.length = 0
  const bad = await scanEmailForFlights(req, { start: '2027-01-31', end: '2026-12-01' })
  assert.equal(bad.ok, false)
  assert.equal(calls.length, 0)

  // Gmail not connected is reported with the link to connect it, not as a crash.
  reply = { status: 401, body: { error: 'not_connected', authUrl: 'https://accounts.google.com/x' } }
  const off = await scanEmailForFlights(req, { start: '2026-12-01', end: '2026-12-31' })
  assert.deepEqual(off, { ok: false, reason: 'gmail_not_connected', authUrl: 'https://accounts.google.com/x' })

  console.log('chat-email-scan: all assertions passed')
})().catch((e) => { console.error(e); process.exit(1) })
