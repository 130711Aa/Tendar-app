-- ============================================================================
-- AUTO-PROVISIONING TENANT VIA AUTH TRIGGER
-- ============================================================================
-- Description: Creates a tenant automatically when a user signs up.
-- This bypasses the need for the user to be fully logged in (e.g. if Email Confirmation is ON).

CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS trigger AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Only run if the user passed tenant data during sign up
    IF NEW.raw_user_meta_data->>'tenant_slug' IS NOT NULL THEN
        
        -- Create the tenant
        INSERT INTO public.tenants (name, slug, owner_id, plan)
        VALUES (
            NEW.raw_user_meta_data->>'tenant_name',
            NEW.raw_user_meta_data->>'tenant_slug',
            NEW.id,
            'free'
        )
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO v_tenant_id;

        IF v_tenant_id IS NOT NULL THEN
            -- Assign admin role
            INSERT INTO public.user_roles (user_id, tenant_id, role)
            VALUES (NEW.id, v_tenant_id, 'admin')
            ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin';
            
            -- Create store settings
            INSERT INTO public.store_settings (tenant_id, is_open)
            VALUES (v_tenant_id, true)
            ON CONFLICT (tenant_id) DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_tenant ON auth.users;
CREATE TRIGGER on_auth_user_created_tenant
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_tenant();
