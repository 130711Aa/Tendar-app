-- ============================================================================
-- FIX TARGET: UPDATE TENANTS TABLE CONSTRAINTS
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Tambah kolom plan_expires_at jika belum ada
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Hapus check constraint lama pada kolom plan untuk menghindari error
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;

-- 3. Tambahkan check constraint baru yang mendukung plan baru ('starter', 'business')
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check 
  CHECK (plan IN ('free', 'basic', 'starter', 'business', 'pro'));
