-- =========================================================
-- MIGRATION: Add Missing Order Columns (Hybrid Approach) - FIXED VERSION
-- Date: 2026-01-24
-- Description: Adds user_name, user_email, user_phone, order_number
--              to orders table while maintaining backward compatibility
--              FIXED: Safe JSON parsing with error handling
-- =========================================================

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
    -- Add column as nullable first
    ALTER TABLE public.orders 
    ADD COLUMN order_number text;
    
    -- Generate order_number for existing orders
    UPDATE public.orders
    SET order_number = 'MM90-' || EXTRACT(EPOCH FROM created_at)::bigint || '-' || SUBSTRING(id::text, 1, 6)
    WHERE order_number IS NULL;
    
    -- Add unique constraint
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number_unique ON public.orders(order_number) 
    WHERE order_number IS NOT NULL;
    
    -- Make it NOT NULL after populating (only if all rows have values)
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number IS NULL) THEN
        ALTER TABLE public.orders 
        ALTER COLUMN order_number SET NOT NULL;
      END IF;
    END $$;
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
  END IF;
END $$;

-- =========================================================
-- 2. ADD USER_NAME, USER_EMAIL, USER_PHONE, USER_TYPE COLUMNS
-- =========================================================
DO $$ 
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
  
  -- Add user_type
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
    WHERE user_type IS NULL AND user_role IS NOT NULL;
  END IF;
END $$;

-- =========================================================
-- 3. EXTRACT USER DETAILS FROM NOTES (Safe JSON Parsing)
-- =========================================================
DO $$
DECLARE
  order_rec RECORD;
  notes_json jsonb;
  user_details_json jsonb;
  extracted_name text;
  extracted_email text;
  extracted_phone text;
  extracted_type text;
BEGIN
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
      
      -- Extract user_type
      IF notes_json ? 'user_type' THEN
        extracted_type := notes_json->>'user_type';
      END IF;
      
      -- Extract user_details if exists
      IF notes_json ? 'user_details' THEN
        user_details_json := notes_json->'user_details';
        
        IF jsonb_typeof(user_details_json) = 'object' THEN
          extracted_name := user_details_json->>'name';
          extracted_email := user_details_json->>'email';
          extracted_phone := user_details_json->>'contact_number';
        END IF;
      END IF;
      
      -- Update only if we have valid data
      IF extracted_name IS NOT NULL OR extracted_email IS NOT NULL OR extracted_phone IS NOT NULL OR extracted_type IS NOT NULL THEN
        UPDATE public.orders
        SET 
          user_name = COALESCE(user_name, extracted_name),
          user_email = COALESCE(user_email, extracted_email),
          user_phone = COALESCE(user_phone, extracted_phone),
          user_type = COALESCE(user_type, extracted_type)
        WHERE id = order_rec.id;
      END IF;
      
      -- Reset variables for next iteration
      extracted_name := NULL;
      extracted_email := NULL;
      extracted_phone := NULL;
      extracted_type := NULL;
      
    EXCEPTION
      WHEN invalid_text_representation THEN
        -- Invalid JSON, skip this record
        CONTINUE;
      WHEN OTHERS THEN
        -- Any other error, skip this record
        CONTINUE;
    END;
  END LOOP;
END $$;

-- =========================================================
-- 4. ADD PRICE_SNAPSHOT TO ORDER_ITEMS
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
    WHERE price_snapshot IS NULL AND unit_price IS NOT NULL;
    
    -- Create a trigger function to keep them in sync
    CREATE OR REPLACE FUNCTION sync_price_snapshot()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.unit_price IS NOT NULL AND NEW.price_snapshot IS NULL THEN
        NEW.price_snapshot := NEW.unit_price;
      ELSIF NEW.price_snapshot IS NOT NULL AND NEW.unit_price IS NULL THEN
        NEW.unit_price := NEW.price_snapshot;
      ELSIF NEW.unit_price IS NOT NULL AND NEW.price_snapshot IS NOT NULL THEN
        -- Keep them in sync - prefer unit_price if both are set
        NEW.price_snapshot := NEW.unit_price;
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
-- 5. CREATE VIEW FOR BACKWARD COMPATIBILITY (Optional)
-- =========================================================
DO $$
BEGIN
  -- Only create view if order_number column exists
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
-- Check columns were added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'orders'
-- ORDER BY ordinal_position;

-- Check order_items columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'order_items'
-- ORDER BY ordinal_position;

-- Check sample data
-- SELECT 
--   id, 
--   order_number, 
--   user_type, 
--   user_name, 
--   user_email, 
--   user_phone 
-- FROM orders 
-- LIMIT 5;
