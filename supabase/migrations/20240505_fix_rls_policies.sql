-- First drop all existing policies
DROP POLICY IF EXISTS "Profile read access" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin update all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access for profile existence checks
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- Profiles table policies
-- Allow anyone to read profiles (needed for auth checks and user info display)
CREATE POLICY "Allow read profiles"
ON profiles FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow new profile creation during signup
CREATE POLICY "Allow profile creation"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Flights table policies
-- Users can read their own flights
CREATE POLICY "Allow users to read own flights"
ON flights FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own flights
CREATE POLICY "Allow users to create flights"
ON flights FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own flights
CREATE POLICY "Allow users to update own flights"
ON flights FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own flights
CREATE POLICY "Allow users to delete own flights"
ON flights FOR DELETE
USING (user_id = auth.uid());

-- Admin policies - using a function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin can do everything
CREATE POLICY "Admin full access profiles"
ON profiles FOR ALL
USING (is_admin());

CREATE POLICY "Admin full access flights"
ON flights FOR ALL
USING (is_admin());

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 