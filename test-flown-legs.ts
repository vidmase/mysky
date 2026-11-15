import assert from 'node:assert/strict'
import { flownLegs } from './lib/statistics/leg-metrics'

const row = (o: object) => ({ departure_iata: 'BRS', arrival_iata: 'TFS', departure_date: '2024-10-30', flight_number: 'FR4753', ...o })
const ids = (rows: any[]) => flownLegs(rows).map((r) => r.id)

// One flight, three rows: the booking and two later receipts for extras. The
// aircraft flew once, so it is one leg — otherwise every add-on purchase adds
// 2,900 km and four hours to the totals.
assert.deepEqual(ids([row({ id: 1 }), row({ id: 2 }), row({ id: 3 })]), [1])

// The same flight filed under a companion's booking is still one flight flown.
assert.deepEqual(ids([row({ id: 1, reservation_number: 'F8V1HC' }), row({ id: 2, reservation_number: 'Q96Y4C' })]), [1])

// Flight numbers are filed as "FR 543" and "FR543", dates with or without a time part.
assert.deepEqual(ids([
  row({ id: 1, flight_number: 'FR 543', departure_date: '2024-07-07' }),
  row({ id: 2, flight_number: 'fr543', departure_date: '2024-07-07T00:00:00.000Z' }),
]), [1])

// A cancelled leg is kept on file for its fare but was never flown.
assert.deepEqual(ids([row({ id: 1, cancelled: true }), row({ id: 2, departure_date: '2024-11-06' })]), [2])

// Different days, different directions and different flight numbers are different flights.
assert.deepEqual(ids([
  row({ id: 1 }),
  row({ id: 2, departure_date: '2024-10-31' }),
  row({ id: 3, departure_iata: 'TFS', arrival_iata: 'BRS', flight_number: 'FR4754' }),
  row({ id: 4, flight_number: 'EZY2341' }),
]), [1, 2, 3, 4])

// With no flight number there is nothing to prove two rows are one flight, so both count.
assert.deepEqual(ids([row({ id: 1, flight_number: null }), row({ id: 2, flight_number: '' })]), [1, 2])

console.log('flown-legs: all assertions passed')
