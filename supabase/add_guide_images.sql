-- ============================================================
-- Imágenes en las guías (Supabase Storage)
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- Bucket público: las fotos se ven sin login desde el markdown de la guía.
-- 8 MB por archivo, aunque el editor las comprime antes de subirlas.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guias', 'guias', true, 8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Cualquiera puede ver las imágenes.
DROP POLICY IF EXISTS "guias_public_read" ON storage.objects;
CREATE POLICY "guias_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'guias');

-- Solo los administradores pueden subir, reemplazar o borrar.
DROP POLICY IF EXISTS "guias_admin_insert" ON storage.objects;
CREATE POLICY "guias_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'guias' AND public.is_admin());

DROP POLICY IF EXISTS "guias_admin_update" ON storage.objects;
CREATE POLICY "guias_admin_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'guias' AND public.is_admin());

DROP POLICY IF EXISTS "guias_admin_delete" ON storage.objects;
CREATE POLICY "guias_admin_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'guias' AND public.is_admin());

-- Diagnóstico.
SELECT id AS bucket, public AS publico, file_size_limit AS limite_bytes
FROM storage.buckets WHERE id = 'guias';
