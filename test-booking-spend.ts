import assert from 'node:assert/strict'
import { groupFlightsIntoBookings } from './lib/statistics/booking-spend'

const total = (fs: any[]) =>
  groupFlightsIntoBookings(fs).reduce((s, b) => s + (b.total ?? 0), 0)

// The reported bug: MLA↔BRS return, one 283.00 fare filed on both legs under ref 37CSCF.
// Spend must be the booking's fare, not the fare times the number of legs.
const returnTrip = [
  { id: 1, reservation_number: '37CSCF', total_receipt: 'GBP 283.00', departure_date: '2026-08-27', airline: 'Jet2' },
  { id: 2, reservation_number: '37CSCF', total_receipt: 'GBP 283.00', departure_date: '2026-08-31', airline: 'Jet2' },
]
assert.equal(total(returnTrip), 283)
assert.equal(groupFlightsIntoBookings(returnTrip).length, 1)
// Attributed to the outbound leg, so the booking lands in the year it started.
assert.equal(groupFlightsIntoBookings(returnTrip)[0].departure_date, '2026-08-27')

// Legs priced separately under one reference are genuinely additive.
assert.equal(total([
  { id: 1, reservation_number: 'ABC123', total_receipt: '100.00', departure_date: '2026-01-01', airline: 'Jet2' },
  { id: 2, reservation_number: 'ABC123', total_receipt: '150.00', departure_date: '2026-01-05', airline: 'Jet2' },
]), 250)

// Separate bookings stay separate even when the fare happens to match.
assert.equal(total([
  { id: 1, reservation_number: 'AAA111', total_receipt: '99.00', departure_date: '2026-01-01', airline: 'Jet2' },
  { id: 2, reservation_number: 'BBB222', total_receipt: '99.00', departure_date: '2026-02-01', airline: 'Jet2' },
]), 198)

// A missing or placeholder reference must not merge unrelated flights.
assert.equal(total([
  { id: 1, reservation_number: '', total_receipt: '50.00', departure_date: '2026-01-01', airline: 'Jet2' },
  { id: 2, reservation_number: null, total_receipt: '50.00', departure_date: '2026-03-01', airline: 'Jet2' },
  { id: 3, reservation_number: 'N/A', total_receipt: '50.00', departure_date: '2026-05-01', airline: 'Jet2' },
]), 150)

// A leg with no fare on record is still a booking — the flights list has to show
// it — but it carries no total, so it cannot be spent against.
const unpriced = groupFlightsIntoBookings([
  { id: 1, reservation_number: 'ZZZ999', total_receipt: null, departure_date: '2026-01-01', airline: 'Jet2' },
])
assert.equal(unpriced.length, 1)
assert.equal(unpriced[0].total, null)

// Legs come back earliest first, so the list can anchor a booking on its outbound
// leg no matter what order the rows arrived in.
const outboundFirst = groupFlightsIntoBookings(returnTrip.slice().reverse())[0]
assert.equal(outboundFirst.legs.length, 2)
assert.equal(outboundFirst.legs[0].departure_date, '2026-08-27')
assert.equal(outboundFirst.legs[1].departure_date, '2026-08-31')
assert.equal(outboundFirst.key, 'ref:37CSCF')

// Fares are filed in whatever the airline charged: pounds, euros, and before the
// euro, litas and lats. A 3026 LTL charter is not a £3026 one, so every booking
// must carry its own currency for the totals to be kept apart.
const currencies = groupFlightsIntoBookings([
  { id: 20, reservation_number: 'GBPREF', total_receipt: 'GBP 239.20' },
  { id: 21, reservation_number: 'EURREF', total_receipt: '380.52 EUR' },
  { id: 22, reservation_number: 'LTLREF', total_receipt: '3026 LTL' },
  { id: 23, reservation_number: 'LVLREF', total_receipt: 'LVL41.10' },
  { id: 24, reservation_number: 'RETREF', total_receipt: null, departure_date: '2024-01-01' },
  { id: 25, reservation_number: 'RETREF', total_receipt: '€99.00', departure_date: '2024-01-08' },
]).map((b) => b.currency)
assert.deepEqual(currencies, ['GBP', 'EUR', 'LTL', 'LVL', 'EUR'])

console.log('booking-spend: all assertions passed')
