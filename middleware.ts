import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })
    
    // Refresh session if expired
    const { data: { session }, error } = await supabase.auth.getSession()
    
    // Handle authentication for protected routes
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
    const isApiRoute = request.nextUrl.pathname.startsWith('/api')
    const isProtectedRoute = !isAuthRoute && 
      (request.nextUrl.pathname.startsWith('/flights') || 
       request.nextUrl.pathname.startsWith('/add-flight') ||
       request.nextUrl.pathname.startsWith('/map') ||
       request.nextUrl.pathname.startsWith('/stats'))

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/auth', request.url)
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Redirect to flights page if accessing auth route with valid session
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/flights', request.url))
    }

    // Handle API routes
    if (isApiRoute && !session && !request.nextUrl.pathname.startsWith('/api/auth')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return res
  } catch (e) {
    console.error('Middleware error:', e)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
} 