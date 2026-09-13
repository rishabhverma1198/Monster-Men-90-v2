-- =========================================================
-- Ensure order_items has a price column for API compatibility
-- Run in Supabase SQL Editor if GET /orders fails with "unit_price does not exist"
-- =========================================================

-- Add price_snapshot if missing (used by GET /orders and GET /orders/:id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_snapshot'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN price_snapshot numeric(10,2);
    -- Copy from unit_price only if that column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'unit_price') THEN
      UPDATE public.order_items
      SET price_snapshot = unit_price
      WHERE price_snapshot IS NULL AND unit_price IS NOT NULL;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_at_purchase') THEN
      UPDATE public.order_items
      SET price_snapshot = price_at_purchase
      WHERE price_snapshot IS NULL AND price_at_purchase IS NOT NULL;
    END IF;
  END IF;
END $$;

-- If your table has no unit_price, add it and copy from price_snapshot or price_at_purchase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'unit_price'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN unit_price numeric(10,2);
    UPDATE public.order_items
    SET unit_price = price_snapshot
    WHERE unit_price IS NULL AND price_snapshot IS NOT NULL;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_at_purchase') THEN
      UPDATE public.order_items
      SET unit_price = price_at_purchase
      WHERE unit_price IS NULL AND price_at_purchase IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Ensure price_snapshot exists and is synced from unit_price where needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'unit_price'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'price_snapshot'
  ) THEN
    UPDATE public.order_items
    SET price_snapshot = unit_price
    WHERE price_snapshot IS NULL AND unit_price IS NOT NULL;
  END IF;
END $$;
