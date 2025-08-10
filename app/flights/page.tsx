import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { FlightsClient, type Flight, type FlightsCounts } from './FlightsClient'

// Define the Flight type based on the table schema
// Types re-exported from FlightsClient

export const dynamic = 'force-dynamic'

export default async function FlightsPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect('/auth')
  }

  const { data: flights, error } = await supabase
    .from('vidmaflights')
    .select('*')
    .eq('owner_id', session.user.id)
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
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading flights...</div>}>
      {/* Hydrate client UI with initial data */}
      <FlightsClient initialFlights={(flights as Flight[]) ?? []} initialCounts={counts} />
    </Suspense>
  )
}
