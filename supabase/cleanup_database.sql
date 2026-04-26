-- ============================================================================
-- 🧹 CLEAN UP DATABASE TENDAR
-- ============================================================================
-- Script ini menghapus SEMUA data di tabel public (orders, products, dst)
-- dan membersihkan user demo yang broken.
--
-- ⚠️  HATI-HATI: Script ini TIDAK bisa di-undo!
--     Jalankan HANYA di development / staging, BUKAN di production.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Hapus data tabel (urutan penting karena ada foreign key)
-- ============================================================================

-- 1a. Anak-anak tabel (child tables dulu)
DELETE FROM public.order_items;
DELETE FROM public.raw_material_movements;
DELETE FROM public.product_raw_materials;

-- 1b. Tabel transaksi
DELETE FROM public.orders;

-- 1c. Tabel produk & kategori
DELETE FROM public.products;
DELETE FROM public.categories;
DELETE FROM public.raw_materials;

-- 1d. Tabel settings & roles
DELETE FROM public.store_settings;
DELETE FROM public.user_roles;

-- 1e. Tabel utama tenant (hapus terakhir)
DELETE FROM public.tenants;

-- ============================================================================
-- STEP 2: Reset sequences (biar ID mulai dari 1 lagi)
-- ============================================================================
ALTER SEQUENCE IF EXISTS public.categories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.orders_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.raw_materials_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.raw_material_movements_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.product_raw_materials_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS public.user_roles_id_seq RESTART WITH 1;

-- ============================================================================
-- STEP 3: Hapus SEMUA user dari auth.users
-- ⚠️  Ini akan hapus SEMUA akun termasuk superadmin!
--     Setelah ini, buat ulang akun superadmin via Dashboard.
-- ============================================================================
DELETE FROM auth.users;

-- ============================================================================
-- STEP 4: Verifikasi semua bersih
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== Hasil Verifikasi ===';
    RAISE NOTICE 'tenants         : % rows', (SELECT COUNT(*) FROM public.tenants);
    RAISE NOTICE 'categories      : % rows', (SELECT COUNT(*) FROM public.categories);
    RAISE NOTICE 'products        : % rows', (SELECT COUNT(*) FROM public.products);
    RAISE NOTICE 'orders          : % rows', (SELECT COUNT(*) FROM public.orders);
    RAISE NOTICE 'order_items     : % rows', (SELECT COUNT(*) FROM public.order_items);
    RAISE NOTICE 'raw_materials   : % rows', (SELECT COUNT(*) FROM public.raw_materials);
    RAISE NOTICE 'user_roles      : % rows', (SELECT COUNT(*) FROM public.user_roles);
    RAISE NOTICE 'store_settings  : % rows', (SELECT COUNT(*) FROM public.store_settings);
    RAISE NOTICE '--- Total user di auth.users ---';
    RAISE NOTICE 'auth.users remaining: %', (SELECT COUNT(*) FROM auth.users);
    RAISE NOTICE '✅ Database bersih!';
END $$;

COMMIT;
