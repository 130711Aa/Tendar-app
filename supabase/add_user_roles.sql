-- ============================================================================
-- MIGRATION: Add User Roles (Database-Driven Admin Management)
-- ============================================================================
-- Run this in your Supabase SQL Editor to add role management.
-- Safe to re-run (uses IF NOT EXISTS and ON CONFLICT).
-- ============================================================================

-- 1. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 2. Helper function: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read Own Role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin Manage Roles" ON public.user_roles;

CREATE POLICY "Read Own Role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin Manage Roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- 4. Seed admin@kareeemjuice.com as admin
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

-- 5. Update Orders RLS policies to use is_admin()
DROP POLICY IF EXISTS "Admin Read All Orders" ON public.orders;
DROP POLICY IF EXISTS "Admin Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Admin Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Admin Delete Orders" ON public.orders;

CREATE POLICY "Admin Read All Orders" ON public.orders
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin Update Orders" ON public.orders
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin Insert Orders" ON public.orders
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin Delete Orders" ON public.orders
    FOR DELETE USING (public.is_admin());

-- 6. Update Store Settings RLS policy
DROP POLICY IF EXISTS "Admin Update Store Status" ON public.store_settings;

CREATE POLICY "Admin Update Store Status" ON public.store_settings
    FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- DONE! Admin role management is now database-driven.
-- To add a new admin, run:
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<USER_UUID>', 'admin')
--   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
-- ============================================================================
