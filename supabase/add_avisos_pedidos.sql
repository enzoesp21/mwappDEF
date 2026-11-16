-- ============================================================
-- Avisos de pedidos de horario: a la campanita y al teléfono
--
-- Enzo, 16/11: "que a Facu le llegue 'te pidieron un cambio de horario'".
-- Facu ya tiene la app en la pantalla de inicio del iPhone.
--
-- - profiles.avisos_pedidos: quién recibe el aviso de cada pedido nuevo. Solo
--   cuenta para los admin. Lo tilda un admin en Usuarios ("Avisos"). La
--   primera vez que se corre esto se le pone a Facundo Nuñez (tiene dos
--   usuarios admin: va en los dos). Nadie se lo pone solo
--   (protect_profile_fields), porque el aviso trae el motivo del pedido.
-- - Cada pedido nuevo deja un aviso en la campanita de esos encargados (un
--   trigger en pedidos_horario: no se toca pedir_cambio_horario).
-- - push_suscripciones: los teléfonos donde alguien tocó "Activar avisos". Con
--   eso, la app le manda la notificación al teléfono aunque la tenga cerrada
--   (en iPhone, solo con la app en la pantalla de inicio). Cada uno ve y
--   borra solo las suyas. Se guardan con guardar_suscripcion_push().
-- - avisos_push_de_pedido(): la usa la app justo después de que alguien pide
--   un cambio, para saber a qué teléfonos mandarle el aviso. Solo contesta a
--   quien acaba de hacer ese pedido (en los últimos 5 minutos).
-- - push_vencida(): borra un teléfono que el servicio de avisos dio de baja.
--
-- Se puede correr dos veces.
-- ============================================================

-- Freno: necesita los pedidos de horario, las notificaciones y el trigger de
-- perfiles tal como lo dejó add_eventos.sql (6 reglas; 7 si esto ya se corrió).
-- Se vuelve a escribir entero abajo: si alguien le agregó otra regla, se cancela.
DO $$
DECLARE
  v_def    text;
  v_reglas int;
BEGIN
  IF to_regclass('public.pedidos_horario') IS NULL THEN
    RAISE EXCEPTION 'Faltan los pedidos de horario: corré primero supabase/add_pedidos_horario.sql.';
  END IF;
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'Faltan las notificaciones: corré primero supabase/add_suggestions_notifications.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 've_eventos') THEN
    RAISE EXCEPTION 'Falta correr supabase/add_eventos.sql.';
  END IF;
  v_def := pg_get_functiondef('public.protect_profile_fields()'::regprocedure);
  v_reglas := (length(v_def) - length(replace(v_def, 'IS DISTINCT FROM', ''))) / length('IS DISTINCT FROM');
  IF NOT (v_reglas = 6 OR (v_reglas = 7 AND position('avisos_pedidos' IN v_def) > 0)) THEN
    RAISE EXCEPTION 'El trigger de perfiles tiene % reglas y se esperaban 6: alguien lo cambió. Se cancela para no pisarlo.', v_reglas;
  END IF;
END $$;

-- 1. Quién recibe los avisos --------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avisos_pedidos') THEN
    ALTER TABLE profiles ADD COLUMN avisos_pedidos boolean NOT NULL DEFAULT false;
    -- Solo la primera vez: después lo maneja Enzo desde Usuarios.
    UPDATE profiles SET avisos_pedidos = true
    WHERE role = 'admin' AND translate(lower(full_name), 'ñ', 'n') = 'facundo nunez';
  END IF;
END $$;

-- El mismo trigger de siempre, con una regla más.
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF is_admin() THEN
    RETURN NEW;
  END IF;

  -- El editor SQL y la service_role tampoco se frenan.
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

  IF NEW.carga_propinas IS DISTINCT FROM OLD.carga_propinas THEN
    RAISE EXCEPTION 'El permiso de propinas lo da un encargado.';
  END IF;

  IF NEW.ve_eventos IS DISTINCT FROM OLD.ve_eventos THEN
    RAISE EXCEPTION 'El permiso de eventos lo da un encargado.';
  END IF;

  IF NEW.avisos_pedidos IS DISTINCT FROM OLD.avisos_pedidos THEN
    RAISE EXCEPTION 'Los avisos de pedidos los da un encargado.';
  END IF;

  -- Se elige una sola vez, en la bienvenida. Después la cambia un encargado.
  IF OLD.experience IS NOT NULL AND NEW.experience IS DISTINCT FROM OLD.experience THEN
    RAISE EXCEPTION 'Pasar al equipo lo hace un encargado.';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. El texto del aviso -------------------------------------------------------

