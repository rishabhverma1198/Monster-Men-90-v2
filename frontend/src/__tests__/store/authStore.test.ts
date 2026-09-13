/**
 * Auth Store Tests
 * Verify authentication state management (login, OTP, Google callback, guest)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../store/authStore';

// Mock API service
vi.mock('../../services/api', () => ({
  apiService: {
    login: vi.fn(),
    signup: vi.fn(),
    getProfile: vi.fn(),
    logout: vi.fn(() => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }),
    otpSend: vi.fn(),
    otpVerify: vi.fn(),
  },
}));

describe('Auth Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('should initialize with empty state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isGuest).toBe(false);
  });

  it('should store token in localStorage on login', async () => {
    const { apiService } = await import('../../services/api');
    (apiService.login as any).mockResolvedValue({
      success: true,
      data: {
        user: { id: '1', email: 'test@test.com', full_name: 'Test' },
        token: 'token123',
      },
    });

    await useAuthStore.getState().login('test@test.com', 'password123');

    expect(localStorage.getItem('auth_token')).toBe('token123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('should store user and token on loginWithOtp success', async () => {
    const { apiService } = await import('../../services/api');
    (apiService.otpVerify as any).mockResolvedValue({
      success: true,
      data: {
        user: { id: 'u2', email: '9876543210@mm.phone', full_name: 'User 3210', role: 'buyer' },
        token: 'jwt-otp-123',
      },
    });

    await useAuthStore.getState().loginWithOtp('9876543210', '123456');

    expect(localStorage.getItem('auth_token')).toBe('jwt-otp-123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.id).toBe('u2');
    expect(useAuthStore.getState().isGuest).toBe(false);
  });

  it('should set auth from OAuth callback (setAuthFromCallback)', () => {
    const user = {
      id: 'google-1',
      email: 'user@gmail.com',
      full_name: 'Google User',
      role: 'buyer' as const,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    const token = 'jwt-google-123';

    useAuthStore.getState().setAuthFromCallback(user, token);

    expect(localStorage.getItem('auth_token')).toBe(token);
    expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe('user@gmail.com');
    expect(useAuthStore.getState().isGuest).toBe(false);
  });

  it('should set guest state on continueAsGuest', () => {
    useAuthStore.getState().continueAsGuest();

    expect(useAuthStore.getState().isGuest).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('should clear state on logout', () => {
    localStorage.setItem('auth_token', 'token123');
    localStorage.setItem('user', JSON.stringify({ id: '1' }));

    useAuthStore.getState().logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
