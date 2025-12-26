
import { createClient } from '@supabase/supabase-js';

const getSupabaseUrl = (): string => {
    try {
        // @ts-ignore
        const v = import.meta.env.VITE_SUPABASE_URL;
        if (v && typeof v === 'string' && !v.includes('import.meta')) return v;
    } catch (e) {}

    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) {
            return process.env.VITE_SUPABASE_URL;
        }
    } catch (e) {}

    return 'https://rucwfhprvsvbytijwzya.supabase.co';
};

const getSupabaseKey = (): string => {
    try {
        // @ts-ignore
        const v = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (v && typeof v === 'string' && !v.includes('import.meta')) return v;
    } catch (e) {}

    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) {
            return process.env.VITE_SUPABASE_ANON_KEY;
        }
    } catch (e) {}

    return '';
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseKey();

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://')
);

// Fallback empty client if not configured to prevent crashes, 
// but App.tsx checks isSupabaseConfigured before use.
export const supabase = createClient(supabaseUrl, supabaseAnonKey || 'placeholder');
