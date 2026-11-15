// The assistant answered "cheapest ticket of the last 6 months" with "First,
// the button: ..." because the history it was sent held four unanswered
// "I can't see the Add these flights button" questions and a reply that was
// raw tool markup. These checks fail if either can reach the model again, or
// if a tool call written as text is no longer recognised (the scan then never
// runs and the "Add these flights" card never appears).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { completedExchanges, containsToolMarkup, parseLeakedToolCall } from './lib/chat-history'

const LEAKED = `

<｜｜DSML｜｜ calls>
<｜｜DSML｜｜ invoke name="scan_email_for_flights">
<｜｜DSML｜｜ parameter name="start" string="true">2026-11-01</｜｜DSML｜｜ parameter>
<｜｜DSML｜｜ parameter name="end" string="true">2026-11-30</｜｜DSML｜｜ parameter>
</｜｜DSML｜｜ invoke>
</｜｜DSML｜｜ calls>`

// The transcript from the bug, oldest first.
const stored = [
  { role: 'user', content: 'how many flights in 2026?' },
  { role: 'assistant', content: 'You flew **24** flights in 2026.' },
  { role: 'user', content: 'i can not see Add these flights button' },
  { role: 'user', content: 'i can not see Add these flights button' },
  { role: 'user', content: 'there is one flight missing in november' },
  { role: 'assistant', content: LEAKED },
  { role: 'user', content: 'i can not see Add these flights button' },
  { role: 'user', content: 'when was the cheapest day of the last 6 months' },
]

const history = completedExchanges(stored)

// Only the one exchange that was actually answered survives.
assert.deepEqual(history, [
  { role: 'user', content: 'how many flights in 2026?' },
  { role: 'assistant', content: 'You flew **24** flights in 2026.' },
])

// No unanswered question and no markup is ever sent back to the model.
assert.ok(!history.some((m) => /button/.test(m.content)), 'unanswered questions must not be replayed')
assert.ok(!history.some((m) => containsToolMarkup(m.content)), 'tool markup must not be replayed')

// The history always alternates user/assistant, starting with the user.
history.forEach((m, i) => assert.equal(m.role, i % 2 === 0 ? 'user' : 'assistant'))

// A tool call written as text is read back so the scan can still run.
assert.deepEqual(parseLeakedToolCall(LEAKED), {
  name: 'scan_email_for_flights',
  args: { start: '2026-11-01', end: '2026-11-30' },
})
// Ordinary answers are not mistaken for tool calls.
assert.equal(parseLeakedToolCall('Your cheapest fare was **€14.99** on 2026-08-03.'), null)

// And the chat route must actually use both, not just have them available.
const route = readFileSync('app/api/chat/route.ts', 'utf8')
assert.match(route, /const history = completedExchanges\(/, 'chat route must build its history with completedExchanges')
assert.match(route, /parseLeakedToolCall\(/, 'chat route must recover tool calls written as text')

console.log(`chat history: ok (${history.length} of ${stored.length} messages kept)`)
