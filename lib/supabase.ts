
import { createClient } from '@supabase/supabase-js';

/**
 * Diagnostic helper to check environment variables.
 * Sensitive parts are masked for security.
 */
const getEnvVar = (name: string): string => {
    // Try Vite's native import.meta.env first, then fallback to process.env (injected by vite.config.ts)
    const value = (import.meta as any).env?.[name] || (process as any).env?.[name] || '';
    
    if (value) {
        const masked = value.length > 8 
            ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` 
            : '***';
        console.log(`[Supabase Init] Found ${name}: ${masked} (Length: ${value.length})`);
    } else {
        console.warn(`[Supabase Init] Missing ${name}`);
    }
    
    return value;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Specific check for the key type. 
// Standard Supabase Anon keys are JWTs starting with 'eyJ'.
if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
    console.error(
        '[Supabase Init] CRITICAL: Your VITE_SUPABASE_ANON_KEY does not look like a standard Supabase Anon key. ' +
        'It should be a long string starting with "eyJ". You might be using a "publishable" or "secret" key instead.'
    );
}

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

// Initialize the client. 
// If credentials are valid, it creates a real client.
// Otherwise, it uses a placeholder to prevent the app from crashing on boot.
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder-project.supabase.co', 'placeholder-key');

if (isSupabaseConfigured) {
    console.log('[Supabase Init] Client initialized successfully.');
} else {
    console.error('[Supabase Init] Client initialization failed due to missing or invalid config.');
}
