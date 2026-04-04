-- ============================================================================
-- TENDAR SAAS - Migration for New Pricing Tiers
-- ============================================================================
-- Dropping the existing CHECK constraint on tenants.plan
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.tenants'::regclass
        AND contype = 'c'
    ) LOOP
        -- We drop all check constraints on tenants table and recreate just the plan one
        EXECUTE 'ALTER TABLE public.tenants DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END;
$$;

-- Migrate existing 'basic' rows to 'starter' before applying new constraint
UPDATE public.tenants SET plan = 'starter' WHERE plan = 'basic';

-- Add the new constraint
ALTER TABLE public.tenants
ADD CONSTRAINT tenants_plan_check 
CHECK (plan IN ('free', 'starter', 'business', 'pro'));

-- Note: In the future, we can add max_products, max_staff, etc., 
-- but for now they are managed via the PLAN_LIMITS configuration in the frontend codebase.
