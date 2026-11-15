'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { PlannedLeg } from '@/lib/email-flights/plan'
import type { Unreadable } from '@/lib/email-flights/gmail-scan'

type CommitResponse = {
  added: { date: string; flightNumber: string; from: string; to: string }[]
  skipped: { flight: string; reason: string }[]
}

const STATUS_LABEL: Record<PlannedLeg['status'], string> = {
  new: 'New',
  changed: 'Booking changed',
  in_log: 'Already in your log',
}

/**
 * What a Gmail scan found, for the user to confirm. New flights are ticked,
 * changed bookings are not (the user decides), flights already filed cannot be
 * ticked, and unreadable emails are listed so they can be added by hand.
 * Saving sends the sealed rows, so what is saved is exactly what is shown.
 */
export function FlightReviewList({
  legs,
  unreadable,
  onAdded,
}: {
  legs: PlannedLeg[]
  unreadable: Unreadable[]
  onAdded?: (result: CommitResponse) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(legs.filter((l) => l.status === 'new' && l.token).map((l) => l.token!))
  )
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<CommitResponse | null>(null)
  const [error, setError] = useState('')

  const addable = useMemo(() => legs.filter((l) => l.token), [legs])

  const toggle = (token: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(token)) next.delete(token)
      else next.add(token)
      return next
    })

  const save = async () => {
    setState('saving')
    setError('')
    try {
      const res = await fetch('/api/gmail/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: Array.from(selected) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setResult(data)
      setState('done')
      onAdded?.(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
      setState('error')
    }
  }

  if (!legs.length && !unreadable.length) {
    return <p className="text-sm text-[var(--ink-3)]">No flight confirmation emails for those dates.</p>
  }

  return (
    <div className="space-y-3 text-sm">
      {legs.length > 0 && addable.length === 0 && (
        <p>
          Nothing new to add: {legs.length === 1 ? 'the flight' : `all ${legs.length} flights`} found in your email for these dates{' '}
          {legs.length === 1 ? 'is' : 'are'} already in your log.
        </p>
      )}
      {legs.length > 0 && (
        <ul className="space-y-1">
          {legs.map((l, i) => {
            const d = l.display
            const checkable = !!l.token && state !== 'done'
            return (
              <li key={l.token ?? `${d.date}-${d.flightNumber}-${i}`} className={l.status === 'in_log' ? 'opacity-50' : ''}>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    disabled={!checkable}
                    checked={!!l.token && selected.has(l.token)}
                    onChange={() => l.token && toggle(l.token)}
                    aria-label={`${d.date} ${d.flightNumber} ${d.from} to ${d.to}`}
                  />
                  <span>
                    <span className="font-mono text-xs">
                      {d.date} · {d.flightNumber} · {d.from}→{d.to} · {d.departs}–{d.arrives}
                    </span>
                    <span className="block text-xs text-[var(--ink-3)]">
                      {STATUS_LABEL[l.status]} · {d.airline} {d.reference}
                      {d.fare ? ` · ${d.fare}` : ''}
                      {d.passengers ? ` · ${d.passengers}` : ''}
                    </span>
                    {l.note && <span className="block text-xs text-[var(--vermillion)]">{l.note}</span>}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {unreadable.length > 0 && (
        <div className="text-xs text-[var(--ink-3)]">
          <p className="font-medium">Couldn&apos;t read {unreadable.length} email{unreadable.length === 1 ? '' : 's'} (not added; add by hand if needed):</p>
          <ul className="list-disc pl-5">
            {unreadable.slice(0, 10).map((u, i) => (
              <li key={i}>
                {u.subject || '(no subject)'} · {u.receivedAt.slice(0, 10)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state === 'done' && result ? (
        <p>
          Added {result.added.length} flight{result.added.length === 1 ? '' : 's'}.
          {result.skipped.length > 0 && ` Skipped ${result.skipped.map((s) => `${s.flight} (${s.reason})`).join('; ')}.`}
        </p>
      ) : addable.length > 0 ? (
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={save} disabled={!selected.size || state === 'saving'}>
            {state === 'saving' ? 'Adding…' : `Add ${selected.size} selected`}
          </Button>
          {state === 'error' && <span className="text-[var(--vermillion)]">{error}</span>}
        </div>
      ) : null}
    </div>
  )
}
