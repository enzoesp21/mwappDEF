-- ============================================================
-- Foto de perfil para cada persona
--
-- 1. Agrega profiles.avatar_url.
-- 2. Deja que cada uno suba, reemplace y borre SU foto en el bucket,
--    dentro de una carpeta propia: avatars/<id de la persona>/...
--    Nadie puede escribir en la carpeta de otro.
-- 3. Cierra un agujero que ya existia (ver abajo).
--
-- OJO, ESTO ES IMPORTANTE:
-- La politica "profiles_update_own" deja que cada uno modifique su propia
-- fila de profiles, sin limitar que columnas. Es decir que cualquier
-- empleado podia ponerse role = 'admin' desde el navegador y entrar al
-- panel de administracion. Ya estaba asi, no lo trae este cambio, pero
-- ahora que el perfil se edita desde la app conviene cerrarlo.
-- El trigger de abajo permite que cada uno edite su nombre y su foto,
-- y bloquea role, status y puesto salvo que quien edita sea admin.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- 1) Columna de la foto.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2) Permisos de subida: cada uno en su carpeta.
DROP POLICY IF EXISTS avatars_own_insert ON storage.objects;
CREATE POLICY avatars_own_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'guias'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_own_update ON storage.objects;
CREATE POLICY avatars_own_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'guias'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_own_delete ON storage.objects;
CREATE POLICY avatars_own_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'guias'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- 3) Freno para que nadie se cambie el rol a si mismo.
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- El admin puede cambiar cualquier cosa de cualquiera.
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- Tampoco frena al editor SQL de Supabase ni a la service_role: ahi no hay
  -- usuario logueado, y para llegar a esa consola ya hay que ser dueño del
  -- proyecto. El freno es contra el navegador de un empleado, no contra vos.
  -- Un anonimo no se cuela por aca: la politica de RLS de profiles ya exige
  -- id = auth.uid() para poder escribir una fila.
  IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'No podés cambiarte el rol.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'No podés cambiarte el estado de la cuenta.';
  END IF;

  IF NEW.puesto IS DISTINCT FROM OLD.puesto THEN
    RAISE EXCEPTION 'El puesto lo cambia un encargado.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_fields();

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT 'columna avatar_url' AS item,
       count(*)::text AS ok
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'avatar_url'
UNION ALL
SELECT 'politicas de avatars (tienen que ser 3)',
       count(*)::text
FROM pg_policies
WHERE schemaname = 'storage' AND policyname LIKE 'avatars_own_%'
UNION ALL
SELECT 'trigger que protege rol y estado',
       count(*)::text
FROM pg_trigger
WHERE tgname = 'trg_protect_profile_fields';
