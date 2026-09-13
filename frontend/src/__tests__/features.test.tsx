/**
 * Features & Functionalities Tests
 * Tests complete user flows and feature implementations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Cart from '../pages/Cart';
import Login from '../pages/Login';
import ProductDetail from '../pages/ProductDetail';
import { ToastProvider } from '../components/common/Toast';
import { apiService } from '../services/api';

// Mock API service
vi.mock('../services/api', () => ({
  apiService: {
    getProducts: vi.fn(),
    getCategories: vi.fn(),
    getProductById: vi.fn(),
    getCart: vi.fn(),
    addToCart: vi.fn(),
    login: vi.fn(),
  },
}));

// Mock stores
vi.mock('../store/cartStore', () => ({
  useCartStore: () => ({
    items: [],
    isLoading: false,
    fetchCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    getTotalAmount: () => 1000,
  }),
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    user: null,
    login: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../store/buyerTypeStore', () => ({
  useBuyerTypeStore: () => ({
    buyerType: 'single',
    hasSelectedBuyerType: () => true,
    setBuyerType: vi.fn(),
  }),
}));

const renderProductDetailAtRoute = () =>
  render(
    <MemoryRouter initialEntries={['/product/1']}>
      <ToastProvider>
        <Routes>
          <Route path="/product/:productId" element={<ProductDetail />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );

describe('Features & Functionalities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Home Page Features', () => {
    it('should display hero carousel', async () => {
      (apiService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { products: [], total: 0 },
      });

      (apiService.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [
          { id: '1', name: 'Category 1', slug: 'category-1' },
          { id: '2', name: 'Category 2', slug: 'category-2' },
        ],
      });

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(apiService.getProducts).toHaveBeenCalled();
      });
    });

    it('should display featured categories', async () => {
      (apiService.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [
          { id: '1', name: 'T-Shirts', slug: 't-shirts' },
          { id: '2', name: 'Jeans', slug: 'jeans' },
        ],
      });

      (apiService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: { products: [], total: 0 },
      });

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Shop by Category/i)).toBeInTheDocument();
      });
    });

    it('should display product grid', async () => {
      (apiService.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          products: [
            {
              id: '1',
              title: 'Product 1',
              price_buyer: 1000,
              description: 'Test',
              category: 't-shirts',
              image_url: 'https://example.com/image.jpg',
              image_urls: [],
              price_wholesale: 800,
              stock: 10,
              is_active: true,
              created_at: '2024-01-01',
              slug: 'product-1',
            },
          ],
          total: 1,
        },
      });

      (apiService.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [],
      });

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });
    });
  });

  describe('Product Detail Features', () => {
    it('should display product information', async () => {
      (apiService.getProductById as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          title: 'Test Product',
          description: 'Test Description',
          price_buyer: 1000,
          price_wholesale: 800,
          category: 't-shirts',
          image_url: 'https://example.com/image.jpg',
          image_urls: ['https://example.com/image.jpg'],
          stock: 10,
          is_active: true,
          created_at: '2024-01-01',
          slug: 'test-product',
        },
      });

      renderProductDetailAtRoute();

      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });
    });

    it('should allow size selection', async () => {
      (apiService.getProductById as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          title: 'Test Product',
          description: 'Test',
          price_buyer: 1000,
          price_wholesale: 800,
          category: 't-shirts',
          image_url: 'https://example.com/image.jpg',
          image_urls: [],
          stock: 10,
          is_active: true,
          created_at: '2024-01-01',
          slug: 'test',
        },
      });

      renderProductDetailAtRoute();

      await waitFor(() => {
        const sizeButton = screen.getByText('M');
        expect(sizeButton).toBeInTheDocument();
        fireEvent.click(sizeButton);
        expect(sizeButton).toHaveClass('border-primary');
      });
    });

    it('should allow quantity adjustment', async () => {
      (apiService.getProductById as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: {
          id: '1',
          title: 'Test Product',
          description: 'Test',
          price_buyer: 1000,
          price_wholesale: 800,
          category: 't-shirts',
          image_url: 'https://example.com/image.jpg',
          image_urls: [],
          stock: 10,
          is_active: true,
          created_at: '2024-01-01',
          slug: 'test',
        },
      });

      renderProductDetailAtRoute();

      await waitFor(() => {
        const plusButton = screen.getByLabelText(/Increase quantity/i);
        expect(plusButton).toBeInTheDocument();
        fireEvent.click(plusButton);
      });
    });
  });

  describe('Cart Features', () => {
    it('should display empty cart message when no items', () => {
      render(
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      );

      expect(screen.getByText(/Hey, your bag feels so light!/i)).toBeInTheDocument();
    });

    it('should display continue shopping button', () => {
      render(
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      );

      const button = screen.getByText(/START SHOPPING/i);
      expect(button).toBeInTheDocument();
    });
  });

  describe('Authentication Features', () => {
    it('should display login form', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      expect(screen.getByText(/Welcome to Monster Men 90 Family/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email or phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    });

    it('should have signup link', () => {
      render(
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      );

      expect(
        screen.getByRole('button', { name: /Sign up \/ Sign in with Google/i })
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      (apiService.getProducts as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network Error')
      );

      (apiService.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [],
      });

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error Loading Products/i)).toBeInTheDocument();
      });
    });

    it('should display loading state', () => {
      (apiService.getProducts as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      (apiService.getCategories as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [],
      });

      render(
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      );

      // Initial skeleton state should be present
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });
});
