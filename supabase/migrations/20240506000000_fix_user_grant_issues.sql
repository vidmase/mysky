-- Drop conflicting policies to ensure clean state
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Admin full access profiles" ON profiles;

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create unified policies with clear names and proper checks
CREATE POLICY "profiles_read_own"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_read_public"
ON profiles FOR SELECT
USING (
    NOT (disabled OR role = 'admin')
);

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id 
    AND (
        (role IS NOT DISTINCT FROM OLD.role) AND 
        (disabled IS NOT DISTINCT FROM OLD.disabled)
    )
);

CREATE POLICY "profiles_admin_all"
ON profiles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Fix handle_new_user function with proper security settings
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, disabled)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'user'),
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        updated_at = now();
    RETURN new;
END;
$$;

-- Recreate trigger with proper timing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Add explicit grant for public profile reading
GRANT SELECT ON profiles TO anon;
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Ensure proper default values
ALTER TABLE profiles 
    ALTER COLUMN disabled SET DEFAULT false,
    ALTER COLUMN role SET DEFAULT 'user'; 