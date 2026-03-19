/**
 * Supabase Configuration
 * Replace these values with your actual Supabase project credentials
 * 
 * To get these values:
 * 1. Go to https://supabase.com/dashboard
 * 2. Select your project (or create one if you haven't)
 * 3. Go to Settings > API
 * 4. Copy the Project URL and anon/public key
 * 
 * See AVATAR_IMPLEMENTATION.md for complete setup instructions
 */

export const SUPABASE_CONFIG = {
    url: 'https://hkogcnxmrrkxggwcrqyh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhrb2djbnhtcnJreGdnd2NycXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxOTA5MDQsImV4cCI6MjA3Mjc2NjkwNH0.mOrnXNJBQLgMg1oq4zW1ySvCMXAbo-ZNAMwx59NJyxM'
};

// Check if configured
const isConfigured = SUPABASE_CONFIG.url && 
                     !SUPABASE_CONFIG.url.includes('YOUR_SUPABASE') &&
                     SUPABASE_CONFIG.anonKey && 
                     !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE');

if (!isConfigured) {
     // Reset
}

// Example:
// export const SUPABASE_CONFIG = {
//     url: 'https://abcdefghijklmnop.supabase.co',
//     anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
// };
