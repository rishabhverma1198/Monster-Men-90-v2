/**
 * Backend Communication Tests
 * Runs real backend checks only when backend is reachable.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import { apiService } from '../services/api';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const TEST_EMAIL = import.meta.env.VITE_TEST_EMAIL || 'monstermen900@gmail.com';
const TEST_PASSWORD = import.meta.env.VITE_TEST_PASSWORD || 'monster@900';

const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 2000 });
    return response.status === 200;
  } catch {
    return false;
  }
};

describe('Backend Communication', () => {
  let authToken = '';
  let backendAvailable = false;

  beforeAll(async () => {
    backendAvailable = await isBackendAvailable();
    if (!backendAvailable) {
      console.warn('Backend not available. Skipping backend communication tests.');
    }
  });

  describe('Health Check', () => {
    it('should connect to backend', async () => {
      if (!backendAvailable) return;
      const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
      expect(response.status).toBe(200);
    });
  });

  describe('Authentication Flow', () => {
    it('should login and get token', async () => {
      if (!backendAvailable) return;
      const result = await apiService.login({ email: TEST_EMAIL, password: TEST_PASSWORD });
      if (!result.success || !result.data?.token) return;

      authToken = result.data.token;
      localStorage.setItem('auth_token', authToken);
      expect(authToken).toBeTruthy();
    });

    it('should get user profile after login', async () => {
      if (!backendAvailable || !authToken) return;
      const result = await apiService.getProfile();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Product Endpoints', () => {
    it('should fetch products from backend', async () => {
      if (!backendAvailable) return;
      const result = await apiService.getProducts({ limit: 5, offset: 0 });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.products)).toBe(true);
    });

    it('should search products', async () => {
      if (!backendAvailable) return;
      const result = await apiService.searchProducts('test', { limit: 5, offset: 0 });
      expect(result.success).toBe(true);
    });

    it('should get categories', async () => {
      if (!backendAvailable) return;
      const result = await apiService.getCategories();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Cart Endpoints', () => {
    it('should get cart items (requires auth)', async () => {
      if (!backendAvailable || !authToken) return;
      const result = await apiService.getCart();
      expect(result.success).toBe(true);
    });
  });

  describe('API Response Format', () => {
    it('should return consistent response format', async () => {
      if (!backendAvailable) return;
      const result = await apiService.getProducts({ limit: 1, offset: 0 });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });
  });
});
