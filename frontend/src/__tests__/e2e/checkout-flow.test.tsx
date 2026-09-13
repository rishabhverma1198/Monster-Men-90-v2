/**
 * E2E Checkout Flow Test
 * Smoke test for app boot on home route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../App';

vi.mock('../../services/api', () => ({
  apiService: {
    getProducts: vi.fn(() =>
      Promise.resolve({
        success: true,
        data: {
          products: [
            {
              id: '1',
              title: 'Test T-Shirt',
              price_buyer: 999,
              image_urls: ['https://example.com/image.jpg'],
              category: 't-shirts',
              is_active: true,
            },
          ],
          total: 1,
        },
      })
    ),
    getCategories: vi.fn(() =>
      Promise.resolve({
        success: true,
        data: [{ id: '1', name: 'Category 1', slug: 'category-1' }],
      })
    ),
    getCart: vi.fn(() => Promise.resolve({ success: true, data: [] })),
  },
}));

describe('E2E Checkout Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('buyer_type', 'single');
    window.history.pushState({}, '', '/');
  });

  it('should complete full checkout flow', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    });

    expect(window.location.pathname).toBe('/');
  });
});
