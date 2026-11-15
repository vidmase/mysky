'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { GmailScanResult } from '@/lib/email-flights/gmail-scan'
import { FlightReviewList } from './FlightReviewList'

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** The flights page's Gmail import: pick departure dates, scan, review, add. */
export function GmailImportDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded?: () => void
}) {
  const today = new Date()
  const [start, setStart] = useState(() => iso(new Date(today.getTime() - 90 * 86400000)))
  const [end, setEnd] = useState(() => iso(new Date(today.getTime() + 365 * 86400000)))
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<GmailScanResult | null>(null)
  const [scanId, setScanId] = useState(0)

  const scan = async () => {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/gmail/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start, end }),
      })
      const data = await res.json().catch(() => ({ ok: false, reason: 'scan_failed', detail: `HTTP ${res.status}` }))
      setResult(data)
      setScanId((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from Gmail</DialogTitle>
          <DialogDescription>
            Reads Ryanair, Wizz Air and easyJet booking confirmations for flights departing between these dates. Nothing is
            added until you confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            From
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="text-sm">
            To
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <Button onClick={scan} disabled={busy || !start || !end || start > end}>
            {busy ? 'Reading your email…' : 'Scan email'}
          </Button>
        </div>

        {result && !result.ok && result.reason === 'gmail_not_connected' && (
          <div className="text-sm">
            <p className="mb-2">Gmail is not connected.</p>
            <Button size="sm" onClick={() => { window.location.href = result.authUrl }}>Connect Gmail</Button>
          </div>
        )}
        {result && !result.ok && result.reason !== 'gmail_not_connected' && (
          <p className="text-sm text-[var(--vermillion)]">The scan did not run: {result.detail}</p>
        )}
        {result?.ok && (
          <>
            <p className="text-xs text-[var(--ink-3)]">
              Read {result.emailsRead} confirmation email{result.emailsRead === 1 ? '' : 's'}
              {result.truncated ? ' (the most recent 300 only; narrow the dates to see older ones)' : ''}.
            </p>
            <FlightReviewList key={scanId} legs={result.legs} unreadable={result.unreadable} onAdded={() => onAdded?.()} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
