require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read SQL file
const sqlFilePath = path.join(__dirname, '../supabase/add-deactivation-end-date.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf-8');

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local file!');
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY defined.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkProfileHasColumn() {
  try {
    // Try to select the column to check if it exists
    const { data, error } = await supabase
      .from('profiles')
      .select('deactivation_end_date')
      .limit(1);
    
    if (error && error.message.includes('column')) {
      // Column doesn't exist
      return false;
    }
    
    // Column exists
    return true;
  } catch (err) {
    console.error('Error checking column:', err);
    return false;
  }
}

async function applyMigration() {
  console.log('Checking if deactivation_end_date column exists...');
  
  const columnExists = await checkProfileHasColumn();
  
  if (columnExists) {
    console.log('Column already exists. Proceeding to apply/update functions and triggers...');
  } else {
    console.log('Column does not exist. Applying full SQL migration...');
  }
  
  try {
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If the rpc doesn't exist, try using the raw SQL query approach
      console.log('Unable to use rpc method, trying raw SQL...');
      
      const { error: sqlError } = await supabase
        .from('_sql')
        .select('*')
        .execute(sql);
      
      if (sqlError) {
        console.error('Error applying SQL migration:', sqlError);
        console.log('\nYou may need to apply this SQL manually using the Supabase dashboard SQL editor.');
        console.log('See instructions in supabase/README-timed-deactivation.md\n');
        process.exit(1);
      }
    }
    
    console.log('✅ SQL migration applied successfully!');
    console.log('✅ Timed deactivation feature is now available.');
    console.log('\nYou can now use the timed deactivation feature in the admin dashboard.');
    console.log('See documentation in supabase/README-timed-deactivation.md for more details.');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration(); 