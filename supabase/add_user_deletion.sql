-- ============================================================
-- Baja y eliminación de usuarios
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- 1) Nuevo estado 'inactive' para el personal que dejó de trabajar.
--    Distinto de 'rejected', que es alguien que nunca fue aprobado.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'inactive'));

-- 2) Borrado definitivo. Va por SECURITY DEFINER porque auth.users no es
--    accesible con la clave pública de la app.
--    Al borrar la cuenta caen en cascada perfil, resultados, firmas,
--    respuestas, inscripciones de comida, sugerencias y notificaciones.
CREATE OR REPLACE FUNCTION delete_user_completely(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede eliminar usuarios';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés eliminar tu propia cuenta';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'El usuario no existe';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_completely(uuid) TO authenticated;

-- 3) Diagnóstico.
SELECT status, count(*) AS usuarios FROM profiles GROUP BY status ORDER BY status;
