import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

export function createOAuth2Client(redirectUri?: string): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  // Determine redirect URI based on environment
  let redirect = redirectUri
  if (!redirect) {
    // First try to use the explicit redirect URI from environment
    if (process.env.GOOGLE_REDIRECT_URI) {
      redirect = process.env.GOOGLE_REDIRECT_URI
    } else {
      // Fallback to dynamic calculation
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000'
      redirect = `${baseUrl}/api/gmail/callback`
    }
  }

  // Log the redirect URI for debugging (remove in production)
  console.log('Google OAuth Redirect URI:', redirect)
  try {
    const fs = require('fs')
    const path = require('path')
    const logPath = path.join(process.cwd(), 'gmail-auth-debug.log')
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] createOAuth2Client Redirect URI: ${redirect}\n`)
  } catch (e) {
    // ignore fs errors
  }

  if (!clientId || !clientSecret || !redirect) {
    throw new Error('Missing Google OAuth env vars (GOOGLE_CLIENT_ID/SECRET)')
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirect)
}

export function getAuthUrl(): string {
  const oAuth2Client = createOAuth2Client()
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent', // ensure refresh_token the first time
  })

  // Log the auth URL for debugging (remove in production)
  console.log('Google OAuth Auth URL:', authUrl)

  return authUrl
}

/**
 * Get the current user from Clerk auth and the Supabase service client.
 * Returns the userId (Clerk ID) and supabase service client.
 */
export async function getClerkUser() {
  const { userId } = await auth()
  const supabase = createSupabaseServer()
  if (!userId) return { supabase, user: null, userId: null, dbUserId: null, email: null }

  const dbUserId = await resolveSupabaseUserId()

  // Fetch user email from Clerk to ensure we can create profile if missing
  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress || null

  return { supabase, user: { id: userId }, userId, dbUserId, email }
}

/**
 * Save Gmail OAuth refresh token to the user's profile in Supabase.
 * Uses Clerk auth to identify the user.
 */
export async function saveRefreshTokenToUser(refresh_token: string, gmail_email?: string | null) {
  const { supabase, dbUserId, email } = await getClerkUser()
  if (!dbUserId) throw new Error('Not authenticated')

  // Store Gmail refresh token in the user's profile
  // verification: if profile doesn't exist, we must provide email to satisfy NOT NULL constraint
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: dbUserId,
      email: email, // Required if creating new row
      gmail_refresh_token: refresh_token,
      gmail_email: gmail_email || null,
    }, { onConflict: 'id' })

  if (error) throw error
}

export async function getUserOAuth2Client(): Promise<{ client: OAuth2Client; hasToken: boolean; email: string | null }> {
  const { supabase, dbUserId } = await getClerkUser()
  const client = createOAuth2Client()
  if (!dbUserId) {
    console.warn('[Gmail OAuth] No dbUserId resolved — Clerk-to-Supabase mapping may be broken')
    return { client, hasToken: false, email: null }
  }

  // Fetch Gmail refresh token from the user's profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('gmail_refresh_token, gmail_email')
    .eq('id', dbUserId)
    .single()

  if (error) {
    console.warn(`[Gmail OAuth] Profile lookup failed for dbUserId=${dbUserId}:`, error.message)
  }

  const refresh = profile?.gmail_refresh_token as string | undefined
  const email = (profile?.gmail_email as string | undefined) || null
  if (!refresh) {
    console.warn(`[Gmail OAuth] No refresh token found for dbUserId=${dbUserId}, email=${email}`)
    return { client, hasToken: false, email }
  }
  console.log(`[Gmail OAuth] Token found for dbUserId=${dbUserId}, email=${email}`)
  client.setCredentials({ refresh_token: refresh })
  return { client, hasToken: true, email }
}

export function getGmailClient(auth: OAuth2Client) {
  return google.gmail({ version: 'v1', auth })
}
