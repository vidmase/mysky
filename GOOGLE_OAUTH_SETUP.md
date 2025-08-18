# Google OAuth Setup Guide

## Fixing "redirect_uri_mismatch" Error

The error you're seeing occurs because the redirect URI configured in your Google OAuth application doesn't match the one being used by your application.

### Step 1: Get Your Current Redirect URI

Your application is currently using this redirect URI:
- **Local Development**: `http://localhost:3000/api/gmail/callback`
- **Production**: `https://your-domain.vercel.app/api/gmail/callback`

### Step 2: Configure Google OAuth Application

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Find your OAuth 2.0 Client ID or create a new one
5. Click on the client ID to edit it

### Step 3: Add Authorized Redirect URIs

In the OAuth 2.0 Client configuration, add these redirect URIs to the **Authorized redirect URIs** section:

```
http://localhost:3000/api/gmail/callback
https://your-production-domain.vercel.app/api/gmail/callback
```

**Important Notes:**
- Replace `your-production-domain` with your actual Vercel domain
- Make sure to include both local development and production URLs
- The exact path `/api/gmail/callback` must match exactly
- No trailing slashes

### Step 4: Update Environment Variables

1. Copy your Google OAuth credentials:
   - **Client ID**: Copy from Google Cloud Console
   - **Client Secret**: Copy from Google Cloud Console

2. Update your `.env` file:
```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### Step 5: Verify Configuration

1. Restart your development server
2. Check the console logs for the redirect URI being used
3. Try the Google OAuth flow again

### Step 6: Production Deployment

For production deployment on Vercel:

1. Add your production environment variables in Vercel dashboard
2. Make sure `VERCEL_URL` is set automatically by Vercel
3. Add your production redirect URI to Google OAuth configuration

### Troubleshooting

**Common Issues:**

1. **Wrong Protocol**: Make sure you're using `http://` for localhost and `https://` for production
2. **Wrong Port**: Ensure you're using port 3000 for local development
3. **Wrong Path**: The path must be exactly `/api/gmail/callback`
4. **Trailing Slashes**: Don't include trailing slashes in redirect URIs
5. **Environment Variables**: Make sure your `.env` file is properly configured

**Debug Steps:**

1. Check the console logs to see what redirect URI is being generated
2. Verify the redirect URI in Google Cloud Console matches exactly
3. Clear browser cache and cookies
4. Restart your development server

### Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive configuration
- Regularly rotate your OAuth client secrets
- Use different OAuth applications for development and production

### Testing the Fix

After making these changes:

1. Restart your development server
2. Try signing in with Google again
3. The redirect URI mismatch error should be resolved
4. You should be redirected back to your application successfully
