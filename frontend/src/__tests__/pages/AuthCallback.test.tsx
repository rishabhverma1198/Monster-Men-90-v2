/**
 * AuthCallback tests – OAuth callback (Google) token/user handling and redirect
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthCallback from '../../pages/AuthCallback';
import { useAuthStore } from '../../store/authStore';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('AuthCallback', () => {
  const mockNavigate = vi.fn();
  const mockSetAuthFromCallback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate as any);
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      setAuthFromCallback: mockSetAuthFromCallback,
    });
  });

  it('should redirect to /login with error when error in URL', async () => {
    vi.mocked(useSearchParams).mockReturnValue([
      new URLSearchParams({ error: 'access_denied' }),
      vi.fn(),
    ] as any);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/login?error='),
        { replace: true }
      );
    });
    expect(mockSetAuthFromCallback).not.toHaveBeenCalled();
  });

  it('should set auth from token and user and navigate to returnUrl', async () => {
    const user = { id: '1', email: 'u@test.com', full_name: 'User', role: 'buyer' };
    const token = 'jwt-123';
    vi.mocked(useSearchParams).mockReturnValue([
      new URLSearchParams({
        token,
        user: encodeURIComponent(JSON.stringify(user)),
      }),
      vi.fn(),
    ] as any);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockSetAuthFromCallback).toHaveBeenCalledWith(user, token);
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('should use sessionStorage auth_return_url when no returnUrl in query', async () => {
    sessionStorage.setItem('auth_return_url', '/products/123');
    const user = { id: '1', email: 'u@test.com', full_name: 'User', role: 'buyer' };
    const token = 'jwt-456';
    vi.mocked(useSearchParams).mockReturnValue([
      new URLSearchParams({
        token,
        user: encodeURIComponent(JSON.stringify(user)),
      }),
      vi.fn(),
    ] as any);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockSetAuthFromCallback).toHaveBeenCalledWith(user, token);
      expect(mockNavigate).toHaveBeenCalledWith('/products/123', { replace: true });
    });
  });

  it('should redirect to /login when token or user missing', async () => {
    vi.mocked(useSearchParams).mockReturnValue([
      new URLSearchParams({ token: 'only-token' }),
      vi.fn(),
    ] as any);

    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/\/login\?error=/),
        { replace: true }
      );
    });
    expect(mockSetAuthFromCallback).not.toHaveBeenCalled();
  });
});
