import { NextResponse } from 'next/server'
import { createOAuth2Client, decodeOAuthState, safeReturnOrigin, saveRefreshTokenToUser } from '@/lib/google'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  // Who is connecting and where they started, carried through Google in the
  // sealed state, so this works without a session on the callback's domain.
  const state = decodeOAuthState(url.searchParams.get('state'))
  const back = safeReturnOrigin(state?.returnOrigin, url.origin)
  if (error) return NextResponse.redirect(new URL('/add-flight?gmail=error', back))
  if (!code) return NextResponse.redirect(new URL('/add-flight?gmail=missing_code', back))

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
      await saveRefreshTokenToUser(refresh, email, state?.dbUserId)
    }
    // Redirect back; if no refresh token returned (already granted), user can still fetch messages
    return NextResponse.redirect(new URL('/add-flight?gmail=connected', back))
  } catch (e: any) {
    console.error('[Gmail OAuth Callback] Token exchange failed:', e?.message || e)

    try {
      const fs = require('fs')
      const path = require('path')
      const logPath = path.join(process.cwd(), 'gmail-auth-debug.log')
      const errorMsg = `[${new Date().toISOString()}] Token exchange failed: ${e?.message || e}\nFull Error: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}\n`
      fs.appendFileSync(logPath, errorMsg)
      if (e?.response?.data) {
        fs.appendFileSync(logPath, `Google API Error Data: ${JSON.stringify(e.response.data)}\n`)
      }
    } catch {
      // ignore
    }

    return NextResponse.redirect(new URL('/add-flight?gmail=exchange_failed', back))
  }
}
