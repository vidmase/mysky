-- Enable RLS on flights table
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on flights table to start fresh
DROP POLICY IF EXISTS "Users can view own flights" ON flights;
DROP POLICY IF EXISTS "Users can create flights" ON flights;
DROP POLICY IF EXISTS "Users can update own flights" ON flights;
DROP POLICY IF EXISTS "Users can delete own flights" ON flights;
DROP POLICY IF EXISTS "Admin full access flights" ON flights;

-- Allow users to view their own flights
CREATE POLICY "Users can view own flights"
ON flights FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to create new flights
CREATE POLICY "Users can create flights"
ON flights FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own flights
CREATE POLICY "Users can update own flights"
ON flights FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Allow users to delete their own flights
CREATE POLICY "Users can delete own flights"
ON flights FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Allow admins full access to all flights
CREATE POLICY "Admin full access flights"
ON flights FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
); 