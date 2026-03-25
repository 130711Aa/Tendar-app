-- =============================================
-- CLEANUP AUTOMATION: Hapus bukti bayar lama
-- Copy-paste dan Run di Supabase SQL Editor
-- =============================================

-- 1. Enable Extension pg_cron (Wajib untuk penjadwalan)
-- Note: Mungkin perlu upgrade project ke Pro atau enable di Settings > Database > Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Buat Function Cleanup
CREATE OR REPLACE FUNCTION cleanup_old_payment_proofs()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  -- Loop cari order yang status 'completed' & bukti bayar > 7 hari
  FOR r IN
    SELECT id, payment_proof_path
    FROM orders
    WHERE status = 'completed'
      AND payment_proof_path IS NOT NULL
      AND created_at < NOW() - INTERVAL '7 days'
  LOOP
    -- Hapus file dari Storage bucket 'payment-proofs'
    BEGIN
        DELETE FROM storage.objects
        WHERE bucket_id = 'payment-proofs'
          AND name = r.payment_proof_path;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Gagal hapus file %: %', r.payment_proof_path, SQLERRM;
    END;

    -- Update Database: set null
    UPDATE orders
    SET payment_proof = NULL,
        payment_proof_path = NULL
    WHERE id = r.id;

    RAISE NOTICE 'Deleted old proof for order %', r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Jadwalkan Job (Setiap hari jam 03:00 pagi WIB / 20:00 UTC)
-- Hapus job lama kalau ada biar gak double
SELECT cron.unschedule('cleanup-payment-proofs-daily');

SELECT cron.schedule(
  'cleanup-payment-proofs-daily',
  '0 20 * * *', -- Jam 20:00 UTC = 03:00 WIB
  'SELECT cleanup_old_payment_proofs()'
);
