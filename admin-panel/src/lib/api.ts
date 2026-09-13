import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

/**
 * API Client Configuration
 * 
 * Centralized Axios instance for backend API communication
 * Handles authentication, error handling, and request/response interceptors
 */

// Backend API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const AUTH_SESSION_CLEARED_EVENT = 'auth:session-cleared';

const clearStoredAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  // Zustand persisted auth state key
  localStorage.removeItem('auth-storage');
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CLEARED_EVENT));
};

const redirectToLogin = () => {
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

/**
 * Create Axios instance with default configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // JWT tokens in headers, not cookies
});

/**
 * Request Interceptor: Add JWT token to requests
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Playwright E2E opt-in header (backend bypasses rate-limit only in non-production).
    if (import.meta.env.VITE_E2E === '1' && config.headers) {
      config.headers['x-e2e-test'] = '1';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor: Handle errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    // Backend returns { success: true, data: {...}, message: "..." }
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url || '';

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || error.response.headers['Retry-After'];
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 900; // Default to 15 minutes
      const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
      
      // Return a more descriptive error
      const rateLimitError = new Error(
        `Too many requests. Please wait ${retryAfterMinutes} minute${retryAfterMinutes !== 1 ? 's' : ''} before trying again.`
      ) as Error & { response?: typeof error.response };
      rateLimitError.response = {
        ...error.response,
        data: {
          ...error.response.data,
          message: rateLimitError.message,
        },
      };
      return Promise.reject(rateLimitError);
    }

    // 401 from login/otp endpoints should go back to caller (no refresh flow).
    const skipRefreshOn401 = [
      '/auth/login',
      '/auth/signup',
      '/auth/otp/send',
      '/auth/otp/verify',
      '/otp/generate',
      '/otp/verify',
      '/auth/forgot-password',
      '/auth/reset-password',
    ].some((path) => requestUrl.includes(path));
    if (error.response?.status === 401 && skipRefreshOn401) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            { token: refreshToken }
          );

          const { data } = response.data as ApiSuccessResponse<RefreshTokenResponse>;
          
          // Update tokens (backend may return refreshToken or only token)
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('refresh_token', data.refreshToken ?? data.token);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.token}`;
          }
          
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed: clear all auth state and force login.
          clearStoredAuth();
          redirectToLogin();
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token: clear all auth state and force login.
        clearStoredAuth();
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * API Response Types
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  requestId?: string;
  timestamp: string;
}

/**
 * Auth Response Types
 */
export interface LoginResponse {
  user: User;
  token: string;
  session?: { refresh_token?: string } | null;
}

export interface SignupResponse {
  user: User;
  token: string;
  message: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'buyer' | 'wholesaler';
  is_active: boolean;
  phone_number?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Auth API Functions
 */
export const authApi = {
  /**
   * Login user
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<LoginResponse>>('/auth/login', {
      email,
      password,
    });
    return response.data.data;
  },

  /**
   * Signup new user
   */
  signup: async (
    email: string,
    password: string,
    full_name?: string
  ): Promise<SignupResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<SignupResponse>>('/auth/signup', {
      email,
      password,
      full_name,
    });
    return response.data.data;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<RefreshTokenResponse>>(
      '/auth/refresh',
      { token: refreshToken }
    );
    return response.data.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ApiSuccessResponse<User>>('/auth/me');
    return response.data.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: { full_name?: string; avatar_url?: string }): Promise<User> => {
    const response = await apiClient.put<ApiSuccessResponse<User>>('/auth/profile', data);
    return response.data.data;
  },

  /**
   * Forgot password
   */
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Check if email exists
   */
  checkEmail: async (email: string): Promise<{ exists: boolean }> => {
    const response = await apiClient.post<ApiSuccessResponse<{ exists: boolean }>>(
      '/auth/check-email',
      { email }
    );
    return response.data.data;
  },
};

/**
 * OTP API Functions
 */
export const otpApi = {
  /**
   * Generate OTP for admin login
   */
  generateOTP: async (phone_number: string): Promise<{ message: string; expires_in: number; whatsapp_link?: string | null; otp?: string }> => {
    const response = await apiClient.post<ApiSuccessResponse<{ message: string; expires_in: number; whatsapp_link?: string | null; otp?: string }>>(
      '/otp/generate',
      { phone_number }
    );
    return response.data.data;
  },

  /**
   * Verify OTP and login
   */
  verifyOTP: async (phone_number: string, otp_code: string): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<LoginResponse>>('/otp/verify', {
      phone_number,
      otp_code,
    });
    return response.data.data;
  },
};

