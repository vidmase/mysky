import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  const { messageId, pinned } = await request.json()
  if (!messageId || typeof pinned !== 'boolean') {
    return NextResponse.json({ error: 'Missing messageId or pinned' }, { status: 400 })
  }
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { error } = await supabase
    .from('chat_messages')
    .update({ pinned })
    .eq('id', messageId)
    .eq('user_id', session.user.id)
  if (error) {
    return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
} 