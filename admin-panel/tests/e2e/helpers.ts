import type { Page } from '@playwright/test';

/** Admin credentials used by E2E tests. Backend must have this user. */
export const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || 'monstermen900@gmail.com';
// Verified working password against backend `/api/auth/login`
export const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || 'Monster@900';

/**
 * Wait for the login form (password mode) to be visible.
 * Use before filling email/password or clicking submit.
 */
export async function waitForLoginForm(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForURL(/\/login/, { timeout: 10000 });
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
}

/**
 * Log in as admin. Clears storage, navigates to /login, waits for form, fills and submits.
 * Assumes backend is running. Use in beforeEach for specs that need an authenticated session.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.waitForURL(/\/login/, { timeout: 10000 });
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}
