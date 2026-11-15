import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { auth, currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { open, seal } from '@/lib/secret-box'

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

/*
 * Google sends the user back to one registered callback (mysky.vercel.app),
 * but people sign in on mysky.daugvila.lt, and a session on one domain does
 * not exist on the other. So who is connecting, and where they came from,
 * travel through Google in the OAuth `state`, sealed with the app's secret so
 * it cannot be forged or edited, and short-lived so it cannot be replayed later.
 */
const STATE_MAX_AGE_MS = 30 * 60 * 1000

// Only these may be sent back to after the callback, so the state can never
// turn the callback into a redirect to someone else's site.
const RETURN_HOSTS = new Set(['mysky.daugvila.lt', 'mysky.vercel.app', 'localhost:3000'])

type OAuthState = { u: string; r?: string; t: number }

export function encodeOAuthState(dbUserId: string, returnOrigin?: string, now = Date.now()): string {
  const payload: OAuthState = { u: dbUserId, r: returnOrigin, t: now }
  return Buffer.from(JSON.stringify(seal(JSON.stringify(payload)))).toString('base64url')
}

/** The connecting user's profile id and return origin, or null when the state is missing, forged or stale. */
export function decodeOAuthState(state: string | null | undefined, now = Date.now()): { dbUserId: string; returnOrigin?: string } | null {
  if (!state) return null
  try {
    const payload = JSON.parse(open(JSON.parse(Buffer.from(state, 'base64url').toString('utf8')))) as OAuthState
    if (typeof payload.u !== 'string' || !payload.u || typeof payload.t !== 'number') return null
    if (now - payload.t > STATE_MAX_AGE_MS || payload.t > now + 60_000) return null
    return { dbUserId: payload.u, returnOrigin: payload.r }
  } catch {
    return null
  }
}

export function safeReturnOrigin(candidate: string | undefined, fallback: string): string {
  try {
    if (candidate) {
      const u = new URL(candidate)
      if (RETURN_HOSTS.has(u.host)) return u.origin
    }
  } catch { }
  return fallback
}

export async function getAuthUrl(): Promise<string> {
  const oAuth2Client = createOAuth2Client()

  // Without a resolved user the link still works the old way: the callback
  // then needs a session on the callback's own domain.
  const dbUserId = await resolveSupabaseUserId().catch(() => null)
  let returnOrigin: string | undefined
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') || h.get('host')
    if (host) returnOrigin = `${h.get('x-forwarded-proto') || 'https'}://${host}`
  } catch { }

  let state: string | undefined
  try {
    if (dbUserId) state = encodeOAuthState(dbUserId, returnOrigin)
  } catch (e) {
    // Sealing needs API_KEY_ENCRYPTION_SECRET; without it, keep the old link
    // rather than breaking every Gmail connection.
    console.error('[Gmail OAuth] Could not seal OAuth state:', e instanceof Error ? e.message : e)
  }

  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent', // ensure refresh_token the first time
    ...(state ? { state } : {}),
  })
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
export async function saveRefreshTokenToUser(refresh_token: string, gmail_email?: string | null, fromState?: string) {
  // A verified OAuth state names the user; otherwise fall back to the session.
  const { supabase, dbUserId, email } = fromState
    ? { supabase: createSupabaseServer(), dbUserId: fromState, email: null as string | null }
    : await getClerkUser()
  if (!dbUserId) throw new Error('Not authenticated')

  // dbUserId is resolved from an existing profile, so this is always an update.
  // An upsert first builds a full insert row, and profiles.username is NOT NULL,
  // so it was rejected before the conflict could turn it into an update: every
  // Gmail connection failed with "null value in column username".
  const { data, error } = await supabase
    .from('profiles')
    .update({
      gmail_refresh_token: refresh_token,
      gmail_email: gmail_email || null,
    })
    .eq('id', dbUserId)
    .select('id')

  if (error) throw error
  if (!data?.length) throw new Error(`No profile row for ${email ?? dbUserId} to store the Gmail token on`)
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
