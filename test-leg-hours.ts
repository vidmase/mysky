import assert from 'node:assert/strict'
import { legHours } from './lib/statistics/leg-metrics'

const near = (a: number | null, b: number) => assert.ok(a != null && Math.abs(a - b) < 1e-6, `${a} != ${b}`)
const leg = (o: object) => ({ departure_date: '2026-07-02', ...o })

// Times on a ticket are local to each airport. Lithuania is two hours ahead of
// the UK, so the clocks overstate an eastbound leg by two hours and understate
// the return by two. "Time aloft" must be elapsed time, or a log with more
// eastbound legs than westbound reports hours that were never flown.
near(legHours(leg({ departure_iata: 'BRS', arrival_iata: 'KUN', departure_time: '06:15:00', arrival_time: '11:00:00', calculated_duration: '4h 45m' }), 1900).hours, 2.75)
near(legHours(leg({ departure_iata: 'KUN', arrival_iata: 'BRS', departure_time: '15:45:00', arrival_time: '16:40:00', calculated_duration: '0h 55m' }), 1900).hours, 2 + 55 / 60)

// A flight landing after midnight was stored as "-19h -50m" and counted as 19 hours.
// Tenerife keeps UK time, so 19:55 to 00:05 is 4h10.
near(legHours(leg({ departure_iata: 'BRS', arrival_iata: 'TFS', departure_time: '19:55:00', arrival_time: '00:05:00', calculated_duration: '-19h -50m' }), 2900).hours, 4 + 10 / 60)

// A mistyped arrival date (years after departure) must not enter the total: estimate from distance instead.
const bad = legHours({ departure_iata: 'VNO', arrival_iata: 'HRG', departure_date: '2010-03-26', arrival_date: '2025-03-01', departure_time: '09:00:00', arrival_time: '13:40:00', calculated_duration: '130900h 40m' }, 3200)
near(bad.hours, 3200 / 840 + 0.5)
assert.ok(bad.implausible != null && bad.implausible > 20)

// With no time zone on file for an airport the recorded duration is still the best available...
near(legHours(leg({ departure_iata: 'XXX', arrival_iata: 'YYY', departure_time: '10:00', arrival_time: '12:30', flight_duration: '2h 30m' }), 1500).hours, 2.5)
// ...but a negative one is a filing artefact, never hours flown.
near(legHours(leg({ departure_iata: 'XXX', arrival_iata: 'YYY', calculated_duration: '-19h -50m' }), 1680).hours, 2.5)

console.log('leg-hours: all assertions passed')
