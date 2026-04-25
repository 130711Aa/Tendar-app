-- ============================================================
-- Fix unique constraint pada tabel categories
-- Masalah: constraint UNIQUE(name) menyebabkan 409 conflict
--          ketika dua tenant berbeda mencoba membuat kategori
--          dengan nama yang sama (misal "Jus").
-- Solusi: ubah constraint menjadi UNIQUE(name, tenant_id)
-- ============================================================

-- 1. Hapus constraint lama (cek nama constraint-nya dulu)
--    Kemungkinan namanya: categories_name_key
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- 2. Buat constraint baru yang benar: unique per tenant
ALTER TABLE categories
ADD CONSTRAINT categories_name_tenant_id_key UNIQUE (name, tenant_id);

-- Verifikasi:
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'categories'::regclass;
