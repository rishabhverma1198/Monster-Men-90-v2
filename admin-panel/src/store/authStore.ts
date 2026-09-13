import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AxiosError } from 'axios';
import { authApi, otpApi, type User, type LoginResponse, type SignupResponse, type ApiErrorResponse } from '../lib/api';

/**
 * Auth Store (Zustand)
 * 
 * Manages authentication state, user data, and auth operations
 * Persists to localStorage for session persistence
 */

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithOTP: (phone_number: string, otp_code: string) => Promise<void>;
  signup: (email: string, password: string, full_name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: (data: { full_name?: string; avatar_url?: string }) => Promise<void>;
  clearAuthState: () => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Login user with password
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: LoginResponse = await authApi.login(email, password);
          
          // Store tokens
          localStorage.setItem('auth_token', response.token);
          if (response.session?.refresh_token) {
            localStorage.setItem('refresh_token', response.session.refresh_token);
          }

          set({
            user: response.user,
            token: response.token,
            refreshToken: response.session?.refresh_token || null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const axiosError = error as AxiosError<ApiErrorResponse>;
          const errorMessage =
            axiosError.response?.data?.message ||
            axiosError.message ||
            'Login failed. Please check your credentials.';
          
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Login user with OTP
       */
      loginWithOTP: async (phone_number: string, otp_code: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: LoginResponse = await otpApi.verifyOTP(phone_number, otp_code);
          
          // Store tokens
          localStorage.setItem('auth_token', response.token);
          if (response.session?.refresh_token) {
            localStorage.setItem('refresh_token', response.session.refresh_token);
          }

          set({
            user: response.user,
            token: response.token,
            refreshToken: response.session?.refresh_token || null,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const axiosError = error as AxiosError<ApiErrorResponse>;
          const errorMessage =
            axiosError.response?.data?.message ||
            axiosError.message ||
            'OTP verification failed. Please try again.';
          
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Signup new user
       */
      signup: async (email: string, password: string, full_name?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response: SignupResponse = await authApi.signup(email, password, full_name);
          
          // Store tokens
          localStorage.setItem('auth_token', response.token);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const axiosError = error as AxiosError<ApiErrorResponse>;
          const errorMessage =
            axiosError.response?.data?.message ||
            axiosError.message ||
            'Signup failed. Please try again.';
          
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      /**
       * Clear local auth state + persisted session
       */
      clearAuthState: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      /**
       * Logout user
       */
      logout: async () => {
        set({ isLoading: true });
        try {
          await authApi.logout();
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API error:', error);
        } finally {
          get().clearAuthState();
        }
      },

      /**
       * Refresh authentication token
       */
      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await authApi.refreshToken(refreshToken);
          
          localStorage.setItem('auth_token', response.token);
          localStorage.setItem('refresh_token', response.refreshToken);
          
          set({
            user: response.user,
            token: response.token,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
          });
        } catch {
          // Refresh failed, clear local auth immediately
          get().clearAuthState();
        }
      },

      /**
       * Update user profile
       */
      updateProfile: async (data: { full_name?: string; avatar_url?: string }) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await authApi.updateProfile(data);
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const axiosError = error as AxiosError<ApiErrorResponse>;
          const errorMessage =
            axiosError.response?.data?.message ||
            axiosError.message ||
            'Failed to update profile.';
          
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      /**
       * Check authentication status
       */
      checkAuth: async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          get().clearAuthState();
          return;
        }

        set({ isLoading: true });
        try {
          const user = await authApi.getProfile();
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Token invalid, clear auth
          get().clearAuthState();
        }
      },

      /**
       * Clear error message
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
