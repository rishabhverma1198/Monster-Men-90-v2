/**
 * ProductCard Component Tests
 * Verify pixel-perfect specifications
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../../components/common/ProductCard';
import type { Product } from '../../types/api';

// Mock stores
vi.mock('../../store/cartStore', () => ({
  useCartStore: () => ({
    addItem: vi.fn(),
  }),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock('../../store/buyerTypeStore', () => ({
  useBuyerTypeStore: () => ({
    buyerType: 'single',
  }),
}));

const mockProduct: Product = {
  id: '1',
  title: 'Test Product',
  slug: 'test-product',
  description: 'Test description',
  category: 'T-Shirts',
  price_buyer: 999,
  price_wholesale: 800,
  wholesale_moq: 10,
  image_urls: ['https://example.com/image.jpg'],
  stock: 100,
  is_active: true,
  created_at: '2024-01-01',
};

describe('ProductCard Component', () => {
  it('should render product with correct dimensions', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    const card = container.querySelector('.max-w-\\[280px\\]');
    expect(card).toBeInTheDocument();
  });

  it('should display product title', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should display product price in correct format', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    expect(screen.getByText(/₹999/)).toBeInTheDocument();
  });

  it('should have Add to Cart button with correct styling', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: /add .* to cart/i });
    expect(button).toHaveClass('bg-[#ffdc46]');
  });

  it('should have image with correct aspect ratio', () => {
    const { container } = render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );

    const imageContainer = container.querySelector('.h-\\[280px\\]');
    expect(imageContainer).toBeInTheDocument();
  });
});
