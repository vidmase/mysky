const fs = require('fs');
const path = require('path');
const https = require('https');

// Read the SQL file
const sqlFilePath = path.join(__dirname, '../supabase/user-admin-functions.sql');
const sql = fs.readFileSync(sqlFilePath, 'utf8');

console.log('Applying SQL functions to Supabase...');

// Supabase project details
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.SUPABASE_PROJECT_ID;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectId || !serviceRoleKey) {
  console.error('Error: Supabase project id or service role key not found in environment variables');
  console.error('Make sure SUPABASE_PROJECT_ID and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create the request options
const options = {
  hostname: `${projectId}.supabase.co`,
  path: '/rest/v1/rpc/admin_user_list_view',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`
  }
};

// Make a request to check if the function exists
const checkRequest = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    // If we get a 404 or error saying function doesn't exist, we apply the functions
    if (res.statusCode === 404 || data.includes('does not exist')) {
      console.log('Functions do not exist. Creating them...');
      applyFunctions();
    } else {
      console.log('Functions already exist. Updating them...');
      applyFunctions();
    }
  });
});

checkRequest.on('error', (error) => {
  console.error('Error checking functions:', error);
  // If there's an error, try to apply the functions anyway
  applyFunctions();
});

checkRequest.end();

function applyFunctions() {
  // Apply the SQL directly using the SQL endpoint
  const sqlOptions = {
    hostname: `${projectId}.supabase.co`,
    path: '/rest/v1/sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Prefer': 'resolution=merge-duplicates'
    }
  };

  const sqlRequest = https.request(sqlOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('SQL execution response:', res.statusCode);
      try {
        const responseData = JSON.parse(data);
        console.log('Response data:', responseData);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ SQL functions applied successfully');
        } else {
          console.error('Failed to apply SQL functions:', responseData);
        }
      } catch (e) {
        console.log('Raw response:', data);
        console.error('Error parsing response:', e);
      }
    });
  });

  sqlRequest.on('error', (error) => {
    console.error('Error applying SQL functions:', error);
  });

  // Send the SQL as a query parameter
  sqlRequest.write(JSON.stringify({ query: sql }));
  sqlRequest.end();
} 