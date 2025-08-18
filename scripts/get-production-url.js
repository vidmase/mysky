#!/usr/bin/env node

/**
 * Get Production URL for Vercel Deployment
 * 
 * This script helps determine the exact production URL for your Vercel deployment
 * and shows you the redirect URI you need to add to Google OAuth.
 */

require('dotenv').config();

function getProductionUrl() {
  console.log('🌐 Vercel Production URL Configuration\n');
  
  // Check for VERCEL_URL environment variable (set automatically by Vercel)
  const vercelUrl = process.env.VERCEL_URL;
  
  if (vercelUrl) {
    console.log('✅ VERCEL_URL environment variable found:');
    console.log(`   ${vercelUrl}`);
    console.log(`\n🔗 Production Redirect URI:`);
    console.log(`   https://${vercelUrl}/api/gmail/callback`);
  } else {
    console.log('❌ VERCEL_URL not found in environment variables');
    console.log('\n📝 To find your production URL:');
    console.log('   1. Go to your Vercel dashboard: https://vercel.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Look at the "Domains" section');
    console.log('   4. Use the main domain (usually your-project-name.vercel.app)');
    console.log('\n💡 Based on your project name "mysky", your URL is likely:');
    console.log('   https://mysky.vercel.app');
    console.log('\n🔗 Production Redirect URI (likely):');
    console.log('   https://mysky.vercel.app/api/gmail/callback');
  }
  
  console.log('\n🎯 Google Cloud Console Configuration:');
  console.log('   Add BOTH of these redirect URIs to your Google OAuth application:');
  console.log('\n   For Development:');
  console.log('   http://localhost:3000/api/gmail/callback');
  console.log('\n   For Production:');
  if (vercelUrl) {
    console.log(`   https://${vercelUrl}/api/gmail/callback`);
  } else {
    console.log('   https://mysky.vercel.app/api/gmail/callback');
  }
  
  console.log('\n📋 Steps to configure:');
  console.log('   1. Go to Google Cloud Console > APIs & Services > Credentials');
  console.log('   2. Edit your OAuth 2.0 Client ID');
  console.log('   3. Add both redirect URIs above to "Authorized redirect URIs"');
  console.log('   4. Save the changes');
  console.log('   5. Deploy your changes to Vercel');
  console.log('   6. Test the OAuth flow in production');
}

// Run the script
if (require.main === module) {
  getProductionUrl();
}

module.exports = { getProductionUrl };
