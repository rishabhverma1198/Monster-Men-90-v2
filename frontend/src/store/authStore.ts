/**
 * Auth Store (Zustand)
 * Manages authentication state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/api';
import { apiService } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isGuest: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  setAuthFromCallback: (user: User, token: string) => void;
  continueAsGuest: () => void;
  logout: () => void;
  clearAuthState: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isGuest: false,

      loginWithOtp: async (phone: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.otpVerify(phone, otp);
          if (response.success && response.data) {
            const { user, token } = response.data;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              isGuest: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.response?.data?.message || error.message || 'OTP verification failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      setAuthFromCallback: (user: User, token: string) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, isGuest: false });
      },

      continueAsGuest: () => {
        set({ isGuest: true, isAuthenticated: false, user: null, token: null });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.login({ email, password });
          if (response.success && response.data) {
            const { user, token } = response.data;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      signup: async (email: string, password: string, fullName: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiService.signup({ email, password, full_name: fullName });
          if (response.success && response.data) {
            const { user, token } = response.data;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || 'Signup failed',
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: () => {
        apiService.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isGuest: false,
        });
      },

      /** Clear auth state only (e.g. on 401). Does not clear localStorage or call API. */
      clearAuthState: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          isGuest: false,
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({
              user,
              token,
              isAuthenticated: true,
            });
            // Verify token is still valid
            await apiService.getProfile();
          } catch {
            // Token invalid, clear auth
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
          }
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
      }),
    }
  )
);
