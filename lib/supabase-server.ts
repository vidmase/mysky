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
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

    return profile?.id ?? null
}
