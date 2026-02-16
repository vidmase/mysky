import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { stringifyCSV } from '@/lib/csv'

export const dynamic = 'force-dynamic'

const HEADERS = [
  'passenger_name',
  'reservation_number',
  'flight_number',
  'departure_airport',
  'arrival_airport',
  'departure_date',
  'departure_time',
  'arrival_time',
  'arrival_date',
  'airline',
  'departure_iata',
  'arrival_iata',
  'seat',
  'notes',
  'total_receipt',
  'purchased_date',
  'purchase_time',
]

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServer()
    const userId = await resolveSupabaseUserId()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start') || undefined
    const end = searchParams.get('end') || undefined

    let query = supabase
      .from('vidmaflights')
      .select('*')
      .eq('owner_id', userId)

    if (start) query = query.gte('departure_date', start)
    if (end) query = query.lte('departure_date', end)

    const { data: flights, error } = await query.order('departure_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (flights || []).map((f: any) => [
      f.passenger_name,
      f.reservation_number,
      f.flight_number,
      f.departure_airport,
      f.arrival_airport,
      f.departure_date,
      f.departure_time,
      f.arrival_time,
      f.arrival_date,
      f.airline,
      f.departure_iata,
      f.arrival_iata,
      f.seat,
      f.notes,
      f.total_receipt,
      f.purchased_date,
      f.purchase_time,
    ])

    const csv = stringifyCSV(HEADERS, rows)

    const now = new Date()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const rangeSuffix = start || end ? `_${start ?? 'start'}_${end ?? 'end'}` : ''
    const filename = `flights${rangeSuffix}_${yyyy}${mm}${dd}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Export failed' }, { status: 500 })
  }
}
