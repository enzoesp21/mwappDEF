-- ============================================================
-- Aprobación de registros por el administrador
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- 1) Columna de estado. Arranca en 'pending'.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass AND conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles (status);

-- 2) IMPORTANTE: todos los que ya estaban registrados quedan aprobados,
--    así nadie del personal actual pierde el acceso.
UPDATE profiles SET status = 'approved' WHERE status = 'pending';

-- 3) Los nuevos registros quedan pendientes. Los admins se auto-aprueban
--    (entran con el código de administrador).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');

  INSERT INTO profiles (id, full_name, puesto, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
    COALESCE(NEW.raw_user_meta_data->>'puesto',    'Sin puesto'),
    v_role,
    CASE WHEN v_role = 'admin' THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 4) Al crearse un perfil pendiente, avisarle a todos los admins.
CREATE OR REPLACE FUNCTION notify_admins_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, message)
    SELECT p.id,
           'Nuevo registro: ' || NEW.full_name || ' (' || NEW.puesto ||
           ') está esperando que le apruebes el acceso.'
    FROM profiles p
    WHERE p.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_notify_admins ON profiles;
CREATE TRIGGER on_profile_created_notify_admins
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_user();

-- 5) RLS: el admin puede leer y actualizar cualquier perfil.
DROP POLICY IF EXISTS "Admins update profiles" ON profiles;
CREATE POLICY "Admins update profiles" ON profiles
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read all profiles" ON profiles;
CREATE POLICY "Admins read all profiles" ON profiles
  FOR SELECT USING (public.is_admin() OR auth.uid() = id);

-- 6) Diagnóstico.
SELECT status, role, count(*) AS cantidad
FROM profiles
GROUP BY status, role
ORDER BY status, role;
