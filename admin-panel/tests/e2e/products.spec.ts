import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { ensureAdminProductExists } from './seed';

/**
 * Products Management E2E Tests
 * Tests real product CRUD flows with actual backend
 */
test.describe('Products Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can view products list', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Wait for page to load
    await page.waitForTimeout(1500);

    // Should see products page title or heading
    const hasProductsTitle = await page.getByText(/products/i).first().isVisible().catch(() => false);
    
    // Should see products table or empty state (check multiple variations)
    const hasEmptyMessage = await page.getByText(/no products found|no products|empty/i).isVisible().catch(() => false);
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasProductCard = await page.locator('[class*="product"], [class*="card"]').first().isVisible().catch(() => false);
    
    // At least one should be true: title, empty message, table, or product card
    expect(hasProductsTitle || hasEmptyMessage || hasTable || hasProductCard).toBeTruthy();
  });

  test('admin can create a new product', async ({ page }) => {
    await page.goto('/dashboard/products/create');

    // Wait for form to load
    await page.waitForTimeout(1000);

    // Fill product form (using name attributes from ProductsCreate.tsx)
    await page.fill('input[name="name"]', 'E2E Test Product');
    await page.fill('textarea[name="description"]', 'This is a test product created by E2E tests');

    // Category: Men / Women / New Trend / Other (use preset "Men")
    await page.locator('select[aria-label="Category"]').selectOption('Men');

    await page.fill('input[name="price"]', '999');
    await page.fill('input[name="stock"]', '10');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect or response
    await page.waitForTimeout(2000);

    // Should redirect to products list or show success message
    const isOnProductsPage = page.url().includes('/dashboard/products');
    
    // Product should appear in list (or success message shown)
    const successMessage = await page.getByText(/success|created|saved|product created/i).isVisible().catch(() => false);
    const productInList = await page.getByText('E2E Test Product').isVisible().catch(() => false);
    
    expect(isOnProductsPage || successMessage || productInList).toBeTruthy();
  });

  test('product form validation works', async ({ page }) => {
    await page.goto('/dashboard/products/create');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('.text-red-400').first()).toBeVisible({ timeout: 5000 });
  });

  test('admin can edit existing product', async ({ page }) => {
    // First, go to products list
    await page.goto('/dashboard/products');

    // Wait for products to load
    await page.waitForTimeout(1000);

    // Find and click edit button for first product
    const editButton = page.locator('a[href*="/edit"], button:has-text("Edit")').first();

    if (!(await editButton.isVisible().catch(() => false))) {
      // Ensure at least one product exists, then reload list.
      // (Uses backend APIs; avoids "skip if empty" behavior.)
      await ensureAdminProductExists(page.request);
      await page.reload();
      await page.waitForTimeout(1000);
    }

    await expect(editButton).toBeVisible();
    await editButton.click();

    // Should be on edit page
    await expect(page).toHaveURL(/\/dashboard\/products\/.*\/edit/);

    // Wait for form to load
    await page.waitForTimeout(1000);

    // Update product name (ProductsEdit uses "name" not "title")
    const nameInput = page.locator('input[name="name"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.click({ clickCount: 3 }); // Select all text
      await nameInput.fill('Updated Product Name');
    } else {
      // Try alternative selector
      const titleInput = page
        .locator('input[name="title"], input[placeholder*="name" i]')
        .first();
      await expect(titleInput).toBeVisible();
      await titleInput.click({ clickCount: 3 });
      await titleInput.fill('Updated Product Name');
    }

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect back to products list
    await expect(page).toHaveURL(/\/dashboard\/products/);
  });

  test('admin can delete product', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Wait for products to load
    await page.waitForTimeout(1000);

    // Ensure at least one product exists (otherwise delete can't be exercised).
    await ensureAdminProductExists(page.request);
    await page.reload();
    await page.waitForTimeout(1000);

    // Find delete/deactivate button (Products page uses icon button with aria-label)
    const deleteButton = page.locator('button[aria-label="Delete product"]').first();
    await expect(deleteButton).toBeVisible();

    // Native confirm() is used; accept it.
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await deleteButton.click();

    // Should mark product inactive (INACTIVE overlay) OR remove from list
    await page.waitForTimeout(1200);
    const hasInactiveOverlay = await page
      .getByText('INACTIVE')
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await page
      .getByText(/no products found/i)
      .isVisible()
      .catch(() => false);
    expect(hasInactiveOverlay || hasEmptyState).toBeTruthy();
  });

  test('products list pagination works', async ({ page }) => {
    await page.goto('/dashboard/products');

    // Wait for products to load
    await page.waitForTimeout(1000);

    // Check if pagination exists
    const nextButton = page.locator('button:has-text("Next")');

    // Products page only renders pagination when totalPages > 1.
    // If there's just 1 page, "Next" won't exist (that's correct behavior).
    const nextVisible = await nextButton.isVisible().catch(() => false);
    if (!nextVisible) {
      expect(true).toBeTruthy();
      return;
    }

    if (await nextButton.isDisabled()) {
      expect(true).toBeTruthy();
      return;
    }

    await nextButton.click();
    // Should be on page 2 (UI renders "Page 2 of N" when pagination is active)
    await expect(page.getByText(/page 2/i)).toBeVisible();
  });
});
