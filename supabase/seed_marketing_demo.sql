-- ============================================================================
-- SEED DATA DEMO: 1 TENANT (FRESH JUICE BAR) & 100 ORDERS
-- Jalankan SETELAH membuat 1 user di Supabase Dashboard → Authentication
-- dengan email: juice@demo.tendar.app
-- ============================================================================

DO $$
DECLARE
    uid UUID;
    t_id UUID;
    cat_jus BIGINT;
    cat_smoothie BIGINT;
    -- Product IDs
    p1 BIGINT := 101; p2 BIGINT := 102; p3 BIGINT := 103; p4 BIGINT := 104; p5 BIGINT := 105;
    order_date TIMESTAMPTZ;
BEGIN
    -- 1. Ambil UUID dari user yang sudah dibuat via Dashboard
    SELECT id INTO uid FROM auth.users WHERE email = 'juice@demo.tendar.app' LIMIT 1;
    IF uid IS NULL THEN RAISE EXCEPTION 'User juice@demo.tendar.app belum dibuat. Buat dulu di Dashboard!'; END IF;

    RAISE NOTICE 'UID ditemukan: %', uid;

    -- ============================================================================
    -- 2. Buat Tenant (Fresh Juice Bar)
    -- ============================================================================
    -- Hapus tenant lama jika ada
    DELETE FROM public.tenants WHERE slug = 'fresh-juice';

    INSERT INTO public.tenants (id, name, slug, owner_id, plan, is_active, whatsapp, created_at)
    VALUES (gen_random_uuid(), 'Fresh Juice Bar', 'fresh-juice', uid, 'pro', true, '628111111111', NOW() - INTERVAL '30 days')
    RETURNING id INTO t_id;

    -- Set Admin Role
    INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES
    (uid, t_id, 'admin')
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin';

    -- Store Settings
    INSERT INTO public.store_settings (tenant_id, is_open) VALUES
    (t_id, true);

    -- ============================================================================
    -- 3. Menu Kategori & Produk
    -- ============================================================================
    INSERT INTO public.categories (name, tenant_id) VALUES ('Jus Buah Segar', t_id) RETURNING id INTO cat_jus;
    INSERT INTO public.categories (name, tenant_id) VALUES ('Smoothies & Blend', t_id) RETURNING id INTO cat_smoothie;

    INSERT INTO public.products (id, name, description, price, category, tenant_id, stock_status) VALUES
    (p1, 'Jus Mangga Manis', 'Mangga harum manis blender segar tanpa air', 15000, 'Jus Buah Segar', t_id, true),
    (p2, 'Jus Alpukat Mentega', 'Alpukat kocok dengan kental manis dan coklat', 18000, 'Jus Buah Segar', t_id, true),
    (p3, 'Jus Semangka', 'Semangka merah segar blender dingin', 12000, 'Jus Buah Segar', t_id, true),
    (p4, 'Smoothie Strawberry', 'Strawberry blend dengan yogurt dan madu', 22000, 'Smoothies & Blend', t_id, true),
    (p5, 'Green Smoothie', 'Bayam + Apel + Jahe + Lemon segar', 25000, 'Smoothies & Blend', t_id, true)
    ON CONFLICT (id) DO NOTHING;

    -- ============================================================================
    -- 4. 100 Orders dalam 1 Minggu Terakhir
    -- ============================================================================
    FOR i IN 1..100 LOOP
        -- Distribusi tanggal: mundur 0 sampai 6 hari, jam antara 08:00 - 21:00, menit acak
        order_date := NOW() - ((i % 7) || ' days')::interval - ((i * 3 % 14 + 8) || ' hours')::interval - ((i * 7 % 60) || ' minutes')::interval;

        INSERT INTO public.orders (order_number, customer_name, customer_phone, total_amount, status, payment_method, tenant_id, created_at, items)
        VALUES (
            'FJB-' || to_char(order_date, 'YYYYMMDD') || '-' || LPAD(i::text, 4, '0'),
            'Pelanggan ' || i,
            '0812' || LPAD((100000 + i * 1337)::text, 6, '0'),
            CASE 
                WHEN i % 3 = 0 THEN 37000 -- P1 (15k) + P4 (22k)
                WHEN i % 3 = 1 THEN 18000 -- P2 (18k)
                ELSE 25000 -- P5 (25k)
            END,
            'completed',
            CASE WHEN i % 2 = 0 THEN 'cash' ELSE 'qris' END,
            t_id,
            order_date,
            CASE 
                WHEN i % 3 = 0 THEN '[{"product_id":101,"name":"Jus Mangga Manis","price":15000,"quantity":1},{"product_id":104,"name":"Smoothie Strawberry","price":22000,"quantity":1}]'::jsonb
                WHEN i % 3 = 1 THEN '[{"product_id":102,"name":"Jus Alpukat Mentega","price":18000,"quantity":1}]'::jsonb
                ELSE '[{"product_id":105,"name":"Green Smoothie","price":25000,"quantity":1}]'::jsonb
            END
        );
    END LOOP;

    RAISE NOTICE '✅ Seed selesai! Tenant ID: %', t_id;
END $$;
