import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed to https://hubble.ge/cms/ (see .github/workflows/deploy-cms.yml).
// Production build is based at /cms/ so assets resolve; dev stays at / for a
// simpler local URL.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cms/' : '/',
  plugins: [react()],
}));
