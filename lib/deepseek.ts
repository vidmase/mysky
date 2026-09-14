import { createSupabaseServer } from '@/lib/supabase-server'
import { open, type SealedSecret } from '@/lib/secret-box'

/**
 * Server-only: this reaches the service-role Supabase client and Node's crypto.
 * The client-safe half of the DeepSeek config lives in lib/deepseek-models.ts.
 *
 * The user's own key wins over the deployment-wide one, so someone who has
 * pasted a key in the UI is billed to their own DeepSeek account. Returns null
 * when neither exists, which callers surface as "add your key" rather than
 * sending an unauthenticated request.
 */
export async function resolveDeepSeekKey(userId: string): Promise<string | null> {
    const supabase = createSupabaseServer()

    const { data, error } = await supabase
        .from('chat_api_keys')
        .select('ciphertext, iv, auth_tag')
        .eq('user_id', userId)
        .eq('provider', 'deepseek')
        .maybeSingle()

    // A failed query must not silently fall through to the shared key: that
    // would bill the deployment for a user who believes they are on their own
    // key. Only "no row" may fall through.
    if (error) {
        throw new Error(`Failed to read stored DeepSeek key: ${error.message}`)
    }

    if (data) {
        const sealed: SealedSecret = {
            ciphertext: data.ciphertext,
            iv: data.iv,
            authTag: data.auth_tag,
        }
        return open(sealed)
    }

    return process.env.DEEPSEEK_API_KEY || null
}
