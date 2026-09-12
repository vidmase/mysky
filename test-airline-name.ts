import assert from 'node:assert/strict'
import { resolveAirlineName, airlineCodeFromFlightNumber } from './app/flights/lib/flight-utils'

// The rows that showed "Unknown" beside a correct Ryanair logo: the airline was
// never filed, but the flight number names the carrier — which is exactly how
// the logo was resolved. Values below are the real ones from vidmaflights.
assert.equal(resolveAirlineName(null, 'FR4121'), 'Ryanair')
assert.equal(resolveAirlineName(null, 'FR8682'), 'Ryanair')
assert.equal(resolveAirlineName('Unknown', 'FR 286'), 'Ryanair', 'spaced flight numbers must resolve')
assert.equal(resolveAirlineName('Unknown', 'FR8681'), 'Ryanair')
assert.equal(resolveAirlineName('', 'W6 1902'), 'Wizz Air')
assert.equal(resolveAirlineName(null, 'EZY2703'), 'easyJet', 'ICAO prefixes count too')
assert.equal(resolveAirlineName('Unknown', 'EZY6212'), 'easyJet')

// A filed airline always wins over the prefix — the record is the authority.
assert.equal(resolveAirlineName('Tez Tour', 'BA123'), 'Tez Tour')
assert.equal(resolveAirlineName('Ryanair', 'FR1214'), 'Ryanair')

// The same carrier filed under different spellings collapses to one name, or the
// airline filter lists it twice and the stats split it in half.
assert.equal(resolveAirlineName('EasyJet', 'EZY2341'), resolveAirlineName('easyJet', 'EZY2703'))
assert.equal(resolveAirlineName('Wizzair', 'W61913'), resolveAirlineName('Wizz Air', 'W6 1902'))

// A bare code filed as the name reads as the airline.
assert.equal(resolveAirlineName('FR', 'FR1214'), 'Ryanair')

// Nothing identifiable stays unidentified rather than being guessed at.
assert.equal(resolveAirlineName(null, null), null)
assert.equal(resolveAirlineName('Unknown', 'XX9999'), null, 'an unmapped prefix must not invent a carrier')
assert.equal(resolveAirlineName(null, '1234'), null)

assert.equal(airlineCodeFromFlightNumber('FR 286'), 'FR')
assert.equal(airlineCodeFromFlightNumber('W6 1902'), 'W6')

console.log('airline names: all assertions passed')
