/**
 * API Response Types
 * All types match backend response structure
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  code: string;
  message: string;
  timestamp?: string;
  requestId?: string;
}

/**
 * Auth Types
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'buyer' | 'wholesaler';
  phone_number?: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Product Types
 */
export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price_buyer: number;
  price_wholesale: number;
  wholesale_moq: number;
  image_url?: string;
  image_urls?: string[];
  stock: number;
  is_active: boolean;
  is_featured?: boolean;
  created_at: string;
  created_by?: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
}

/**
 * Cart Types
 */
export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string; // Backend uses 'name', not 'title'
    buyer_price: number; // Backend uses 'buyer_price', not 'price_buyer'
    wholesaler_price?: number; // Backend uses 'wholesaler_price', not 'price_wholesale'
    wholesale_moq?: number;
    image_url?: string; // Backend uses 'image_url', not 'image_urls'
    // Support both for backward compatibility
    title?: string;
    price_buyer?: number;
    price_wholesale?: number;
    image_urls?: string[];
  };
}

/**
 * Order Types
 */
export interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products: {
    id: string;
    title: string;
    image_url?: string;
  };
}

export interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  created_at: string;
  updated_at?: string;
  order_items?: OrderItem[];
  user_id?: string;
  shipping_awb?: string;
  shipping_courier?: string;
  shipping_tracking_url?: string;
  shipping_label_url?: string;
  shipping_cost?: number;
  shipping_pincode?: string;
  delivery_pincode?: string;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
}

/**
 * Pagination Types
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
  page?: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  rating?: number;
  fabric?: string;
}

export interface ProductSort {
  field: 'price' | 'created_at' | 'title';
  order: 'asc' | 'desc';
}
