/**
 * UI/UX Tests
 * Tests user interface elements, interactions, and accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../components/common/ProductCard';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import type { Product } from '../types/api';

// Mock stores
vi.mock('../store/cartStore', () => ({
  useCartStore: () => ({
    addItem: vi.fn(),
    getItemCount: () => 0,
  }),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock('../store/buyerTypeStore', () => ({
  useBuyerTypeStore: () => ({
    buyerType: 'single',
  }),
}));

describe('UI/UX Tests', () => {
  describe('ProductCard Component', () => {
    const mockProduct: Product = {
      id: '1',
      title: 'Test Product',
      description: 'Test Description',
      price_buyer: 1000,
      price_wholesale: 800,
      wholesale_moq: 10,
      category: 't-shirts',
      image_url: 'https://example.com/image.jpg',
      image_urls: ['https://example.com/image.jpg'],
      stock: 10,
      is_active: true,
      created_at: '2024-01-01',
      slug: 'test-product',
    };

    it('should render product card with correct dimensions', () => {
      const { container } = render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const card = container.querySelector('.w-full.max-w-\\[280px\\]');
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

    it('should display product price', () => {
      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      expect(screen.getByText(/₹1,000/)).toBeInTheDocument();
    });

    it('should have add to cart button', () => {
      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const button = screen.getByLabelText(/Add Test Product to cart/i);
      expect(button).toBeInTheDocument();
    });

    it('should have accessible image with alt text', () => {
      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const image = screen.getByAltText('Test Product');
      expect(image).toBeInTheDocument();
    });

    it('should have link to product detail page', () => {
      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/product/1');
    });
  });

  describe('Navbar Component', () => {
    it('should render navbar with logo', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      const logo = screen.getByText(/Monster Men 90/i);
      expect(logo).toBeInTheDocument();
    });

    it('should have search functionality', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      // Search input should be present (check by placeholder or aria-label)
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should have cart icon with badge', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      // Cart link should be present
      const cartLink = screen.getByLabelText(/cart/i);
      expect(cartLink).toBeInTheDocument();
    });

    it('should be sticky positioned', () => {
      const { container } = render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      const navbar = container.querySelector('nav');
      expect(navbar).toHaveClass('sticky');
    });
  });

  describe('Footer Component', () => {
    it('should render footer with links', () => {
      render(
        <BrowserRouter>
          <Footer />
        </BrowserRouter>
      );

      // Footer should contain navigation links
      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on buttons', () => {
      const mockProduct: Product = {
        id: '1',
        title: 'Test Product',
        description: 'Test',
        price_buyer: 1000,
        price_wholesale: 800,
        wholesale_moq: 10,
        category: 't-shirts',
        image_url: 'https://example.com/image.jpg',
        image_urls: [],
        stock: 10,
        is_active: true,
        created_at: '2024-01-01',
        slug: 'test',
      };

      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const button = screen.getByLabelText(/Add Test Product to cart/i);
      expect(button).toHaveAttribute('aria-label');
    });

    it('should have semantic HTML elements', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have responsive classes on product card', () => {
      const { container } = render(
        <BrowserRouter>
          <ProductCard
            product={{
              id: '1',
              title: 'Test',
              description: 'Test',
              price_buyer: 1000,
              price_wholesale: 800,
              wholesale_moq: 10,
              category: 't-shirts',
              image_url: 'https://example.com/image.jpg',
              image_urls: [],
              stock: 10,
              is_active: true,
              created_at: '2024-01-01',
              slug: 'test',
            }}
          />
        </BrowserRouter>
      );

      const card = container.querySelector('.max-w-\\[280px\\]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Color Scheme', () => {
    it('should use primary color (#ffdc46) for buttons', () => {
      const mockProduct: Product = {
        id: '1',
        title: 'Test',
        description: 'Test',
        price_buyer: 1000,
        price_wholesale: 800,
        wholesale_moq: 10,
        category: 't-shirts',
        image_url: 'https://example.com/image.jpg',
        image_urls: [],
        stock: 10,
        is_active: true,
        created_at: '2024-01-01',
        slug: 'test',
      };

      render(
        <BrowserRouter>
          <ProductCard product={mockProduct} />
        </BrowserRouter>
      );

      const button = screen.getByLabelText(/Add Test to cart/i);
      expect(button).toHaveClass('bg-[#ffdc46]');
    });
  });
});
