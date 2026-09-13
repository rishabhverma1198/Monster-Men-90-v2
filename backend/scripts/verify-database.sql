-- =========================================================
-- COMPLETE DATABASE VERIFICATION SQL
-- Run this in Supabase SQL Editor for 100% verification
-- =========================================================

-- 1️⃣ TABLES EXISTENCE CHECK
SELECT 
    'TABLE_EXISTS' as check_type,
    tablename as object_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tablename) 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM (VALUES 
    ('profiles'),
    ('products'),
    ('variants'),
    ('inventory'),
    ('cart_items'),
    ('orders'),
    ('order_items'),
    ('payments'),
    ('categories'),
    ('reviews')
) AS expected_tables(tablename);

-- 2️⃣ CRITICAL COLUMNS CHECK
SELECT 
    'COLUMN_EXISTS' as check_type,
    table_name || '.' || column_name as object_name,
    data_type,
    CASE 
        WHEN is_nullable = 'NO' THEN 'NOT NULL ✅'
        ELSE 'NULLABLE'
    END as nullability
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    (table_name = 'products' AND column_name IN ('id', 'title', 'slug', 'price_buyer', 'stock', 'image_urls', 'is_active', 'created_by'))
    OR (table_name = 'orders' AND column_name IN ('id', 'user_id', 'order_number', 'total_amount', 'status', 'created_at'))
    OR (table_name = 'order_items' AND column_name IN ('id', 'order_id', 'product_id', 'quantity', 'price_at_purchase'))
    OR (table_name = 'cart_items' AND column_name IN ('id', 'user_id', 'product_id', 'quantity'))
    OR (table_name = 'inventory' AND column_name IN ('id', 'product_id', 'variant_id', 'stock', 'reserved', 'reorder_level'))
    OR (table_name = 'profiles' AND column_name IN ('id', 'email', 'role', 'full_name', 'is_active'))
)
ORDER BY table_name, column_name;

-- 3️⃣ RLS POLICIES CHECK
SELECT 
    'RLS_POLICY' as check_type,
    schemaname || '.' || tablename as object_name,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED' 
        ELSE '❌ DISABLED' 
    END as rls_status,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = pt.tablename) as policy_count
FROM pg_tables pt
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'products', 'cart_items', 'orders', 'order_items', 'inventory', 'payments')
ORDER BY tablename;

-- 4️⃣ POLICIES DETAIL
SELECT 
    'POLICY_DETAIL' as check_type,
    schemaname || '.' || tablename || '.' || policyname as object_name,
    cmd as operation,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ HAS USING CLAUSE'
        ELSE '⚠️ NO USING CLAUSE'
    END as using_status,
    CASE 
        WHEN with_check IS NOT NULL THEN '✅ HAS WITH CHECK'
        ELSE '⚠️ NO WITH CHECK'
    END as check_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'products', 'cart_items', 'orders', 'order_items', 'inventory', 'payments')
ORDER BY tablename, policyname;

-- 5️⃣ TRIGGERS CHECK
SELECT 
    'TRIGGER' as check_type,
    trigger_schema || '.' || trigger_name as object_name,
    event_object_table as table_name,
    action_timing || ' ' || event_manipulation as trigger_type,
    '✅ EXISTS' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('trg_reserve_inventory', 'trg_release_inventory')
ORDER BY event_object_table, trigger_name;

-- 6️⃣ FOREIGN KEYS CHECK
SELECT 
    'FOREIGN_KEY' as check_type,
    tc.table_name || '.' || kcu.column_name as from_column,
    ccu.table_name || '.' || ccu.column_name as to_column,
    rc.delete_rule as on_delete,
    '✅ EXISTS' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('cart_items', 'orders', 'order_items', 'inventory', 'payments', 'products')
ORDER BY tc.table_name, kcu.column_name;

