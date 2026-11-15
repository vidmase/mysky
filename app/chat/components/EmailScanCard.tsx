'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ScanOutcome } from '@/lib/chat-email-scan'

/**
 * What the assistant's email scan found, under its reply. Nothing reaches the
 * log until the user presses Add: the import re-reads the same emails through
 * /api/gmail/import, which also skips anything already filed.
 */
export function EmailScanCard({ scan }: { scan: ScanOutcome }) {
  const [state, setState] = useState<'idle' | 'adding' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<string>('')

  if (!scan.ok) {
    if (scan.reason === 'gmail_not_connected' && scan.authUrl) {
      return (
        <div className="mt-3 rounded-lg border border-[var(--rule)] bg-[hsl(var(--card))] p-3 text-sm">
          <p className="mb-2">Gmail is not connected, so I could not read your email.</p>
          <Button size="sm" onClick={() => { window.location.href = scan.authUrl! }}>Connect Gmail</Button>
        </div>
      )
    }
    return null
  }
  if (scan.flights.length === 0) return null

  const emailIds = Array.from(new Set(scan.flights.map((f) => f.emailId)))

  const add = async () => {
    setState('adding')
    try {
      const res = await fetch('/api/gmail/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: emailIds }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401 && data?.authUrl) {
        window.location.href = data.authUrl
        return
      }
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`)
      const skipped = data.skipped_duplicates ? `, ${data.skipped_duplicates} already in your log` : ''
      setResult(`Added ${data.inserted ?? 0} flight${data.inserted === 1 ? '' : 's'}${skipped}.`)
      setState('done')
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Import failed')
      setState('error')
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-[var(--rule)] bg-[hsl(var(--card))] p-3 text-sm">
      <div className="mb-2 font-medium">
        {scan.flights.length} new flight{scan.flights.length === 1 ? '' : 's'} found in your email
      </div>
      <ul className="mb-3 space-y-1 font-mono text-xs">
        {scan.flights.map((f, i) => (
          <li key={`${f.emailId}-${i}`}>
            {f.date ?? '?'} · {f.flightNumber ?? '?'} · {f.from ?? '?'}→{f.to ?? '?'}
            {f.departs ? ` · ${f.departs}–${f.arrives ?? ''}` : ''}
            {f.fare ? ` · ${f.fare}` : ''}
          </li>
        ))}
      </ul>
      {state === 'done' || state === 'error' ? (
        <p className={state === 'error' ? 'text-[var(--vermillion)]' : ''}>{result}</p>
      ) : (
        <Button size="sm" onClick={add} disabled={state === 'adding'}>
          {state === 'adding' ? 'Adding…' : 'Add these flights'}
        </Button>
      )}
    </div>
  )
}
