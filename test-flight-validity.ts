import assert from 'node:assert/strict'
import { flightKey, flightParseProblem } from './lib/flight-validity'

const ok = { departure_iata: 'BRS', arrival_iata: 'LPA', flight_number: 'FR4757', departure_date: '2026-11-04', departure_time: '13:35', arrival_time: '17:45' }

// A real flight passes, including ones from airports the app's own airport
// list does not know (Hurghada is missing from it but is in this log).
assert.equal(flightParseProblem(ok), null)
assert.equal(flightParseProblem({ ...ok, departure_iata: 'VNO', arrival_iata: 'HRG', flight_number: 'BA123' }), null)

// Every placeholder the parsers fall back to must be refused, or it lands in the stats.
assert.equal(flightParseProblem({ ...ok, departure_iata: 'DTD', arrival_iata: 'DTD' }), 'departure and arrival are both DTD')
assert.equal(flightParseProblem({ ...ok, departure_iata: 'Unknown' }), 'airports not read')
assert.equal(flightParseProblem({ ...ok, arrival_iata: null }), 'airports not read')
assert.equal(flightParseProblem({ ...ok, flight_number: 'Number' }), 'flight number not read')
assert.equal(flightParseProblem({ ...ok, departure_date: 'soon' }), 'departure date not read')
assert.equal(flightParseProblem({ ...ok, departure_time: '15:00', arrival_time: '15:00:00' }), 'departure and arrival times are both 15:00')

// Duplicates are matched on date and flight number however each is written.
assert.equal(flightKey('2026-11-04T00:00:00.000Z', 'FR 4757'), flightKey('2026-11-04', 'fr4757'))

console.log('flight-validity: all assertions passed')
