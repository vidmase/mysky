'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'

/**
 * The landing page replaces the app's <MainNav />, so it also has to carry
 * the sign-in affordance. Sends signed-in visitors straight to their log
 * instead of asking them to authenticate again.
 */
export function LandingAuthLink({ className }: { className?: string }) {
  const { user, loading } = useAuth()

  if (loading) {
    // Hold the slot so the nav baseline doesn't jump once auth resolves.
    return <span className={className} style={{ visibility: 'hidden' }} aria-hidden="true">Sign in</span>
  }

  return user ? (
    <Link href="/flights" className={className}>
      Open log
    </Link>
  ) : (
    <Link href="/auth" className={className}>
      Sign in
    </Link>
  )
}
