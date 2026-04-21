-- Menjalankan ini di SQL Editor Supabase akan membuat fungsi RPC
-- yang memungkinkan client mendeteksi apakah user punya password atau tidak
-- secara aman (hanya untuk dirinya sendiri).

CREATE OR REPLACE FUNCTION public.has_password_set()
RETURNS boolean AS $$
DECLARE
  has_pw boolean;
BEGIN
  -- Cek apakah encrypted_password di tabel auth.users tidak null dan tidak kosong
  SELECT (encrypted_password IS NOT NULL AND encrypted_password != '') INTO has_pw
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN coalesce(has_pw, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Berikan akses agar bisa dipanggil lewat API oleh user yang sudah login
GRANT EXECUTE ON FUNCTION public.has_password_set() TO authenticated;
