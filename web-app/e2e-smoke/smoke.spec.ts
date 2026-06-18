import { test, expect } from '@playwright/test';

/**
 * Smoke test - runs after every production build (via `vite preview`).
 *
 * Catches two classes of regressions that previously caused blank pages:
 *   1. Unresolved imports / missing modules  → page is empty or errors on load
 *   2. Runtime JS crashes in eagerly-loaded  → pageerror event fires
 *      code (e.g. library incompatible with
 *      the React version)
 *
 * The test does NOT log in - it only verifies the app shell mounts.
 * The login page is the first thing rendered for unauthenticated users,
 * so a non-empty #root is sufficient evidence that React started.
 */
test('app shell mounts without uncaught JS errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  // The app uses hash routing on GitHub Pages - navigate to the hash route.
  await page.goto('/app/#/home');
  await page.waitForLoadState('networkidle');

  // React must have rendered something into the root element.
  // (Even the login redirect is fine - any non-empty #root means React ran.)
  const root = page.locator('#root');
  await expect(root).not.toBeEmpty();

  // No uncaught exceptions allowed - this is what caught the @react-three/fiber
  // v8 + React 19 crash that previously blanked every page.
  expect(
    errors,
    `Uncaught JS exceptions on page:\n${errors.join('\n')}`,
  ).toHaveLength(0);
});
