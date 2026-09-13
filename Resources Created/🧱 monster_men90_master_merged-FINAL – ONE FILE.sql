BEGIN;

-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- PROFILES (auth.users extension)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','manager','buyer','wholesaler')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  company_name text,
  gst_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_access ON public.profiles;
CREATE POLICY profiles_access
ON public.profiles
FOR ALL
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
  )
);

-- =========================================================
-- PRODUCTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE NOT NULL,
  description text,
  category text NOT NULL,
  has_variants boolean DEFAULT false,
  buyer_price numeric(10,2) CHECK (buyer_price >= 0),
  wholesaler_price numeric(10,2) CHECK (wholesaler_price >= 0),
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_read ON public.products;
CREATE POLICY products_read
ON public.products
FOR SELECT
USING (public.products.is_active = true);

DROP POLICY IF EXISTS products_manage ON public.products;
CREATE POLICY products_manage
ON public.products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
  )
);

-- =========================================================
-- VARIANTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  type text,
  value text,
  sku_suffix text,
  buyer_price numeric(10,2),
  wholesaler_price numeric(10,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS variants_access ON public.variants;
CREATE POLICY variants_access
ON public.variants
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = variants.product_id AND p.is_active = true
  )
);

-- =========================================================
-- INVENTORY
-- =========================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.variants(id),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  reserved integer DEFAULT 0 CHECK (reserved >= 0),
  reorder_level integer DEFAULT 10,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_id, variant_id)
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_manage ON public.inventory;
CREATE POLICY inventory_manage
ON public.inventory
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
  )
);

-- =========================================================
-- CART
-- =========================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.variants(id),
  quantity integer CHECK (quantity > 0),
  unit_price numeric(10,2) CHECK (unit_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, product_id, variant_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cart_access ON public.cart_items;
CREATE POLICY cart_access
ON public.cart_items
FOR ALL
USING (user_id = auth.uid());

-- =========================================================
-- ORDERS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_role text CHECK (user_role IN ('buyer','wholesaler')),
  status text DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','packed','shipped','in_transit','delivered','cancelled')),
  payment_method text CHECK (payment_method IN ('cod','online')),
  payment_status text DEFAULT 'pending'
    CHECK (payment_status IN ('pending','completed','failed','refunded')),
  total_amount numeric(10,2) CHECK (total_amount >= 0),
  shipping_address text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orders_access ON public.orders;
CREATE POLICY orders_access
ON public.orders
FOR ALL
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
  )
);

-- =========================================================
-- ORDER ITEMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid REFERENCES public.variants(id),
  quantity integer CHECK (quantity > 0),
  unit_price numeric(10,2) CHECK (unit_price >= 0),
  total numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_items_access ON public.order_items;
CREATE POLICY order_items_access
ON public.order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND (
      o.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin','manager')
      )
    )
  )
);

-- =========================================================
-- INVENTORY TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.reserve_inventory()
RETURNS trigger AS $$
BEGIN
  UPDATE public.inventory
  SET reserved = reserved + NEW.quantity
  WHERE product_id = NEW.product_id
    AND variant_id IS NOT DISTINCT FROM NEW.variant_id
    AND (stock - reserved) >= NEW.quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reserve_inventory ON public.order_items;
CREATE TRIGGER trg_reserve_inventory
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.reserve_inventory();

CREATE OR REPLACE FUNCTION public.release_inventory()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    UPDATE public.inventory i
    SET reserved = reserved - oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND i.product_id = oi.product_id
      AND i.variant_id IS NOT DISTINCT FROM oi.variant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_release_inventory ON public.orders;
CREATE TRIGGER trg_release_inventory
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.release_inventory();

-- =========================================================
-- PAYMENTS (Razorpay)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  gateway text DEFAULT 'razorpay',
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  amount numeric(10,2),
  status text CHECK (status IN ('created','paid','failed','refunded')),
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_admin ON public.payments;
CREATE POLICY payments_admin
ON public.payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- =========================================================
-- ADMIN ANALYTICS
-- =========================================================
CREATE OR REPLACE VIEW public.admin_sales_summary AS
SELECT
  date_trunc('day', created_at) AS date,
  COUNT(*) total_orders,
  SUM(total_amount) total_revenue
FROM public.orders
WHERE status = 'delivered'
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW public.admin_top_products AS
SELECT
  p.id,
  p.name,
  SUM(oi.quantity) total_sold
FROM public.order_items oi
JOIN public.products p ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY total_sold DESC;

COMMIT;
