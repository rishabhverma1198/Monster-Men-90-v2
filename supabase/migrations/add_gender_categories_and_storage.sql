-- Migration: Add Gender Categories and Storage Buckets
-- Description: Adds Men/Women categories support and separate storage buckets

-- ============================================================
-- 1. Add gender column to products table
-- ============================================================
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('men', 'women', 'unisex')) DEFAULT 'unisex';

-- Create index for gender filtering
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);

-- ============================================================
-- 2. Create Storage Buckets for Men and Women Products
-- ============================================================

-- Men Products Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'men-products',
  'men-products',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Women Products Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'women-products',
  'women-products',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Storage Policies for Men Products Bucket
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Men Products are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload men products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update men products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete men products" ON storage.objects;

-- Allow public read access
CREATE POLICY "Men Products are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'men-products');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload men products"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'men-products' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update men products"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'men-products' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete men products"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'men-products' 
  AND auth.role() = 'authenticated'
);

-- ============================================================
-- 4. Storage Policies for Women Products Bucket
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Women Products are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload women products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update women products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete women products" ON storage.objects;

-- Allow public read access
CREATE POLICY "Women Products are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'women-products');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload women products"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'women-products' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update women products"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'women-products' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete women products"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'women-products' 
  AND auth.role() = 'authenticated'
);

-- ============================================================
-- 5. Update existing products to have gender (optional)
-- ============================================================
-- You can run this to set default gender based on category
-- UPDATE products SET gender = 'men' WHERE category ILIKE '%men%' OR category ILIKE '%male%';
-- UPDATE products SET gender = 'women' WHERE category ILIKE '%women%' OR category ILIKE '%female%' OR category ILIKE '%ladies%';

-- ============================================================
-- 6. Create function to move product between categories
-- ============================================================
CREATE OR REPLACE FUNCTION move_product_to_gender(
  product_id UUID,
  new_gender VARCHAR(10)
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate gender
  IF new_gender NOT IN ('men', 'women', 'unisex') THEN
    RAISE EXCEPTION 'Invalid gender. Must be men, women, or unisex';
  END IF;

  -- Update product gender
  UPDATE products
  SET gender = new_gender,
      updated_at = NOW()
  WHERE id = product_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. Add notification table for admin alerts
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'order', 'stock', 'customer', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB, -- Additional data (order_id, product_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON admin_notifications(created_at DESC);

-- RLS Policies for notifications (only admins can see)
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all notifications" ON admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON admin_notifications;

CREATE POLICY "Admins can view all notifications"
ON admin_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE u.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "System can insert notifications"
ON admin_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update notifications"
ON admin_notifications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    JOIN profiles p ON p.id = u.id
    WHERE u.id = auth.uid() AND p.role = 'admin'
  )
);

-- ============================================================
-- 8. Function to create notifications
-- ============================================================
CREATE OR REPLACE FUNCTION create_admin_notification(
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_severity VARCHAR(20) DEFAULT 'info',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO admin_notifications (type, title, message, severity, metadata)
  VALUES (p_type, p_title, p_message, p_severity, p_metadata)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Triggers for automatic notifications
-- ============================================================

-- Trigger: Low stock notification
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock < 10 AND NEW.stock >= 0 THEN
    PERFORM create_admin_notification(
      'stock',
      'Low Stock Alert',
      'Product "' || NEW.title || '" is running low on stock. Current stock: ' || NEW.stock,
      'warning',
      jsonb_build_object('product_id', NEW.id, 'stock', NEW.stock)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_low_stock ON products;

CREATE TRIGGER trigger_low_stock
AFTER UPDATE OF stock ON products
FOR EACH ROW
WHEN (NEW.stock < 10 AND NEW.stock >= 0)
EXECUTE FUNCTION notify_low_stock();

-- Trigger: New order notification
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_admin_notification(
    'order',
    'New Order Received',
    'New order #' || NEW.order_number || ' has been placed. Total: ₹' || NEW.total_amount,
    'success',
    jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number, 'total_amount', NEW.total_amount)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_new_order ON orders;

CREATE TRIGGER trigger_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_new_order();

-- Trigger: New customer registration
CREATE OR REPLACE FUNCTION notify_new_customer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'buyer' THEN
    PERFORM create_admin_notification(
      'customer',
      'New Customer Registered',
      'New customer registered: ' || COALESCE(NEW.full_name, NEW.email),
      'info',
      jsonb_build_object('user_id', NEW.id, 'email', NEW.email)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_new_customer ON profiles;

CREATE TRIGGER trigger_new_customer
AFTER INSERT ON profiles
FOR EACH ROW
WHEN (NEW.role = 'buyer')
EXECUTE FUNCTION notify_new_customer();

-- ============================================================
-- 10. View for unread notifications count
-- ============================================================
CREATE OR REPLACE VIEW admin_unread_notifications_count AS
SELECT COUNT(*) as unread_count
FROM admin_notifications
WHERE is_read = FALSE;

-- ============================================================
-- Migration Complete
-- ============================================================
