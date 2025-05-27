import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createPagesServerClient({ req, res });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return res.status(500).json({ error: userError.message });
  }
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Check admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError) {
    return res.status(500).json({ error: profileError.message });
  }
  if (!profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Get target user email
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });

  // Send password reset email
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000/reset-password',
  });

  if (resetError) {
    return res.status(500).json({ error: resetError.message });
  }

  return res.status(200).json({ success: true });
} 