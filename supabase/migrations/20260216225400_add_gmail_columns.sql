-- Add columns for Gmail integration to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_email TEXT;

-- Add comment explaining usage
COMMENT ON COLUMN profiles.gmail_refresh_token IS 'OAuth2 refresh token for Gmail integration';
COMMENT ON COLUMN profiles.gmail_email IS 'Email address associated with the connected Gmail account';
