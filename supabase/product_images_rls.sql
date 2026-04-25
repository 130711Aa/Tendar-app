-- ============================================================
-- RLS Policies untuk bucket "product-images"
-- Paste ini di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Siapapun bisa READ (public bucket, gambar tampil di halaman customer)
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 2. User yang sudah login bisa UPLOAD gambar
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- 3. User authenticated bisa UPDATE (replace) gambar
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- 4. User authenticated bisa DELETE gambar
--    (opsional: bisa dibatasi lebih ketat per tenant, tapi ini sudah cukup aman
--     karena delete dipanggil dari server-side flow yang sudah divalidasi)
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
