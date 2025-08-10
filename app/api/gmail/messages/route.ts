import { NextResponse } from 'next/server'
import { getAuthUrl, getGmailClient, getUserOAuth2Client } from '@/lib/google'
import { parseEmail } from '@/lib/gmail-parser'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function decodeBase64Url(data?: string | null): string {
  if (!data) return ''
  const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  return buff.toString('utf8')
}

function extractPlainText(payload: any): string {
  if (!payload) return ''
  const mimeType = payload.mimeType
  if (mimeType === 'text/plain') return decodeBase64Url(payload.body?.data)
  if (mimeType === 'text/html') {
    const html = decodeBase64Url(payload.body?.data)
    // Strip tags naively
    return html.replace(/<[^>]+>/g, ' ')
  }
  if (payload.parts && Array.isArray(payload.parts)) {
    // Prefer text/plain part
    const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain')
    if (plain) return extractPlainText(plain)
    // Fallback to first part text
    for (const p of payload.parts) {
      const text = extractPlainText(p)
      if (text) return text
    }
  }
  return ''
}

export async function GET() {
  try {
    const { client, hasToken } = await getUserOAuth2Client()
    if (!hasToken) {
      const url = getAuthUrl()
      return NextResponse.json({ error: 'not_connected', authUrl: url }, { status: 401 })
    }

    const gmail = getGmailClient(client)

    // Search for likely booking emails from last 2 years
    const q = [
      'newer_than:24m',
      '(subject:(booking OR reservation OR itinerary) OR "booking confirmation" OR "itinerary")',
      '(from:(ryanair.com OR easyjet.com OR britishairways.com OR ba.com OR lufthansa.com OR united.com OR delta.com OR aa.com))'
    ].join(' ')

    const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 10 })
    const ids = list.data.messages?.map((m: { id?: string | null }) => m.id as string).filter(Boolean) as string[] || []
    if (ids.length === 0) {
      return NextResponse.json({ parsed: null, reason: 'no_messages' })
    }

    for (const id of ids) {
      const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
      const subject = (msg.data.payload?.headers || []).find((h: { name?: string; value?: string }) => (h.name || '').toLowerCase() === 'subject')?.value || ''
      const bodyText = extractPlainText(msg.data.payload)
      const combined = `${subject}\n\n${bodyText}`
      const parsed = parseEmail(subject, combined)
      if (parsed) {
        return NextResponse.json({ parsed, subject })
      }
    }

    return NextResponse.json({ parsed: null, reason: 'no_parse' })
  } catch (e: any) {
    // If token expired or revoked, force re-auth
    const message = e?.message || 'Unknown error'
    console.error('GET /api/gmail/messages error:', e)
    if (message.includes('invalid_grant') || message.includes('unauthorized_client')) {
      return NextResponse.json({ error: 'reauthorize', authUrl: getAuthUrl() }, { status: 401 })
    }
    return NextResponse.json({ error: 'server_error', message }, { status: 500 })
  }
}
