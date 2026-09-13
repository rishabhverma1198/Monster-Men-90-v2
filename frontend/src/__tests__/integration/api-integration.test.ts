/**
 * API Integration Tests
 * Test actual API calls to backend (requires backend running)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { apiService } from '../../services/api';

const TEST_EMAIL = import.meta.env.VITE_TEST_EMAIL || 'monstermen900@gmail.com';
const TEST_PASSWORD = import.meta.env.VITE_TEST_PASSWORD || 'Monster@900';

describe('API Integration Tests', () => {
  let authToken: string = '';

  beforeAll(async () => {
    // Login to get token
    try {
      const response = await apiService.login({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (response.success && response.data) {
        authToken = response.data.token;
        localStorage.setItem('auth_token', authToken);
      }
    } catch (error) {
      console.warn('Could not login for tests:', error);
    }
  });

  describe('Public Endpoints', () => {
    it('should fetch products without authentication', async () => {
      const response = await apiService.getProducts({ limit: 10, offset: 0 });
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data.products)).toBe(true);
    });

    it('should fetch categories', async () => {
      const response = await apiService.getCategories();
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should search products', async () => {
      const response = await apiService.searchProducts('test', { limit: 10 });
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data.products)).toBe(true);
    });
  });

  describe('Authenticated Endpoints', () => {
    it('should fetch user profile when authenticated', async () => {
      if (!authToken) {
        console.warn('Skipping authenticated test - no token');
        return;
      }

      const response = await apiService.getProfile();
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('email');
    });

    it('should fetch cart when authenticated', async () => {
      if (!authToken) {
        console.warn('Skipping authenticated test - no token');
        return;
      }

      const response = await apiService.getCart();
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should fetch orders when authenticated', async () => {
      if (!authToken) {
        console.warn('Skipping authenticated test - no token');
        return;
      }

      const response = await apiService.getOrders({ limit: 10, offset: 0 });
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('orders');
    });
  });
});
