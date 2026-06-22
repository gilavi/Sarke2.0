import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const repoRoot = resolve(__dirname, '..');
const shims = resolve(__dirname, 'shims');

export default defineConfig({
  plugins: [react()],
  // When Vitest transforms @root/components/** files, esbuild walks up to the
  // repo root tsconfig.json which extends "expo/tsconfig.base" — a package that
  // isn't installed in CI (only web-app/ deps are). Providing tsconfigRaw here
  // bypasses file-based tsconfig discovery for all esbuild transforms so the
  // missing expo package never causes a TSConfckParseError.
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        jsx: 'react-jsx',
        jsxImportSource: 'react',
        target: 'esnext',
        module: 'esnext',
        moduleResolution: 'bundler',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        strict: false,
      },
    },
  },
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
    // Deduplicate React so that shared ../components/primitives (which resolve
    // react from root node_modules when imported via @root) use the SAME React
    // instance as the web-app code. Without this, two React instances coexist
    // in the same test run and hooks crash with "null (reading 'useState')".
    dedupe: ['react', 'react-dom', 'react-native-web'],
    // Keep in sync with vite.config.ts aliases — Vitest uses this config
    // for tests, not the main Vite config, so RN-web aliases must be
    // duplicated here so tests that import shared ../components code work.
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@root', replacement: repoRoot },
      // Use a lightweight HTML stub instead of react-native-web in tests.
      // RNW's StyleSheet uses a jsdom-incompatible Proxy that causes crashes.
      { find: /^react-native$/, replacement: resolve(shims, 'react-native.test.tsx') },
      { find: /^lucide-react-native$/, replacement: resolve(__dirname, 'node_modules/lucide-react') },
      { find: /^expo-haptics$/, replacement: resolve(shims, 'expo-haptics.web.ts') },
      { find: /^expo-router$/, replacement: resolve(shims, 'expo-router.web.ts') },
      { find: /^react-native-gesture-handler$/, replacement: resolve(shims, 'react-native-gesture-handler.web.tsx') },
      { find: /^react-native-maps$/, replacement: resolve(shims, 'react-native-maps.ts') },
      { find: /^@react-native-community\/datetimepicker$/, replacement: resolve(shims, 'datetimepicker.web.tsx') },
      { find: /^react-native-safe-area-context$/, replacement: resolve(shims, 'react-native-safe-area-context.web.tsx') },
      // react-native-worklets and react-native-reanimated both try to initialise
      // TurboModules that don't exist in jsdom. Redirect at the Vite alias level
      // (before module init) so the crashes never happen.
      { find: /^@react-native-async-storage\/async-storage/, replacement: resolve(__dirname, 'node_modules/@react-native-async-storage/async-storage') },
      { find: /^react-native-worklets/, replacement: resolve(shims, 'react-native-worklets.test.ts') },
      { find: /^react-native-reanimated$/, replacement: resolve(shims, 'react-native-reanimated.test.ts') },
    ],
  },
});
