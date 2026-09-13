import { test, expect } from '@playwright/test';
import { waitForLoginForm, loginAsAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

/**
 * Authentication E2E Tests
 * Tests real login/logout flows with actual backend
 */
test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('admin can login successfully', async ({ page }) => {
    await waitForLoginForm(page);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test('login fails with invalid credentials', async ({ page }) => {
    await waitForLoginForm(page);
    // Use a unique email to avoid account-lockout interference across retries/runs.
    const invalidEmail = `invalid+${Date.now()}@test.com`;
    await page.fill('input[type="email"]', invalidEmail);
    await page.fill('input[type="password"]', 'wrongpassword');
    const [loginResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().includes('/api/auth/login'),
        { timeout: 15000 }
      ),
      page.click('button[type="submit"]'),
    ]);

    // Backend should reject bad credentials
    expect([401, 423]).toContain(loginResp.status());
    await expect(page).toHaveURL(/\/login/);
  });

  test('login form validation works', async ({ page }) => {
    await waitForLoginForm(page);
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid email address/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/password is required/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('admin can logout', async ({ page }) => {
    await loginAsAdmin(page);

    await page.getByRole('button', { name: /logout/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/products');

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('session persists on page refresh', async ({ page }) => {
    await loginAsAdmin(page);
    await page.reload();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });
});
