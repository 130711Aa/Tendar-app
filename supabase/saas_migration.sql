-- ============================================================================
-- TENDAR SAAS - PHASE 1: MULTI-TENANT SCHEMA MIGRATION
-- ============================================================================
-- Platform: Tendar
-- Description: Transforms the single-tenant Kareem Juice app into a
--              multi-tenant SaaS platform. Run this in Supabase SQL Editor.
-- Safe to re-run: Uses IF NOT EXISTS, ON CONFLICT, and DO blocks.
-- ============================================================================

-- ============================================================================
-- PREREQUISITE CHECK
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        RAISE EXCEPTION 'Prerequisite missing: Base tables (e.g., public.categories) do not exist. Please run master_schema_final.sql BEFORE running this migration.';
    END IF;
END $$;


-- ============================================================================
-- STEP 1: TENANTS TABLE (Core of multi-tenancy)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,                       -- Display name, e.g. "Kareem Juice"
    slug        TEXT NOT NULL UNIQUE,                -- URL-safe identifier, e.g. "kareem-juice"
    owner_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    logo_url    TEXT,
    whatsapp    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants(owner_id);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 2: SEED FIRST TENANT (Kareem Juice)
-- The existing data in the database belongs to this tenant.
-- ============================================================================

DO $$
DECLARE
    v_owner_uid UUID;
    v_tenant_id UUID;
BEGIN
    -- Find the existing admin user
    SELECT id INTO v_owner_uid FROM auth.users WHERE email = 'admin@kareeemjuice.com' LIMIT 1;

    -- Create Kareem Juice as the first tenant
    INSERT INTO public.tenants (name, slug, owner_id, plan)
    VALUES ('Kareem Juice', 'kareem-juice', v_owner_uid, 'pro')
    ON CONFLICT (slug) DO NOTHING;

    -- Store tenant_id for later use in seeding
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'kareem-juice';
    RAISE NOTICE 'Kareem Juice tenant_id: %', v_tenant_id;
END $$;


-- ============================================================================
-- STEP 3: ADD tenant_id COLUMN TO ALL TABLES
-- Adds the column and backfills existing data with the first tenant's ID.
-- ============================================================================

-- Helper: add tenant_id to a table if it doesn't exist and backfill
DO $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'kareem-juice';

    -- categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.categories ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.categories SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.products ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.products SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.orders ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.orders SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- order_items
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.order_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.order_items SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- raw_materials
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_materials' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.raw_materials ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.raw_materials SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- raw_material_movements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raw_material_movements' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.raw_material_movements ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.raw_material_movements SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- product_raw_materials
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_raw_materials' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.product_raw_materials ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.product_raw_materials SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
    END IF;

    -- store_settings: Now supports multiple tenants, remove single-row constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_settings' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS single_row;
        ALTER TABLE public.store_settings ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.store_settings ALTER COLUMN id TYPE UUID USING gen_random_uuid();
        ALTER TABLE public.store_settings ALTER COLUMN id SET DEFAULT gen_random_uuid();
        ALTER TABLE public.store_settings ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.store_settings SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_store_settings_tenant ON public.store_settings(tenant_id);
    END IF;

    -- user_roles: user can be admin of multiple tenants
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
        ALTER TABLE public.user_roles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
        UPDATE public.user_roles SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
        -- New unique constraint: one role per user per tenant
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_tenant_unique UNIQUE (user_id, tenant_id);
    END IF;
END $$;

-- Indexes for tenant_id (performance)
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id    ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id      ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id        ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_id   ON public.order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_tenant_id ON public.raw_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id    ON public.user_roles(tenant_id);


-- ============================================================================
-- STEP 4: HELPER FUNCTIONS
-- ============================================================================

-- Get tenant_id from slug (used by frontend via .env VITE_TENANT_SLUG)
CREATE OR REPLACE FUNCTION public.get_tenant_id_by_slug(p_slug TEXT)
RETURNS UUID AS $$
    SELECT id FROM public.tenants WHERE slug = p_slug AND is_active = true LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check if current user is admin of a specific tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = p_tenant_id
          AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Keep backward-compat is_admin() — checks if user is admin of ANY tenant they own
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ============================================================================
-- STEP 5: UPDATE RLS POLICIES (Tenant-Isolated)
-- ============================================================================

