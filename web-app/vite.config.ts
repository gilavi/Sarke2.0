import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Hosted at https://gilavi.github.io/Sarke2.0/app/ — the /Sarke2.0/ root is reserved
// for the existing sarke-sign signing app (web/), which uses hash routing and is
// referenced by SMS links generated in lib/sms.ts and supabase send-signing-sms.
// Do NOT change the base without also updating those callers.
export default defineConfig({
  base: '/Sarke2.0/app/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
