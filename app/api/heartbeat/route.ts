import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'

export async function POST() {
    try {
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createSupabaseServer()
        await supabase
            .from('profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', userId)

        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
    }
}
