-- =========================================================
-- Migration: Add Performance Indexes
-- Description: Adds indexes on frequently queried columns
--              to improve query performance
-- Date: 2024-01-15
-- =========================================================

-- Products Table Indexes
-- =========================================================

-- Index on category (used in product filtering)
CREATE INDEX IF NOT EXISTS idx_products_category 
ON public.products(category);

-- Index on slug (used for product lookups by slug)
CREATE INDEX IF NOT EXISTS idx_products_slug 
ON public.products(slug);

-- Index on is_active (used to filter active products)
CREATE INDEX IF NOT EXISTS idx_products_is_active 
ON public.products(is_active);

-- Composite index for common query pattern: active products by category
CREATE INDEX IF NOT EXISTS idx_products_category_is_active 
ON public.products(category, is_active) 
WHERE is_active = true;

-- Orders Table Indexes
-- =========================================================

-- Index on user_id (used to fetch user orders)
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON public.orders(user_id);

-- Index on status (used for order filtering by status)
CREATE INDEX IF NOT EXISTS idx_orders_status 
ON public.orders(status);

-- Index on created_at (used for ordering by date)
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
ON public.orders(created_at DESC);

-- Composite index for common query pattern: user orders by status and date
CREATE INDEX IF NOT EXISTS idx_orders_user_status_created 
ON public.orders(user_id, status, created_at DESC);

-- Cart Items Table Indexes
-- =========================================================

-- Index on user_id (used to fetch user cart items)
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id 
ON public.cart_items(user_id);

-- Index on product_id (used for product lookups in cart)
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id 
ON public.cart_items(product_id);

-- Composite index for common query pattern: user cart items with product
CREATE INDEX IF NOT EXISTS idx_cart_items_user_product 
ON public.cart_items(user_id, product_id);

-- Profiles Table Indexes
-- =========================================================

-- Index on email (used for user lookups and authentication)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON public.profiles(email);

-- Index on role (used for role-based access control queries)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON public.profiles(role);

-- Composite index for common query pattern: active users by role
CREATE INDEX IF NOT EXISTS idx_profiles_role_is_active 
ON public.profiles(role, is_active) 
WHERE is_active = true;

-- Order Items Table Indexes (Additional optimization)
-- =========================================================

-- Index on order_id (used to fetch order items for an order)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items(order_id);

-- Index on product_id (used for product sales analytics)
CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
ON public.order_items(product_id);

-- Inventory Table Indexes (Additional optimization)
-- =========================================================

-- Index on product_id (used for inventory lookups)
CREATE INDEX IF NOT EXISTS idx_inventory_product_id 
ON public.inventory(product_id);

-- Composite index for inventory queries with variant
CREATE INDEX IF NOT EXISTS idx_inventory_product_variant 
ON public.inventory(product_id, variant_id) 
WHERE variant_id IS NOT NULL;

-- =========================================================
-- Migration Complete
-- =========================================================

-- Note: All indexes use IF NOT EXISTS to ensure idempotency
-- Indexes are created using B-tree (default) which is optimal
-- for equality and range queries used in this application
