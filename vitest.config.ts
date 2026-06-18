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
    ],
    exclude: ['node_modules', 'dist', 'web', 'web-app', 'website'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'lib/**/*.ts',
        'types/**/*.ts',
        'store/**/*.ts',
      ],
      exclude: [
        'lib/**/*.d.ts',
        'lib/supabase.ts',
        'lib/theme.ts',
        'lib/ThemeContext.tsx',
      ],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20,
      },
    },
    env: {
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
      // reanimated v4 hangs on import under jsdom; alias it to an inert stub so
      // the real native/worklet graph never loads. See tests/mocks/reanimated-stub.ts.
      'react-native-reanimated': path.resolve(__dirname, 'tests/mocks/reanimated-stub.ts'),
    },
  },
});
