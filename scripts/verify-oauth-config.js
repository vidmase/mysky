#!/usr/bin/env node

/**
 * Google OAuth Configuration Verification Script
 * 
 * This script helps verify that your Google OAuth configuration is correct
 * and shows you exactly what redirect URIs you need to configure.
 */

require('dotenv').config();

function verifyOAuthConfig() {
  console.log('🔍 Google OAuth Configuration Verification\n');
  
  // Check environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const vercelUrl = process.env.VERCEL_URL;
  
  console.log('📋 Environment Variables:');
  console.log(`   GOOGLE_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Missing'}`);
  console.log(`   GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`   NEXTAUTH_URL: ${nextAuthUrl || '❌ Not set (will use localhost:3000)'}`);
  console.log(`   VERCEL_URL: ${vercelUrl || '❌ Not set (local development)'}`);
  
  // Calculate redirect URIs
  const baseUrl = vercelUrl 
    ? `https://${vercelUrl}` 
    : nextAuthUrl || 'http://localhost:3000';
  
  const redirectUri = `${baseUrl}/api/gmail/callback`;
  
  console.log('\n🔗 Redirect URI Configuration:');
  console.log(`   Current Base URL: ${baseUrl}`);
  console.log(`   Redirect URI: ${redirectUri}`);
  
  console.log('\n📝 Google Cloud Console Configuration Required:');
  console.log('   Add this exact redirect URI to your Google OAuth application:');
  console.log(`   ${redirectUri}`);
  
  if (!vercelUrl) {
    console.log('\n🌐 For Production (when deployed to Vercel):');
    console.log('   You will also need to add:');
    console.log('   https://your-domain.vercel.app/api/gmail/callback');
    console.log('   (Replace "your-domain" with your actual Vercel domain)');
  }
  
  // Validation
  console.log('\n✅ Validation:');
  
  if (!clientId || !clientSecret) {
    console.log('   ❌ Missing Google OAuth credentials');
    console.log('   Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file');
    return false;
  }
  
  if (!redirectUri.includes('localhost') && !redirectUri.includes('vercel.app')) {
    console.log('   ⚠️  Redirect URI format may be incorrect');
    console.log('   Expected formats:');
    console.log('   - http://localhost:3000/api/gmail/callback (development)');
    console.log('   - https://your-domain.vercel.app/api/gmail/callback (production)');
    return false;
  }
  
  console.log('   ✅ Configuration appears valid');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Go to Google Cloud Console > APIs & Services > Credentials');
  console.log('   2. Edit your OAuth 2.0 Client ID');
  console.log('   3. Add the redirect URI shown above to "Authorized redirect URIs"');
  console.log('   4. Save the changes');
  console.log('   5. Restart your development server');
  console.log('   6. Try the Google OAuth flow again');
  
  return true;
}

// Run the verification
if (require.main === module) {
  verifyOAuthConfig();
}

module.exports = { verifyOAuthConfig };
