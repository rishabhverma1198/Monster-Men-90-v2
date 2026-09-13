-- =========================================================
-- MIGRATION: Add Missing Order Columns (Hybrid Approach)
-- Date: 2026-01-24
-- Description: Adds user_name, user_email, user_phone, order_number
--              to orders table while maintaining backward compatibility
-- =========================================================

BEGIN;

-- =========================================================
-- 1. ADD ORDER_NUMBER COLUMN TO ORDERS
-- =========================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'order_number'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN order_number text UNIQUE;
    
    -- Generate order_number for existing orders
    UPDATE public.orders
    SET order_number = 'MM90-' || EXTRACT(EPOCH FROM created_at)::bigint || '-' || SUBSTRING(id::text, 1, 6)
    WHERE order_number IS NULL;
    
    -- Make it NOT NULL after populating
    ALTER TABLE public.orders 
    ALTER COLUMN order_number SET NOT NULL;
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
  END IF;
END $$;

-- =========================================================
-- 2. ADD USER_NAME, USER_EMAIL, USER_PHONE COLUMNS
-- =========================================================
DO $$ 
DECLARE
  order_rec RECORD;
  notes_json jsonb;
  user_details_json jsonb;
BEGIN
  -- Add user_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'user_name'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN user_name text;
  END IF;
  
  -- Add user_email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'user_email'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN user_email text;
  END IF;
  
  -- Add user_phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'user_phone'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN user_phone text;
  END IF;
  
  -- Add user_type (alias for user_role, for compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'user_type'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN user_type text CHECK (user_type IN ('single', 'wholeseller'));
    
    -- Populate user_type from user_role for existing data
    UPDATE public.orders
    SET user_type = CASE 
      WHEN user_role = 'buyer' THEN 'single'
      WHEN user_role = 'wholesaler' THEN 'wholeseller'
      ELSE 'single'
    END
    WHERE user_type IS NULL;
  END IF;
  
  -- Extract user details from notes JSON for existing orders (with safe JSON parsing)
  -- Using a function to safely parse JSON
  FOR order_rec IN 
      SELECT id, notes 
      FROM public.orders 
      WHERE notes IS NOT NULL 
        AND notes::text LIKE '%user_details%'
        AND (user_name IS NULL OR user_email IS NULL OR user_phone IS NULL OR user_type IS NULL)
    LOOP
      BEGIN
        -- Try to parse notes as JSON
        notes_json := order_rec.notes::jsonb;
        
        -- Extract user_details if exists
        IF notes_json ? 'user_details' THEN
          user_details_json := notes_json->'user_details';
          
          UPDATE public.orders
          SET 
            user_name = COALESCE(user_name, user_details_json->>'name'),
            user_email = COALESCE(user_email, user_details_json->>'email'),
            user_phone = COALESCE(user_phone, user_details_json->>'contact_number'),
            user_type = COALESCE(user_type, notes_json->>'user_type')
          WHERE id = order_rec.id;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Skip invalid JSON entries, continue with next order
          CONTINUE;
      END;
    END LOOP;
END $$;

-- =========================================================
-- 3. ADD PRICE_SNAPSHOT TO ORDER_ITEMS (alias for unit_price)
-- =========================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'order_items' 
    AND column_name = 'price_snapshot'
  ) THEN
    ALTER TABLE public.order_items 
    ADD COLUMN price_snapshot numeric(10,2);
    
    -- Populate price_snapshot from unit_price for existing data
    UPDATE public.order_items
    SET price_snapshot = unit_price
    WHERE price_snapshot IS NULL;
    
    -- Create a trigger to keep them in sync
    CREATE OR REPLACE FUNCTION sync_price_snapshot()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.unit_price IS NOT NULL AND NEW.price_snapshot IS NULL THEN
        NEW.price_snapshot := NEW.unit_price;
      ELSIF NEW.price_snapshot IS NOT NULL AND NEW.unit_price IS NULL THEN
        NEW.unit_price := NEW.price_snapshot;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    DROP TRIGGER IF EXISTS trg_sync_price_snapshot ON public.order_items;
    CREATE TRIGGER trg_sync_price_snapshot
    BEFORE INSERT OR UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_price_snapshot();
  END IF;
END $$;

-- =========================================================
-- 4. CREATE VIEW FOR BACKWARD COMPATIBILITY (Optional)
-- =========================================================
-- Only create view if order_number column exists (migration was successful)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'order_number'
  ) THEN
    CREATE OR REPLACE VIEW public.orders_compat AS
    SELECT 
      id,
      order_number,
      user_id,
      user_type,
      COALESCE(user_type, 
        CASE 
          WHEN user_role = 'buyer' THEN 'single'
          WHEN user_role = 'wholesaler' THEN 'wholeseller'
          ELSE 'single'
        END
      ) as user_type_compat,
      user_name,
      user_email,
      user_phone,
      status,
      total_amount,
      created_at,
      notes,
      user_role,
      payment_method,
      payment_status,
      shipping_address,
      updated_at
    FROM public.orders;

    COMMENT ON VIEW public.orders_compat IS 'Backward compatible view for orders table with both old and new columns';
  END IF;
END $$;

COMMIT;

-- =========================================================
-- VERIFICATION QUERIES (Run after migration)
-- =========================================================
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'orders'
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'order_items'
-- ORDER BY ordinal_position;
