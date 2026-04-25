import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves under https://<owner>.github.io/<repo>/, so all asset
// URLs need to be prefixed with the repo name. Override at deploy time via
// VITE_BASE_PATH if the repo is renamed or hosted elsewhere.
const base = process.env.VITE_BASE_PATH ?? '/Sarke2.0/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
