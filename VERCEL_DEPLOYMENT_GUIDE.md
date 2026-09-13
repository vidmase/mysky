# Vercel Deployment Guide - OAuth Fix

## Problem Summary

You're getting a "redirect_uri_mismatch" error on your Vercel deployment because the redirect URI being generated doesn't match what's configured in Google OAuth.

## Root Cause

The issue was that your code was calculating the redirect URI dynamically using `VERCEL_URL`, but there was a mismatch between what was being generated and what was configured in Google OAuth.

## Solution Applied

1. **Updated `lib/google.ts`** to use environment variables more reliably
2. **Fixed `.env.local`** to remove conflicting redirect URI variables
3. **Added debugging** to help identify the exact redirect URI being used

## Steps to Deploy the Fix

### 1. Commit and Push Your Changes

```bash
git add .
git commit -m "Fix Google OAuth redirect URI mismatch for Vercel deployment"
git push
```

### 2. Deploy to Vercel

Your changes should automatically deploy to Vercel if you have auto-deployment enabled.

### 3. Set Environment Variables in Vercel

Go to your Vercel dashboard and ensure these environment variables are set:

**Required Variables:**
- `GOOGLE_CLIENT_ID` = `<your-google-client-id>.apps.googleusercontent.com`
- `GOOGLE_CLIENT_SECRET` = `<your-google-client-secret>`
- `NEXTAUTH_URL` = `https://mysky.vercel.app`

**Optional (for debugging):**
- `VERCEL_URL` = This is automatically set by Vercel

### 4. Test the Debug Endpoint

After deployment, visit this URL to see what redirect URI is being generated:
```
https://mysky.vercel.app/api/debug-oauth
```

This will show you:
- The exact redirect URI being used
- Environment variables status
- The auth URL being generated

### 5. Verify Google OAuth Configuration

Make sure your Google OAuth application has these redirect URIs:

**Development:**
```
http://localhost:3000/api/gmail/callback
```

**Production:**
```
https://mysky.vercel.app/api/gmail/callback
```

## Expected Behavior After Fix

1. **Local Development**: Should work with `http://localhost:3000/api/gmail/callback`
2. **Production**: Should work with `https://mysky.vercel.app/api/gmail/callback`
3. **Debug Endpoint**: Should show the correct redirect URI being used

## Troubleshooting

### If Still Getting redirect_uri_mismatch:

1. **Check the debug endpoint**: Visit `https://mysky.vercel.app/api/debug-oauth`
2. **Compare the redirect URI** shown there with what's in Google OAuth
3. **Add the exact redirect URI** from the debug endpoint to Google OAuth
4. **Wait 5-10 minutes** for Google's changes to propagate

### If Debug Endpoint Shows Wrong URL:

1. **Check Vercel environment variables** are set correctly
2. **Redeploy** the application
3. **Clear browser cache** and try again

## Security Notes

- The debug endpoint will be removed in production
- Environment variables are properly secured in Vercel
- Google OAuth credentials are protected

## Testing Checklist

- [ ] Local development OAuth works
- [ ] Production OAuth works
- [ ] Debug endpoint shows correct redirect URI
- [ ] No redirect_uri_mismatch errors
- [ ] Gmail integration functions properly
