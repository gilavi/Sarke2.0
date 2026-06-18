import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Public anon Supabase creds (same as .env.example) so supabase.ts's
    // import-time env validation passes under Vitest in CI, which runs without
    // a local .env. Any test that imports the data layer pulls in supabase.ts.
    env: {
      VITE_SUPABASE_URL: 'https://seskuthiopywrgntsgfw.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_OF_L2E27-Uv8MMw87fWfSA_znD7moYY',
    },
    // Unit tests live under src/. Keep Playwright specs (e2e-smoke/, run via
    // `npm run smoke`) out of Vitest - their `test()` comes from @playwright/test
    // and throws "did not expect test() to be called here" under Vitest.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'e2e-smoke/**', '**/*.smoke.*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/__tests__/**',
        'src/test-setup.ts',
        'src/test-utils.tsx',
        'src/types/**',
        'src/main.tsx',
        'src/**/*.d.ts',
      ],
      // No enforced thresholds yet - run `npm run test:coverage` to establish a
      // baseline, then ratchet thresholds up here (e.g. lines/functions: 60).
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@root': resolve(__dirname, '..'),
    },
  },
});
