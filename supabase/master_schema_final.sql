-- ============================================================================
-- MASTER SCHEMA - KAREEM JUICE APPLICATION
-- ============================================================================
-- This script sets up the entire database schema, including:
-- 1. Tables (Products, Orders, Inventory, etc.)
-- 2. Relationships & Indexes
-- 3. Row Level Security (RLS) & Policies
-- 4. Analytics Views
-- 5. Automation Triggers (Inventory Deduction)
-- 6. Storage Buckets
-- 7. Realtime Configuration
-- ============================================================================

-- ============================================================================
-- 1. ENUMS & UTILITIES
-- ============================================================================

-- Cleanup potential problematic auth triggers (to prevent "database error saving new user")
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- auto-timezone for consistency
ALTER DATABASE postgres SET timezone TO 'Asia/Jakarta';

-- ============================================================================
-- 2. CORE TABLES (CATEGORIES & PRODUCTS)
-- ============================================================================

-- 2.1 Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Categories
INSERT INTO public.categories (name) VALUES 
('Jus Segar'), ('Smoothies'), ('Mocktails'), ('Tea Series'), ('Coffee Series')
ON CONFLICT (name) DO NOTHING;

-- 2.2 Products
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT PRIMARY KEY, -- ID from Frontend/Seed
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    stock_status BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. ORDERS & TRANSACTIONS
-- ============================================================================

-- 3.1 Orders
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

-- Fix: Add user_id if missing (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_id') THEN
        ALTER TABLE public.orders ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 3.2 Order Items (Relational)
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id),
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- RLS for Orders (Policies consolidated at the end of file for clarity)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;


-- RLS for Order Items (Policies consolidated at the end of file)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 4. INVENTORY SYSTEM
-- ============================================================================

-- 4.1 Raw Materials
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- e.g., 'gram', 'ml', 'pcs'
    minimum_stock INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON public.raw_materials(name);

-- 4.2 Material Movements (Ledger)
CREATE TABLE IF NOT EXISTS public.raw_material_movements (
    id BIGSERIAL PRIMARY KEY,
    raw_material_id BIGINT REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    movement_type TEXT CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL, -- Postive for IN, Negative for OUT
    reference_type TEXT CHECK (reference_type IN ('PURCHASE', 'SALE', 'STOCK_OPNAME', 'WASTE')),
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movements_material_id ON public.raw_material_movements(raw_material_id);

-- 4.3 Product Recipe (BOM)
CREATE TABLE IF NOT EXISTS public.product_raw_materials (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    raw_material_id BIGINT REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    quantity_used INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, raw_material_id)
);

-- ============================================================================
-- 5. VIEWS (ANALYTICS & STOCK)
-- ============================================================================

-- View: Current Stock Calculation
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

-- View: Product Performance
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

-- View: Summary KPIs
CREATE OR REPLACE VIEW view_analytics_summary AS
SELECT 
    COUNT(id) as total_orders,
    SUM(total_amount) as total_revenue,
    CASE WHEN COUNT(id) > 0 THEN SUM(total_amount) / COUNT(id) ELSE 0 END as overall_aov
FROM orders
WHERE status != 'cancelled';

-- View: Sales Time Analysis
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

-- View: Customer Insights
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

