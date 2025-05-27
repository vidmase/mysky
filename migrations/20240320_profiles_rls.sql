-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can create profile" ON profiles;
DROP POLICY IF EXISTS "Admin full access profiles" ON profiles;

-- Allow anyone to read profiles (needed for auth checks and user info display)
CREATE POLICY "Users can read profiles"
ON profiles FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow new profile creation during signup
CREATE POLICY "Users can create profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create a function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_id
    AND role = 'admin'
  );
$$;

-- Allow admins to perform any operation
CREATE POLICY "Admin full access profiles"
ON profiles FOR ALL
USING (is_admin(auth.uid())); 