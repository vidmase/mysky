import { NextRequest, NextResponse } from 'next/server'
import { getFlightStatusByNumberAndDate } from '@/src/lib/services/flight-status'

export const revalidate = 300 // 5 min SWR

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const flightNumber = searchParams.get('flightNumber') || searchParams.get('number')
  const date = searchParams.get('date') // YYYY-MM-DD (local)
  const dateLocalRole = (searchParams.get('dateLocalRole') as 'Departure'|'Arrival'|'Both') || 'Departure'

  if (!flightNumber || !date) {
    return NextResponse.json({ error: 'Missing flightNumber or date (YYYY-MM-DD)' }, { status: 400 })
  }

  try {
    const data = await getFlightStatusByNumberAndDate(flightNumber, date, { dateLocalRole })
    return NextResponse.json({ flights: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch flight status' }, { status: 500 })
  }
}
