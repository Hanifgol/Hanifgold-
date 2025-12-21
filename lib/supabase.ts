
import { createClient } from '@supabase/supabase-js';

/**
 * Standard Vite environment variable access. 
 * These are replaced by build-time values defined in vite.config.ts
 * FIX: Using process.env instead of import.meta.env to resolve TS errors in environments 
 * where ImportMeta is not fully extended with Vite-specific env types.
 */
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

// Initialize the client. 
// If credentials are valid, it creates a real client.
// Otherwise, it uses a placeholder to prevent the app from crashing on boot,
// allowing the UI to show the connection error screen gracefully.
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder-project.supabase.co', 'placeholder-key');
