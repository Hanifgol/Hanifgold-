
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' is used to load all env variables regardless of VITE_ prefix.
  // Fix: Cast process to any to resolve 'cwd' property error in some TS environments
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Retrieve keys from loaded env files or system environment
  const apiKey = env.API_KEY || process.env.API_KEY || '';
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Safely provide environment variables to the client
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey)
    }
  };
});
