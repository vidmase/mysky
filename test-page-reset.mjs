import assert from 'node:assert/strict'

/* Mirrors the paging arithmetic in app/flights/FlightsClient.tsx. The bug was not
   in matching — options and filtering share resolveAirlineName — but in the page
   surviving a filter change. Real booking counts from vidmaflights below. */
const ITEMS_PER_PAGE = 7
const BOOKINGS = { Ryanair: 157, easyJet: 8, 'Wizz Air': 7, airBaltic: 3, Jet2: 1, 'Tez Tour': 1 }

const pageOf = (total, page) => {
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const start = (page - 1) * ITEMS_PER_PAGE
  return { rows: Math.max(0, Math.min(total, start + ITEMS_PER_PAGE) - start), totalPages }
}

// Before: browsing Ryanair's page 3 and then picking any other airline emptied
// the table, because the page index carried over into a much shorter list.
for (const [carrier, count] of Object.entries(BOOKINGS)) {
  const { rows } = pageOf(count, 3)
  if (carrier === 'Ryanair') assert.ok(rows > 0, 'Ryanair has 23 pages, so it kept working')
  else assert.equal(rows, 0, `${carrier} went blank on page 3 — the reported symptom`)
}

// After: a filter change resets to the first page, so every carrier lists.
const afterFilterChange = 1
for (const [carrier, count] of Object.entries(BOOKINGS)) {
  const { rows } = pageOf(count, afterFilterChange)
  assert.ok(rows > 0, `${carrier} must list at least one booking`)
  assert.equal(rows, Math.min(count, ITEMS_PER_PAGE))
}

// The clamp covers a page falling off the end without the filters moving, such as
// deleting the only booking on the last page.
const clamp = (page, totalPages) => (page > totalPages ? Math.max(1, totalPages) : page)
assert.equal(clamp(3, 1), 1)
assert.equal(clamp(23, 23), 23, 'a page still in range is left alone')
assert.equal(clamp(1, 0), 1, 'an empty list must not land on page 0')

console.log('page reset: all assertions passed')
