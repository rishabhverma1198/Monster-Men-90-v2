/**
 * Routing Tests
 * Verify all routes are accessible and render correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

vi.mock('../pages/Home', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('../pages/Category', () => ({
  default: () => <div data-testid="category-page">Category Page</div>,
}));

vi.mock('../pages/ProductDetail', () => ({
  default: () => <div data-testid="product-detail-page">Product Detail Page</div>,
}));

vi.mock('../pages/Cart', () => ({
  default: () => <div data-testid="cart-page">Cart Page</div>,
}));

vi.mock('../pages/Checkout', () => ({
  default: () => <div data-testid="checkout-page">Checkout Page</div>,
}));

vi.mock('../pages/Login', () => ({
  default: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('../pages/Signup', () => ({
  default: () => <div data-testid="signup-page">Signup Page</div>,
}));

vi.mock('../pages/Search', () => ({
  default: () => <div data-testid="search-page">Search Page</div>,
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: '1', full_name: 'Test User' },
    checkAuth: vi.fn(),
    clearAuthState: vi.fn(),
  }),
}));

vi.mock('../store/cartStore', () => ({
  useCartStore: () => ({
    fetchCart: vi.fn(),
    getItemCount: () => 0,
    items: [],
  }),
}));

vi.mock('../store/buyerTypeStore', () => ({
  useBuyerTypeStore: () => ({
    buyerType: 'single',
    hasSelectedBuyerType: () => true,
  }),
}));

const renderAt = async (path: string) => {
  window.history.pushState({}, '', path);
  render(<App />);
};

describe('Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Home page at /', async () => {
    await renderAt('/');
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
  });

  it('should render Category page at /category/:categoryName', async () => {
    await renderAt('/category/t-shirts');
    expect(await screen.findByTestId('category-page')).toBeInTheDocument();
  });

  it('should render Product Detail page at /product/:productId', async () => {
    await renderAt('/product/123');
    expect(await screen.findByTestId('product-detail-page')).toBeInTheDocument();
  });

  it('should render Cart page at /cart', async () => {
    await renderAt('/cart');
    expect(await screen.findByTestId('cart-page')).toBeInTheDocument();
  });

  it('should render Checkout page at /checkout', async () => {
    await renderAt('/checkout');
    expect(await screen.findByTestId('checkout-page')).toBeInTheDocument();
  });

  it('should render Login page at /login', async () => {
    await renderAt('/login');
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
  });

  it('should render Signup page at /signup', async () => {
    await renderAt('/signup');
    expect(await screen.findByTestId('signup-page')).toBeInTheDocument();
  });

  it('should render Search page at /search', async () => {
    await renderAt('/search?q=test');
    expect(await screen.findByTestId('search-page')).toBeInTheDocument();
  });

  it('should have Navbar on all pages', async () => {
    await renderAt('/');
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('should have Footer on all pages', async () => {
    await renderAt('/');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
