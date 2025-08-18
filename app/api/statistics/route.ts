import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { 
  calculateUnifiedStatistics,
  batchFetchFlightData,
  getCacheKey
} from '@/lib/statistics'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every minute

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for If-None-Match header
    const ifNoneMatch = request.headers.get('If-None-Match')

    // Implement stale-while-revalidate caching
    const cachedStats = await unstable_cache(
      async () => {
        const { flights, airports } = await batchFetchFlightData(supabase, session.user.id)
        const stats = calculateUnifiedStatistics(flights, airports)
        
        return {
          ...stats,
          lastUpdated: new Date().toISOString()
        }
      },
      [getCacheKey(session.user.id)],
      {
        revalidate: 3600, // Cache for 1 hour
        tags: ['flight-statistics', `user-${session.user.id}`]
      }
    )()

    // Return 304 if ETag matches
    if (ifNoneMatch && ifNoneMatch === cachedStats.etag) {
      return new NextResponse(null, { status: 304 })
    }

    // Set cache headers
    const headers = new Headers()
    headers.set('Cache-Control', 'private, max-age=60, s-maxage=60')
    headers.set('ETag', cachedStats.etag || '')
    headers.set('Vary', 'Cookie, Authorization')

    return NextResponse.json(cachedStats, { headers })

  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 })
  }
} 