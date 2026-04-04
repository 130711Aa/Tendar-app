-- Remove the global unique constraint on the name column
ALTER TABLE public.categories 
    DROP CONSTRAINT IF EXISTS categories_name_key;

-- Add a new composite unique constraint scoped to the tenant
ALTER TABLE public.categories 
    ADD CONSTRAINT categories_tenant_id_name_key UNIQUE (tenant_id, name);
