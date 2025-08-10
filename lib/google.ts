import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

export function createOAuth2Client(redirectUri?: string): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirect = redirectUri || process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirect) {
    throw new Error('Missing Google OAuth env vars (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI)')
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirect)
}

export function getAuthUrl(): string {
  const oAuth2Client = createOAuth2Client()
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent', // ensure refresh_token the first time
  })
}

export async function getSupabaseUser() {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return { supabase, user: null as const }
  return { supabase, user: data.user }
}

export async function saveRefreshTokenToUser(refresh_token: string, email?: string | null) {
  const { supabase, user } = await getSupabaseUser()
  if (!user) throw new Error('Not authenticated')
  const metadata = {
    ...(user.user_metadata || {}),
    gmail_refresh_token: refresh_token,
    gmail_email: email || user.email || null,
  }
  const { error } = await supabase.auth.updateUser({ data: metadata })
  if (error) throw error
}

export async function getUserOAuth2Client(): Promise<{ client: OAuth2Client; hasToken: boolean; email: string | null }> {
  const { user } = await getSupabaseUser()
  const client = createOAuth2Client()
  if (!user) return { client, hasToken: false, email: null }
  const refresh = (user.user_metadata as any)?.gmail_refresh_token as string | undefined
  const email = ((user.user_metadata as any)?.gmail_email as string | undefined) || user.email || null
  if (!refresh) return { client, hasToken: false, email }
  client.setCredentials({ refresh_token: refresh })
  return { client, hasToken: true, email }
}

export function getGmailClient(auth: OAuth2Client) {
  return google.gmail({ version: 'v1', auth })
}
