/**
 * API Integration Tests
 * Verifies apiService behavior with a mocked axios client.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiService } from '../services/api';

const { mockRequest } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      request: mockRequest,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: { baseURL: 'http://localhost/api' },
    })),
  },
}));

describe('API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should login successfully', async () => {
    mockRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: { token: 'test-token', user: { id: '1', email: 'test@test.com' } },
      },
    });

    const result = await apiService.login({ email: 'test@test.com', password: 'password123' });
    expect(result.success).toBe(true);
    expect(result.data?.token).toBe('test-token');
  });

  it('should fetch products list', async () => {
    mockRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: { products: [{ id: '1', title: 'P1' }], total: 1 },
      },
    });

    const result = await apiService.getProducts({ limit: 10, offset: 0 });
    expect(result.success).toBe(true);
    expect(result.data.products).toHaveLength(1);
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: '/products',
      })
    );
  });

  it('should create order', async () => {
    mockRequest.mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: '1', order_number: 'ORD-001' },
      },
    });

    const result = await apiService.createOrder();
    expect(result.success).toBe(true);
    expect(result.data?.order_number).toBe('ORD-001');
  });

  it('should map network errors to API errors', async () => {
    mockRequest.mockRejectedValueOnce(new Error('Network Error'));

    await expect(apiService.getProducts({ limit: 10, offset: 0 })).rejects.toMatchObject({
      success: false,
      code: 'NETWORK_ERROR',
    });
  });
});
