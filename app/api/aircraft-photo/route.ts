import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Aircraft photo feature has been disabled' }, { status: 410 })
}
