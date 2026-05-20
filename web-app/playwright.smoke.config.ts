import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke-test config for the web-app production build.
 * Runs a single test against `vite preview` to verify the app mounts
 * without uncaught JS errors after every build.
 *
 * Run locally:  npm run smoke
 * Run in CI:    npx playwright test --config=playwright.smoke.config.ts
 */
export default defineConfig({
  testDir: './e2e-smoke',
  timeout: 30_000,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
