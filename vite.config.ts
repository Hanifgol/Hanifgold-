import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Retrieve API_KEY from loaded env files or system environment (Netlify)
  const apiKey = env.API_KEY || process.env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Safely provide process.env.API_KEY to the client
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Polyfill process.env to prevent crashes in some libs
      'process.env': {}
    }
  };
});