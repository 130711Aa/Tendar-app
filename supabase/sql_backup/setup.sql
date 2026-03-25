-- =============================================
-- CLEANUP: Hapus bukti bayar otomatis setelah 7 hari
-- Copy-paste dan Run di Supabase SQL Editor
-- =============================================

-- 1. Buat function untuk cleanup bukti bayar lama
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
    -- Hapus file dari storage bucket
    DELETE FROM storage.objects
    WHERE bucket_id = 'payment-proofs'
      AND name = r.payment_proof_path;

    -- Null-kan kolom bukti bayar di database
    UPDATE orders
    SET payment_proof = NULL,
        payment_proof_path = NULL
    WHERE id = r.id;

    RAISE LOG 'Cleaned payment proof for order %', r.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Jadwalkan jalan setiap hari jam 2 pagi UTC
SELECT cron.schedule(
  'cleanup-payment-proofs-daily',
  '0 2 * * *',
  'SELECT cleanup_old_payment_proofs()'
);
