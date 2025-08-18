import { NextResponse } from 'next/server'
import { createOAuth2Client, getAuthUrl } from '@/lib/google'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Get environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const vercelUrl = process.env.VERCEL_URL
    const nextAuthUrl = process.env.NEXTAUTH_URL
    
    // Calculate the redirect URI that would be used
    const baseUrl = vercelUrl 
      ? `https://${vercelUrl}` 
      : nextAuthUrl || 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/gmail/callback`
    
    // Generate the auth URL to see what's actually being sent
    const authUrl = getAuthUrl()
    
    return NextResponse.json({
      environment: {
        VERCEL_URL: vercelUrl,
        NEXTAUTH_URL: nextAuthUrl,
        GOOGLE_CLIENT_ID: clientId ? 'Set' : 'Missing',
        GOOGLE_CLIENT_SECRET: clientSecret ? 'Set' : 'Missing'
      },
      calculated: {
        baseUrl,
        redirectUri,
        authUrl
      },
      instructions: {
        message: 'Add this exact redirect URI to Google OAuth:',
        redirectUri: redirectUri
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
