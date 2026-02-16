# Rate Limit Fix Guide

## Problem Summary

You're experiencing "Request rate limit reached" errors with HTTP 429 status codes when trying to sign in. This is caused by Supabase's authentication rate limiting.

## Root Cause

Supabase has strict rate limits by default:
- **Sign in/sign up**: Only 30 attempts per 5 minutes per IP address
- **Token refresh**: 150 per 5 minutes
- **Email sending**: 2 per hour

You've hit these limits, likely from repeated sign-in attempts while debugging the OAuth issue.

## Immediate Solutions

### 1. Wait for Rate Limit to Reset
- **Current rate limit window**: 5 minutes
- **Solution**: Wait 5 minutes before trying to sign in again
- **The rate limit will automatically reset**

### 2. Clear Browser Cache and Cookies
```bash
# Clear all browser data for your domain
# Or use incognito/private browsing mode
```

### 3. Try Different Network
- Use mobile data instead of WiFi
- Use a different IP address (VPN, different network)

## Long-term Fixes

### 1. Update Supabase Rate Limits

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Settings**
3. Update these values:
   - **Sign in/sign up**: 100 per 5 minutes
   - **Token refresh**: 300 per 5 minutes
   - **Email sending**: 10 per hour
   - **Token verifications**: 100 per 5 minutes

**Option B: Via Supabase CLI**
```bash
# Apply the updated config.toml
supabase db reset
```

### 2. Deploy the Updated Code

The code changes I made include:
- ✅ **Better error handling** for rate limiting
- ✅ **User-friendly countdown timer** showing wait time
- ✅ **Disabled form inputs** during rate limiting
- ✅ **Toast notifications** for better UX

### 3. Apply the Migration

Run the migration to document the rate limit changes:
```bash
supabase db push
```

## Code Changes Applied

### 1. Updated `supabase/config.toml`
- Increased sign in/sign up limit from 30 to 100
- Increased token refresh limit from 150 to 300
- Increased email limit from 2 to 10

### 2. Enhanced `app/auth/page.tsx`
- Added rate limiting detection
- Added countdown timer
- Disabled form during rate limiting
- Better error messages

### 3. Created Migration
- Documented rate limit changes
- Provided instructions for manual updates

## Testing the Fix

### 1. Wait 5 Minutes
- Don't try to sign in immediately
- Wait for the rate limit window to reset

### 2. Test Sign In
- Try signing in with correct credentials
- Should work without rate limiting

### 3. Test Rate Limiting UI
- If you hit rate limits again, you'll see:
  - Countdown timer
  - Disabled form
  - Clear error message

## Prevention Tips

### 1. Implement Proper Error Handling
- Don't retry failed requests immediately
- Show clear error messages to users
- Implement exponential backoff

### 2. Use Development vs Production
- Use different Supabase projects for dev/prod
- Set higher limits for development
- Monitor rate limit usage

### 3. Consider CAPTCHA
- Add CAPTCHA for repeated failed attempts
- Implement progressive delays
- Use IP-based blocking for abuse

## Monitoring

### Check Rate Limit Usage
```sql
-- Monitor auth attempts (if you have access to logs)
SELECT * FROM auth.audit_log_entries 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Set Up Alerts
- Monitor for 429 errors
- Alert on unusual sign-in patterns
- Track rate limit hits

## Emergency Override

If you need immediate access:

### 1. Supabase Dashboard
- Go to Authentication > Users
- Find your user account
- Reset password or enable/disable as needed

### 2. Database Direct Access
```sql
-- Only if you have direct database access
-- Be very careful with this
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'your-email@example.com';
```

## Next Steps

1. **Wait 5 minutes** for current rate limit to reset
2. **Deploy the updated code** to Vercel
3. **Update Supabase rate limits** via dashboard
4. **Test the sign-in flow** again
5. **Monitor for any remaining issues**

The rate limiting should be resolved once you wait for the current window to expire and deploy the improved error handling.





