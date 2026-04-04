-- ============================================================================
-- ADD plan_expires_at COLUMN TO TENANTS TABLE
-- Jalankan di Supabase > SQL Editor
-- ============================================================================

-- Tambah kolom plan_expires_at
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Tenant yang sudah aktif "pro" (misal Kareem Juice) tidak punya expiry — itu oke
-- Kolom ini akan diisi saat upgrade lewat Midtrans berhasil

-- Done!
