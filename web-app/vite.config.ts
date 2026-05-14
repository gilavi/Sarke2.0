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
          if (id.includes('react-dom') || id.includes('scheduler')) return 'react-dom';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
