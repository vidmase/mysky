import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { Archivo, Bodoni_Moda, Martian_Mono } from 'next/font/google'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { FlightsClient, type FlightsCounts } from './FlightsClient'
import type { Flight } from '@/types/flight'

import '@/app/styles/paper.css'

// Types re-exported from FlightsClient

export const dynamic = 'force-dynamic'

/* The logbook is printed on the same press as the landing page: a Didone for
   the display voice, a tight grotesk for running text, and a wide mono for
   anything that behaves like flight data. */
const display = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '700'],
  variable: '--font-display',
  display: 'swap',
})

const body = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

const code = Martian_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-code',
  display: 'swap',
})

const paperShell = `paper-stock ${display.variable} ${body.variable} ${code.variable}`

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
    <div className={paperShell}>
      <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading flights...</div>}>
        {/* Hydrate client UI with initial data */}
        <FlightsClient initialFlights={(flights as Flight[]) ?? []} initialCounts={counts} />
      </Suspense>
    </div>
  )
}
