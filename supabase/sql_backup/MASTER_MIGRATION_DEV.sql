-- ============================================================================
-- MASTER MIGRATION SCRIPT FOR KAREEM JUICE (COMPLETE VERSION)
-- ============================================================================

-- ============================================================================
-- 1. CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.categories (name) VALUES 
('Jus Segar'), ('Smoothies'), ('Mocktails'), ('Tea Series'), ('Coffee Series')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create categories" ON public.categories;
CREATE POLICY "Anyone can create categories" ON public.categories FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete categories" ON public.categories;
CREATE POLICY "Anyone can delete categories" ON public.categories FOR DELETE USING (true);


-- ============================================================================
-- 2. PRODUCTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    stock_status BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Products" ON public.products;
CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin Write Products" ON public.products;
CREATE POLICY "Admin Write Products" ON public.products FOR ALL USING (true);


-- ============================================================================
-- 3. ORDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    total_amount INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_proof TEXT,
    payment_proof_path TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
CREATE POLICY "Anyone can read orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;
CREATE POLICY "Anyone can delete orders" ON public.orders FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);


-- ============================================================================
-- 4. ORDER ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id),
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Create Order Items" ON public.order_items;
CREATE POLICY "Public Create Order Items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Order Items" ON public.order_items;
CREATE POLICY "Public Read Order Items" ON public.order_items FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);


-- ============================================================================
-- 5. STOCK/INVENTORY SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    minimum_stock INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON public.raw_materials(name);

CREATE TABLE IF NOT EXISTS public.raw_material_movements (
    id BIGSERIAL PRIMARY KEY,
    raw_material_id BIGINT REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    movement_type TEXT CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL,
    reference_type TEXT CHECK (reference_type IN ('PURCHASE', 'SALE', 'STOCK_OPNAME', 'WASTE')),
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movements_material_id ON public.raw_material_movements(raw_material_id);

CREATE TABLE IF NOT EXISTS public.product_raw_materials (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    raw_material_id BIGINT REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    quantity_used INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, raw_material_id)
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_raw_materials ENABLE ROW LEVEL SECURITY;


-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read access for all users" ON public.raw_materials;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.raw_materials;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.raw_material_movements;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.raw_material_movements;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_raw_materials;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.product_raw_materials;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.raw_materials FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.raw_materials FOR ALL USING (true);
CREATE POLICY "Enable read access for all users" ON public.raw_material_movements FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.raw_material_movements FOR ALL USING (true);
CREATE POLICY "Enable read access for all users" ON public.product_raw_materials FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.product_raw_materials FOR ALL USING (true);


-- ============================================================================
-- 6. VIEWS (LENGKAP SEMUA 8 View)
-- ============================================================================

-- View 1: Current Stock
CREATE OR REPLACE VIEW view_raw_material_stock AS
SELECT 
    rm.id,
    rm.name,
    rm.unit,
    rm.minimum_stock,
    COALESCE(SUM(rmm.quantity), 0) as current_stock,
    CASE WHEN COALESCE(SUM(rmm.quantity), 0) <= rm.minimum_stock THEN true ELSE false END as is_low_stock
FROM public.raw_materials rm
LEFT JOIN public.raw_material_movements rmm ON rm.id = rmm.raw_material_id
GROUP BY rm.id, rm.name, rm.unit, rm.minimum_stock;

-- View 2: Product Performance
CREATE OR REPLACE VIEW view_analytics_product_performance AS
SELECT 
    oi.product_id,
    oi.name,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.price * oi.quantity) as total_revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY oi.product_id, oi.name;

-- View 3: Summary KPIs
CREATE OR REPLACE VIEW view_analytics_summary AS
SELECT 
    COUNT(id) as total_orders,
    SUM(total_amount) as total_revenue,
    CASE WHEN COUNT(id) > 0 THEN SUM(total_amount) / COUNT(id) ELSE 0 END as overall_aov
FROM orders
WHERE status != 'cancelled';

-- View 4: Sales Time Analysis
CREATE OR REPLACE VIEW view_analytics_sales_time AS
SELECT 
    TO_CHAR(created_at, 'Day') as day_name,
    EXTRACT(ISODOW FROM created_at) as day_of_week, 
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    COUNT(id) as total_transactions,
    SUM(total_amount) as total_revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY day_name, day_of_week, hour_of_day
ORDER BY day_of_week, hour_of_day;

-- View 5: Customer Insights (MISSING in previous file)
CREATE OR REPLACE VIEW view_analytics_customer_insights AS
SELECT 
    customer_phone,
    MAX(customer_name) as customer_name, 
    COUNT(id) as total_transactions,
    SUM(total_amount) as total_spent,
    MAX(created_at) as last_order_date,
    CASE WHEN COUNT(id) > 1 THEN 'Returning' ELSE 'New' END as customer_type
FROM orders
WHERE status != 'cancelled' AND customer_phone IS NOT NULL AND customer_phone != ''
GROUP BY customer_phone;

-- View 6: Product Matrix / BCG Matrix (MISSING in previous file)
CREATE OR REPLACE VIEW view_analytics_product_matrix AS
WITH product_stats AS (
    SELECT 
        product_id, name, total_quantity, total_revenue
    FROM view_analytics_product_performance
),
averages AS (
    SELECT AVG(total_quantity) as avg_qty, AVG(total_revenue) as avg_rev
    FROM product_stats
)
SELECT 
    p.product_id, p.name, p.total_quantity, p.total_revenue,
    CASE 
        WHEN p.total_quantity >= a.avg_qty AND p.total_revenue >= a.avg_rev THEN 'Star'
        WHEN p.total_quantity >= a.avg_qty AND p.total_revenue < a.avg_rev THEN 'Cash Cow'
        WHEN p.total_quantity < a.avg_qty AND p.total_revenue >= a.avg_rev THEN 'Premium'
        ELSE 'Dead Weight'
    END as classification
FROM product_stats p, averages a;

-- View 7: Forecast (MISSING in previous file)
CREATE OR REPLACE VIEW view_analytics_forecast AS
WITH daily_sales AS (
    SELECT DATE(created_at) as sale_date, SUM(total_amount) as daily_rev, COUNT(id) as daily_tx
    FROM orders WHERE status != 'cancelled' GROUP BY DATE(created_at)
)
SELECT 
    'Moving Average (7 Days)' as metric,
    AVG(daily_rev) as predicted_revenue_tomorrow,
    AVG(daily_tx) as predicted_transactions_tomorrow
FROM (SELECT daily_rev, daily_tx FROM daily_sales ORDER BY sale_date DESC LIMIT 7) last_7_days;

-- View 8: Average Order Value Daily (Optional helper view)
CREATE OR REPLACE VIEW view_analytics_aov AS
SELECT 
    DATE(created_at) as order_date,
    COUNT(id) as total_orders,
    SUM(total_amount) as total_revenue,
    CASE WHEN COUNT(id) > 0 THEN SUM(total_amount) / COUNT(id) ELSE 0 END as avg_order_value
FROM orders WHERE status != 'cancelled' GROUP BY DATE(created_at);


-- ============================================================================
-- 7. STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'payment-proofs' );
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'payment-proofs' );
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'payment-proofs' );
