/**
 * What the chat model sees of the conversation so far, and how to read a tool
 * call that a DeepSeek model wrote into its reply text instead of `tool_calls`.
 *
 * Kept free of server imports so test-chat-history.ts can run it directly.
 */

export type StoredChatMessage = { role: string; content: string | null }
export type HistoryMessage = { role: 'user' | 'assistant'; content: string }

/** DeepSeek's own tool-call markup; it has no place in a reply to the user. */
const TOOL_MARKUP = /<｜+DSML｜+/

export function containsToolMarkup(text: string): boolean {
  return TOOL_MARKUP.test(text)
}

/**
 * Completed exchanges only, oldest first.
 *
 * A question is stored before the model is called, so a failed call leaves it
 * in the table with no answer. Replaying those made the model answer a backlog
 * of old, unanswered questions ("First, the button: ...") instead of the one
 * just asked. A reply that is only leaked tool markup is not an answer either.
 */
export function completedExchanges(messages: StoredChatMessage[]): HistoryMessage[] {
  const out: HistoryMessage[] = []
  for (let i = 0; i < messages.length - 1; i++) {
    const question = messages[i]
    const answer = messages[i + 1]
    if (question.role !== 'user' || answer.role !== 'assistant') continue
    const q = question.content?.trim()
    const a = answer.content?.trim()
    if (!q || !a || containsToolMarkup(a)) continue
    out.push({ role: 'user', content: q }, { role: 'assistant', content: a })
    i++
  }
  return out
}

/**
 * A tool call the model wrote as text, e.g.
 *   <｜DSML｜invoke name="scan_email_for_flights">
 *   <｜DSML｜parameter name="start" string="true">2026-11-01</｜DSML｜parameter>
 * Returns null when the text holds no such call.
 */
export function parseLeakedToolCall(
  text: string
): { name: string; args: Record<string, string> } | null {
  if (!containsToolMarkup(text)) return null
  const invoke = text.match(/invoke\s+name="([^"]+)"/)
  if (!invoke) return null
  const args: Record<string, string> = {}
  const param = /parameter\s+name="([^"]+)"[^>]*>([^<]*)</g
  for (const m of text.matchAll(param)) args[m[1]] = m[2].trim()
  return { name: invoke[1], args }
}
