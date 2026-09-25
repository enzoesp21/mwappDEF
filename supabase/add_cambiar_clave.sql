-- ============================================================
-- Cambiar la contraseña de alguien desde el panel de admin
--
-- La app no tiene "me olvidé la contraseña". Enzo decidió que, si alguien se
-- la olvida, un admin le pone una clave provisoria desde Usuarios y se la
-- pasa; después la persona la puede cambiar en su Perfil.
--
-- La clave se guarda cifrada igual que las que pone Supabase (bcrypt, "$2a$"),
-- así que la persona entra normalmente con la nueva. Nadie puede leer la
-- clave vieja ni la nueva: solo se reemplaza.
--
-- Solo un admin puede usarla (lo frena la función, no solo la pantalla).
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION admin_cambiar_clave(p_user_id uuid, p_clave text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar contraseñas.';
  END IF;

  IF p_clave IS NULL OR length(p_clave) < 6 THEN
    RAISE EXCEPTION 'La contraseña tiene que tener al menos 6 caracteres.';
  END IF;

  IF length(p_clave) > 72 THEN
    RAISE EXCEPTION 'La contraseña es demasiado larga.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_clave, extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario no existe.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION admin_cambiar_clave(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_cambiar_clave(uuid, text) TO authenticated;

-- Freno: el cifrado tiene que dar el mismo formato que usa Supabase.
DO $$
BEGIN
  IF left(extensions.crypt('prueba', extensions.gen_salt('bf', 10)), 7) <> '$2a$10$' THEN
    RAISE EXCEPTION 'El cifrado no da el formato que espera Supabase: se cancela.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT 'admin_cambiar_clave' AS funcion,
       CASE WHEN to_regprocedure('admin_cambiar_clave(uuid, text)') IS NOT NULL
            THEN 'creada' ELSE 'NO ESTÁ' END AS estado,
       left(extensions.crypt('prueba', extensions.gen_salt('bf', 10)), 7) AS formato_cifrado;
