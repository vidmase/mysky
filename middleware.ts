import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    // Check if user is disabled in profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('disabled')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('Error checking user disabled status:', error)
      return res
    }

    const isDisabled = profile?.disabled === true

    if (isDisabled) {
      // If user is disabled, only allow access to auth pages
      const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
      
      if (!isAuthPage) {
        // Clear any existing data fetching responses
        const response = NextResponse.redirect(new URL('/auth?disabled=1', request.url))
        
        // Clear the session
        const supabase = createMiddlewareClient({ req: request, res: response })
        await supabase.auth.signOut()
        
        return response
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
} 