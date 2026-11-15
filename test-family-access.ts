// Family members get read-only access. These checks fail if a change would let
// a viewer write: every handler that changes data must resolve the user with
// resolveSupabaseUserId (owners only), never resolveReadAccess (owners + viewers).
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeViewerEmail } from './lib/family'

// Stored emails must match how sign-in looks them up (trimmed, lowercase), or
// an added family member would silently never get access.
assert.equal(normalizeViewerEmail('  Mama@Example.LT '), 'mama@example.lt')
assert.equal(normalizeViewerEmail('not-an-email'), null)
assert.equal(normalizeViewerEmail('a@b'), null)
assert.equal(normalizeViewerEmail('two words@x.lt'), null)
assert.equal(normalizeViewerEmail(42), null)

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? routes(p) : n === 'route.ts' ? [p] : []
  })
}

let checked = 0
for (const file of routes('app/api')) {
  const src = readFileSync(file, 'utf8')
  const starts = Array.from(src.matchAll(/export async function (\w+)/g))
  starts.forEach((m, i) => {
    if (!/^(POST|PUT|PATCH|DELETE)$/.test(m[1])) return
    const body = src.slice(m.index!, starts[i + 1]?.index ?? src.length)
    checked++
    assert.ok(!body.includes('resolveReadAccess'), `${file} ${m[1]} must not grant viewers write access`)
  })
}
assert.ok(checked > 10, `expected to inspect many write handlers, saw ${checked}`)

// The family list itself is owner-only, so a viewer cannot add others.
const family = readFileSync('app/api/family/route.ts', 'utf8')
assert.ok(!family.includes('resolveReadAccess'), 'family management must be owner-only')

console.log(`family access: ok (${checked} write handlers checked)`)
