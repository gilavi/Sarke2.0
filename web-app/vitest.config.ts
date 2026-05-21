import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Unit tests live under src/. Keep Playwright specs (e2e-smoke/, run via
    // `npm run smoke`) out of Vitest — their `test()` comes from @playwright/test
    // and throws "did not expect test() to be called here" under Vitest.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'e2e-smoke/**', '**/*.smoke.*'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
