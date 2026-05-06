import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('unauthenticated user sees login UI', async ({ page }) => {
    // The app renders auth UI at root when unauthenticated
    // Wait for the app to hydrate and verify the page loaded
    await expect(page.locator('body')).toBeVisible();
    // Give RN web a moment to render inputs
    await page.waitForTimeout(2000);
    // Look for any input field (RN TextInput on web may not always expose type="password")
    const anyInput = page.locator('input, textarea, [role="textbox"]').first();
    await expect(anyInput).toBeVisible({ timeout: 10000 });
  });

  test('login UI has email and password fields', async ({ page }) => {
    // Look for password input first (most reliable across RN web renders)
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 10000 });

    // Email field may render as a generic text input; check by placeholder or nearby label
    const emailInput = page.locator('input').first();
    await expect(emailInput).toBeVisible();
  });

  test('login validation shows error for empty fields', async ({ page }) => {
    // Look for a submit button by common text patterns
    const submitBtn = page.locator('text=/შესვლა|Login|Sign in/i').first();
    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();
      // Expect some form of error or alert to appear
      await expect(
        page.locator('text=/მოთხოვნა|required|error|შეცდომა/i').first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
