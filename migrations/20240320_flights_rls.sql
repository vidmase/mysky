-- Enable RLS on the flights table
ALTER TABLE vidmaflights ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own flights" ON vidmaflights;
DROP POLICY IF EXISTS "Users can create their own flights" ON vidmaflights;
DROP POLICY IF EXISTS "Users can update their own flights" ON vidmaflights;
DROP POLICY IF EXISTS "Users can delete their own flights" ON vidmaflights;
DROP POLICY IF EXISTS "Admins can access all flights" ON vidmaflights;

-- Create policy for users to view their own flights or all flights if admin
CREATE POLICY "Users can view their own flights"
ON vidmaflights
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() OR 
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'admin'
    AND id = auth.uid()
  )
);

-- Create policy for users to create their own flights
CREATE POLICY "Users can create their own flights"
ON vidmaflights
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Create policy for users to update their own flights or any flight if admin
CREATE POLICY "Users can update their own flights"
ON vidmaflights
FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid() OR 
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'admin'
    AND id = auth.uid()
  )
)
WITH CHECK (
  owner_id = auth.uid() OR 
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'admin'
    AND id = auth.uid()
  )
);

-- Create policy for users to delete their own flights or any flight if admin
CREATE POLICY "Users can delete their own flights"
ON vidmaflights
FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid() OR 
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role = 'admin'
    AND id = auth.uid()
  )
);

-- Create policy for admins to access all flights
CREATE POLICY "Admins can access all flights"
ON vidmaflights
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
); 