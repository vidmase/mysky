import { NextResponse } from 'next/server'
import { resolveReadAccess } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/** Whether the signed-in user may only view (a family member) or also edit. */
export async function GET() {
  const access = await resolveReadAccess()
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ readOnly: access.readOnly })
}
