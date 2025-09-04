import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Feature disabled
  return NextResponse.json({ error: 'Aircraft registration editing has been disabled' }, { status: 410 })
}

export const dynamic = 'force-dynamic'
