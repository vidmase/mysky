import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'

export async function GET() {
    try {
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createSupabaseServer()
        const { data: profile } = await supabase
            .from('profiles')
            .select('disabled, deactivation_end_date')
            .eq('id', userId)
            .single()

        return NextResponse.json({
            disabled: profile?.disabled ?? false,
            deactivation_end_date: profile?.deactivation_end_date ?? null
        })
    } catch (e: any) {
        return NextResponse.json({ disabled: false })
    }
}
