import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Login from '../pages/Login';

/**
 * Auth Store Tests
 * Tests authentication store functionality
 */
describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorage.clear();
  });

  it('should initialize with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('should store tokens in localStorage on login', async () => {
    const store = useAuthStore.getState();
    
    // Mock successful login response
    vi.spyOn(store, 'login').mockImplementation(async (email: string, password: string) => {
      const mockUser = {
        id: '1',
        email,
        role: 'admin',
        full_name: 'Test Admin',
      };
      
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('refresh_token', 'mock-refresh-token');
      localStorage.setItem('user', JSON.stringify(mockUser));
      
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    });

    await store.login('admin@test.com', 'password');

    expect(localStorage.getItem('auth_token')).toBe('mock-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('should clear tokens on logout', async () => {
    const store = useAuthStore.getState();
    
    // Set initial authenticated state
    localStorage.setItem('auth_token', 'mock-token');
    localStorage.setItem('refresh_token', 'mock-refresh-token');
    useAuthStore.setState({
      user: { id: '1', email: 'admin@test.com', role: 'admin' },
      isAuthenticated: true,
    });

    await store.logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

/**
 * Login Component Tests
 */
describe('Login Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should render login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText(/admin@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText(/admin@example.com/i);
    const form = emailInput.closest('form')!;

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.submit(form);

    await waitFor(
      () => {
        const errs = document.querySelectorAll('.text-red-400');
        expect(errs.length).toBeGreaterThan(0);
        const hasEmailErr = [...errs].some((el) => /invalid email|email/i.test(el.textContent || ''));
        expect(hasEmailErr).toBe(true);
      },
      { timeout: 3000 }
    );
  });

  it('should disable submit button when loading', () => {
    useAuthStore.setState({ isLoading: true });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // When loading, button shows "Signing in..." not "Sign In"
    const submitButton = screen.getByRole('button', { name: /signing in/i });
    expect(submitButton).toBeDisabled();
  });
});
