import assert from 'node:assert/strict'

process.env.API_KEY_ENCRYPTION_SECRET = 'test-secret-with-enough-entropy-0123456789'

;(async () => {
  const { encodeOAuthState, decodeOAuthState, safeReturnOrigin } = await import('./lib/google')

  // Google always returns to mysky.vercel.app, where someone signed in on
  // mysky.daugvila.lt has no session. The state must carry who is connecting
  // and where to send them back, or the token cannot be saved.
  const now = 1_800_000_000_000
  const state = encodeOAuthState('profile-123', 'https://mysky.daugvila.lt', now)
  assert.deepEqual(decodeOAuthState(state, now + 60_000), { dbUserId: 'profile-123', returnOrigin: 'https://mysky.daugvila.lt' })

  // Whoever holds a valid state decides whose profile gets the Gmail token, so
  // an edited, invented or old state must be refused rather than trusted.
  const tampered = state.slice(0, -4) + (state.endsWith('AAAA') ? 'BBBB' : 'AAAA')
  assert.equal(decodeOAuthState(tampered, now), null)
  assert.equal(decodeOAuthState(Buffer.from(JSON.stringify({ u: 'someone-else', t: now })).toString('base64url'), now), null)
  assert.equal(decodeOAuthState(state, now + 31 * 60 * 1000), null)
  assert.equal(decodeOAuthState(null, now), null)

  // The return address comes from the state, so it is limited to the app's own
  // domains: the callback must never become a redirect to an outside site.
  assert.equal(safeReturnOrigin('https://mysky.daugvila.lt', 'https://mysky.vercel.app'), 'https://mysky.daugvila.lt')
  assert.equal(safeReturnOrigin('https://evil.example', 'https://mysky.vercel.app'), 'https://mysky.vercel.app')
  assert.equal(safeReturnOrigin('https://mysky.daugvila.lt.evil.example', 'https://mysky.vercel.app'), 'https://mysky.vercel.app')
  assert.equal(safeReturnOrigin(undefined, 'https://mysky.vercel.app'), 'https://mysky.vercel.app')

  console.log('gmail-oauth-state: all assertions passed')
})().catch((e) => { console.error(e); process.exit(1) })
