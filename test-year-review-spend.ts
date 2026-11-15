import assert from 'node:assert/strict'
import { buildYearReview, toLegs } from './lib/year-review'

// A year's fares arrive in whatever each airline charged. Two pound bookings and
// one euro booking are not "one total in pounds": the story must headline the
// currency most of the year was filed in and report the rest beside it, never
// add the two together.
const flights: any[] = [
  { id: 1, reservation_number: 'GBPONE', total_receipt: 'GBP 100.00', departure_date: '2024-03-01', departure_iata: 'BRS', arrival_iata: 'KUN' },
  { id: 2, reservation_number: 'GBPTWO', total_receipt: '50.00 GBP', departure_date: '2024-04-01', departure_iata: 'KUN', arrival_iata: 'BRS' },
  { id: 3, reservation_number: 'EURONE', total_receipt: 'EUR 300.00', departure_date: '2024-05-01', departure_iata: 'VNO', arrival_iata: 'MLA' },
]
const review = buildYearReview(toLegs(flights), flights, 2024)

assert.equal(review.currency, 'GBP')
assert.equal(review.spend?.total, 150)
assert.equal(review.spend?.bookings, 2)
assert.equal(review.spend?.average, 75)
assert.equal(review.spend?.cheapest?.amount, 50)
assert.deepEqual(review.spend?.others, [{ currency: 'EUR', total: 300, bookings: 1 }])

console.log('year-review-spend: all assertions passed')
