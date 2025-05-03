import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Create a single instance that's shared across the app
const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Export the singleton instance directly
export const createClient = () => supabase 