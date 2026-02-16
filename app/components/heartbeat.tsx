'use client'
import { useEffect } from 'react'
import type React from 'react'
import { useAuth } from '@/contexts/auth-context'

export function Heartbeat({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      try {
        await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      } catch (e) {
        // Silently ignore heartbeat failures
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

  return <>{children}</>
}