import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { parseCSV } from '@/lib/csv'

export const dynamic = 'force-dynamic'

// Accepted headers (case-insensitive). Extra columns are ignored.
const FIELD_MAP: Record<string, string> = {
  passenger_name: 'passenger_name',
  reservation_number: 'reservation_number',
  flight_number: 'flight_number',
  departure_airport: 'departure_airport',
  arrival_airport: 'arrival_airport',
  departure_date: 'departure_date',
  departure_time: 'departure_time',
  arrival_time: 'arrival_time',
  arrival_date: 'arrival_date',
  airline: 'airline',
  departure_iata: 'departure_iata',
  arrival_iata: 'arrival_iata',
  seat: 'seat',
  notes: 'notes',
  total_receipt: 'total_receipt',
  purchased_date: 'purchased_date',
  purchase_time: 'purchase_time',
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase()
}

function toISODate(d?: string | null): string | null {
  if (!d) return null
  const s = String(d).trim()
  if (!s) return null
  // Allow already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const parsed = new Date(s)
  if (isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let csvText = ''
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
      csvText = await file.text()
    } else {
      csvText = await request.text()
      if (!csvText) return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }

    const { headers, rows } = parseCSV(csvText)
    if (!headers.length) return NextResponse.json({ error: 'No headers found' }, { status: 400 })

    const idxMap: Record<string, number> = {}
    headers.forEach((h, i) => {
      const norm = normalizeHeader(h)
      if (FIELD_MAP[norm]) idxMap[FIELD_MAP[norm]] = i
    })

    const required = ['departure_airport','arrival_airport','departure_date','departure_time','arrival_time']
    const missing = required.filter((k) => idxMap[k] === undefined)
    if (missing.length) {
      return NextResponse.json({ error: `Missing required columns: ${missing.join(', ')}` }, { status: 400 })
    }

    // Fetch existing flights to deduplicate (best-effort)
    const { data: existing, error: exErr } = await supabase
      .from('vidmaflights')
      .select('id,reservation_number,flight_number,departure_date')
      .eq('owner_id', user.id)
    if (exErr) {
      // Not fatal; proceed without dedupe
      console.error('Existing fetch error:', exErr.message)
    }
    const existingSet = new Set<string>()
    for (const f of existing || []) {
      const key = [f.reservation_number||'', f.flight_number||'', f.departure_date||''].join('|')
      existingSet.add(key)
    }

    const toInsert: any[] = []
    let skipped_duplicates = 0
    for (const r of rows) {
      const pick = (k: string) => {
        const i = idxMap[k]
        return i !== undefined ? r[i] : ''
      }
      const depDateISO = toISODate(pick('departure_date'))
      const arrDateISO = toISODate(pick('arrival_date')) || depDateISO

      const reservation_number = String(pick('reservation_number') || '').trim() || null
      const flight_number = String(pick('flight_number') || '').trim() || null

      const dedupeKey = [reservation_number||'', flight_number||'', depDateISO||''].join('|')
      if (existingSet.has(dedupeKey)) {
        skipped_duplicates++
        continue
      }

      const row = {
        owner_id: user.id,
        passenger_name: String(pick('passenger_name') || '').trim() || null,
        reservation_number,
        flight_number,
        departure_airport: String(pick('departure_airport') || '').trim(),
        arrival_airport: String(pick('arrival_airport') || '').trim(),
        departure_date: depDateISO,
        arrival_date: arrDateISO,
        departure_time: String(pick('departure_time') || '').trim(),
        arrival_time: String(pick('arrival_time') || '').trim(),
        airline: String(pick('airline') || '').trim() || null,
        departure_iata: String(pick('departure_iata') || '').trim() || null,
        arrival_iata: String(pick('arrival_iata') || '').trim() || null,
        seat: String(pick('seat') || '').trim() || null,
        notes: String(pick('notes') || '').trim() || null,
        total_receipt: String(pick('total_receipt') || '').trim() || null,
        purchased_date: toISODate(pick('purchased_date')),
        purchase_time: String(pick('purchase_time') || '').trim() || null,
      }

      // Basic validation
      if (!row.departure_airport || !row.arrival_airport || !row.departure_date || !row.departure_time || !row.arrival_time) {
        continue
      }
      toInsert.push(row)
      existingSet.add(dedupeKey)
    }

    if (!toInsert.length) {
      return NextResponse.json({ inserted: 0, skipped_duplicates, total_rows: rows.length })
    }

    const { data: inserted, error } = await supabase
      .from('vidmaflights')
      .insert(toInsert)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ inserted: inserted?.length || 0, skipped_duplicates, total_rows: rows.length })
  } catch (e: any) {
    console.error('CSV import error', e)
    return NextResponse.json({ error: e?.message || 'Import failed' }, { status: 500 })
  }
}
