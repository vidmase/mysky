import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function handler(req, res) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return res.status(401).json({ error: 'Unauthorized' })
  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  // Active subscriptions
  const { count: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  // Total revenue
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('type', 'subscription')
  const totalRevenue = payments ? payments.reduce((sum, p) => sum + (p.amount || 0), 0) : 0
  // Coupons
  const { data: coupons } = await supabase
    .from('coupons')
    .select('code, times_used, total_discount')
  return res.status(200).json({
    activeSubscriptions,
    totalRevenue,
    coupons: coupons || [],
  })
} 