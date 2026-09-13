/**
 * API Service Layer
 * Centralized API client with authentication and error handling
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { 
  ApiResponse, 
  ApiError,
  LoginRequest,
  SignupRequest,
  AuthResponse,
  ProductsResponse,
  Product,
  Category,
  CartItem,
  Order,
  OrdersResponse,
  PaginationParams,
} from '../types/api';

import { apiBaseUrl } from '../config/env';

const API_BASE_URL = apiBaseUrl;

/** Optional request options (e.g. AbortSignal for cancellation). */
export interface RequestOptions {
  signal?: AbortSignal;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors and log responses
    this.client.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
          console.log(`✅ API ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.data);
        }
        return response;
      },
      (error: AxiosError<ApiError>) => {
        if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
          return Promise.reject(error);
        }
        if (import.meta.env.DEV) {
          console.error(`❌ API Error ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
          });
        }
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login with returnUrl for post-login redirect
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.dispatchEvent(new CustomEvent('auth:session-expired'));
          const returnUrl = window.location.pathname + window.location.search || '/';
          window.location.href = '/login?returnUrl=' + encodeURIComponent(returnUrl);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generic request handler
   */
  private async request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any,
    config?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>({
        method,
        url,
        data,
        ...config,
      });
      
      // Log response in development for debugging
      if (import.meta.env.DEV) {
        console.log(`📡 API ${method.toUpperCase()} ${url}:`, {
          success: response.data?.success,
          dataKeys: response.data?.data ? Object.keys(response.data.data) : 'no data',
          status: response.status,
        });
      }
      
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axiosError.code === 'ERR_CANCELED' || axiosError.name === 'CanceledError') {
        throw { success: false, code: 'ABORTED', message: 'Request cancelled' } as ApiError;
      }
      // Handle specific error codes with better messages
      let errorCode = axiosError.response?.data?.code || 'UNKNOWN_ERROR';
      let errorMessage = axiosError.response?.data?.message || axiosError.message;
      // Network errors
      if (!axiosError.response) {
        errorCode = 'NETWORK_ERROR';
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }
      // Rate limiting
      else if (axiosError.response.status === 429) {
        errorCode = 'RATE_LIMIT';
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      }
      // Service unavailable
      else if (axiosError.response.status === 503) {
        errorCode = 'SERVICE_UNAVAILABLE';
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      }
      // Server errors
      else if (axiosError.response.status >= 500) {
        errorCode = 'SERVER_ERROR';
        errorMessage = 'Server error. Please try again later.';
      }
      // Client errors (400-499)
      else if (axiosError.response.status >= 400 && axiosError.response.status < 500) {
        if (!errorMessage || errorMessage === axiosError.message) {
          errorMessage = 'Invalid request. Please check your input and try again.';
        }
      }
      
      throw {
        success: false,
        code: errorCode,
        message: errorMessage,
        timestamp: axiosError.response?.data?.timestamp,
      } as ApiError;
    }
  }

  // =========================================================
  // AUTH ENDPOINTS
  // =========================================================

  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('post', '/auth/login', credentials);
  }

  async signup(data: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('post', '/auth/signup', data);
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.request('get', '/auth/profile');
  }

  /** Check if user exists by email or phone (for Login vs Signup flow). Returns auth_method when exists (e.g. 'google', 'email', 'phone'). */
  async checkAuthIdentifier(identifier: string): Promise<ApiResponse<{ exists: boolean; type: 'email' | 'phone'; auth_method?: string }>> {
    return this.request('get', '/auth/check', undefined, {
      params: { identifier: identifier.trim() },
    });
  }

  async updateProfile(data: { full_name?: string; avatar_url?: string | null }): Promise<ApiResponse<any>> {
    return this.request('put', '/auth/profile', data);
  }

  async uploadProfilePicture(file: File): Promise<ApiResponse<{ url: string; path: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('auth_token');
    const baseURL = this.client.defaults.baseURL || `${apiBaseUrl}/api`;
    const response = await fetch(`${baseURL}/auth/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
      throw { success: false, code: json.code || 'UPLOAD_ERROR', message: json.message || 'Upload failed' };
    }
    return { success: true, data: json.data || json, message: json.message };
  }

  async sendProfilePhoneOtp(): Promise<ApiResponse<{ whatsapp_url?: string; expires_in_seconds?: number }>> {
    return this.request('post', '/auth/profile/send-phone-otp');
  }

  async verifyProfilePhoneOtp(otp_code: string): Promise<ApiResponse<{ verified: boolean }>> {
    return this.request('post', '/auth/profile/verify-phone-otp', { otp_code });
  }

  async updateProfilePhone(new_phone: string): Promise<ApiResponse<any>> {
    return this.request('put', '/auth/profile/phone', { new_phone });
  }

  async sendProfileEmailOtp(): Promise<ApiResponse<{ expires_in_seconds?: number }>> {
    return this.request('post', '/auth/profile/send-email-otp');
  }

  async verifyProfileEmailOtp(otp_code: string): Promise<ApiResponse<{ verified: boolean }>> {
    return this.request('post', '/auth/profile/verify-email-otp', { otp_code });
  }

  async updateProfileEmail(new_email: string): Promise<ApiResponse<any>> {
    return this.request('put', '/auth/profile/email', { new_email });
  }

  /** Set password (for Google/phone users) so they can sign in with email + password later */
  async setProfilePassword(new_password: string, confirm_password: string): Promise<ApiResponse<{ message: string }>> {
    return this.request('post', '/auth/profile/set-password', { new_password, confirm_password });
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return this.request('post', '/auth/refresh');
  }

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  async otpSend(phone_number: string): Promise<ApiResponse<{ whatsapp_url: string; expires_in_seconds: number }>> {
    return this.request('post', '/auth/otp/send', { phone_number });
  }

  async otpVerify(phone_number: string, otp_code: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('post', '/auth/otp/verify', { phone_number, otp_code });
  }

  async forgotPassword(data: { email?: string; phone_number?: string }): Promise<ApiResponse<{ message: string; whatsapp_url?: string }>> {
    return this.request('post', '/auth/forgot-password', data);
  }

  async resetPassword(data: {
    email?: string;
    phone_number?: string;
    otp_code: string;
    new_password?: string;
  }): Promise<ApiResponse<AuthResponse | { message: string }>> {
    return this.request('post', '/auth/reset-password', data);
  }

  // =========================================================
  // PRODUCT ENDPOINTS
  // =========================================================

  async getProducts(
    params?: PaginationParams & { category?: string; gender?: string },
    options?: RequestOptions
  ): Promise<ApiResponse<ProductsResponse>> {
    return this.request<ProductsResponse>('get', '/products', undefined, { params, signal: options?.signal });
  }

  async getProductById(id: string, options?: RequestOptions): Promise<ApiResponse<Product>> {
    return this.request<Product>('get', `/products/${id}`, undefined, { signal: options?.signal });
  }

  async searchProducts(
    query: string,
    params?: PaginationParams,
    options?: RequestOptions
  ): Promise<ApiResponse<ProductsResponse>> {
    return this.request<ProductsResponse>('get', '/products/search', undefined, {
      params: { q: query, ...params },
      signal: options?.signal,
    });
  }

  async getCategories(options?: RequestOptions): Promise<ApiResponse<Category[]>> {
    return this.request<Category[]>('get', '/products/categories', undefined, { signal: options?.signal });
  }

  // =========================================================
  // CART ENDPOINTS
  // =========================================================

  async getCart(options?: RequestOptions): Promise<ApiResponse<CartItem[]>> {
    return this.request<CartItem[]>('get', '/cart', undefined, { signal: options?.signal });
  }

  async addToCart(productId: string, quantity: number = 1): Promise<ApiResponse<CartItem>> {
    return this.request<CartItem>('post', '/cart', { product_id: productId, quantity });
  }

  async updateCartItem(cartItemId: string, quantity: number): Promise<ApiResponse<CartItem>> {
    return this.request<CartItem>('put', '/cart/update', {
      cart_item_id: cartItemId,
      quantity,
    });
  }

  async removeCartItem(cartItemId: string): Promise<ApiResponse<void>> {
    return this.request<void>('delete', `/cart/remove/${cartItemId}`);
  }

  async clearCart(): Promise<ApiResponse<void>> {
    return this.request<void>('delete', '/cart/clear');
  }

  // =========================================================
  // ORDER ENDPOINTS
  // =========================================================

  async createOrder(
    data?: {
      user_type?: 'single' | 'wholeseller';
      user_details?: {
        name: string;
        email: string;
        contact_number: string;
      };
    },
    idempotencyKey?: string
  ): Promise<ApiResponse<Order>> {
    const config = idempotencyKey
      ? { headers: { 'Idempotency-Key': idempotencyKey } as Record<string, string> }
      : undefined;
    return this.request<Order>('post', '/orders', data || {}, config);
  }

  async getOrders(params?: PaginationParams, options?: RequestOptions): Promise<ApiResponse<OrdersResponse>> {
    return this.request<OrdersResponse>('get', '/orders', undefined, { params, signal: options?.signal });
  }

  async getOrderById(id: string, options?: RequestOptions): Promise<ApiResponse<Order>> {
    return this.request<Order>('get', `/orders/${id}`, undefined, { signal: options?.signal });
  }

  // =========================================================
  // SHIPPING/TRACKING ENDPOINTS
  // =========================================================

  async trackShipment(awbNumber: string): Promise<ApiResponse<{
    success: boolean;
    awb_number: string;
    status: string;
    current_status: string;
    tracking_events: Array<{
      status: string;
      location: string;
      timestamp: string;
      description: string;
    }>;
    estimated_delivery?: string;
  }>> {
    return this.request('get', `/shipping/track/${awbNumber}`);
  }

  // =========================================================
  // WISHLIST ENDPOINTS (Backend not implemented — stub to avoid 404)
  // =========================================================

  async getWishlist(): Promise<ApiResponse<Product[]>> {
    return Promise.resolve({
      success: true,
      data: [] as Product[],
      message: 'OK',
      timestamp: new Date().toISOString(),
    });
  }

  async addToWishlist(productId: string): Promise<ApiResponse<void>> {
    void productId;
    return Promise.resolve({
      success: true,
      data: undefined,
      message: 'Wishlist coming soon',
      timestamp: new Date().toISOString(),
    });
  }

  async removeFromWishlist(productId: string): Promise<ApiResponse<void>> {
    void productId;
    return Promise.resolve({
      success: true,
      data: undefined,
      message: 'OK',
      timestamp: new Date().toISOString(),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
