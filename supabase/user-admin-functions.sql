-- Function to get filtered user list
CREATE OR REPLACE FUNCTION admin_filtered_user_list(
  email_filter TEXT DEFAULT NULL,
  role_filter TEXT DEFAULT NULL,
  signup_after TIMESTAMPTZ DEFAULT NULL,
  signup_before TIMESTAMPTZ DEFAULT NULL,
  last_active_after TIMESTAMPTZ DEFAULT NULL,
  last_active_before TIMESTAMPTZ DEFAULT NULL,
  page_size INTEGER DEFAULT 20,
  page_number INTEGER DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  is_super_admin BOOLEAN,
  disabled BOOLEAN,
  deactivation_end_date TIMESTAMPTZ,
  total_count BIGINT
) LANGUAGE SQL SECURITY DEFINER AS $$
  WITH filtered_users AS (
    SELECT
      au.id,
      au.email,
      p.role,
      au.created_at,
      au.last_sign_in_at,
      p.last_active_at,
      -- Check for super admin status (default to false if column doesn't exist)
      COALESCE((au.raw_app_meta_data->>'is_super_admin')::BOOLEAN, FALSE) as is_super_admin,
      COALESCE(p.disabled, FALSE) as disabled,
      p.deactivation_end_date
    FROM
      auth.users au
    JOIN
      profiles p ON au.id = p.id
    WHERE
      (email_filter IS NULL OR au.email ILIKE '%' || email_filter || '%')
      AND (role_filter IS NULL OR p.role = role_filter)
      AND (signup_after IS NULL OR au.created_at >= signup_after)
      AND (signup_before IS NULL OR au.created_at <= signup_before)
      AND (last_active_after IS NULL OR p.last_active_at >= last_active_after)
      AND (last_active_before IS NULL OR p.last_active_at <= last_active_before)
  ),
  count_filtered AS (
    SELECT COUNT(*) AS total_count FROM filtered_users
  )
  SELECT
    fu.id,
    fu.email,
    fu.role,
    fu.created_at,
    fu.last_sign_in_at,
    fu.last_active_at,
    fu.is_super_admin,
    fu.disabled,
    fu.deactivation_end_date,
    cf.total_count
  FROM
    filtered_users fu,
    count_filtered cf
  ORDER BY
    fu.created_at DESC
  LIMIT
    page_size
  OFFSET
    (page_number - 1) * page_size;
$$;

-- Simple function to just retrieve all users (for backward compatibility)
CREATE OR REPLACE FUNCTION admin_user_list_view()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  is_super_admin BOOLEAN,
  disabled BOOLEAN,
  deactivation_end_date TIMESTAMPTZ
) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT
    au.id,
    au.email,
    p.role,
    au.created_at,
    au.last_sign_in_at,
    p.last_active_at,
    -- Check for super admin status (default to false if column doesn't exist)
    COALESCE((au.raw_app_meta_data->>'is_super_admin')::BOOLEAN, FALSE) as is_super_admin,
    COALESCE(p.disabled, FALSE) as disabled,
    p.deactivation_end_date
  FROM
    auth.users au
  JOIN
    profiles p ON au.id = p.id
  ORDER BY
    au.created_at DESC;
$$; 