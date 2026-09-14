import { NextResponse } from 'next/server'
import { createSupabaseServer, resolveSupabaseUserId } from '@/lib/supabase-server'
import { seal } from '@/lib/secret-box'

export const dynamic = 'force-dynamic'

const PROVIDER = 'deepseek'

/**
 * DeepSeek issues keys as `sk-` followed by a hex-ish body. Checking the shape
 * here turns a typo into an immediate, specific error instead of a 401 that
 * only shows up on the next chat message.
 */
const KEY_SHAPE = /^sk-[A-Za-z0-9_-]{16,}$/

/** Whether a key is stored, and which one — never the key itself. */
export async function GET() {
    try {
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createSupabaseServer()
        const { data, error } = await supabase
            .from('user_api_keys')
            .select('hint, updated_at')
            .eq('user_id', userId)
            .eq('provider', PROVIDER)
            .maybeSingle()

        if (error) {
            throw new Error(error.message)
        }

        return NextResponse.json({
            configured: !!data,
            hint: data?.hint ?? null,
            updatedAt: data?.updated_at ?? null,
            // Lets the UI say "using the shared key" rather than "no key at all".
            sharedKeyAvailable: !!process.env.DEEPSEEK_API_KEY,
        })
    } catch (error: any) {
        console.error('Chat key GET error:', error)
        return NextResponse.json({ error: 'Failed to read key status' }, { status: 500 })
    }
}

/** Store (or replace) this user's DeepSeek key. */
export async function POST(request: Request) {
    try {
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json().catch(() => null)
        const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''

        if (!apiKey) {
            return NextResponse.json({ error: 'An API key is required.' }, { status: 400 })
        }
        if (!KEY_SHAPE.test(apiKey)) {
            return NextResponse.json(
                { error: 'That does not look like a DeepSeek key. They start with "sk-".' },
                { status: 400 }
            )
        }

        const sealed = seal(apiKey)
        const supabase = createSupabaseServer()

        const { error } = await supabase
            .from('user_api_keys')
            .upsert(
                {
                    user_id: userId,
                    provider: PROVIDER,
                    ciphertext: sealed.ciphertext,
                    iv: sealed.iv,
                    auth_tag: sealed.authTag,
                    hint: apiKey.slice(-4),
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,provider' }
            )

        if (error) {
            throw new Error(error.message)
        }

        return NextResponse.json({ configured: true, hint: apiKey.slice(-4) })
    } catch (error: any) {
        console.error('Chat key POST error:', error)

        // A missing encryption secret is a deployment problem the operator can
        // fix, so say so rather than hiding it behind a generic failure.
        if (error?.message?.includes('API_KEY_ENCRYPTION_SECRET')) {
            return NextResponse.json(
                { error: 'Key storage is not configured on the server. Contact support.' },
                { status: 500 }
            )
        }

        return NextResponse.json({ error: 'Failed to save the key.' }, { status: 500 })
    }
}

/** Forget this user's key and fall back to the deployment key, if there is one. */
export async function DELETE() {
    try {
        const userId = await resolveSupabaseUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createSupabaseServer()
        const { error } = await supabase
            .from('user_api_keys')
            .delete()
            .eq('user_id', userId)
            .eq('provider', PROVIDER)

        if (error) {
            throw new Error(error.message)
        }

        return NextResponse.json({ configured: false })
    } catch (error: any) {
        console.error('Chat key DELETE error:', error)
        return NextResponse.json({ error: 'Failed to remove the key.' }, { status: 500 })
    }
}
