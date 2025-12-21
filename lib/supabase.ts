
import { createClient } from '@supabase/supabase-js';

// Accessing variables via process.env as defined and injected in vite.config.ts
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder'));

// We initialize with the provided credentials. 
// If they are missing, we use placeholders to prevent immediate crash, 
// allowing the App.tsx to display its built-in error UI.
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder-project.supabase.co', 'placeholder-key');