-- Drop all existing policies first
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
    END LOOP;
END $$;

-- TENANTS table
-- Public: anyone can look up an active tenant by slug (name, id, slug are public info)
CREATE POLICY "Public read active tenants"   ON public.tenants FOR SELECT USING (is_active = true);
-- Owners can also read their own tenant (even if inactive)
CREATE POLICY "Owners can read own tenant"   ON public.tenants FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Owners can update own tenant" ON public.tenants FOR UPDATE USING (owner_id = auth.uid());

-- CATEGORIES
CREATE POLICY "Public read categories"  ON public.categories FOR SELECT USING (true);
CREATE POLICY "Tenant admin write categories" ON public.categories
    FOR ALL USING (public.is_tenant_admin(tenant_id));

-- PRODUCTS
CREATE POLICY "Public read products"  ON public.products FOR SELECT USING (true);
CREATE POLICY "Tenant admin write products" ON public.products
    FOR ALL USING (public.is_tenant_admin(tenant_id));

-- ORDERS: customers see own, tenant admins see all within tenant
CREATE POLICY "Customer read own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Customer insert orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Customer delete pending orders" ON public.orders
    FOR DELETE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Tenant admin read all orders" ON public.orders
    FOR SELECT USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Tenant admin update orders" ON public.orders
    FOR UPDATE USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Tenant admin insert orders (POS)" ON public.orders
    FOR INSERT WITH CHECK (public.is_tenant_admin(tenant_id));
CREATE POLICY "Tenant admin delete orders" ON public.orders
    FOR DELETE USING (public.is_tenant_admin(tenant_id));

-- ORDER ITEMS
CREATE POLICY "Public access order items" ON public.order_items FOR ALL USING (true);

-- INVENTORY
CREATE POLICY "Public read inventory"         ON public.raw_materials FOR SELECT USING (true);
CREATE POLICY "Tenant admin write inventory"  ON public.raw_materials
    FOR ALL USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Public read movements"         ON public.raw_material_movements FOR SELECT USING (true);
CREATE POLICY "Tenant admin write movements"  ON public.raw_material_movements
    FOR ALL USING (public.is_tenant_admin(tenant_id));
CREATE POLICY "Public read recipes"           ON public.product_raw_materials FOR SELECT USING (true);
CREATE POLICY "Tenant admin write recipes"    ON public.product_raw_materials
    FOR ALL USING (public.is_tenant_admin(tenant_id));

-- STORE SETTINGS
CREATE POLICY "Public read store status"        ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Tenant admin update store status" ON public.store_settings
    FOR UPDATE USING (public.is_tenant_admin(tenant_id));

-- USER ROLES
CREATE POLICY "Read own role"           ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Tenant admin manage roles" ON public.user_roles
    FOR ALL USING (public.is_tenant_admin(tenant_id));


-- ============================================================================
-- STEP 6: UPDATE ANALYTICS VIEWS (Tenant-Scoped)
-- ============================================================================

-- Drop existing views first (required because column structure changes)
DROP VIEW IF EXISTS view_analytics_product_matrix CASCADE;
DROP VIEW IF EXISTS view_analytics_forecast CASCADE;
DROP VIEW IF EXISTS view_analytics_product_performance CASCADE;
DROP VIEW IF EXISTS view_analytics_summary CASCADE;
DROP VIEW IF EXISTS view_analytics_sales_time CASCADE;
DROP VIEW IF EXISTS view_analytics_customer_insights CASCADE;
DROP VIEW IF EXISTS view_raw_material_stock CASCADE;

-- Product Performance (per tenant)
CREATE VIEW view_analytics_product_performance AS
SELECT
    o.tenant_id,
    oi.product_id,
    oi.name,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.price * oi.quantity) as total_revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY o.tenant_id, oi.product_id, oi.name;

-- Summary KPIs (per tenant)
CREATE VIEW view_analytics_summary AS
SELECT
    tenant_id,
    COUNT(id) as total_orders,
    SUM(total_amount) as total_revenue,
    CASE WHEN COUNT(id) > 0 THEN SUM(total_amount) / COUNT(id) ELSE 0 END as overall_aov
