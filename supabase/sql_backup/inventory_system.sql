-- ==========================================
-- 1. RAW MATERIALS MASTER TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.raw_materials (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- e.g., 'gram', 'ml', 'pcs'
    minimum_stock INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching materials
CREATE INDEX IF NOT EXISTS idx_raw_materials_name ON public.raw_materials(name);

-- ==========================================
-- 2. RAW MATERIAL MOVEMENTS (Ledger)
-- ==========================================
-- DROP TABLE to fix previous schema error if it exists
DROP TABLE IF EXISTS public.raw_material_movements CASCADE;

CREATE TABLE public.raw_material_movements (
    id BIGSERIAL PRIMARY KEY,
    raw_material_id BIGINT REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    movement_type TEXT CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL, -- Signed value: Positive for IN, Negative for OUT
    reference_type TEXT CHECK (reference_type IN ('PURCHASE', 'SALE', 'STOCK_OPNAME', 'WASTE')),
    reference_id TEXT, -- Can be Order ID, Purchase ID, or Audit ID
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_material_id ON public.raw_material_movements(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON public.raw_material_movements(created_at);

-- ==========================================
-- 3. PRODUCT RECIPES (BOM)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.product_raw_materials (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
    raw_material_id BIGINT REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    quantity_used INTEGER NOT NULL, -- Amount of raw material used per 1 unit of product
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, raw_material_id) -- Prevent duplicate ingredients for same product
);

-- ==========================================
-- 4. VIEW: CURRENT STOCK
-- ==========================================
DROP VIEW IF EXISTS view_raw_material_stock;

CREATE OR REPLACE VIEW view_raw_material_stock AS
SELECT 
    rm.id,
    rm.name,
    rm.unit,
    rm.minimum_stock,
    COALESCE(SUM(rmm.quantity), 0) as current_stock,
    CASE 
        WHEN COALESCE(SUM(rmm.quantity), 0) <= rm.minimum_stock THEN true 
        ELSE false 
    END as is_low_stock
FROM 
    public.raw_materials rm
LEFT JOIN 
    public.raw_material_movements rmm ON rm.id = rmm.raw_material_id
GROUP BY 
    rm.id, rm.name, rm.unit, rm.minimum_stock;

-- ==========================================
-- 5. FUNCTION & TRIGGER: AUTO DEDUCTION
-- ==========================================
CREATE OR REPLACE FUNCTION handle_new_order_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if items exist
    IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
        INSERT INTO public.raw_material_movements (raw_material_id, movement_type, quantity, reference_type, reference_id, notes)
        SELECT 
            prm.raw_material_id,
            'OUT',
            -1 * ( (item->>'quantity')::int * prm.quantity_used ), -- Negative quantity
            'SALE',
            NEW.order_number, -- Use Order Number as reference
            'Auto-deduction for Order #' || NEW.order_number
        FROM 
            jsonb_array_elements(NEW.items) AS item
        JOIN 
            public.products p ON p.name = (item->>'name') -- Fallback to name match if ID missing
            -- Ideally use product_id from item JSON if reliable
            LEFT JOIN public.product_raw_materials prm ON prm.product_id = p.id
        WHERE 
            prm.id IS NOT NULL; -- Only insert if recipe exists
            
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON public.orders;
CREATE TRIGGER trg_auto_deduct_inventory
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION handle_new_order_inventory();

-- Enable RLS
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_raw_materials ENABLE ROW LEVEL SECURITY;

-- Simple Policies 
CREATE POLICY "Enable read access for all users" ON public.raw_materials FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.raw_materials FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON public.raw_material_movements FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.raw_material_movements FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON public.product_raw_materials FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.product_raw_materials FOR ALL USING (true);

-- ==========================================
-- 6. SEED DATA (FOR TESTING)
-- ==========================================
-- Insert Raw Materials
INSERT INTO public.raw_materials (name, unit, minimum_stock) VALUES
('Susu UHT', 'ml', 1000),
('Gula Pasir', 'gram', 500),
('Es Batu', 'balk', 5),
('Cup 16oz', 'pcs', 50)
ON CONFLICT DO NOTHING;

-- Initial Stock (via movements)
INSERT INTO public.raw_material_movements (raw_material_id, movement_type, quantity, reference_type, notes)
SELECT id, 'IN', 10000, 'PURCHASE', 'Initial Stock' FROM public.raw_materials WHERE name = 'Susu UHT'
UNION ALL
SELECT id, 'IN', 5000, 'PURCHASE', 'Initial Stock' FROM public.raw_materials WHERE name = 'Gula Pasir'
UNION ALL
SELECT id, 'IN', 100, 'PURCHASE', 'Initial Stock' FROM public.raw_materials WHERE name = 'Es Batu'
UNION ALL
SELECT id, 'IN', 500, 'PURCHASE', 'Initial Stock' FROM public.raw_materials WHERE name = 'Cup 16oz';

-- Link Products to Materials (Recipe)
-- Assuming we have a product 'Milkshake Strawberry'. We need its ID.
-- This part is tricky without knowing exact Product IDs. 
-- Users will have to set this up via UI.
