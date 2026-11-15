/**
 * A family member's email as stored in profile_viewers, or null when it is not
 * one. Stored lowercase and trimmed: viewer sign-in matches on exactly this.
 */
export function normalizeViewerEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : null
}
