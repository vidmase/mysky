import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res })
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) {
    console.error('Supabase getUser error:', userError)
    return res.status(500).json({ error: userError.message })
  }
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profileError) {
    console.error('Supabase profile error:', profileError)
    return res.status(500).json({ error: profileError.message })
  }
  if (!profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString() // last 5 minutes
  const { data: liveUsers, error } = await supabase
    .from('profiles')
    .select('id, email, last_active_at, role')
    .gte('last_active_at', since)
  if (error) {
    console.error('Supabase liveUsers error:', error)
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ liveUsers })
} 