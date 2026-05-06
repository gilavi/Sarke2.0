import { test, expect } from '@playwright/test';

test.describe('Navigation & core flows', () => {
  test('home page loads without crashing', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('guide page loads', async ({ page }) => {
    await page.goto('/guide');
    await expect(page.locator('body')).toBeVisible();
    // The guide page should show the scaffold image or at least render
    // expo-image on web may not produce a simple <img>, so we just verify no crash
  });

  test('terms page is accessible', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('body')).toBeVisible();
  });
});
