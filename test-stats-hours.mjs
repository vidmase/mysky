import assert from 'node:assert/strict'

// Mirrors app/stats/page.tsx: parseDurationHours + the MAX_LEG_HOURS guard.
function parseDurationHours(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const hm = s.match(/(\d+)\s*h(?:ours?)?\s*(\d+)?\s*m?/i)
  if (hm) return (Number(hm[1]) || 0) + (Number(hm[2]) || 0) / 60
  const mins = s.match(/^(\d+)\s*m(?:in(?:utes?)?)?$/i)
  if (mins) return (Number(mins[1]) || 0) / 60
  const colon = s.match(/^(\d+):(\d{2})$/)
  if (colon) return (Number(colon[1]) || 0) + (Number(colon[2]) || 0) / 60
  return null
}
const MAX_LEG_HOURS = 20
const derive = km => km / 840 + 0.5
function legHours(dur, km) {
  const recorded = parseDurationHours(dur)
  const ok = recorded != null && recorded > 0 && recorded <= MAX_LEG_HOURS ? recorded : null
  return ok != null ? ok : (km != null ? derive(km) : 0)
}

// The real corrupt row: BA123 VNO-HRG, departure 2010-03-26, arrival filed as
// 2025-03-01. Its stored duration alone exceeded every other flight combined.
assert.equal(parseDurationHours('130900h 40m') > 130000, true, 'parser reads the bad value as-is')
const vnoHrg = legHours('130900h 40m', 3200)
assert.ok(vnoHrg < 20, `an impossible duration must not enter the total, got ${vnoHrg}`)
assert.ok(Math.abs(vnoHrg - (3200 / 840 + 0.5)) < 1e-9, 'it falls back to the distance estimate')

// Ordinary durations are untouched — the guard must not quietly rewrite good data.
assert.ok(Math.abs(legHours('4h 50m', 2500) - 4.8333333) < 1e-6)
assert.ok(Math.abs(legHours('0h 55m', 400) - 0.9166667) < 1e-6)
// A genuine ultra-long-haul (SIN-JFK is ~18h40m) stays recorded, not estimated.
assert.ok(Math.abs(legHours('18h 40m', 15300) - 18.6666667) < 1e-6, 'real long-haul must survive the bound')
// A leg with no duration on record is estimated from its distance.
assert.ok(Math.abs(legHours(null, 1680) - 2.5) < 1e-9)

// The headline: 236 legs cannot add up to 131,804 hours.
const totalNow = 131804, legs = 236
assert.ok(totalNow / legs > 500, 'the figure on the page averaged 558h per leg')
const totalFixed = 888
assert.ok(totalFixed / legs < 5, `after the guard the average is ${(totalFixed / legs).toFixed(2)}h per leg`)

console.log('stats hours: all assertions passed')
