-- =========================================================
-- VERIFY REALTIME PUBLICATION CONFIGURATION
-- Run this in Supabase SQL Editor to check realtime setup
-- =========================================================

-- 1. Check if publication exists
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 2. Check which tables are in the publication
SELECT 
    schemaname,
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 3. Check if critical tables are included
-- Expected: products, inventory, orders, cart_items, order_items
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'products'
        ) THEN '✅ products'
        ELSE '❌ products MISSING'
    END as products_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'inventory'
        ) THEN '✅ inventory'
        ELSE '❌ inventory MISSING'
    END as inventory_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'orders'
        ) THEN '✅ orders'
        ELSE '❌ orders MISSING'
    END as orders_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'cart_items'
        ) THEN '✅ cart_items'
        ELSE '❌ cart_items MISSING'
    END as cart_items_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'order_items'
        ) THEN '✅ order_items'
        ELSE '❌ order_items MISSING'
    END as order_items_status;

-- 4. If tables are missing, add them with this command:
-- ALTER PUBLICATION supabase_realtime ADD TABLE products, inventory, orders, cart_items, order_items;

-- 5. Check replica identity (needed for realtime to work)
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN relreplident = 'd' THEN '✅ DEFAULT (full row)'
        WHEN relreplident = 'n' THEN '⚠️ NOTHING (won''t work)'
        WHEN relreplident = 'i' THEN '✅ INDEX'
        WHEN relreplident = 'f' THEN '✅ FULL'
        ELSE '❓ UNKNOWN'
    END as replica_identity
FROM pg_publication_tables ppt
JOIN pg_class pc ON pc.relname = ppt.tablename
JOIN pg_namespace pn ON pn.oid = pc.relnamespace
WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
ORDER BY tablename;
