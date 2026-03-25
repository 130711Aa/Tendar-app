-- =============================================
-- CATEGORIES TABLE: Simpan kategori ke Supabase
-- Copy-paste dan Run di Supabase SQL Editor
-- =============================================

-- 1. Buat tabel categories
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Insert default categories
INSERT INTO categories (name) VALUES 
('Jus Segar'), 
('Smoothies'), 
('Mocktails'), 
('Tea Series'), 
('Coffee Series')
ON CONFLICT (name) DO NOTHING;

-- 3. Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 4. Policy: siapa saja bisa SELECT (customer & admin lihat kategori)
CREATE POLICY "Anyone can read categories"
    ON categories FOR SELECT
    USING (true);

-- 5. Policy: siapa saja bisa INSERT (admin tambah kategori)
CREATE POLICY "Anyone can create categories"
    ON categories FOR INSERT
    WITH CHECK (true);

-- 6. Policy: siapa saja bisa DELETE (admin hapus kategori)
CREATE POLICY "Anyone can delete categories"
    ON categories FOR DELETE
    USING (true);
