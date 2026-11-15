'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Viewer = { viewer_email: string; created_at: string }

/**
 * Šeima: emails of family members who may sign in and see this log without
 * changing it. Shown only to the log's owner.
 */
export function FamilyAccess() {
  const [viewers, setViewers] = useState<Viewer[] | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const res = await fetch('/api/family')
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
    setViewers(data.viewers)
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])

  const run = async (req: Promise<Response>) => {
    setBusy(true)
    setError('')
    try {
      const res = await req
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepavyko')
      return false
    } finally {
      setBusy(false)
    }
  }

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await run(fetch('/api/family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) }))
    if (ok) setEmail('')
  }

  const remove = (v: string) => run(fetch(`/api/family?email=${encodeURIComponent(v)}`, { method: 'DELETE' }))

  return (
    <section className="w-full max-w-md mt-6 bg-background border border-flight rounded-2xl shadow-xl p-6">
      <h2 className="text-lg font-semibold mb-1">Šeima</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Šeimos nariai prisijungia su savo el. paštu ir mato jūsų skrydžius, bet negali nieko pridėti, keisti ar ištrinti.
      </p>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <Input type="email" required placeholder="vardas@pastas.lt" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
        <Button type="submit" disabled={busy || !email.trim()}>Pridėti</Button>
      </form>
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      {viewers === null ? (
        <p className="text-sm text-muted-foreground">Kraunama…</p>
      ) : viewers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Dar niekas nepridėtas.</p>
      ) : (
        <ul className="space-y-2">
          {viewers.map((v) => (
            <li key={v.viewer_email} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{v.viewer_email}</span>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => remove(v.viewer_email)}>Pašalinti</Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
