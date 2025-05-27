-- Add deactivation_end_date column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deactivation_end_date TIMESTAMPTZ DEFAULT NULL;

-- Create a function to automatically re-enable accounts when deactivation period ends
CREATE OR REPLACE FUNCTION check_deactivation_end() 
RETURNS TRIGGER AS $$
BEGIN
  -- If disabled=false or deactivation_end_date is null, do nothing
  IF NOT NEW.disabled OR NEW.deactivation_end_date IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- If deactivation_end_date is in the past, automatically re-enable the account
  IF NEW.deactivation_end_date < NOW() THEN
    NEW.disabled = FALSE;
    NEW.deactivation_end_date = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to run the function before insert or update
DROP TRIGGER IF EXISTS check_deactivation_end_trigger ON profiles;
CREATE TRIGGER check_deactivation_end_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_deactivation_end();

-- Bonus: Create a scheduled job to periodically re-enable accounts
-- This handles cases where no updates happen to the row, but the deactivation period ends
CREATE OR REPLACE FUNCTION auto_reactivate_accounts() 
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET 
    disabled = FALSE, 
    deactivation_end_date = NULL
  WHERE 
    disabled = TRUE 
    AND deactivation_end_date IS NOT NULL 
    AND deactivation_end_date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a Row Level Security policy to block access for disabled accounts
CREATE POLICY "Block access for disabled accounts"
ON profiles
USING (
  disabled IS NOT TRUE
);

-- Create a cron job to run auto_reactivate_accounts every 15 minutes
-- Note: You'll need the pg_cron extension enabled
DO $$
BEGIN
  -- Only run this if pg_cron is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Create the job to run every 15 minutes
    PERFORM cron.schedule('*/15 * * * *', 'SELECT auto_reactivate_accounts()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If pg_cron is not available, this section will be skipped
  RAISE NOTICE 'pg_cron extension not available. You will need to set up a scheduled task manually.';
END $$; 