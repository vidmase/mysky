import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/chat/reactions?messageId=...
export async function GET(request: Request) {
  const url = new URL(request.url)
  const messageId = url.searchParams.get('messageId')
  if (!messageId) {
    return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })
  }
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabase
    .from('chat_message_reactions')
    .select('reaction, user_id')
    .eq('message_id', messageId)
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 })
  }
  // Group by reaction type
  const grouped = data.reduce((acc, { reaction, user_id }) => {
    if (!acc[reaction]) acc[reaction] = []
    acc[reaction].push(user_id)
    return acc
  }, {} as Record<string, string[]>)
  return NextResponse.json({ reactions: grouped })
}

// POST /api/chat/reactions { messageId, reaction }
export async function POST(request: Request) {
  const { messageId, reaction } = await request.json()
  if (!messageId || !reaction) {
    return NextResponse.json({ error: 'Missing messageId or reaction' }, { status: 400 })
  }
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { error } = await supabase
    .from('chat_message_reactions')
    .upsert({
      message_id: messageId,
      user_id: session.user.id,
      reaction
    }, { onConflict: 'message_id,user_id,reaction' })
  if (error) {
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

// DELETE /api/chat/reactions { messageId, reaction }
export async function DELETE(request: Request) {
  const { messageId, reaction } = await request.json()
  if (!messageId || !reaction) {
    return NextResponse.json({ error: 'Missing messageId or reaction' }, { status: 400 })
  }
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { error } = await supabase
    .from('chat_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', session.user.id)
    .eq('reaction', reaction)
  if (error) {
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
} 