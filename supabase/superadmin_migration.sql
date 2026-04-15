-- ============================================================================
-- SUPER ADMIN MIGRATION — Tendar Platform
-- Run in Supabase SQL Editor (production)
-- ============================================================================
-- IMPORTANT: Create user admin@tendarapp.com in Supabase Auth FIRST
-- before running this migration.
-- ============================================================================

-- ============================================================
-- 1. Expand role CHECK constraint to include 'superadmin'
-- ============================================================
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
  CHECK (role IN ('admin', 'customer', 'staff', 'superadmin'));

-- ============================================================
-- 2. Helper function: is_superadmin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- 3. Seed superadmin role for admin@tendarapp.com
--    Uses tenant_id = NULL (global scope)
-- ============================================================
DO $$
DECLARE
    sa_uid UUID;
BEGIN
    SELECT id INTO sa_uid FROM auth.users WHERE email = 'admin@tendarapp.com' LIMIT 1;
    IF sa_uid IS NOT NULL THEN
        -- Delete any existing superadmin row for this user (NULL tenant_id won't match ON CONFLICT)
        DELETE FROM public.user_roles WHERE user_id = sa_uid AND role = 'superadmin';
        -- Also delete any NULL tenant_id row for this user
        DELETE FROM public.user_roles WHERE user_id = sa_uid AND tenant_id IS NULL;
        -- Insert fresh
        INSERT INTO public.user_roles (user_id, role, tenant_id)
        VALUES (sa_uid, 'superadmin', NULL);
        RAISE NOTICE 'Superadmin role assigned to admin@tendarapp.com (uid: %)', sa_uid;
    ELSE
        RAISE WARNING 'User admin@tendarapp.com not found in auth.users. Create this user first.';
    END IF;
END $$;

-- ============================================================
-- 4. RLS Bypass Policies for superadmin
-- ============================================================

-- Tenants: superadmin can read ALL tenants (even inactive)
CREATE POLICY "Superadmin read all tenants" ON public.tenants
    FOR SELECT USING (public.is_superadmin());
CREATE POLICY "Superadmin update all tenants" ON public.tenants
    FOR UPDATE USING (public.is_superadmin());

-- Invoices: superadmin can read + update all
CREATE POLICY "Superadmin all invoices" ON public.invoices
    FOR ALL USING (public.is_superadmin());

-- Payments: superadmin can read + update all
CREATE POLICY "Superadmin all payments" ON public.payments
    FOR ALL USING (public.is_superadmin());

-- Payment audit logs: superadmin can read + insert
CREATE POLICY "Superadmin all audit logs" ON public.payment_audit_logs
    FOR ALL USING (public.is_superadmin());

-- User roles: superadmin can read all roles (to see merchant owners)
CREATE POLICY "Superadmin read all roles" ON public.user_roles
    FOR SELECT USING (public.is_superadmin());

-- Orders: superadmin can read all orders (for stats)
CREATE POLICY "Superadmin read all orders" ON public.orders
    FOR SELECT USING (public.is_superadmin());

-- ============================================================
-- 5. RPC: approve_payment
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_payment(
    p_payment_id UUID,
    p_invoice_id UUID,
    p_tenant_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_new_expiry TIMESTAMPTZ;
    v_current_expiry TIMESTAMPTZ;
BEGIN
    -- Auth check
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Unauthorized: superadmin only';
    END IF;

    -- Get invoice
    SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

    -- Update payment → valid
    UPDATE public.payments
    SET status = 'valid', rejection_reason = NULL
    WHERE id = p_payment_id;

    -- Update invoice → paid
    UPDATE public.invoices
    SET status = 'paid'
    WHERE id = p_invoice_id;

    -- Calculate new expiry: extend from current expiry or from now
    SELECT plan_expires_at INTO v_current_expiry 
    FROM public.tenants WHERE id = p_tenant_id;
    
    IF v_current_expiry IS NOT NULL AND v_current_expiry > NOW() THEN
        v_new_expiry := v_current_expiry + INTERVAL '30 days';
    ELSE
        v_new_expiry := NOW() + INTERVAL '30 days';
    END IF;

    -- Update tenant plan
    UPDATE public.tenants
    SET plan = v_invoice.plan_id,
        plan_expires_at = v_new_expiry,
        is_active = true
    WHERE id = p_tenant_id;

    -- Audit log
    INSERT INTO public.payment_audit_logs (entity, entity_id, action, payload)
    VALUES ('payment', p_payment_id, 'superadmin_approved', jsonb_build_object(
        'invoice_id', p_invoice_id,
        'tenant_id', p_tenant_id,
        'plan', v_invoice.plan_id,
        'new_expiry', v_new_expiry,
        'approved_by', auth.uid()
    ));

    RETURN jsonb_build_object('success', true, 'new_expiry', v_new_expiry);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. RPC: reject_payment
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_payment(
    p_payment_id UUID,
    p_reason TEXT
) RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Unauthorized: superadmin only';
    END IF;

    UPDATE public.payments
    SET status = 'rejected', rejection_reason = p_reason
    WHERE id = p_payment_id;

    INSERT INTO public.payment_audit_logs (entity, entity_id, action, payload)
    VALUES ('payment', p_payment_id, 'superadmin_rejected', jsonb_build_object(
        'reason', p_reason,
        'rejected_by', auth.uid()
    ));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. RPC: override_tenant_plan
-- ============================================================
CREATE OR REPLACE FUNCTION public.override_tenant_plan(
    p_tenant_id UUID,
    p_plan TEXT,
    p_days INTEGER,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_new_expiry TIMESTAMPTZ;
    v_current_expiry TIMESTAMPTZ;
BEGIN
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Unauthorized: superadmin only';
    END IF;

    -- Validate plan
    IF p_plan NOT IN ('free', 'starter', 'business', 'pro') THEN
        RAISE EXCEPTION 'Invalid plan: %', p_plan;
    END IF;

    -- Calculate expiry
    SELECT plan_expires_at INTO v_current_expiry
    FROM public.tenants WHERE id = p_tenant_id;

    IF p_plan = 'free' THEN
        v_new_expiry := NULL;
    ELSIF v_current_expiry IS NOT NULL AND v_current_expiry > NOW() THEN
        v_new_expiry := v_current_expiry + (p_days || ' days')::INTERVAL;
    ELSE
        v_new_expiry := NOW() + (p_days || ' days')::INTERVAL;
    END IF;

    UPDATE public.tenants
    SET plan = p_plan,
        plan_expires_at = v_new_expiry
    WHERE id = p_tenant_id;

    INSERT INTO public.payment_audit_logs (entity, entity_id, action, payload)
    VALUES ('subscription', p_tenant_id, 'superadmin_override', jsonb_build_object(
        'plan', p_plan,
        'days', p_days,
        'new_expiry', v_new_expiry,
        'reason', p_reason,
        'overridden_by', auth.uid()
    ));

    RETURN jsonb_build_object('success', true, 'new_expiry', v_new_expiry);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. RPC: suspend_tenant
-- ============================================================
CREATE OR REPLACE FUNCTION public.suspend_tenant(
    p_tenant_id UUID,
    p_suspend BOOLEAN
) RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Unauthorized: superadmin only';
    END IF;

    UPDATE public.tenants
    SET is_active = NOT p_suspend
    WHERE id = p_tenant_id;

    INSERT INTO public.payment_audit_logs (entity, entity_id, action, payload)
    VALUES ('subscription', p_tenant_id, 
        CASE WHEN p_suspend THEN 'superadmin_suspended' ELSE 'superadmin_reactivated' END,
        jsonb_build_object('by', auth.uid())
    );

    RETURN jsonb_build_object('success', true, 'is_active', NOT p_suspend);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. RPC: get_superadmin_stats (dashboard metrics)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_superadmin_stats()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Unauthorized: superadmin only';
    END IF;

    SELECT jsonb_build_object(
        'total_revenue_this_month', COALESCE((
            SELECT SUM(i.total_amount) FROM invoices i
            WHERE i.status = 'paid'
            AND i.created_at >= date_trunc('month', NOW())
        ), 0),
        'total_merchants', (SELECT COUNT(*) FROM tenants),
        'active_merchants', (SELECT COUNT(*) FROM tenants WHERE is_active = true),
        'review_queue', (SELECT COUNT(*) FROM payments WHERE status = 'review_needed'),
        'new_merchants_this_month', (
            SELECT COUNT(*) FROM tenants
            WHERE created_at >= date_trunc('month', NOW())
        ),
        'total_revenue_all_time', COALESCE((
            SELECT SUM(i.total_amount) FROM invoices i WHERE i.status = 'paid'
        ), 0)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. RPC: get_monthly_growth (for chart)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_monthly_growth()
RETURNS JSONB AS $$
BEGIN
    IF NOT public.is_superadmin() THEN
        RAISE EXCEPTION 'Unauthorized: superadmin only';
    END IF;

    RETURN (
        SELECT jsonb_agg(row_to_json(t))
        FROM (
            SELECT
                TO_CHAR(date_trunc('month', created_at), 'Mon YYYY') as month,
                COUNT(*) as new_merchants,
                EXTRACT(MONTH FROM created_at) as month_num,
                EXTRACT(YEAR FROM created_at) as year_num
            FROM tenants
            WHERE created_at >= NOW() - INTERVAL '12 months'
            GROUP BY date_trunc('month', created_at), month_num, year_num
            ORDER BY year_num, month_num
        ) t
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Grant execute to authenticated users (RPC checks role internally)
-- ============================================================
GRANT EXECUTE ON FUNCTION public.approve_payment(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.override_tenant_plan(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_tenant(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_superadmin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_growth() TO authenticated;

-- ============================================================
-- DONE
-- ============================================================
