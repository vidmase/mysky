-- Add deactivation_end_date column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivation_end_date TIMESTAMPTZ;

-- Create a function to automatically reactivate users when their deactivation period ends
CREATE OR REPLACE FUNCTION check_deactivation_end() RETURNS TRIGGER AS $$
BEGIN
  -- If deactivation_end_date is set and has passed, reactivate the user
  IF NEW.deactivation_end_date IS NOT NULL AND NEW.deactivation_end_date <= NOW() THEN
    NEW.disabled := false;
    NEW.deactivation_end_date := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the function before any update
DROP TRIGGER IF EXISTS check_deactivation_end_trigger ON profiles;
CREATE TRIGGER check_deactivation_end_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_deactivation_end();

-- Add an index to improve performance of deactivation checks
CREATE INDEX IF NOT EXISTS idx_profiles_deactivation_end_date ON profiles(deactivation_end_date)
WHERE deactivation_end_date IS NOT NULL; 