FROM orders
WHERE status != 'cancelled'
GROUP BY tenant_id;

-- Sales Time Analysis (per tenant)
CREATE VIEW view_analytics_sales_time AS
SELECT
    tenant_id,
    TO_CHAR(created_at, 'Day') as day_name,
    EXTRACT(ISODOW FROM created_at) as day_of_week,
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    COUNT(id) as total_transactions,
    SUM(total_amount) as total_revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY tenant_id, day_name, day_of_week, hour_of_day
ORDER BY day_of_week, hour_of_day;

-- Customer Insights (per tenant)
CREATE VIEW view_analytics_customer_insights AS
SELECT
    tenant_id,
    customer_phone,
    MAX(customer_name) as customer_name,
    COUNT(id) as total_transactions,
    SUM(total_amount) as total_spent,
    MAX(created_at) as last_order_date,
    CASE WHEN COUNT(id) > 1 THEN 'Returning' ELSE 'New' END as customer_type
FROM orders
WHERE status != 'cancelled' AND customer_phone IS NOT NULL AND customer_phone != ''
GROUP BY tenant_id, customer_phone;

-- Stock View (per tenant)
CREATE OR REPLACE VIEW view_raw_material_stock AS
SELECT
    rm.tenant_id,
    rm.id,
    rm.name,
    rm.unit,
    rm.minimum_stock,
    COALESCE(SUM(rmm.quantity), 0) as current_stock,
    CASE WHEN COALESCE(SUM(rmm.quantity), 0) <= rm.minimum_stock THEN true ELSE false END as is_low_stock
FROM public.raw_materials rm
LEFT JOIN public.raw_material_movements rmm ON rm.id = rmm.raw_material_id
GROUP BY rm.tenant_id, rm.id, rm.name, rm.unit, rm.minimum_stock;


-- ============================================================================
-- STEP 7: UPDATE INVENTORY TRIGGER (Tenant-Aware)
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_order_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
        INSERT INTO public.raw_material_movements
            (raw_material_id, tenant_id, movement_type, quantity, reference_type, reference_id, notes)
        SELECT
            prm.raw_material_id,
            NEW.tenant_id,
            'OUT',
            -1 * ((item->>'quantity')::int * prm.quantity_used),
            'SALE',
            NEW.order_number,
            'Auto-deduction for Order #' || NEW.order_number
        FROM jsonb_array_elements(NEW.items) AS item
        JOIN public.products p
            ON p.name = (item->>'name') AND p.tenant_id = NEW.tenant_id
        LEFT JOIN public.product_raw_materials prm ON prm.product_id = p.id
        WHERE prm.id IS NOT NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON public.orders;
CREATE TRIGGER trg_auto_deduct_inventory
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION handle_new_order_inventory();


-- ============================================================================
-- STEP 8: TENANT REGISTRATION RPC (for Phase 2 Onboarding UI)
-- Called by frontend after user signs up. Creates tenant + sets admin role.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_new_tenant(
    p_name TEXT,
    p_slug TEXT
) RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Must be authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Validate slug characters (only lowercase letters, numbers, hyphens)
    IF p_slug !~ '^[a-z0-9-]+$' THEN
        RAISE EXCEPTION 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).';
    END IF;

    -- Validate slug uniqueness
    IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = p_slug) THEN
        RAISE EXCEPTION 'Slug "%" sudah digunakan, coba yang lain.', p_slug;
    END IF;

    -- 1. Create the tenant
    INSERT INTO public.tenants (name, slug, owner_id, plan)
    VALUES (p_name, p_slug, auth.uid(), 'free')
    RETURNING id INTO v_tenant_id;

    -- 2. Create default store_settings for this tenant
    INSERT INTO public.store_settings (tenant_id, is_open)
    VALUES (v_tenant_id, true);

    -- 3. Grant the registering user admin role for this tenant
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (auth.uid(), v_tenant_id, 'admin')
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin';

    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant anon/authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.register_new_tenant(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- DONE - TENDAR MULTI-TENANT SCHEMA IS NOW ACTIVE
-- ============================================================================
