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

  // Get target user info
  const { userId, role, disabled, deactivation_end_date } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // Update the user's role and/or disabled status in the profiles table
  const updates: any = {};
  if (role) updates.role = role;
  if (typeof disabled === 'boolean') {
    updates.disabled = disabled;
    
    // Handle deactivation end date
    if (disabled) {
      // If deactivating, set the end date if provided
      updates.deactivation_end_date = deactivation_end_date || null;
    } else {
      // If activating, always clear the end date
      updates.deactivation_end_date = null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({ success: true });
} 