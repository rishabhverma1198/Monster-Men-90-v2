# Database Migrations

## Migration 001: Add Missing Order Columns (Hybrid Approach)

### Purpose
Adds missing columns to match expected schema while maintaining backward compatibility with existing code and data.

### Changes
1. **orders table:**
   - ✅ `order_number` (text, UNIQUE, NOT NULL)
   - ✅ `user_name` (text)
   - ✅ `user_email` (text)
   - ✅ `user_phone` (text)
   - ✅ `user_type` (text: 'single' | 'wholeseller')

2. **order_items table:**
   - ✅ `price_snapshot` (numeric) - alias for `unit_price`
   - ✅ Trigger to keep `unit_price` and `price_snapshot` in sync

3. **Backward Compatibility:**
   - ✅ Existing data migrated automatically
   - ✅ Old columns (`user_role`, `notes`) still work
   - ✅ New columns populated from existing data
   - ✅ View `orders_compat` for compatibility

### How to Run

#### Option 1: Via Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `001_add_missing_order_columns.sql`
3. Paste and execute

#### Option 2: Via psql
```bash
psql -h <your-supabase-host> -U postgres -d postgres -f migrations/001_add_missing_order_columns.sql
```

#### Option 3: Via Supabase CLI
```bash
supabase db push
```

### Verification
After running migration, verify with:
```sql
-- Check orders table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check order_items table columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'order_items'
ORDER BY ordinal_position;

-- Check if data was migrated
SELECT 
  id, 
  order_number, 
  user_type, 
  user_name, 
  user_email, 
  user_phone 
FROM orders 
LIMIT 5;
```

### Rollback (if needed)
```sql
BEGIN;
ALTER TABLE public.orders DROP COLUMN IF EXISTS order_number;
ALTER TABLE public.orders DROP COLUMN IF EXISTS user_name;
ALTER TABLE public.orders DROP COLUMN IF EXISTS user_email;
ALTER TABLE public.orders DROP COLUMN IF EXISTS user_phone;
ALTER TABLE public.orders DROP COLUMN IF EXISTS user_type;
ALTER TABLE public.order_items DROP COLUMN IF EXISTS price_snapshot;
DROP TRIGGER IF EXISTS trg_sync_price_snapshot ON public.order_items;
DROP FUNCTION IF EXISTS sync_price_snapshot();
DROP VIEW IF EXISTS public.orders_compat;
COMMIT;
```

### Notes
- Migration is **idempotent** - safe to run multiple times
- Existing data is automatically migrated
- Old code continues to work (backward compatible)
- New code can use new columns directly

---

## Migration 003: Order Items Price Columns

### Purpose
If GET `/api/orders` fails with **"column order_items_1.unit_price does not exist"**, your `order_items` table may be missing `price_snapshot` or `unit_price`. This migration ensures at least one price column exists and syncs data.

### When to Run
- Run in **Supabase SQL Editor** when you see the above error on the Orders page.

### What It Does
- Adds `price_snapshot` to `order_items` if missing (and copies from `unit_price` if it exists).
- Adds `unit_price` to `order_items` if missing (and copies from `price_snapshot` or `price_at_purchase`).
- Syncs values so the backend (which now selects only `price_snapshot`) can return orders correctly.

### How to Run
1. Supabase Dashboard → SQL Editor
2. Copy contents of `003_order_items_price_columns.sql`
3. Paste and run
