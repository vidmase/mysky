import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
    const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    return supabase
} 