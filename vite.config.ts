
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Retrieve Gemini API key from environment
  // Updated to check for VITE_GOOGLE_API_KEY as requested by the user
  const apiKey = env.API_KEY || env.VITE_GOOGLE_API_KEY || (process as any).env.API_KEY || (process as any).env.VITE_GOOGLE_API_KEY || '';

  // Retrieve Supabase credentials from environment or use requested fallbacks
  const supabaseUrl = env.VITE_SUPABASE_URL || (process as any).env.VITE_SUPABASE_URL || 'https://rucwfhprvsvbytijwzya.supabase.co';
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || (process as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ltaNA7nnVozoSCOcZIjg';

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Provide Gemini API key to the client
      'process.env.API_KEY': JSON.stringify(apiKey),
      
      // Define Supabase environment variables for the client side. 
      // Using both import.meta.env and process.env patterns for maximum compatibility.
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey)
    }
  };
});
