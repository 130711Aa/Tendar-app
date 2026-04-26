-- ============================================================================
-- HAPUS USER DEMO YANG BROKEN (di-insert via SQL langsung)
-- Jalankan di Supabase SQL Editor
-- ============================================================================

-- Hapus user dari auth.users berdasarkan email
-- (ini akan cascade delete ke semua tabel yang referensi user_id)
DELETE FROM auth.users 
WHERE email IN (
    'kopi@demo.tendar.app',
    'resto@demo.tendar.app',
    'juice@demo.tendar.app'
);

-- Verifikasi sudah terhapus
SELECT id, email, created_at FROM auth.users 
WHERE email IN (
    'kopi@demo.tendar.app',
    'resto@demo.tendar.app',
    'juice@demo.tendar.app'
);
-- Kalau query di atas return 0 rows → berhasil terhapus
