-- ============================================================================
-- SQL: ADD 'STAFF' ROLE AND UPDATE POLICIES 
-- ============================================================================

-- 1. Modify CHECK constraint on user_roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'customer', 'staff'));

-- 2. Create helper function for staff
CREATE OR REPLACE FUNCTION public.is_tenant_staff(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND tenant_id = p_tenant_id
          AND role = 'staff'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Update existing policies where staff needs access

-- ORDERS
-- Tenant staff read all orders
CREATE POLICY "Tenant staff read all orders" ON public.orders
    FOR SELECT USING (public.is_tenant_staff(tenant_id));
-- Tenant staff update orders (status modification)
CREATE POLICY "Tenant staff update orders" ON public.orders
    FOR UPDATE USING (public.is_tenant_staff(tenant_id));
-- Tenant staff insert orders (POS)
CREATE POLICY "Tenant staff insert orders (POS)" ON public.orders
    FOR INSERT WITH CHECK (public.is_tenant_staff(tenant_id));

-- PRODUCTS (Update stock status)
CREATE POLICY "Tenant staff update products" ON public.products
    FOR UPDATE USING (public.is_tenant_staff(tenant_id));

-- INVENTORY
CREATE POLICY "Tenant staff write inventory"  ON public.raw_materials
    FOR ALL USING (public.is_tenant_staff(tenant_id));
CREATE POLICY "Tenant staff write movements"  ON public.raw_material_movements
    FOR ALL USING (public.is_tenant_staff(tenant_id));
CREATE POLICY "Tenant staff write recipes"    ON public.product_raw_materials
    FOR ALL USING (public.is_tenant_staff(tenant_id));

-- Note: user_roles modification or billing modifications are NOT granted to staff.
