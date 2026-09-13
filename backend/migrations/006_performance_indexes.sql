-- =========================================================
-- Performance indexes for hot paths (audit recommendation)
-- Run after 005. Safe to run multiple times (IF NOT EXISTS).
-- =========================================================

-- Orders: list by user, sorted by created_at
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at_desc
  ON public.orders(user_id, created_at DESC);

-- Cart items: by user
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id
  ON public.cart_items(user_id);

-- Order items: by order (for admin order list and order detail)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id
  ON public.order_items(order_id);

-- Profiles: by role (admin check)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(role);

-- Products: list filters (active, category, gender)
CREATE INDEX IF NOT EXISTS idx_products_is_active_created_at
  ON public.products(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products(category) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_gender
  ON public.products(gender) WHERE is_active = true;

-- Admin notifications: by created_at for list
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at
  ON public.admin_notifications(created_at DESC);
