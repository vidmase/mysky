import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env'

// Create a single instance that's shared across the app
const supabase = createSupabaseClient(
    NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Export the singleton instance directly
export const createClient = () => supabase 