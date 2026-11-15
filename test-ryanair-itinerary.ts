import assert from 'node:assert/strict'
import { itineraryToFlights, parseRyanairItinerary } from './lib/ryanair-itinerary'

// Text taken from real Ryanair itineraries, one per layout Ryanair has used.
// The old readers kept one flight per email (every return leg was lost) and
// misread the current layout into airports like "DTD".

// Current layout (2019-now), a return trip: both legs, the whole booking's fare, every passenger.
const current = parseRyanairItinerary(
  'Ryanair Travel Itinerary myRyanair Destination:: Gran Canaria Reservation: EY3KYH Your flight information ' +
  'To Gran Canaria FR4757 Bristol - Gran Canaria Wed, 04 Nov 26 Departure time - 13:35 Arrival time - 17:45 (BRS) - (LPA) ' +
  'To Bristol FR4758 Gran Canaria - Bristol Sat, 07 Nov 26 Departure time - 11:45 Arrival time - 15:50 (LPA) - (BRS) ' +
  'Passenger(s): Mr VIDMANTAS DAUGVILA ● Flight out: FR4757 ● Flight back: FR4758 Mrs VAIDA VAITKEVICIUTE DAUGVILE ● Flight out: FR4757 ● ' +
  'Receipt: Total price of your trip purchased via Visa Debit / Delta ending in: 7345 239.20 GBP VAT is not applicable'
)
assert.ok(current)
assert.equal(current.reservation_number, 'EY3KYH')
assert.equal(current.total_receipt, 'GBP 239.20')
assert.equal(current.passenger_name, 'Mr VIDMANTAS DAUGVILA, Mrs VAIDA VAITKEVICIUTE DAUGVILE')
assert.deepEqual(current.legs.map((l) => `${l.departure_date} ${l.flight_number} ${l.departure_iata}-${l.arrival_iata} ${l.departure_time}-${l.arrival_time}`), [
  '2026-11-04 FR4757 BRS-LPA 13:35-17:45',
  '2026-11-07 FR4758 LPA-BRS 11:45-15:50',
])

// Airport names with brackets, and a landing after midnight: the arrival is the next day.
const late = parseRyanairItinerary(
  '<p>Reservation: TVJT9X</p><p>To Tenerife (South) FR4753 Bristol - Tenerife (South) Thu, 17 Apr 25 Departure time - 19:55 Arrival time - 00:05 (BRS) - (TFS)</p> Total price 36.74 GBP'
)
assert.equal(late?.legs[0].departure_airport, 'Bristol')
assert.equal(late?.legs[0].arrival_airport, 'Tenerife (South)')
assert.equal(late?.legs[0].arrival_date, '2025-04-18')

// 2015-2018 layout.
const y2015 = parseRyanairItinerary(
  'Reservation: OMNZJW Status: CONFIRMED To Kaunas : FR8681 DEPART: Bristol (BRS) DATE: Tue, 11 Aug 15 TIME: 08:45 ARRIVAL: Kaunas (KUN) DATE: Tue, 11 Aug 15 TIME: 13:35 ' +
  'From Kaunas : FR8682 DEPART: Kaunas (KUN) DATE: Sat, 22 Aug 15 TIME: 07:25 ARRIVAL: Bristol (BRS) DATE: Sat, 22 Aug 15 TIME: 08:20 PASSENGER(S): Mr VIDMANTAS DAUGVILA No travel insurance? RECEIPT: Total paid 190.98 GBP'
)
assert.deepEqual(y2015?.legs.map((l) => `${l.departure_date} ${l.flight_number} ${l.departure_iata}-${l.arrival_iata}`), ['2015-08-11 FR8681 BRS-KUN', '2015-08-22 FR8682 KUN-BRS'])
assert.equal(y2015?.total_receipt, 'GBP 190.98')

// 2013-2015 layout.
const y2014 = parseRyanairItinerary(
  'FLIGHT RESERVATION NUMBER VI48QM FLIGHT STATUS CONFIRMED From Bristol to Kaunas (FR8681) DEPART (BRS) Bristol ARRIVAL (KUN) Kaunas Wed 05 Mar 2014 15:45 hrs Wed 05 Mar 2014 20:15 hrs Book Airport carpark ' +
  'From Kaunas to Bristol (FR8682) DEPART (KUN) Kaunas ARRIVAL (BRS) Bristol Sun 09 Mar 2014 08:10 hrs Sun 09 Mar 2014 09:15 hrs PASSENGER(S) Mr VIDMANTAS DAUGVILA'
)
assert.deepEqual(y2014?.legs.map((l) => `${l.departure_date} ${l.flight_number} ${l.departure_time}-${l.arrival_time}`), ['2014-03-05 FR8681 15:45-20:15', '2014-03-09 FR8682 08:10-09:15'])

// 2010-2013 layout.
const y2012 = parseRyanairItinerary(
  'YOUR RESERVATION NUMBER IS: AYSVRS GOING OUT From Bristol (BRS) to Kaunas (KUN) Fri, 01Jun12 Flight FR8681 Depart BRS at 17:05 and arrive KUN at 21:55 ' +
  'COMING BACK From Kaunas (KUN) to Bristol (BRS) Mon, 11Jun12 Flight FR8682 Depart KUN at 22:20 and arrive BRS at 23:10 PASSENGERS 1. MR VIDMANTAS DAUGVILA ADT ' +
  'PAYMENT DETAILS ********86.98 GBP Total Fare *******157.29 GBP Total Paid'
)
assert.deepEqual(y2012?.legs.map((l) => `${l.departure_date} ${l.flight_number} ${l.departure_iata}-${l.arrival_iata}`), ['2012-06-01 FR8681 BRS-KUN', '2012-06-11 FR8682 KUN-BRS'])
assert.equal(y2012?.total_receipt, 'GBP 157.29')
assert.equal(y2012?.passenger_name, 'MR VIDMANTAS DAUGVILA')

// Anything that is not an itinerary is left to the other readers, not guessed at.
assert.equal(parseRyanairItinerary('RT6W8Q | Check in online for your trip to Kaunas. Avoid a check-in fee at the airport'), null)
assert.equal(parseRyanairItinerary('easyJet booking reference: K91FM3V London Luton to Tenerife South EZY2341'), null)

// Each leg becomes a flight the import can save, bought on the day the email arrived.
const flights = itineraryToFlights(current, 'Sun, 11 Oct 2026 10:23:12 +0000')
assert.equal(flights.length, 2)
assert.equal(flights[1].purchased_date, '2026-10-11')
assert.equal(flights[1].airline, 'Ryanair')
assert.equal(flights[1].reservation_number, 'EY3KYH')

console.log('ryanair-itinerary: all assertions passed')
