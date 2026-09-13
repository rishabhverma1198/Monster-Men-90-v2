import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

/**
 * Regression Tests
 * Tests critical paths to ensure no regressions after changes
 */
test.describe('Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('critical navigation paths work', async ({ page }) => {
    // Dashboard
    await page.goto('/dashboard');
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();

    // Products
    await page.goto('/dashboard/products');
    await expect(page.getByText(/products/i).first()).toBeVisible();

    // Orders
    await page.goto('/dashboard/orders');
    await expect(page.getByText(/orders/i).first()).toBeVisible();

    // Users (if exists)
    await page.goto('/dashboard/users').catch(() => {});
    
    // Inventory (if exists)
    await page.goto('/dashboard/inventory').catch(() => {});
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/dashboard');

    // Click Products in sidebar
    await page.click('a[href="/dashboard/products"]');
    await expect(page).toHaveURL(/\/dashboard\/products/);

    // Click Orders in sidebar
    await page.click('a[href="/dashboard/orders"]');
    await expect(page).toHaveURL(/\/dashboard\/orders/);

    // Click Dashboard in sidebar
    await page.click('a[href="/dashboard"]');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('authentication persists across navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to multiple pages
    await page.goto('/dashboard/products');
    await expect(page).toHaveURL(/\/dashboard\/products/);

    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/\/dashboard\/orders/);

    // Should still be authenticated
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();
  });

  test('logout works from any page', async ({ page }) => {
    await page.goto('/dashboard/products');

    await page.getByRole('button', { name: /logout/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Should not be able to access dashboard
    await page.goto('/dashboard/products');
    await expect(page).toHaveURL(/\/login/);
  });

  test('protected routes redirect when not authenticated', async ({ page, context }) => {
    // Clear authentication
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to access protected routes
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dashboard/products');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('page refresh maintains authentication', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Refresh page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL(/\/dashboard\/products/);
    await expect(page.getByText(/products/i).first()).toBeVisible();
  });

  test('back button navigation works correctly', async ({ page }) => {
    await page.goto('/dashboard/products');
    
    // Go to create product page
    await page.click('a[href="/dashboard/products/create"]');
    await expect(page).toHaveURL(/\/dashboard\/products\/create/);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard\/products/);
  });
});