-- View: Product Matrix
CREATE OR REPLACE VIEW view_analytics_product_matrix AS
WITH product_stats AS (
    SELECT product_id, name, total_quantity, total_revenue
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

-- View: Forecast
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

-- ============================================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-deduct inventory on new order
CREATE OR REPLACE FUNCTION handle_new_order_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
        INSERT INTO public.raw_material_movements (raw_material_id, movement_type, quantity, reference_type, reference_id, notes)
        SELECT 
            prm.raw_material_id,
            'OUT',
            -1 * ( (item->>'quantity')::int * prm.quantity_used ),
            'SALE',
            NEW.order_number,
            'Auto-deduction for Order #' || NEW.order_number
        FROM 
            jsonb_array_elements(NEW.items) AS item
        JOIN 
            public.products p ON p.name = (item->>'name') 
            LEFT JOIN public.product_raw_materials prm ON prm.product_id = p.id
        WHERE 
            prm.id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON public.orders;
CREATE TRIGGER trg_auto_deduct_inventory
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION handle_new_order_inventory();

-- ============================================================================
-- 7. USER ROLES (Database-Driven Admin Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Helper function: returns TRUE if the current logged-in user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Seed: set admin@kareeemjuice.com as admin (safe to re-run)
DO $$
DECLARE
    admin_uid UUID;
BEGIN
    SELECT id INTO admin_uid FROM auth.users WHERE email = 'admin@kareeemjuice.com' LIMIT 1;
    IF admin_uid IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (admin_uid, 'admin')
        ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    END IF;
END $$;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) & POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_raw_materials ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to avoid conflicts
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename; 
    END LOOP; 
END $$;

-- User Roles: everyone can read own role, only admins can modify
CREATE POLICY "Read Own Role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin Manage Roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- Create Permissive Policies (Adjust as needed for production)
-- Categories & Products: Public Read, Admin Write (Simulated as public for now)
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Write Categories" ON public.categories FOR ALL USING (true);

CREATE POLICY "Public Read Products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public Write Products" ON public.products FOR ALL USING (true);

-- Orders: Role-based access
-- Customers: read own orders
CREATE POLICY "Customer Read Own Orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);

-- Customers: insert own orders
CREATE POLICY "Customer Insert Orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Customers: delete own orders ONLY if status = 'pending'
CREATE POLICY "Customer Delete Pending Orders" ON public.orders
    FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Admin: read all orders
CREATE POLICY "Admin Read All Orders" ON public.orders
    FOR SELECT USING (public.is_admin());

-- Admin: update order status
CREATE POLICY "Admin Update Orders" ON public.orders
    FOR UPDATE USING (public.is_admin());

-- Admin: insert orders (POS orders)
CREATE POLICY "Admin Insert Orders" ON public.orders
    FOR INSERT WITH CHECK (public.is_admin());

-- Admin: delete orders
CREATE POLICY "Admin Delete Orders" ON public.orders
    FOR DELETE USING (public.is_admin());

CREATE POLICY "Public Access Order Items" ON public.order_items FOR ALL USING (true);

-- Inventory: Public Read, Admin Write
CREATE POLICY "Public Read Inventory" ON public.raw_materials FOR SELECT USING (true);
CREATE POLICY "Public Write Inventory" ON public.raw_materials FOR ALL USING (true);

CREATE POLICY "Public Read Movements" ON public.raw_material_movements FOR SELECT USING (true);
CREATE POLICY "Public Write Movements" ON public.raw_material_movements FOR ALL USING (true);

CREATE POLICY "Public Read Recipes" ON public.product_raw_materials FOR SELECT USING (true);
CREATE POLICY "Public Write Recipes" ON public.product_raw_materials FOR ALL USING (true);

-- ============================================================================
-- 8. STORAGE
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Note: 'storage.objects' policies need to be dropped specifically if they exist
DROP POLICY IF EXISTS "Public Access Proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Proofs" ON storage.objects;

CREATE POLICY "Public Access Proofs" ON storage.objects FOR SELECT USING ( bucket_id = 'payment-proofs' );
CREATE POLICY "Public Upload Proofs" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'payment-proofs' );

-- ============================================================================
-- 9. STORE SETTINGS (Open/Close Toggle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.store_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_open BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Store Status" ON public.store_settings;
DROP POLICY IF EXISTS "Admin Update Store Status" ON public.store_settings;

CREATE POLICY "Public Read Store Status" ON public.store_settings
    FOR SELECT USING (true);

CREATE POLICY "Admin Update Store Status" ON public.store_settings
    FOR UPDATE USING (public.is_admin());

-- Insert initial row
INSERT INTO public.store_settings (id, is_open)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. REALTIME CONFIGURATION
-- ============================================================================

-- Enable Realtime for Orders (Critical for Notifications)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'store_settings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE store_settings;
    END IF;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
