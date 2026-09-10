import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { CalendarClient } from './CalendarClient'
import type { Flight } from "@/types/flight"

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const { userId: clerkId } = await auth()

  if (!clerkId) {
    redirect('/auth')
  }

  // Same as /flights: an authenticated user must not be sent to /auth, which
  // redirects them right back here and loops.
  const userId = await resolveSupabaseUserId()
  if (!userId) {
    throw new Error(
      'No flight profile is linked to this account. Signed in with Clerk, but no matching row in the Supabase profiles table.'
    )
  }

  const supabase = createSupabaseServer()
  // Fetch flights data for calendar
  const { data: flights, error } = await supabase
    .from('vidmaflights')
    .select('*')
    .eq('owner_id', userId)
    .order('departure_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Flight Calendar
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Visualize your flights in calendar view
        </p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading calendar...</p>
          </div>
        </div>
      }>
        <CalendarClient initialFlights={(flights as Flight[]) ?? []} />
      </Suspense>
    </div>
  )
}
