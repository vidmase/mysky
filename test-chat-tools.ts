// The assistant answers "how many times did Patricija fly?" from query_flights'
// count, so that count has to be the one the rest of the app would give. These
// checks fail if a cancelled booking is counted as a flight, if a name stored
// in capitals or with extra spaces stops matching, or if a date range drops
// its first or last day.
import assert from 'node:assert/strict'
import { formatFlightLine, getFlightStatusForModel, queryFlights } from './lib/chat-tools'

const flights = [
    { departure_date: '2026-12-03', departure_iata: 'VNO', arrival_iata: 'LTN', airline: 'Ryanair', flight_number: 'FR 2341', passenger_name: 'PATRICIJA  X' },
    { departure_date: '2026-06-01', departure_iata: 'LTN', arrival_iata: 'VNO', airline: 'Wizz Air', flight_number: 'W6 1234', passenger_name: 'Patricija X', cancelled: true },
    { departure_date: '2026-01-01', departure_iata: 'VNO', arrival_iata: 'BGY', airline: 'Ryanair', flight_number: 'FR100', passenger_name: 'Patricija X' },
    { departure_date: ' 2025-12-31', departure_iata: 'BGY', arrival_iata: 'VNO', airline: 'Ryanair', flight_number: 'FR101', passenger_name: 'Vidmantas Y' },
    { departure_date: null, departure_iata: 'VNO', arrival_iata: 'RIX', airline: 'airBaltic', flight_number: 'BT1', passenger_name: 'Patricija X' },
]

const count = (out: string) => Number(out.match(/^(\d+) flight/)?.[1] ?? 0)

// A cancelled booking was paid for but never flown: not a flight by default.
assert.equal(count(queryFlights(flights, { passenger: 'patricija' })), 3)
assert.equal(count(queryFlights(flights, { passenger: 'patricija', cancelled: 'include' })), 4)
assert.equal(count(queryFlights(flights, { passenger: 'patricija', cancelled: 'only' })), 1)

// Inclusive range on both ends; the stray leading space still counts; an
// undated flight cannot be placed in a range.
assert.equal(count(queryFlights(flights, { date_from: '2025-12-31', date_to: '2026-01-01' })), 2)
assert.equal(count(queryFlights(flights, { passenger: 'patricija', date_from: '2000-01-01' })), 2)

// Airport matches either end; codes and flight numbers ignore case and spaces.
assert.equal(count(queryFlights(flights, { airport: 'bgy' })), 2)
assert.equal(count(queryFlights(flights, { from: 'vno', to: 'ltn' })), 1)
assert.equal(count(queryFlights(flights, { flight_number: 'fr2341' })), 1)

assert.equal(queryFlights(flights, { passenger: 'nobody' }), 'No flights match these filters.')

// The model must see who flew and that a booking was cancelled.
assert.match(formatFlightLine(flights[1]), /passenger Patricija X/)
assert.match(formatFlightLine(flights[1]), /CANCELLED/)

// A malformed call must not reach the paid provider.
getFlightStatusForModel({ flight_number: 'FR1', date: 'tomorrow' }).then((out) => {
    assert.match(out, /did not run/)
    console.log('chat tools: all checks passed')
})
