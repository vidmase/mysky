/**
 * The DeepSeek models the chat may use. An allowlist rather than a
 * pass-through, so a caller cannot point the request at an arbitrary model.
 *
 * Kept free of server imports: the chat page renders the picker from this
 * list, so it has to be safe in the browser bundle.
 */
export const DEEPSEEK_MODELS = [
    {
        id: 'deepseek-flash',
        label: 'DeepSeek V4.1 Flash',
        description: 'Newest and fast. Can also scan your email for new flights.',
        tools: true,
    },
    {
        id: 'deepseek-chat',
        label: 'DeepSeek Chat',
        description: 'Fast, for everyday questions about your flights.',
        tools: true,
    },
    {
        id: 'deepseek-reasoner',
        label: 'DeepSeek Reasoner',
        description: 'Slower, thinks step by step. Better at counting and comparing.',
        // DeepSeek's reasoner has not accepted tool calls, so it answers
        // questions only and cannot scan email.
        tools: false,
    },
] as const

export type DeepSeekModelId = (typeof DEEPSEEK_MODELS)[number]['id']

export const DEFAULT_DEEPSEEK_MODEL: DeepSeekModelId = 'deepseek-flash'

export function modelCanUseTools(id: DeepSeekModelId): boolean {
    return DEEPSEEK_MODELS.find((m) => m.id === id)?.tools === true
}

export function isDeepSeekModel(value: unknown): value is DeepSeekModelId {
    return DEEPSEEK_MODELS.some((m) => m.id === value)
}
