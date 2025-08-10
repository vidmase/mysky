import { NextResponse } from 'next/server'
import { createOAuth2Client, saveRefreshTokenToUser } from '@/lib/google'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  if (error) return NextResponse.redirect(new URL('/add-flight?gmail=error', url.origin))
  if (!code) return NextResponse.redirect(new URL('/add-flight?gmail=missing_code', url.origin))

  try {
    const oAuth2 = createOAuth2Client()
    const { tokens } = await oAuth2.getToken(code)
    const refresh = tokens.refresh_token
    const idToken = tokens.id_token

    // Save refresh token if present
    if (refresh) {
      // Optionally get email from id_token
      let email: string | null = null
      if (idToken) {
        try {
          const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString())
          email = payload?.email ?? null
        } catch {
          // ignore
        }
      }
      await saveRefreshTokenToUser(refresh, email)
    }
    // Redirect back; if no refresh token returned (already granted), user can still fetch messages
    return NextResponse.redirect(new URL('/add-flight?gmail=connected', url.origin))
  } catch (e) {
    return NextResponse.redirect(new URL('/add-flight?gmail=exchange_failed', url.origin))
  }
}
