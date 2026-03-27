-- ============================================================================
-- HOTFIX: Convert products.id to BIGSERIAL (auto-increment)
-- ============================================================================
-- CONTEXT:
--   The original master_schema_final.sql defined products.id as plain BIGINT,
--   requiring the frontend to supply the ID (id: Date.now()).
--   After the SaaS migration, Supabase inserts now return data via .select(),
--   so we need the DB to auto-generate the ID instead.
--
-- SAFE TO RUN: Uses sequence creation with IF NOT EXISTS-style check.
-- ============================================================================

-- 1. Create a sequence for products.id (if it doesn't already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'products_id_seq') THEN
        CREATE SEQUENCE public.products_id_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;
    END IF;
END $$;

-- 2. Set the sequence owner to products.id
ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;

-- 3. Set the default value of products.id to the sequence
ALTER TABLE public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq');

-- 4. Advance the sequence past any existing IDs to avoid conflicts
SELECT setval('public.products_id_seq', COALESCE((SELECT MAX(id) FROM public.products), 0) + 1, false);

-- ============================================================================
-- DONE: products.id now auto-increments. Frontend no longer needs to send id.
-- ============================================================================