/**
 * Product API Functions
 */
export const productApi = {
  /**
   * Get all products (admin endpoint - includes inactive products)
   */
  getProducts: async (params?: {
    limit?: number;
    offset?: number;
    category?: string;
    gender?: string;
    q?: string;
  }): Promise<{ products: Product[]; total: number; page: number }> => {
    const response = await apiClient.get<ApiSuccessResponse<{ products: Product[]; total: number; page: number }>>(
      '/admin/products',
      { params }
    );
    return response.data.data;
  },

  /**
   * Search products
   */
  searchProducts: async (
    query: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ products: Product[]; total: number }> => {
    const response = await apiClient.get<ApiSuccessResponse<{ products: Product[]; total: number }>>(
      '/products/search',
      { params: { q: query, ...params } }
    );
    return response.data.data;
  },

  /**
   * Get product by ID
   */
  getProductById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<ApiSuccessResponse<Product>>(`/products/${id}`);
    return response.data.data;
  },

  /**
   * Create product (admin only)
   */
  createProduct: async (data: FormData): Promise<Product> => {
    const response = await apiClient.post<ApiSuccessResponse<Product>>('/admin/products', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Update product (admin only)
   */
  updateProduct: async (id: string, data: FormData): Promise<Product> => {
    const response = await apiClient.put<ApiSuccessResponse<Product>>(`/admin/products/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Delete product (soft delete - admin only)
   */
  deleteProduct: async (id: string): Promise<Product> => {
    const response = await apiClient.delete<ApiSuccessResponse<Product>>(`/admin/products/${id}`);
    return response.data.data;
  },

  /**
   * Upload file (admin only)
   */
  uploadFile: async (formData: FormData): Promise<UploadResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<UploadResponse>>('/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Get categories
   */
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<ApiSuccessResponse<Category[]>>('/products/categories');
    return response.data.data;
  },

  /**
   * Move product to gender category
   */
  moveProductToGender: async (productId: string, gender: 'men' | 'women'): Promise<Product> => {
    const response = await apiClient.put<ApiSuccessResponse<Product>>(
      `/admin/products/${productId}/move-gender`,
      { gender }
    );
    return response.data.data;
  },

  /**
   * Update product status (active/inactive)
   */
  updateProductStatus: async (productId: string, isActive: boolean): Promise<Product> => {
    const response = await apiClient.put<ApiSuccessResponse<Product>>(
      `/admin/products/${productId}/status`,
      { is_active: isActive }
    );
    return response.data.data;
  },
};

/**
 * Product Types
 */
export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  gender?: 'men' | 'women' | 'unisex';
  price_buyer: number;
  price_wholesale?: number;
  price_wholesaler?: number;
  wholesale_moq?: number;
  stock: number;
  image_url?: string;
  image_urls?: string[];
  is_active: boolean;
  is_featured?: boolean;
  created_by?: string;
  video_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface UploadResponse {
  url: string;
  path: string;
  bucket: string;
  filename: string;
  size: number;
  mimetype: string;
}

/**
 * Order API Functions
 */
export const orderApi = {
  /**
   * Get all orders (admin only)
   */
  getOrders: async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
    user_id?: string;
  }): Promise<{ orders: Order[]; total: number; page: number; limit: number; offset: number }> => {
    const response = await apiClient.get<ApiSuccessResponse<{
      orders: Order[];
      total: number;
      page: number;
      limit: number;
      offset: number;
    }>>('/admin/orders', { params });
    return response.data.data;
  },

  /**
   * Get order by ID (admin only)
   */
  getOrderById: async (id: string): Promise<Order> => {
    const response = await apiClient.get<ApiSuccessResponse<Order>>(`/admin/orders/${id}`);
    return response.data.data;
  },

  /**
   * Update order status (admin only)
   */
  updateOrderStatus: async (id: string, data: { status?: string; notes?: string }): Promise<Order> => {
    const response = await apiClient.put<ApiSuccessResponse<Order>>(`/admin/orders/${id}`, data);
    return response.data.data;
  },
};

/**
 * Shipping API Functions
 */
export interface CreateShipmentRequest {
  order_id: string;
  courier_id?: string;
  pickup_pincode: string;
  delivery_pincode: string;
  weight?: number;
  cod_amount?: number;
}

export interface ShipmentResponse {
  success: boolean;
  shipment_id?: string;
  awb_number?: string;
  tracking_url?: string;
  label_url?: string;
  status?: string;
  message?: string;
}

export interface TrackingResponse {
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
}

export interface ShippingRate {
  courier_id: string;
  courier_name: string;
  service_type: string;
  rate: number;
  estimated_days: number;
}

export const shippingApi = {
  /**
   * Create shipment for an order
   */
  createShipment: async (data: CreateShipmentRequest): Promise<ShipmentResponse> => {
    const response = await apiClient.post<ApiSuccessResponse<ShipmentResponse>>('/shipping/create', data);
    return response.data.data;
  },

  /**
   * Get shipping rates
   */
  getShippingRates: async (params: {
    pickup_pincode: string;
    delivery_pincode: string;
    weight: number;
    cod_amount?: number;
  }): Promise<ShippingRate[]> => {
    const response = await apiClient.get<ApiSuccessResponse<ShippingRate[]>>('/shipping/rates', { params });
    return response.data.data;
  },

  /**
   * Track shipment by AWB
   */
  trackShipment: async (awb_number: string): Promise<TrackingResponse> => {
    const response = await apiClient.get<ApiSuccessResponse<TrackingResponse>>(`/shipping/track/${awb_number}`);
    return response.data.data;
  },

  /**
   * Generate shipping label
   */
  generateLabel: async (awb_number: string): Promise<{ label_url: string }> => {
    const response = await apiClient.post<ApiSuccessResponse<{ label_url: string }>>(`/shipping/label/${awb_number}`);
    return response.data.data;
  },

  /**
   * Cancel shipment
   */
  cancelShipment: async (awb_number: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<ApiSuccessResponse<{ success: boolean; message: string }>>(`/shipping/cancel/${awb_number}`);
    return response.data.data;
  },
};

/**
 * Order Types
 */
export interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase?: number; // Legacy field
  unit_price: number; // Correct field name
  products?: {
    id: string;
    title: string;
    image_url?: string;
    sku?: string;
    weight?: number;
  };
}

export interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  user_id: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_type?: string;
  shipping_address?: string;
  shipping_awb?: string;
  shipping_courier?: string;
  shipping_tracking_url?: string;
  shipping_label_url?: string;
  shipping_cost?: number;
  shipping_pincode?: string;
  delivery_pincode?: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
  };
  order_items?: OrderItem[];
}

/**
 * User API Functions
 */
export const userApi = {
  /**
   * Get all users (admin only)
   */
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<ApiSuccessResponse<User[]>>('/users');
    return response.data.data;
  },

  /**
   * Update user role (admin only)
   */
  updateUserRole: async (userId: string, role: 'admin' | 'buyer' | 'wholesaler'): Promise<User> => {
    const response = await apiClient.put<ApiSuccessResponse<User>>(`/users/${userId}/role`, { role });
    return response.data.data;
  },

  /**
   * Update user active status (admin only)
   */
  updateUserStatus: async (userId: string, is_active: boolean): Promise<User> => {
    const response = await apiClient.put<ApiSuccessResponse<User>>(`/users/${userId}/status`, { is_active });
    return response.data.data;
  },
};

/**
 * Inventory API Functions
 */
export interface InventoryItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  stock: number;
  reserved: number;
  reorder_level: number;
  updated_at: string;
  products: {
    id: string;
    title: string;
    image_url?: string;
    image_urls?: string[];
  };
}

export const inventoryApi = {
  /**
   * Get all inventory (admin only)
   */
  getInventory: async (): Promise<InventoryItem[]> => {
    const response = await apiClient.get<ApiSuccessResponse<InventoryItem[]>>('/admin/inventory');
    return response.data.data;
  },

  /**
   * Update inventory stock (admin only)
   */
  updateStock: async (inventoryId: string, stock: number): Promise<InventoryItem> => {
    const response = await apiClient.put<ApiSuccessResponse<InventoryItem>>(
      `/admin/inventory/${inventoryId}/stock`,
      { stock }
    );
    return response.data.data;
  },

  /**
   * Update reorder level (admin only)
   */
  updateReorderLevel: async (inventoryId: string, reorder_level: number): Promise<InventoryItem> => {
    const response = await apiClient.put<ApiSuccessResponse<InventoryItem>>(
      `/admin/inventory/${inventoryId}/reorder-level`,
      { reorder_level }
    );
    return response.data.data;
  },
};

/**
 * Notification API Functions
 */
export interface Notification {
  id: string;
  type: 'order' | 'stock' | 'customer' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  metadata?: Record<string, string>;
  created_at: string;
}

export const notificationApi = {
  /**
   * Get all notifications (admin only)
   */
  getNotifications: async (): Promise<{ notifications: Notification[]; unread_count: number }> => {
    const response = await apiClient.get<ApiSuccessResponse<{ notifications: Notification[]; unread_count: number }>>(
      '/admin/notifications'
    );
    return response.data.data;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.put(`/admin/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/admin/notifications/read-all');
  },
};

/**
 * Leads API Functions
 */
export interface Lead {
  id: string;
  order_number: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  user_type: 'single' | 'wholeseller';
  total_amount: number;
  status: string;
  created_at: string;
}

export const leadsApi = {
  /**
   * Get all leads (admin only)
   */
  getLeads: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ leads: Lead[]; total: number; page: number; limit: number; offset: number }> => {
    const response = await apiClient.get<ApiSuccessResponse<{
      leads: Lead[];
      total: number;
      page: number;
      limit: number;
      offset: number;
    }>>('/admin/leads', { params });
    return response.data.data;
  },
};

/**
 * Admin Settings API Functions
 */
export interface AdminProfile {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  phone_number?: string; // Main phone column in Supabase
  avatar_url?: string; // Profile picture URL
  otp_enabled?: boolean; // Optional - column may not exist
  is_active?: boolean; // Actual column name in Supabase
  status?: string; // Mapped from is_active for frontend compatibility
  created_at: string;
  updated_at: string;
}

export const adminApi = {
  /**
   * Get admin profile
   */
  getProfile: async (): Promise<AdminProfile> => {
    const response = await apiClient.get<ApiSuccessResponse<AdminProfile>>('/admin/profile');
    return response.data.data;
  },

  /**
   * Update admin profile
   */
  updateProfile: async (data: {
    full_name?: string;
    phone_number?: string; // Use phone_number instead of contact_number/whatsapp_number
    avatar_url?: string; // Profile picture URL
    // otp_enabled removed - column doesn't exist in Supabase
  }): Promise<AdminProfile> => {
    const response = await apiClient.put<ApiSuccessResponse<AdminProfile>>('/admin/profile', data);
    return response.data.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<void> => {
    await apiClient.post('/auth/change-password', data);
  },
};

/**
 * Variant API Functions
 */
export interface Variant {
  id: string;
  product_id: string;
  type: 'size' | 'color';
  value: string;
  sku_suffix?: string;
  buyer_price?: number;
  wholesaler_price?: number;
  created_at: string;
  inventory?: {
    id: string;
    stock: number;
    reserved: number;
    reorder_level: number;
  };
}

export interface CreateVariantInput {
  product_id: string;
  type: 'size' | 'color';
  value: string;
  sku_suffix?: string;
  buyer_price?: number;
  wholesaler_price?: number;
}

export const variantApi = {
  /**
   * Get variants for a product
   */
  getVariantsByProduct: async (productId: string): Promise<Variant[]> => {
    const response = await apiClient.get<ApiSuccessResponse<Variant[]>>(
      `/variants/product/${productId}`
    );
    return response.data.data;
  },

  /**
   * Create variant
   */
  createVariant: async (data: CreateVariantInput): Promise<Variant> => {
    const response = await apiClient.post<ApiSuccessResponse<Variant>>('/variants', data);
    return response.data.data;
  },

  /**
   * Update variant
   */
  updateVariant: async (variantId: string, data: Partial<CreateVariantInput>): Promise<Variant> => {
    const response = await apiClient.put<ApiSuccessResponse<Variant>>(`/variants/${variantId}`, data);
    return response.data.data;
  },

  /**
   * Delete variant
   */
  deleteVariant: async (variantId: string): Promise<void> => {
    await apiClient.delete(`/variants/${variantId}`);
  },

  /**
   * Update variant inventory
   */
  updateVariantInventory: async (variantId: string, stock: number): Promise<unknown> => {
    const response = await apiClient.put<ApiSuccessResponse<unknown>>(
      `/variants/${variantId}/inventory`,
      { stock }
    );
    return response.data.data;
  },
};

export default apiClient;