-- 7️⃣ INDEXES CHECK (Performance)
SELECT 
    'INDEX' as check_type,
    schemaname || '.' || tablename || '.' || indexname as object_name,
    indexdef,
    CASE 
        WHEN indexname LIKE '%_pkey' THEN '✅ PRIMARY KEY'
        WHEN indexname LIKE '%_fkey' THEN '✅ FOREIGN KEY'
        ELSE '✅ INDEX'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('products', 'orders', 'cart_items', 'inventory', 'profiles')
ORDER BY tablename, indexname;

-- 8️⃣ FUNCTIONS CHECK (Triggers use functions)
SELECT 
    'FUNCTION' as check_type,
    routine_schema || '.' || routine_name as object_name,
    routine_type,
    '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('reserve_inventory', 'release_inventory', 'handle_new_user')
ORDER BY routine_name;

-- 9️⃣ REPLICA IDENTITY (Realtime needs this)
SELECT 
    'REPLICA_IDENTITY' as check_type,
    schemaname || '.' || relname as object_name,
    CASE relreplident
        WHEN 'd' THEN '✅ DEFAULT (full row) - Good for Realtime'
        WHEN 'n' THEN '❌ NOTHING - Realtime may not work'
        WHEN 'i' THEN '⚠️ INDEX - May work but less data'
        WHEN 'f' THEN '✅ FULL - Best for Realtime'
        ELSE '❓ UNKNOWN'
    END as replica_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND c.relname IN ('products', 'inventory', 'orders', 'cart_items', 'order_items');

-- 🔟 PUBLICATION CHECK (Realtime)
SELECT 
    'REALTIME_PUBLICATION' as check_type,
    pubname as publication_name,
    tablename as table_name,
    CASE 
        WHEN tablename IS NOT NULL THEN '✅ IN PUBLICATION'
        ELSE '❌ NOT IN PUBLICATION'
    END as status
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
WHERE p.pubname = 'supabase_realtime'
AND (
    tablename IS NULL 
    OR tablename IN ('products', 'inventory', 'orders', 'cart_items', 'order_items')
)
ORDER BY tablename;

-- 1️⃣1️⃣ DATA INTEGRITY CHECKS
SELECT 
    'DATA_INTEGRITY' as check_type,
    'Products without inventory' as check_name,
    COUNT(DISTINCT p.id) as issue_count,
    CASE 
        WHEN COUNT(DISTINCT p.id) = 0 THEN '✅ ALL PRODUCTS HAVE INVENTORY'
        ELSE '⚠️ SOME PRODUCTS MISSING INVENTORY ROWS'
    END as status
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id AND i.variant_id IS NULL
WHERE i.id IS NULL;

-- 1️⃣2️⃣ ORDERS STATUS CHECK CONSTRAINT
SELECT 
    'CONSTRAINT' as check_type,
    tc.table_name || '.' || tc.constraint_name as object_name,
    cc.check_clause as constraint_definition,
    '✅ EXISTS' as status
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.constraint_type = 'CHECK'
AND (
    (tc.table_name = 'orders' AND cc.check_clause LIKE '%status%')
    OR (tc.table_name = 'payments' AND cc.check_clause LIKE '%status%')
);

-- =========================================================
-- SUMMARY REPORT
-- =========================================================
SELECT 
    'SUMMARY' as report_section,
    COUNT(DISTINCT tablename) as total_tables_checked,
    COUNT(DISTINCT CASE WHEN rowsecurity THEN tablename END) as tables_with_rls,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as total_functions
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'products', 'variants', 'inventory', 'cart_items', 'orders', 'order_items', 'payments', 'categories', 'reviews');

-- =========================================================
-- RECOMMENDATIONS
-- =========================================================
SELECT 
    'RECOMMENDATION' as check_type,
    recommendation as message,
    priority as priority_level
FROM (VALUES
    ('Add missing tables to realtime publication if not included', 'HIGH'),
    ('Ensure all products have inventory rows', 'HIGH'),
    ('Verify RLS policies allow intended access patterns', 'MEDIUM'),
    ('Check indexes exist on frequently queried columns', 'LOW')
) AS recommendations(recommendation, priority);
