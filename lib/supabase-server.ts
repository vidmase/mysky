import { createClient } from '@supabase/supabase-js'
import { currentUser } from '@clerk/nextjs/server'

/**
 * Creates a Supabase client using the service-role key.
 * Use this in API routes where Clerk handles authentication.
 * The service-role key bypasses RLS, so always filter by userId.
 */
export function createSupabaseServer() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase environment variables')
    }

    // A malformed URL (e.g. a truncated SUPABASE_URL) otherwise fails silently at
    // request time, which reads downstream as "no data" rather than "misconfigured".
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(supabaseUrl.replace(/\/+$/, ''))) {
        throw new Error(
            `Invalid Supabase URL: "${supabaseUrl}". Expected https://<project-ref>.supabase.co ` +
            `(check SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL in .env.local).`
        )
    }

    return createClient(supabaseUrl, supabaseServiceKey)
}

/**
 * Resolves the Clerk user's email to the original Supabase UUID in the profiles table.
 * Clerk IDs are strings (e.g. "user_abc123") but Supabase owner_id/profiles.id are UUIDs.
 * This function bridges the gap by looking up the profile by email.
 *
 * Returns null if no matching profile is found.
 */
export async function resolveSupabaseUserId(): Promise<string | null> {
    const user = await currentUser()
    if (!user) return null

    const email = user.emailAddresses?.[0]?.emailAddress
    if (!email) return null

    const supabase = createSupabaseServer()
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

    // Only "no such profile" may resolve to null. A failed query (bad URL, network,
    // bad key) must not be swallowed: callers read null as "not signed in", which
    // sends an authenticated user back to /auth and straight into a redirect loop.
    if (error) {
        throw new Error(`Failed to resolve Supabase profile for ${email}: ${error.message}`)
    }

    return profile?.id ?? null
}

export type ReadAccess = {
    /** whose flight log is shown */
    ownerId: string
    /** true for a family member invited to view someone else's log */
    readOnly: boolean
}

/**
 * Whose log the signed-in user may read: their own, or else the log of someone
 * who added their email as a family viewer (profile_viewers).
 *
 * Only reading goes through this. Every route that changes data keeps using
 * resolveSupabaseUserId(), which returns a profile only for its owner, so a
 * viewer is refused by default anywhere this has not been opened up.
 */
export async function resolveReadAccess(): Promise<ReadAccess | null> {
    const own = await resolveSupabaseUserId()
    if (own) return { ownerId: own, readOnly: false }

    const user = await currentUser()
    const email = user?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase()
    if (!email) return null

    const supabase = createSupabaseServer()
    const { data, error } = await supabase
        .from('profile_viewers')
        .select('owner_id')
        .eq('viewer_email', email)
        .order('created_at', { ascending: true })
        .limit(1)
    if (error) {
        throw new Error(`Failed to check family access for ${email}: ${error.message}`)
    }
    return data?.[0] ? { ownerId: data[0].owner_id, readOnly: true } : null
}
