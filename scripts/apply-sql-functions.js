const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get the absolute path to .env.local
const envPath = path.resolve(process.cwd(), '.env.local');

// Check if the file exists
if (!fs.existsSync(envPath)) {
  console.error(`Error: .env.local file not found at ${envPath}`);
  process.exit(1);
}

// Read environment variables
require('dotenv').config({ path: envPath });

// Log the loaded environment for debugging
console.log('Environment loaded from:', envPath);
console.log('URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Supabase connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase URL or Service Key not found in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read the SQL file
const sqlFilePath = path.join(__dirname, '../supabase/user-admin-functions.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

console.log('SQL file loaded:', sqlFilePath);

// Since this is a fresh application, let's directly apply the SQL without checking if functions exist
async function applyMigration() {
  console.log('Applying SQL functions to Supabase database...');
  try {
    console.log('Executing SQL on', supabaseUrl);
    // Execute the SQL directly
    const { data, error } = await supabase.rpc('admin_filtered_user_list', {
      email_filter: null,
      role_filter: null,
      signup_after: null,
      signup_before: null,
      last_active_after: null,
      last_active_before: null,
      page_size: 10,
      page_number: 1
    }).catch(err => {
      console.log('Expected error when checking function (this is normal):', err.message);
      return { error: { message: 'Function does not exist' } };
    });
    
    if (error && error.message.includes('does not exist')) {
      console.log('Admin functions not found, creating them...');
      
      // Use raw SQL query to create functions
      const { error: sqlError } = await supabase.from('_sql').select('*').execute(sql);
      
      if (sqlError) {
        console.error('Error applying SQL functions:', sqlError);
        process.exit(1);
      }
      
      console.log('✅ SQL functions applied successfully');
    } else if (error) {
      console.error('Unexpected error checking for functions:', error);
      process.exit(1);
    } else {
      console.log('Admin functions already exist, updating them...');
      
      // Use raw SQL query to update functions
      const { error: sqlError } = await supabase.from('_sql').select('*').execute(sql);
      
      if (sqlError) {
        console.error('Error updating SQL functions:', sqlError);
        process.exit(1);
      }
      
      console.log('✅ SQL functions updated successfully');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration(); 