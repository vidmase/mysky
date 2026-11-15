import { NextResponse } from 'next/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { normalizeViewerEmail } from '@/lib/family'

export const dynamic = 'force-dynamic'

// Family members who may view this owner's log. Owner-only: a viewer resolves
// to no owner id here, so cannot see or change who else has access.

export async function GET() {
  const ownerId = await resolveSupabaseUserId()
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await createSupabaseServer()
    .from('profile_viewers')
    .select('viewer_email, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ viewers: data })
}

export async function POST(req: Request) {
  const ownerId = await resolveSupabaseUserId()
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const email = normalizeViewerEmail(body?.email)
  if (!email) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })

  const supabase = createSupabaseServer()
  // Someone with a log of their own always sees that log, never this one.
  const { data: own, error: ownErr } = await supabase.from('profiles').select('id').ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`)).limit(1)
  if (ownErr) return NextResponse.json({ error: ownErr.message }, { status: 500 })
  if (own?.length) {
    return NextResponse.json(
      { error: own[0].id === ownerId ? 'That is your own email' : 'That person has their own flight log, so they would see theirs, not yours' },
      { status: 409 }
    )
  }

  const { error } = await supabase
    .from('profile_viewers')
    .upsert({ owner_id: ownerId, viewer_email: email }, { onConflict: 'owner_id,viewer_email', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, email })
}

export async function DELETE(req: Request) {
  const ownerId = await resolveSupabaseUserId()
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = normalizeViewerEmail(new URL(req.url).searchParams.get('email'))
  if (!email) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  const { error } = await createSupabaseServer()
    .from('profile_viewers')
    .delete()
    .eq('owner_id', ownerId)
    .eq('viewer_email', email)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
