
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Retrieve Gemini API key from environment
  const apiKey = env.API_KEY || (process as any).env.API_KEY || '';

  // Retrieve Supabase credentials from environment or use requested fallbacks
  const supabaseUrl = env.VITE_SUPABASE_URL || (process as any).env.VITE_SUPABASE_URL || 'https://dnfcppypfmbabrnkscmc.supabase.co';
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || (process as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZmNwcHlwZm1iYWJybmtzY21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMjk4MTIsImV4cCI6MjA4MTkwNTgxMn0.2Bwo9W7giPbDhXnW789KizcTvwdV_fsfhH1C6_k91C8';

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
