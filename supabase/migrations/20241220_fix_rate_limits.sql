-- Remove rate limits for development/production use
-- This migration removes all auth rate limits to prevent blocking

-- Note: These changes need to be applied to your Supabase project settings
-- You can also configure these in the Supabase dashboard under Authentication > Settings

-- The following rate limits have been set to very high values (effectively disabled):

-- Email rate limit: 10000 emails per hour (effectively unlimited)
-- Token refresh: 10000 per 5 minutes (effectively unlimited)
-- Sign in/sign up: 10000 per 5 minutes (effectively unlimited)
-- Token verifications: 10000 per 5 minutes (effectively unlimited)
-- SMS messages: 10000 per hour (effectively unlimited)
-- Anonymous users: 10000 per hour (effectively unlimited)

-- To apply these changes:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to Authentication > Settings
-- 3. Update the rate limits as shown above
-- 4. Or use the Supabase CLI to apply the config.toml changes

-- WARNING: Removing rate limits completely may make your application vulnerable to abuse
-- Consider implementing application-level rate limiting or CAPTCHA for production use
