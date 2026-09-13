-- =========================================================
-- CRITICAL PRODUCTION FIXES
-- Apply this migration to fix all critical issues
-- =========================================================

-- =========================================================
-- 1. FIX VARIANTS RLS POLICY (Require Authentication)
-- =========================================================

-- Drop existing policy
DROP POLICY IF EXISTS variants_access ON public.variants;

-- Create new policy requiring authentication
CREATE POLICY variants_access ON public.variants
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = variants.product_id AND p.is_active = true
  )
);

-- =========================================================
-- 2. ADD MISSING INDEXES FOR PERFORMANCE
-- =========================================================

-- Order Items Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Cart Items Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

-- Inventory Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON public.inventory(variant_id);

-- Orders Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Products Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- =========================================================
-- 3. CREATE TRANSACTION-SAFE CHECKOUT FUNCTION
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_user_id UUID,
  p_cart_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_total_amount INTEGER := 0;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_price INTEGER;
  v_available_stock INTEGER;
  v_inventory_id UUID;
BEGIN
  -- Generate order number
  v_order_number := 'MM90-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || SUBSTRING(p_user_id::TEXT, 1, 6);

  -- Validate cart items and calculate total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_price := (v_item->>'price_buyer')::INTEGER;

    -- Check inventory with row-level lock
    SELECT id, (stock - reserved) INTO v_inventory_id, v_available_stock
    FROM public.inventory
    WHERE product_id = v_product_id
      AND variant_id IS NULL
    FOR UPDATE; -- Row-level lock to prevent race conditions

    IF v_inventory_id IS NULL THEN
      RAISE EXCEPTION 'Inventory not found for product %', v_product_id;
    END IF;

    IF v_available_stock < v_quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
        v_product_id, v_available_stock, v_quantity;
    END IF;

    v_total_amount := v_total_amount + (v_price * v_quantity);
  END LOOP;

  -- Create order
  INSERT INTO public.orders (user_id, order_number, total_amount, status)
  VALUES (p_user_id, v_order_number, v_total_amount, 'pending')
  RETURNING id INTO v_order_id;

  -- Insert order items and reserve inventory atomically
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_price := (v_item->>'price_buyer')::INTEGER;

    -- Insert order item
    INSERT INTO public.order_items (order_id, product_id, quantity, price_at_purchase)
    VALUES (v_order_id, v_product_id, v_quantity, v_price);

    -- Reserve inventory (trigger will handle this, but we do it explicitly for safety)
    UPDATE public.inventory
    SET reserved = reserved + v_quantity
    WHERE product_id = v_product_id
      AND variant_id IS NULL;
  END LOOP;

  -- Clear cart
  DELETE FROM public.cart_items WHERE user_id = p_user_id;

  -- Return order details
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total_amount,
    'status', 'pending'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB) TO authenticated;

-- =========================================================
-- 4. FIX INVENTORY TRIGGER TO HANDLE MISSING ROWS
-- =========================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_reserve_inventory ON public.order_items;
DROP FUNCTION IF EXISTS public.reserve_inventory();

-- Create improved reserve inventory function
CREATE OR REPLACE FUNCTION public.reserve_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_inventory_id UUID;
  v_available_stock INTEGER;
  v_rows_updated INTEGER;
BEGIN
  -- Find inventory row
  SELECT id, (stock - reserved) INTO v_inventory_id, v_available_stock
  FROM public.inventory
  WHERE product_id = NEW.product_id
    AND variant_id IS NOT DISTINCT FROM NEW.variant_id
  FOR UPDATE; -- Lock row to prevent race conditions

  -- If inventory row doesn't exist, create it
  IF v_inventory_id IS NULL THEN
    INSERT INTO public.inventory (product_id, variant_id, stock, reserved, reorder_level)
    VALUES (NEW.product_id, NEW.variant_id, 0, NEW.quantity, 10)
    RETURNING id INTO v_inventory_id;
    
    -- If we're trying to reserve more than stock, fail
    IF NEW.quantity > 0 THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Inventory row created but stock is 0', NEW.product_id;
    END IF;
  ELSE
    -- Check available stock
    IF v_available_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %', 
        NEW.product_id, v_available_stock, NEW.quantity;
    END IF;

    -- Reserve inventory
    UPDATE public.inventory
    SET reserved = reserved + NEW.quantity
    WHERE id = v_inventory_id;

    -- Check if update succeeded
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated = 0 THEN
      RAISE EXCEPTION 'Failed to reserve inventory for product %', NEW.product_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trg_reserve_inventory
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.reserve_inventory();

-- =========================================================
-- 5. ADD ORDER ITEMS INSERT POLICY (For Backend Service Role)
-- =========================================================

-- Allow service role to insert order items (backend uses supabaseAdmin)
DROP POLICY IF EXISTS order_items_service_insert ON public.order_items;
CREATE POLICY order_items_service_insert ON public.order_items
FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS

-- =========================================================
-- 6. ENSURE INVENTORY AUTO-CREATION ON PRODUCT CREATION
-- =========================================================

-- Create or replace function to auto-create inventory
CREATE OR REPLACE FUNCTION public.ensure_product_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create inventory row for base product if it doesn't exist
  INSERT INTO public.inventory (product_id, variant_id, stock, reserved, reorder_level)
  VALUES (NEW.id, NULL, COALESCE(NEW.stock, 0), 0, 10)
  ON CONFLICT (product_id, variant_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trg_ensure_product_inventory ON public.products;
CREATE TRIGGER trg_ensure_product_inventory
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_product_inventory();

-- =========================================================
-- 7. ADD MISSING RLS POLICY FOR ORDER ITEMS INSERT
-- =========================================================

-- Users can insert order items for their own orders
DROP POLICY IF EXISTS order_items_user_insert ON public.order_items;
CREATE POLICY order_items_user_insert ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND o.user_id = auth.uid()
  )
);

-- =========================================================
-- VERIFICATION QUERIES
-- =========================================================

-- Verify indexes created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verify policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('order_items', 'variants')
ORDER BY tablename, policyname;
