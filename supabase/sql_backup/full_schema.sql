-- =======================================================
-- KAREEM JUICE - FULL DATABASE SETUP (REVISED)
-- Copy & Paste this entire file into Supabase SQL Editor
-- and run it to setup the database.
-- =======================================================

-- 1. Create 'orders' table
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    total_amount INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_proof TEXT,
    payment_proof_path TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- First, drop existing policies to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can read orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON orders;

-- Then recreate them
CREATE POLICY "Anyone can create orders"
    ON orders FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can read orders"
    ON orders FOR SELECT
    USING (true);

CREATE POLICY "Anyone can update orders"
    ON orders FOR UPDATE
    USING (true);

CREATE POLICY "Anyone can delete orders"
    ON orders FOR DELETE
    USING (true);

-- 4. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 5. Helper Function: Create Storage Bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Policies for 'payment-proofs' bucket
-- Drop existing policies first
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

-- Recreate storage policies
CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'payment-proofs' );

CREATE POLICY "Public Upload"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'payment-proofs' );

CREATE POLICY "Public Delete"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'payment-proofs' );


-- 7. CLEANUP AUTOMATION: Delete old proofs & data after 7 days
CREATE OR REPLACE FUNCTION cleanup_old_payment_proofs()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, payment_proof_path
    FROM orders
    WHERE status = 'completed'
      AND created_at < NOW() - INTERVAL '7 days'
      AND payment_proof IS NOT NULL
  LOOP
    -- Remove file from storage
    DELETE FROM storage.objects
    WHERE bucket_id = 'payment-proofs'
      AND name = r.payment_proof_path;

    -- Update order record
    UPDATE orders
    SET payment_proof = NULL,
        payment_proof_path = NULL
    WHERE id = r.id;

    RAISE LOG 'Cleaned payment proof for order %', r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Schedule the cleanup (Needs pg_cron extension)
-- Note: You might need to enable pg_cron in Extensions first
-- We use a DO block to avoid errors if extension is missing/permissions are weird
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-payment-proofs-daily',
      '0 2 * * *',
      'SELECT cleanup_old_payment_proofs()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule cron job. Ensure pg_cron is enabled.';
END $$;
