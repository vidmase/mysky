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
        { id: 'm2', duplicate: true, parsed: { flight_number: 'FR8682' } },
      ],
    },
  }
  const found = await scanEmailForFlights(req, { start: '2026-12-01', end: '2027-01-31' })
  assert.equal(calls[0].cookie, '__session=abc')
  assert.match(calls[0].url, /\/api\/gmail\/preview\?start=2026-12-01&end=2027-01-31$/)

  // A flight already in the log must not be offered again, or "Add" would
  // propose something the user already has.
  assert.ok(found.ok)
  if (found.ok) {
    assert.equal(found.flights.length, 1)
    assert.equal(found.alreadyInLog, 1)
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
