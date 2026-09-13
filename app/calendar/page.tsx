import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { Archivo, Bodoni_Moda, Martian_Mono } from 'next/font/google'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { CalendarClient } from './CalendarClient'
import type { Flight } from "@/types/flight"

import '@/app/styles/paper.css'

export const dynamic = 'force-dynamic'

const display = Bodoni_Moda({ subsets: ['latin'], style: ['normal', 'italic'], weight: ['400', '500', '700'], variable: '--font-display', display: 'swap' })
const body = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' })
const code = Martian_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-code', display: 'swap' })

export default async function CalendarPage() {
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect('/auth')

  const userId = await resolveSupabaseUserId()
  if (!userId) throw new Error('No flight profile is linked to this account. Signed in with Clerk, but no matching row in the Supabase profiles table.')

  const supabase = createSupabaseServer()
  const { data: flights, error } = await supabase
    .from('vidmaflights').select('*').eq('owner_id', userId).order('departure_date', { ascending: false })
  if (error) throw new Error(error.message)

  return (
    <div className={`paper-stock ${display.variable} ${body.variable} ${code.variable}`}>
      <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading calendar...</div>}>
        <CalendarClient initialFlights={(flights as Flight[]) ?? []} />
      </Suspense>
    </div>
  )
}
