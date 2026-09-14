import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { FlightsClient, type FlightsCounts } from './FlightsClient'
import type { Flight } from '@/types/flight'

// Types re-exported from FlightsClient

export const dynamic = 'force-dynamic'

export default async function FlightsPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) {
    redirect('/auth')
  }

  // Clerk says this user is signed in, so never bounce them to /auth here: the
  // sign-in page redirects an authenticated user straight back, which loops.
  const userId = await resolveSupabaseUserId()
  if (!userId) {
    throw new Error(
      'No flight profile is linked to this account. Signed in with Clerk, but no matching row in the Supabase profiles table.'
    )
  }

  const supabase = createSupabaseServer()
  const { data: flights, error } = await supabase
    .from('vidmaflights')
    .select('*')
    .eq('owner_id', userId)
    .order('departure_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const now = new Date()
  const upcoming = (flights ?? []).filter((f) => new Date(f.departure_date as string) > now).length
  const counts: FlightsCounts = {
    total: flights?.length ?? 0,
    upcoming,
    past: (flights?.length ?? 0) - upcoming,
  }

  return (
    <div className="paper-stock">
      <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading flights...</div>}>
        {/* Hydrate client UI with initial data */}
        <FlightsClient initialFlights={(flights as Flight[]) ?? []} initialCounts={counts} />
      </Suspense>
    </div>
  )
}
