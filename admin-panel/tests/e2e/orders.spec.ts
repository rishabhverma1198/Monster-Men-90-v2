import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { ensureAdminOrderExists } from './seed';

/**
 * Orders Management E2E Tests
 * Tests real order management flows with actual backend
 */
test.describe('Orders Management', () => {
  test.beforeAll(async ({ request }) => {
    // Ensure at least one real order exists so "details/status update" tests never skip.
    await ensureAdminOrderExists(request);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can view orders list', async ({ page }) => {
    await page.goto('/dashboard/orders');

    // Wait for page to load
    await page.waitForTimeout(1500);

    // Should see orders page title or heading
    const hasOrdersTitle = await page.getByText(/orders/i).first().isVisible().catch(() => false);
    
    // Should see orders table or empty state (check multiple variations)
    const hasEmptyMessage = await page.getByText(/no orders found|no orders|empty/i).isVisible().catch(() => false);
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasOrderCard = await page.locator('[class*="order"], [class*="card"]').first().isVisible().catch(() => false);
    
    // At least one should be true: title, empty message, table, or order card
    expect(hasOrdersTitle || hasEmptyMessage || hasTable || hasOrderCard).toBeTruthy();
  });

  test('admin can filter orders by status', async ({ page }) => {
    await page.goto('/dashboard/orders');

    // Wait for orders to load
    await page.waitForTimeout(1000);

    // Find status filter dropdown
    const statusFilter = page.getByLabel('Filter by order status');
    await expect(statusFilter).toBeVisible();

    await statusFilter.selectOption('pending');

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Should show filtered results (or empty state)
    const hasResults = await page.locator('table').isVisible().catch(() => false);
    const isEmpty = await page.getByText(/no orders found/i).isVisible().catch(() => false);

    expect(hasResults || isEmpty).toBeTruthy();
  });

  test('admin can view order details', async ({ page, request }) => {
    await ensureAdminOrderExists(request);
    await page.goto('/dashboard/orders');

    // Wait for orders to load
    await page.waitForTimeout(1000);

    // Find and click "View" button for first order
    const viewButton = page.locator('a:has-text("View"), button:has-text("View")').first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // Should be on order details page
    await expect(page).toHaveURL(/\/dashboard\/orders\/.+/);

    // Should see order information
    await expect(page.getByText(/order details/i)).toBeVisible();

    // Should see order summary-ish content
    const hasSummary = await page
      .getByText(/total|amount|status/i)
      .isVisible()
      .catch(() => false);
    expect(hasSummary).toBeTruthy();
  });

  test('admin can update order status', async ({ page, request }) => {
    await ensureAdminOrderExists(request);
    await page.goto('/dashboard/orders');

    // Wait for orders to load
    await page.waitForTimeout(1000);

    // Find and click "View" button for first order
    const viewButton = page.locator('a:has-text("View"), button:has-text("View")').first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    await expect(page).toHaveURL(/\/dashboard\/orders\/.+/);

    // Click "Update Status" button
    const updateButton = page.getByRole('button', { name: /update status/i }).first();
    await expect(updateButton).toBeVisible();
    await updateButton.click();

    // Should see status update modal
    await expect(page.getByText(/update order status/i)).toBeVisible();

    // Select new status
    const statusSelect = page.locator('select').last();
    await statusSelect.selectOption('confirmed');

    // Click update button (modal footer)
    const confirmButton = page.getByRole('button', { name: /update status/i }).last();
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for update to complete
    await page.waitForTimeout(1500);

    // Should see updated status (or success message)
    const hasUpdated = await page.getByText(/confirmed/i).isVisible().catch(() => false);
    const hasSuccess = await page.getByText(/success|updated/i).isVisible().catch(() => false);

    expect(hasUpdated || hasSuccess).toBeTruthy();
  });

  test('order status update modal can be cancelled', async ({ page, request }) => {
    await ensureAdminOrderExists(request);
    await page.goto('/dashboard/orders');

    await page.waitForTimeout(1000);

    const viewButton = page.locator('a:has-text("View"), button:has-text("View")').first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    await expect(page).toHaveURL(/\/dashboard\/orders\/.+/);

    const updateButton = page.getByRole('button', { name: /update status/i }).first();
    await expect(updateButton).toBeVisible();
    await updateButton.click();

    await expect(page.getByText(/update order status/i)).toBeVisible();

    // Click cancel
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Modal should close
    await expect(page.getByText(/update order status/i)).not.toBeVisible();
  });

  test('orders list pagination works', async ({ page }) => {
    await page.goto('/dashboard/orders');

    await page.waitForTimeout(1000);

    const nextButton = page.locator('button:has-text("Next")');

    // If only 1 page, "Next" must be disabled (that's correct behavior, not a skip).
    if (await nextButton.isVisible()) {
      if (await nextButton.isDisabled()) {
        await expect(page.getByText(/page 1 of 1/i)).toBeVisible();
      } else {
        await nextButton.click();
        await expect(page.getByText(/page 2/i)).toBeVisible();
      }
    } else {
      // Pagination UI should always exist when orders page renders a list.
      await expect(page.getByText(/page/i)).toBeVisible();
    }
  });
});
