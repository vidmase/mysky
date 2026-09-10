'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

/**
 * Fires a single heartbeat when the landing page mounts. The global
 * <Heartbeat> in the root layout only starts polling 30s in, so this
 * preserves the immediate beat the old homepage sent.
 *
 * Gated on a session: the landing page is the public entry point, and an
 * anonymous POST here just earns a 401 on every visit.
 */
export function HomeHeartbeat() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    fetch('/api/heartbeat', { method: 'POST' }).catch(() => { })
  }, [user])

  return null
}
