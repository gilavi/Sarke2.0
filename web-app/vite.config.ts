import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/Sarke2.0/app/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@root': path.resolve(__dirname, '..'),
    },
  },
  build: {
    sourcemap: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // three.js and @react-three/fiber/@react-three/drei stay in vendor.
          // Splitting them into a separate chunk caused two problems:
          //  1. Vite's module-preload helper ended up in the threejs chunk, forcing
          //     a static import from the entry → threejs at startup.
          //  2. @react-three/fiber module-init code ran before React's vendor chunk
          //     had set up ReactCurrentBatchConfig → blank page crash.
          // Keeping them in vendor ensures proper initialization order.
          // (same reason react-dom is kept in vendor — see comment below)
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet';
          if (id.includes('@radix-ui')) return 'radix-ui';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('lucide-react')) return 'icons';
          // react-dom is NOT split from vendor — keeping them together avoids the
          // circular chunk dependency (vendor↔react-dom) that caused a blank page on GH Pages.
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
