# Timed User Deactivation

This feature allows administrators to temporarily deactivate user accounts for a specified duration. After the deactivation period ends, the accounts are automatically reactivated.

## Features

- Administrators can choose from preset deactivation durations (1 hour, 24 hours, 48 hours, 1 week, 30 days)
- Administrators can permanently deactivate accounts (no auto-reactivation)
- Automatic reactivation when the deactivation period ends
- Real-time notification to users when their account is deactivated
- Row Level Security to block access for deactivated accounts

## Database Changes

To implement this feature, we need to:

1. Add a `deactivation_end_date` column to the `profiles` table
2. Create a trigger function to automatically reactivate accounts when the deactivation period ends
3. Set up a scheduled job to periodically check for accounts that need reactivation
4. Add a Row Level Security policy to block access for deactivated accounts

## Applying the SQL Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard (https://app.supabase.io)
2. Select your project
3. Go to the "SQL Editor" section
4. Create a new query
5. Copy the contents of `add-deactivation-end-date.sql` and paste it into the SQL editor
6. Click "Run" to execute the SQL

### Option 2: Using the Apply Script (Requires Credentials)

If you have set up the project with proper credentials:

```bash
npm run apply-sql -- --file=supabase/add-deactivation-end-date.sql
```

## How it Works

### Database Layer

The system works through several components:

1. **Trigger Function**: The `check_deactivation_end()` function runs before any insert or update to the `profiles` table. If a user has `disabled=true` and a `deactivation_end_date` in the past, it automatically sets `disabled=false`.

2. **Scheduled Job**: The `auto_reactivate_accounts()` function periodically checks for accounts that should be reactivated and updates them. This handles cases where no updates happen to trigger the function.

3. **RLS Policy**: A Row Level Security policy blocks access to the system for any user with `disabled=true`, regardless of whether the deactivation is temporary or permanent.

### Frontend Layer

1. **Admin Interface**: Administrators can set a deactivation duration when disabling a user account.

2. **User Notification**: When a user's account is deactivated, they receive a real-time notification and are logged out.

## Scheduled Job

The SQL includes a setup for a scheduled job using `pg_cron`, which runs every 15 minutes. If you don't have `pg_cron` enabled in your Supabase instance, you'll need to set up an alternative:

### Alternative: Supabase Edge Functions

You can create a Supabase Edge Function that runs periodically to check for accounts that need reactivation:

1. Create a new Edge Function (`supabase/functions/reactivate-accounts/index.ts`):

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Run the auto-reactivate function
    const { error } = await supabaseAdmin.rpc('auto_reactivate_accounts')
    
    if (error) throw error
    
    return new Response(JSON.stringify({ success: true }), { 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
})
```

2. Deploy the function:

```bash
supabase functions deploy reactivate-accounts
```

3. Set up a scheduled task to call this function every 15 minutes using a service like Upstash, Google Cloud Scheduler, or AWS EventBridge. 