'use client'
import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type React from 'react'

export function Heartbeat({ children }: { children: React.ReactNode }) {
  const supabase = createClientComponentClient()
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', user.id)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])
  return <>{children}</>
} 