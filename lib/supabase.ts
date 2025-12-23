
import { createClient } from '@supabase/supabase-js';

/**
 * Robust retrieval of environment variables.
 * Using direct literal tokens to ensure Vite's static replacement works reliably.
 */

// Helper to safely extract values from various possible injection points
const getEnvValue = (key: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string => {
  // 1. Try Vite static replacement (must be literal string for the analyzer)
  try {
    if (key === 'VITE_SUPABASE_URL') {
      // @ts-ignore - Injected by Vite
      const val = import.meta.env.VITE_SUPABASE_URL;
      if (val && typeof val === 'string' && !val.includes('import.meta')) return val;
    } else {
      // @ts-ignore - Injected by Vite
      const val = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (val && typeof val === 'string' && !val.includes('import.meta')) return val;
    }
  } catch (e) {}
  
  // 2. Try process.env (for environments that don't use static replacement or browser polyfills)
  try {
    const procVal = (process as any).env[key] || (window as any).process?.env?.[key];
    if (procVal && typeof procVal === 'string') return procVal;
  } catch (e) {}

  // 3. Final fallback: Use project-specific defaults
  if (key === 'VITE_SUPABASE_URL') return 'https://rucwfhprvsvbytijwzya.supabase.co';
  if (key === 'VITE_SUPABASE_ANON_KEY') return 'sb_publishable_ltaNA7nnVozoSCOcZIjg';
  
  return '';
};

const supabaseUrl = getEnvValue('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvValue('VITE_SUPABASE_ANON_KEY');

// Diagnostic logging for development
if (supabaseUrl && supabaseAnonKey) {
    const maskedKey = supabaseAnonKey.length > 8 
        ? `${supabaseAnonKey.substring(0, 4)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 4)}` 
        : '***';
    console.log(`[Supabase Init] Connected to: ${supabaseUrl}`);
    console.log(`[Supabase Init] Key used: ${maskedKey}`);
}

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

// Initialize the client
// We prioritize real configuration but provide a dummy to prevent crashes if all checks fail
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder-project.supabase.co', 'placeholder-key');

if (isSupabaseConfigured) {
    console.log('[Supabase Init] Client initialized successfully.');
} else {
    console.error('[Supabase Init] Client initialization failed due to missing config. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}
