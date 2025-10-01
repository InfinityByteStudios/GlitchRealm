/**
 * Supabase Configuration
 * Replace these values with your actual Supabase project credentials
 * 
 * To get these values:
 * 1. Go to https://supabase.com/dashboard
 * 2. Select your project
 * 3. Go to Settings > API
 * 4. Copy the Project URL and anon/public key
 */

export const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_PROJECT_URL',  // e.g., 'https://xxxxx.supabase.co'
    anonKey: 'YOUR_SUPABASE_ANON_KEY'  // Your public anon key (safe to use in browser)
};

// Example:
// export const SUPABASE_CONFIG = {
//     url: 'https://abcdefghijklmnop.supabase.co',
//     anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
// };
