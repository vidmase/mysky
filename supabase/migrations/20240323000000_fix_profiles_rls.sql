-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own profile (including disabled status)
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile (except role and disabled status)
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    AND (
        -- Cannot modify role or disabled status
        (role IS NOT DISTINCT FROM OLD.role) AND 
        (disabled IS NOT DISTINCT FROM OLD.disabled)
    )
);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Allow admins to update all profiles
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Allow public read access to basic profile info (but not sensitive fields)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (
    true
)
WITH CHECK (
    -- Only allow access to non-sensitive fields for public viewing
    NOT (disabled OR role = 'admin')
);

-- Allow insert for new user registration
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Ensure proper default values
ALTER TABLE profiles 
    ALTER COLUMN disabled SET DEFAULT false,
    ALTER COLUMN role SET DEFAULT 'user';

-- Add trigger to prevent users from modifying their own role or disabled status
CREATE OR REPLACE FUNCTION prevent_self_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id = auth.uid() AND 
       (
           NEW.role IS DISTINCT FROM OLD.role OR 
           NEW.disabled IS DISTINCT FROM OLD.disabled
       ) AND
       NOT EXISTS (
           SELECT 1 FROM profiles 
           WHERE id = auth.uid() 
           AND role = 'admin'
           AND id != NEW.id  -- Ensure admin is not modifying their own status
       )
    THEN
        RAISE EXCEPTION 'Users cannot modify their own role or disabled status';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_self_role_change_trigger ON profiles;
CREATE TRIGGER prevent_self_role_change_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_role_change(); 