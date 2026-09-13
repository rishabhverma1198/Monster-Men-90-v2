/**
 * Product Features Tests
 * Test product-related functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../../components/common/ProductCard';
import type { Product } from '../../types/api';

const mockProduct: Product = {
  id: '1',
  title: 'Test T-Shirt',
  slug: 'test-tshirt',
  description: 'A test t-shirt',
  category: 'T-Shirts',
  price_buyer: 999,
  price_wholesale: 800,
  wholesale_moq: 10,
  image_urls: ['https://example.com/image.jpg'],
  stock: 100,
  is_active: true,
  created_at: '2024-01-01',
};

const mockAddItem = vi.fn().mockResolvedValue(undefined);
let isAuthenticated = true;

vi.mock('../../store/cartStore', () => ({
  useCartStore: () => ({
    addItem: mockAddItem,
  }),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated,
  }),
}));

vi.mock('../../store/buyerTypeStore', () => ({
  useBuyerTypeStore: () => ({
    buyerType: 'single',
  }),
}));

describe('Product Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAuthenticated = true;
    window.history.pushState({}, '', '/');
  });

  describe('ProductCard', () => {
    it('should display product information correctly', () => {
      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      expect(screen.getByText('Test T-Shirt')).toBeInTheDocument();
      expect(screen.getByText(/₹999/)).toBeInTheDocument();
    });

    it('should have working Add to Cart button', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const button = screen.getByRole('button', { name: /add .* to cart/i });
      await user.click(button);

      await waitFor(() => {
        expect(mockAddItem).toHaveBeenCalledWith('1', 1);
      });
    });

    it('should redirect to login if not authenticated', async () => {
      isAuthenticated = false;
      const user = userEvent.setup();
      const originalLocation = window.location;
      delete (window as any).location;
      (window as any).location = {
        href: 'http://localhost:3000/',
        pathname: '/',
        search: '',
      };

      try {
        render(
          <BrowserRouter>
            <ProductCard product={mockProduct} />
          </BrowserRouter>
        );

        const button = screen.getByRole('button', { name: /add .* to cart/i });
        await user.click(button);

        expect((window as any).location.href).toContain('/login?returnUrl=');
        expect(mockAddItem).not.toHaveBeenCalled();
      } finally {
        (window as any).location = originalLocation;
      }
    });

    it('should show loading state when adding to cart', async () => {
      mockAddItem.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const button = screen.getByRole('button', { name: /add .* to cart/i });
      await user.click(button);

      // Button should show loading state
      expect(button).toBeDisabled();
    });
  });
});