-- "Lucas López pidió un cambio de horario: sáb 21/11, no puede venir. Motivo: turno médico"
CREATE OR REPLACE FUNCTION texto_aviso_pedido(p_pedido uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(nullif(btrim(pr.full_name), ''), 'Alguien')
         || ' pidió un cambio de horario: '
         || (SELECT string_agg((ARRAY['dom','lun','mar','mié','jue','vie','sáb'])[extract(dow FROM f)::int + 1]
                               || ' ' || to_char(f, 'DD/MM'), ', ' ORDER BY f)
             FROM unnest(p.fechas) f)
         || ', '
         || CASE p.tipo
              WHEN 'no_puedo' THEN 'no puede venir'
              WHEN 'solo_franja' THEN 'solo puede de ' || to_char(p.desde, 'HH24:MI') || ' a ' || to_char(p.hasta, 'HH24:MI')
              WHEN 'no_franja' THEN 'no puede de ' || to_char(p.desde, 'HH24:MI') || ' a ' || to_char(p.hasta, 'HH24:MI')
              ELSE 'otro cambio'
            END
         || '. Motivo: ' || p.motivo
  FROM pedidos_horario p
  LEFT JOIN profiles pr ON pr.id = p.user_id
  WHERE p.id = p_pedido;
$$;
REVOKE ALL ON FUNCTION texto_aviso_pedido(uuid) FROM PUBLIC, anon, authenticated;

-- 3. A la campanita de los encargados, con cada pedido nuevo -------------------

CREATE OR REPLACE FUNCTION avisar_pedido_horario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (user_id, message)
  SELECT pr.id, texto_aviso_pedido(NEW.id)
  FROM profiles pr
  WHERE pr.avisos_pedidos AND pr.role = 'admin' AND pr.status = 'approved' AND pr.id <> NEW.user_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS avisar_pedido_horario ON pedidos_horario;
CREATE TRIGGER avisar_pedido_horario AFTER INSERT ON pedidos_horario
  FOR EACH ROW EXECUTE FUNCTION avisar_pedido_horario();

-- 4. Los teléfonos con avisos activados ----------------------------------------

CREATE TABLE IF NOT EXISTS push_suscripciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  dispositivo text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_suscripciones_endpoint CHECK (endpoint LIKE 'https://%' AND char_length(endpoint) <= 1000)
);
CREATE INDEX IF NOT EXISTS push_suscripciones_usuario_idx ON push_suscripciones (user_id);

ALTER TABLE push_suscripciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_suscripciones_propias ON push_suscripciones;
CREATE POLICY push_suscripciones_propias ON push_suscripciones
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS push_suscripciones_borrar_propias ON push_suscripciones;
CREATE POLICY push_suscripciones_borrar_propias ON push_suscripciones
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
GRANT SELECT, DELETE ON push_suscripciones TO authenticated;
-- Para guardar se usa guardar_suscripcion_push(): si el teléfono ya estaba
-- anotado a nombre de otro (alguien que entró con otro usuario), pasa al actual.

CREATE OR REPLACE FUNCTION guardar_suscripcion_push(p_endpoint text, p_p256dh text, p_auth text, p_dispositivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Iniciá sesión de nuevo.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO push_suscripciones (user_id, endpoint, p256dh, auth, dispositivo)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_dispositivo, 120))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = auth.uid(), p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
        dispositivo = EXCLUDED.dispositivo, created_at = now();
END;
$$;

-- A qué teléfonos mandar el aviso de un pedido: solo para quien lo acaba de hacer.
CREATE OR REPLACE FUNCTION avisos_push_de_pedido(p_pedido uuid)
RETURNS TABLE (endpoint text, p256dh text, auth text, mensaje text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT s.endpoint, s.p256dh, s.auth, texto_aviso_pedido(p.id)
  FROM pedidos_horario p
  JOIN profiles pr ON pr.avisos_pedidos AND pr.role = 'admin' AND pr.status = 'approved' AND pr.id <> p.user_id
  JOIN push_suscripciones s ON s.user_id = pr.id
  WHERE p.id = p_pedido
    AND p.user_id = auth.uid()
    AND p.created_at > now() - interval '5 minutes';
$$;

-- El servicio de avisos dijo que ese teléfono ya no existe (desinstaló la app,
-- sacó el permiso): se borra para no seguir intentando.
CREATE OR REPLACE FUNCTION push_vencida(p_endpoint text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM push_suscripciones WHERE endpoint = p_endpoint;
$$;

REVOKE ALL ON FUNCTION guardar_suscripcion_push(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION avisos_push_de_pedido(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION push_vencida(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION guardar_suscripcion_push(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION avisos_push_de_pedido(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION push_vencida(text) TO authenticated;

-- Verificación: cinco filas, las cuatro primeras "listo".
SELECT 'avisos a la campanita con cada pedido' AS que,
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'avisar_pedido_horario') THEN 'listo' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'teléfonos con avisos (cada uno ve los suyos)',
       CASE WHEN to_regclass('public.push_suscripciones') IS NOT NULL
                 AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.push_suscripciones'::regclass)
            THEN 'listo' ELSE 'FALTA' END
UNION ALL
SELECT 'funciones para guardar y mandar',
       CASE WHEN to_regprocedure('guardar_suscripcion_push(text, text, text, text)') IS NOT NULL
                 AND to_regprocedure('avisos_push_de_pedido(uuid)') IS NOT NULL
                 AND to_regprocedure('push_vencida(text)') IS NOT NULL
                 AND NOT has_function_privilege('anon', 'avisos_push_de_pedido(uuid)', 'EXECUTE')
            THEN 'listo' ELSE 'FALTA' END
UNION ALL
SELECT 'nadie se pone los avisos solo',
       CASE WHEN position('avisos_pedidos' IN pg_get_functiondef('public.protect_profile_fields()'::regprocedure)) > 0
            THEN 'listo' ELSE 'FALTA' END
UNION ALL
SELECT 'reciben los avisos',
       coalesce(string_agg(full_name || ' (' || puesto || ')', ', ' ORDER BY full_name), 'nadie')
FROM profiles WHERE avisos_pedidos AND role = 'admin';
