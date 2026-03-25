-- =============================================
-- ORDERS TABLE: Simpan pesanan ke Supabase
-- Copy-paste dan Run di Supabase SQL Editor
-- =============================================

-- 1. Buat tabel orders
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

-- 2. Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 3. Policy: siapa saja bisa INSERT (customer buat pesanan)
CREATE POLICY "Anyone can create orders"
    ON orders FOR INSERT
    WITH CHECK (true);

-- 4. Policy: siapa saja bisa SELECT (admin lihat pesanan)
CREATE POLICY "Anyone can read orders"
    ON orders FOR SELECT
    USING (true);

-- 5. Policy: siapa saja bisa UPDATE (admin update status)
CREATE POLICY "Anyone can update orders"
    ON orders FOR UPDATE
    USING (true);

-- 6. Policy: siapa saja bisa DELETE (admin hapus pesanan)
CREATE POLICY "Anyone can delete orders"
    ON orders FOR DELETE
    USING (true);

-- 7. Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
