-- ============================================================================
-- FIX: Superadmin RLS - Circular Dependency
-- ============================================================================
-- MASALAH:
--   Policy "Read own role" hanya mengizinkan SELECT di mana tenant_id cocok.
--   Superadmin di-insert dengan tenant_id = NULL sehingga tidak terbaca.
--   Fungsi is_superadmin() juga query user_roles → circular deadlock.
--
-- SOLUSI:
--   Tambahkan policy SELECT yang mengizinkan user SELALU bisa membaca
--   baris user_roles miliknya sendiri, tanpa peduli tenant_id (termasuk NULL).
-- ============================================================================

-- Drop policy lama yang mungkin conflict
DROP POLICY IF EXISTS "Read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Read own roles any tenant" ON public.user_roles;

-- Policy baru: user bisa baca SEMUA baris miliknya (termasuk tenant_id IS NULL)
CREATE POLICY "Read own roles any tenant"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Pastikan policy untuk superadmin juga tetap ada
DROP POLICY IF EXISTS "Superadmin read all roles" ON public.user_roles;
CREATE POLICY "Superadmin read all roles"
ON public.user_roles
FOR SELECT
USING (public.is_superadmin());

-- Verifikasi: cek semua policy di user_roles setelah fix
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'user_roles';
