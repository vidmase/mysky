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

  // Total users
  const { count: totalUsers, error: totalUsersError } = await supabase
    .from('auth.users')
    .select('*', { count: 'exact', head: true })
  if (totalUsersError) {
    console.error('Supabase totalUsers error:', totalUsersError)
    return res.status(500).json({ error: totalUsersError.message })
  }

  // Active users (last 24h)
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: active24h, error: active24hError } = await supabase
    .from('auth.users')
    .select('*', { count: 'exact', head: true })
    .gte('last_sign_in_at', since24h)
  if (active24hError) {
    console.error('Supabase active24h error:', active24hError)
    return res.status(500).json({ error: active24hError.message })
  }

  // Active users (last 7d)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: active7d, error: active7dError } = await supabase
    .from('auth.users')
    .select('*', { count: 'exact', head: true })
    .gte('last_sign_in_at', since7d)
  if (active7dError) {
    console.error('Supabase active7d error:', active7dError)
    return res.status(500).json({ error: active7dError.message })
  }

  // Most active users (top 5 by last_sign_in_at)
  const { data: topUsersData, error: topUsersError } = await supabase
    .from('auth.users')
    .select('id, email, last_sign_in_at')
    .order('last_sign_in_at', { ascending: false })
    .limit(5)
  if (topUsersError) {
    console.error('Supabase topUsers error:', topUsersError)
    return res.status(500).json({ error: topUsersError.message })
  }
  const topUsers = topUsersData || []

  return res.status(200).json({
    totalUsers,
    active24h,
    active7d,
    topUsers,
  })
} 