/**
 * Shared TypeScript types and interfaces
 */

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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  requestId?: string;
  timestamp?: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
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

export interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  products?: {
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
  user_id: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  profiles?: {
    id: string;
    email: string;
    full_name: string;
  };
  order_items?: OrderItem[];
}
