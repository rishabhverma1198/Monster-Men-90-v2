/**
 * API Integration Tests
 * Verify all API endpoints are correctly called
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiService } from '../services/api';

vi.mock('axios', () => {
  const mockRequest = vi.fn();
  const mockClient = {
    request: mockRequest,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockClient),
    },
  };
});

const mockedAxios = axios as any;
const getMockRequest = () => mockedAxios.create?.()?.request ?? mockedAxios.create?.();

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getMockRequest()?.mockResolvedValue({ data: { success: true, data: {} } });
  });

  describe('Auth APIs', () => {
    it('should call login endpoint with correct data', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { user: { id: '1', email: 'test@test.com' }, token: 'token123' },
        },
      };

      getMockRequest()?.mockResolvedValue(mockResponse);

      const result = await apiService.login({ email: 'test@test.com', password: 'password123' });

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe('test@test.com');
    });

    it('should call signup endpoint with correct data', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { user: { id: '1', email: 'test@test.com' }, token: 'token123' },
        },
      };

      getMockRequest()?.mockResolvedValue(mockResponse);

      const result = await apiService.signup({
        email: 'test@test.com',
        password: 'password123',
        full_name: 'Test User',
      });

      expect(result.success).toBe(true);
    });

    it('should call otpSend with phone_number', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { whatsapp_url: 'https://wa.me/919876543210?text=OTP', expires_in_seconds: 300 },
        },
      };

      getMockRequest()?.mockResolvedValue(mockResponse);

      const result = await apiService.otpSend('9876543210');

      expect(result.success).toBe(true);
      expect(result.data.whatsapp_url).toMatch(/wa\.me/);
      expect(getMockRequest()).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: '/auth/otp/send',
          data: { phone_number: '9876543210' },
        })
      );
    });

    it('should call otpVerify with phone and otp_code', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { user: { id: '1', role: 'buyer' }, token: 'jwt-123' },
        },
      };

      getMockRequest()?.mockResolvedValue(mockResponse);

      const result = await apiService.otpVerify('9876543210', '123456');

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('jwt-123');
      expect(getMockRequest()).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: '/auth/otp/verify',
          data: { phone_number: '9876543210', otp_code: '123456' },
        })
      );
    });
  });

  describe('Product APIs', () => {
    it('should call getProducts with pagination params', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { products: [], total: 0 },
        },
      };

      getMockRequest()?.mockResolvedValue(mockResponse);

      await apiService.getProducts({ limit: 20, offset: 0 });

      expect(getMockRequest()).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          url: '/products',
          params: { limit: 20, offset: 0 },
        })
      );
    });

    it('should call searchProducts with query', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { products: [], total: 0 },
        },
      };

      getMockRequest()?.mockResolvedValue(mockResponse);

      await apiService.searchProducts('test query', { limit: 20 });

      expect(getMockRequest()).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'get',
          url: '/products/search',
          params: { q: 'test query', limit: 20 },
        })
      );
    });
  });

  describe('Cart APIs', () => {
    it('should call addToCart with product ID and quantity', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: '1', product_id: '123', quantity: 1 },
        },
      };

      getMockRequest()?.mockResolvedValue(mockResponse);

      await apiService.addToCart('123', 2);

      expect(getMockRequest()).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: '/cart',
          data: { product_id: '123', quantity: 2 },
        })
      );
    });
  });

  describe('Order APIs', () => {
    it('should call createOrder', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { id: '1', order_number: 'MM90-123' },
        },
      };

      getMockRequest()?.mockResolvedValue(mockResponse);

      const result = await apiService.createOrder();

      expect(result.success).toBe(true);
      expect(result.data.order_number).toBe('MM90-123');
    });
  });
});
