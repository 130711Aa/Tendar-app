-- =============================================
-- MIGRATION: Products & Order Items
-- Copy-paste dan Run di Supabase SQL Editor
-- =============================================

-- 1. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT PRIMARY KEY, -- We use the ID from data.js
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    stock_status BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS for Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Public Read (Customer lihat menu)
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);

-- 4. Policy: Admin Write (Admin tambah/edit menu)
-- Note: Security is relaxed for now (true) as requested to get it working easily.
-- In production, you'd verify admin role.
DROP POLICY IF EXISTS "Admin Write Products" ON public.products;
CREATE POLICY "Admin Write Products" ON public.products FOR ALL USING (true);


-- 5. Create Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id),
    name TEXT NOT NULL, -- Snapshot of name at time of purchase
    price INTEGER NOT NULL, -- Snapshot of price at time of purchase
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable RLS for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 7. Policy: Public Access
DROP POLICY IF EXISTS "Public Create Order Items" ON public.order_items;
CREATE POLICY "Public Create Order Items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Order Items" ON public.order_items;
CREATE POLICY "Public Read Order Items" ON public.order_items FOR SELECT USING (true);

-- 8. Add Index
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
