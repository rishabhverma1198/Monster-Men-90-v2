/**
 * OTP Login Tests
 *
 * Login uses apiClient.post('/otp/generate') for OTP send, not otpApi.generateOTP.
 * Verify flow uses loginWithOTP -> otpApi.verifyOTP.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import * as api from '../lib/api';
import { useAuthStore } from '../store/authStore';

const mockPost = vi.fn();
vi.mock('../lib/api', () => ({
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  otpApi: {
    generateOTP: vi.fn(),
    verifyOTP: vi.fn(),
  },
}));

describe('OTP Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockResolvedValue({ data: { success: true, message: 'OTP sent', expires_in: 300 } });
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should render OTP login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const otpButton = screen.getByText(/OTP/i);
    fireEvent.click(otpButton);

    expect(screen.getByPlaceholderText(/9876543210/i)).toBeInTheDocument();
  });

  it('should validate phone number format', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const otpButton = screen.getByText(/OTP/i);
    fireEvent.click(otpButton);

    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.submit(phoneInput.closest('form')!);

    await waitFor(
      () => {
        const errs = document.querySelectorAll('.text-red-400');
        expect(errs.length).toBeGreaterThan(0);
        const hasPhoneErr = [...errs].some(
          (el) => /invalid phone|phone number|at least 10 digits|10 digits/i.test(el.textContent || '')
        );
        expect(hasPhoneErr).toBe(true);
      },
      { timeout: 3000 }
    );
  });

  it('should generate OTP on valid phone number', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const otpButton = screen.getByText(/OTP/i);
    fireEvent.click(otpButton);

    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    const submitButton = screen.getByText(/Send OTP/i);
    fireEvent.click(submitButton);

    await waitFor(
      () => {
        expect(mockPost).toHaveBeenCalledWith('/otp/generate', { phone_number: '9876543210' });
        expect(screen.getByPlaceholderText(/000000/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should verify OTP and login', async () => {
    const mockVerifyOTP = vi.fn().mockResolvedValue({
      user: { id: '1', email: 'admin@test.com', role: 'admin' },
      token: 'test-token',
    });
    api.otpApi.verifyOTP = mockVerifyOTP as typeof api.otpApi.verifyOTP;

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const otpButton = screen.getByText(/OTP/i);
    fireEvent.click(otpButton);

    const phoneInput = screen.getByPlaceholderText(/9876543210/i);
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    const sendButton = screen.getByText(/Send OTP/i);
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/000000/i)).toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText(/000000/i);
    fireEvent.change(otpInput, { target: { value: '123456' } });

    const verifyButton = screen.getByText(/Verify OTP/i);
    fireEvent.click(verifyButton);

    await waitFor(
      () => {
        expect(mockVerifyOTP).toHaveBeenCalledWith('9876543210', '123456');
      },
      { timeout: 3000 }
    );
  });
});
