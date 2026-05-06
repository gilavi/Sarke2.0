import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      '__tests__/**/*.{test,spec}.{ts,tsx,mjs}',
    ],
    exclude: ['node_modules', 'dist', 'web', 'web-app', 'website'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
    },
  },
});
