import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: '/Sarke2.0/app/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three') || id.includes('@react-three')) return 'threejs';
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
