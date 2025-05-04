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

  // Join profiles with auth.users to get last_sign_in_at and is_super_admin
  const { data: users, error } = await supabase.rpc('admin_user_list_view')
  if (error) {
    console.error('Supabase users error:', error)
    return res.status(500).json({ error: error.message })
  }
  return res.status(200).json({ users })
} 