// =========================================================
// TYPES - Match Database Schema
// =========================================================

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'buyer' | 'wholesaler';
  status: 'active' | 'inactive'; // Schema uses 'status', not 'is_active'
  full_name?: string | null;
  company_name?: string | null;
  gst_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string; // Schema uses 'name', not 'title'
  sku: string; // Required unique field
  description?: string | null;
  category: string;
  has_variants: boolean;
  buyer_price: number;
  wholesaler_price: number;
  wholesale_moq?: number;
  image_url?: string | null; // Single URL, not array
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Note: Stock is NOT in products table, it's in inventory table
}

export interface Variant {
  id: string;
  product_id: string;
  type?: string | null;
  value?: string | null;
  sku_suffix?: string | null;
  buyer_price?: number | null;
  wholesaler_price?: number | null;
  created_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  variant_id?: string | null;
  stock: number;
  reserved: number;
  reorder_level: number;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  product?: Product; // For join queries
}

export interface Order {
  id: string;
  user_id: string;
  user_role?: 'buyer' | 'wholesaler' | null;
  status: 'pending' | 'confirmed' | 'packed' | 'shipped' | 'in_transit' | 'delivered' | 'cancelled';
  payment_method?: 'cod' | 'online' | null;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  total_amount: number;
  shipping_address?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Note: order_number doesn't exist in schema
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  unit_price: number;
  total: number; // Generated column (quantity * unit_price)
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  gateway: string;
  gateway_order_id?: string | null;
  gateway_payment_id?: string | null;
  gateway_signature?: string | null;
  amount: number;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  payload?: any; // JSONB
  created_at: string;
}