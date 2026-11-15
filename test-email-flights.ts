import assert from 'node:assert/strict'

process.env.API_KEY_ENCRYPTION_SECRET = 'test-secret-with-enough-entropy-0123456789'

;(async () => {
  const { readFlightEmail } = await import('./lib/email-flights')
  const { planLegs, sealRow, openRow, rowForLeg } = await import('./lib/email-flights/plan')
  const { describeScanForModel } = await import('./lib/chat-email-scan')

  // ---- Readers: text from real confirmations in this account ----

  const wizz = readFlightEmail('noreply@wizzair.com', 'Your travel itinerary: DLZEGZ',
    'Flight confirmation code: DLZEGZ Passenger info Title First name Last name Route Cabin baggage Checked-in bag Seat ' +
    'MS Vaida Vaitkeviciute-Daugvile VNO-BCN 1/40x30x20 0 - BCN-VNO 1/40x30x20 0 - CHD Beatrice Daugvilaite VNO-BCN 1/40x30x20 0 - ' +
    'Flight details GOING OUT Flight Number: W6 1913 Departs from: Arrives to: Vilnius (VNO) Barcelona El Prat - Terminal 2 (BCN) 21/03/2026 06:00 21/03/2026 08:35 ' +
    'COMING BACK Flight Number: W6 1914 Departs from: Arrives to: Barcelona El Prat - Terminal 2 (BCN) Vilnius (VNO) 24/03/2026 09:20 24/03/2026 14:00 ' +
    // A declined payment attempt is listed too; only the grand total is the price.
    'Payment summary 06/01/2026 RV 414901088 declined 213.78 EUR 06/01/2026 RV 414901205 confirmed 213.78 EUR Grand total 213.78 EUR')
  assert.ok(wizz)
  assert.equal(wizz.airline, 'Wizz Air')
  assert.equal(wizz.total_receipt, 'EUR 213.78')
  assert.deepEqual(wizz.legs.map((l) => `${l.departure_date} ${l.flight_number} ${l.departure_iata}-${l.arrival_iata} ${l.departure_time}-${l.arrival_time}`),
    ['2026-03-21 W61913 VNO-BCN 06:00-08:35', '2026-03-24 W61914 BCN-VNO 09:20-14:00'])
  assert.equal(wizz.passenger_name, 'MS Vaida Vaitkeviciute-Daugvile, CHD Beatrice Daugvilaite')

  const ezyText = (from: string, to: string) =>
    'Hi, VIDMANTAS; here are the details for your booking K7JBL97 Payment details • Payment to easyJet of €381.92 by Debit Mastercard on 30/05/2024 ' +
    '• Payment to easyJet of €45.99 by Debit Mastercard on 04/07/2024 ' +
    `Passenger & Flight details 1 of 1 ${from} to ${to} EZY2732 Departs: Fri 05 Jul 2024 11:10 Arrives: Fri 05 Jul 2024 15:15 Bag drop opens ` +
    'Mr VIDMANTAS DAUGVILA Mr VIDMANTAS DAUGVILA Seat: 25D'
  const ezy = readFlightEmail('donotreply@easyjet.com', 'easyJet booking reference: K7JBL97', ezyText('Tenerife South', 'Bristol'))
  assert.ok(ezy)
  // easyJet lists extras bought later as further payments: the price is all of them.
  assert.equal(ezy.total_receipt, 'EUR 427.91')
  assert.equal(`${ezy.legs[0].departure_iata}-${ezy.legs[0].arrival_iata}`, 'TFS-BRS')
  assert.equal(readFlightEmail('donotreply@easyjet.com', 'x', ezyText('Barcelona (Terminal 2C)', 'Bristol'))?.legs[0].departure_iata, 'BCN')
  // easyJet gives names, not codes: "London" has six airports, an unknown name has none. Either way the email is refused, never guessed.
  assert.equal(readFlightEmail('donotreply@easyjet.com', 'x', ezyText('London', 'Bristol')), null)
  assert.equal(readFlightEmail('donotreply@easyjet.com', 'x', ezyText('Atlantis', 'Bristol')), null)

  // No reader for the sender, or not a confirmation: nothing comes back to save.
  assert.equal(readFlightEmail('reservations@airbaltic.com', 'Travel Confirmation', 'Flight BT0655 ...'), null)
  assert.equal(readFlightEmail('noreply@wizzair.com', 'Your booking DLZEGZ: Important baggage information', 'Bring home surprises'), null)

  // ---- Planning: what each leg means for the log ----

  const owner = 'profile-1'
  const read = (emailId: string, receivedAt: string, booking: any) => ({ emailId, subject: 's', receivedAt, booking })
  const ry = (ref: string, legs: [string, string, string, string][]) => ({
    airline: 'Ryanair', reader: 'ryanair-itinerary', reservation_number: ref, passenger_name: 'Mr X', total_receipt: 'GBP 100.00',
    legs: legs.map(([d, fn, from, to]) => ({ flight_number: fn, departure_iata: from, arrival_iata: to, departure_airport: from, arrival_airport: to, departure_date: d, arrival_date: d, departure_time: '08:00', arrival_time: '10:00' })),
  })

  const planned = planLegs(owner, [
    // Already filed, though the log's reference was misread: date and flight number decide.
    read('e1', '2026-01-01T10:00:00Z', ry('AAAAAA', [['2026-03-01', 'FR1', 'BRS', 'KUN']])),
    // Moved by the airline: the newer email wins, and the old flight in the log is pointed out, not silently kept beside it.
    read('e2', '2026-01-01T10:00:00Z', ry('BBBBBB', [['2026-03-05', 'FR2', 'BRS', 'KUN']])),
    read('e3', '2026-02-01T10:00:00Z', ry('BBBBBB', [['2026-03-06', 'FR2', 'BRS', 'KUN']])),
    // New: both legs offered, the one outside the range left out.
    read('e4', '2026-01-02T10:00:00Z', ry('CCCCCC', [['2026-03-10', 'FR3', 'BRS', 'TFS'], ['2026-04-20', 'FR4', 'TFS', 'BRS']])),
    // The same flight on a second booking is offered once.
    read('e5', '2026-01-03T10:00:00Z', ry('DDDDDD', [['2026-03-10', 'FR3', 'BRS', 'TFS']])),
  ], [
    { departure_date: '2026-03-01', flight_number: 'FR 1', reservation_number: 'Number', departure_iata: 'BRS', arrival_iata: 'KUN' },
    { departure_date: '2026-03-05', flight_number: 'FR2', reservation_number: 'BBBBBB', departure_iata: 'BRS', arrival_iata: 'KUN' },
  ], '2026-03-01', '2026-03-31')

  assert.deepEqual(planned.map((p) => `${p.display.date} ${p.display.flightNumber} ${p.status}`), [
    '2026-03-01 FR1 in_log', '2026-03-06 FR2 changed', '2026-03-10 FR3 new',
  ])
  assert.equal(planned[0].token, undefined, 'a flight already filed can never be saved again from a scan')
  assert.match(planned[1].note!, /2026-03-05 FR2 BRS-KUN/)

  // Ryanair's resend after buying a bag shows only the bag's price; the booking's price is the first email's.
  const resent = planLegs(owner, [
    read('r1', '2026-10-11T10:00:00Z', { ...ry('B8ZRWN', [['2026-11-02', 'FR8682', 'KUN', 'BRS']]), total_receipt: 'EUR 334.38' }),
    read('r2', '2026-11-08T10:00:00Z', { ...ry('B8ZRWN', [['2026-11-02', 'FR8682', 'KUN', 'BRS']]), total_receipt: 'EUR 29.99' }),
  ], [], '2026-11-01', '2026-11-30')
  assert.equal(resent[0].display.fare, 'EUR 334.38')
  assert.match(openRow(resent[0].token!, owner)!.notes, /email r2/, 'the flights still come from the latest email')

  // ---- Saving exactly what was shown, for this user only ----

  const token = planned[2].token!
  const row = openRow(token, owner)!
  assert.equal(row.reservation_number, 'CCCCCC')
  assert.equal(row.departure_country, 'United Kingdom')
  assert.match(row.notes, /ryanair-itinerary, email e4/)
  assert.equal(openRow(token, 'someone-else'), null)
  assert.equal(openRow(token.slice(0, -3) + 'AAA', owner), null)
  assert.equal(openRow(token, owner, Date.now() + 25 * 3600 * 1000), null)
  assert.equal(openRow(sealRow('someone-else', rowForLeg('someone-else', read('x', '2026-01-01T00:00:00Z', ry('E', [['2026-03-01', 'FR9', 'BRS', 'KUN']])), ry('E', [['2026-03-01', 'FR9', 'BRS', 'KUN']]).legs[0] as any)), owner), null)

  // ---- What the assistant is told ----

  const told = describeScanForModel({ ok: true, legs: planned, unreadable: [{ subject: 'Your itinerary', receivedAt: '2026-01-01', reason: 'x' }], emailsRead: 6, truncated: false })
  assert.match(told, /New, not added yet \(1\)/)
  assert.match(told, /Never say a flight was added/)
  assert.match(told, /Could not read 1 email/)
  const nothing = describeScanForModel({ ok: true, legs: [planned[0]], unreadable: [], emailsRead: 1, truncated: false })
  assert.match(nothing, /do not mention an add button/)

  console.log('email-flights: all assertions passed')
})().catch((e) => { console.error(e); process.exit(1) })
