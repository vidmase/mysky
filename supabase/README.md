# Applying SQL Functions to Your Supabase Database

You need to apply the SQL functions to your Supabase database. Here's how:

## Option 1: Use the Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard (https://app.supabase.io)
2. Select your project
3. Go to the "SQL Editor" section
4. Create a new query
5. Copy the contents of `user-admin-functions.sql` and paste it into the SQL editor
6. Click "Run" to execute the SQL

## Option 2: Use the Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push --db-url your-db-connection-string
```

## Option 3: Use the Apply Script (Requires Credentials)

1. Make sure your `.env.local` file contains the following:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

2. Run the script:
   ```
   npm run apply-sql
   ```

## Troubleshooting

### Missing Function Error

If you're getting the error: "Could not find the function public.admin_filtered_user_list", it means the SQL functions haven't been applied to your database yet. Follow one of the options above to fix it.

### Column Errors

If you're getting errors about missing columns, you might need to check your database schema:

1. The SQL functions expect a `profiles` table with columns:
   - `id` (UUID, foreign key to auth.users.id)
   - `role` (TEXT)
   - `last_active_at` (TIMESTAMPTZ)

2. For the `is_super_admin` status, the function looks for the `raw_app_meta_data->>'is_super_admin'` field in the `auth.users` table.

You can verify your profiles table structure with this query:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public';
```

If you need to modify the table structure, run:

```sql
-- Add missing columns if needed
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NULL;
``` 