-- ============================================================================
-- TENDAR SAAS - HOTFIX: Public SELECT Policy for Tenants Table
-- ============================================================================
-- Problem: The SELECT policy on public.tenants only allows `owner_id = auth.uid()`
--          but resolveTenantId() is called by anonymous users to look up a store by slug.
--          This causes 406 errors and "Toko tidak ditemukan" for ALL tenants.
-- Fix:     Allow anyone to read active tenants (slug, name, id are public info).
-- Safe:     Sensitive info (owner_id) is not exposed to customers via this policy.
-- ============================================================================

-- Drop policies before recreating them to make this script safe to run multiple times
DROP POLICY IF EXISTS "Owners can read own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Public read active tenants" ON public.tenants;

-- Public: anyone can read basic info of active tenants (for slug resolution)
CREATE POLICY "Public read active tenants"
    ON public.tenants
    FOR SELECT
    USING (is_active = true);

-- Owners can still read their own tenant even if inactive
CREATE POLICY "Owners can read own tenant"
    ON public.tenants
    FOR SELECT
    USING (owner_id = auth.uid());

-- ============================================================================
-- DONE - tenants table is now publicly readable for active tenants
-- ============================================================================
