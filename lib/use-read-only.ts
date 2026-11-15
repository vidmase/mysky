'use client'

import { useEffect, useState } from 'react'

let pending: Promise<boolean> | null = null

/**
 * True for family members, who may look but not change anything; null until
 * known. Hide edit controls unless this is false, so they never flash up for a
 * viewer; redirect only when it is true. The server refuses viewers' writes
 * regardless; this only tidies the UI.
 */
export function useReadOnly(): boolean | null {
  const [readOnly, setReadOnly] = useState<boolean | null>(null)
  useEffect(() => {
    pending ??= fetch('/api/me')
      .then((r) => (r.ok ? r.json() : { readOnly: true }))
      .then((d) => d.readOnly !== false)
      .catch(() => {
        pending = null
        return true
      })
    let live = true
    pending.then((v) => live && setReadOnly(v))
    return () => {
      live = false
    }
  }, [])
  return readOnly
}
