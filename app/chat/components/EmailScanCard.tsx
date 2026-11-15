'use client'

import { Button } from '@/components/ui/button'
import { FlightReviewList } from '@/components/gmail/FlightReviewList'
import type { ScanOutcome } from '@/lib/chat-email-scan'

/** What the assistant's email scan found, under its reply, for the user to confirm. */
export function EmailScanCard({ scan }: { scan: ScanOutcome }) {
  if (!scan.ok) {
    if (scan.reason === 'gmail_not_connected') {
      return (
        <div className="mt-3 rounded-lg border border-[var(--rule)] bg-[hsl(var(--card))] p-3 text-sm">
          <p className="mb-2">Gmail is not connected, so I could not read your email.</p>
          <Button size="sm" onClick={() => { window.location.href = scan.authUrl }}>Connect Gmail</Button>
        </div>
      )
    }
    return null
  }
  if (!scan.legs.length && !scan.unreadable.length) return null

  return (
    <div className="mt-3 rounded-lg border border-[var(--rule)] bg-[hsl(var(--card))] p-3">
      <FlightReviewList legs={scan.legs} unreadable={scan.unreadable} />
    </div>
  )
}
