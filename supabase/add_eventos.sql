-- ============================================================
-- Eventos y mesas personalizadas: calendario interno
--
-- Pedido de Enzo, 11/11: un calendario para recordar las MESAS PERSONALIZADAS
-- (mesas de 20 personas con menú armado, etc.) y las bodas y demás EVENTOS
-- PRIVADOS, para saber cuándo tenemos el salón y cuándo no. Lo ven solo las
-- personas que él elige (encargados de barra, recepción, etc.) y los admin.
--
-- - profiles.ve_eventos: quién lo ve. Lo tilda un admin en Usuarios
--   ("Eventos"). Nadie se lo puede poner a sí mismo (protect_profile_fields).
-- - puede_ver_eventos(): admin, o aprobado con ve_eventos.
-- - eventos: una fila por mesa o evento, con la fecha, el tipo (mesa
--   personalizada o evento privado), la comida (desayuno, almuerzo, merienda
--   o cena), el horario, el nombre, la cantidad de personas (pax), el salón y
--   los detalles (menú, contacto, seña...). Un evento privado ocupa ese salón.
--   Quien lo ve también lo puede cargar, cambiar y borrar. Queda quién lo cargó
--   y quién lo cambió por última vez.
--
-- No toca datos que ya existan. Se puede correr dos veces.
-- ============================================================

-- Freno: necesita is_admin(), los perfiles con el permiso de propinas y el
-- trigger de perfiles tal como está hoy (se vuelve a escribir entero abajo; si
-- alguien le agregó otra regla, se cancela para no perderla).
DO $$
DECLARE
  v_def    text;
  v_reglas int;
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Falta la función is_admin(): corré primero supabase/schema.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'carga_propinas') THEN
    RAISE EXCEPTION 'Falta profiles.carga_propinas: corré primero supabase/add_propinas.sql.';
  END IF;
  IF to_regprocedure('public.protect_profile_fields()') IS NULL THEN
    RAISE EXCEPTION 'Falta la función protect_profile_fields(): corré primero supabase/schema.sql.';
  END IF;
  v_def := pg_get_functiondef('public.protect_profile_fields()'::regprocedure);
  v_reglas := (length(v_def) - length(replace(v_def, 'IS DISTINCT FROM', ''))) / length('IS DISTINCT FROM');
  -- Hoy son 5 (rol, estado, puesto, propinas y "pasar al equipo"); 6 si este SQL ya se corrió.
  IF NOT (v_reglas = 5 OR (v_reglas = 6 AND position('ve_eventos' IN v_def) > 0)) THEN
    RAISE EXCEPTION 'El trigger de perfiles tiene % reglas y se esperaban 5: alguien lo cambió. Se cancela para no pisarlo.', v_reglas;
  END IF;
END $$;

-- 1. Quién lo ve -------------------------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ve_eventos boolean NOT NULL DEFAULT false;

-- El mismo trigger de siempre, con una regla más al final de las de permisos.
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

  -- Se elige una sola vez, en la bienvenida. Después la cambia un encargado.
  IF OLD.experience IS NOT NULL AND NEW.experience IS DISTINCT FROM OLD.experience THEN
    RAISE EXCEPTION 'Pasar al equipo lo hace un encargado.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION puede_ver_eventos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND ve_eventos AND status = 'approved'
  );
$$;
REVOKE ALL ON FUNCTION puede_ver_eventos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION puede_ver_eventos() TO authenticated;

-- 2. Los eventos -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS eventos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           date NOT NULL,
  -- 'mesa': mesa personalizada. 'evento': evento privado (boda, cumpleaños,
  -- empresa...), que ocupa el salón.
  tipo            text NOT NULL CHECK (tipo IN ('mesa', 'evento')),
  comida          text NOT NULL CHECK (comida IN ('desayuno', 'almuerzo', 'merienda', 'cena')),
  hora            time,
  hora_fin        time,
  nombre          text NOT NULL,
  pax             integer,
  -- Una mesa puede ir sin salón ("a definir"); un evento privado, no: lo ocupa.
  salon           text,
  notas           text,
  creado_por      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_nombre CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 120),
  CONSTRAINT eventos_salon CHECK (salon IS NULL OR char_length(btrim(salon)) BETWEEN 1 AND 60),
  CONSTRAINT eventos_pax CHECK (pax IS NULL OR pax BETWEEN 1 AND 2000),
  CONSTRAINT eventos_notas CHECK (notas IS NULL OR char_length(notas) <= 2000),
  -- Una mesa personalizada siempre lleva la cantidad de personas; la hora y el
  -- salón pueden quedar a definir (fix_eventos_mesas_personalizadas.sql, 12/11).
  CONSTRAINT eventos_mesa_pax CHECK (tipo <> 'mesa' OR pax IS NOT NULL),
  CONSTRAINT eventos_evento_salon CHECK (tipo <> 'evento' OR salon IS NOT NULL),
  CONSTRAINT eventos_hora_fin CHECK (hora_fin IS NULL OR hora IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS eventos_fecha_idx ON eventos (fecha);

-- Quién lo cargó y quién lo cambió lo pone la base, no la pantalla.
CREATE OR REPLACE FUNCTION eventos_quien()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.creado_por := coalesce(auth.uid(), NEW.creado_por);
    NEW.creado_en := now();
  ELSE
    NEW.creado_por := OLD.creado_por;
    NEW.creado_en := OLD.creado_en;
  END IF;
  NEW.actualizado_por := coalesce(auth.uid(), NEW.actualizado_por);
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS eventos_quien ON eventos;
CREATE TRIGGER eventos_quien BEFORE INSERT OR UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION eventos_quien();

ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eventos_todo ON eventos;
CREATE POLICY eventos_todo ON eventos
  FOR ALL TO authenticated
  USING (puede_ver_eventos())
  WITH CHECK (puede_ver_eventos());
GRANT SELECT, INSERT, UPDATE, DELETE ON eventos TO authenticated;

-- Verificación: cuatro filas. Las tres primeras tienen que decir "listo".
SELECT 'tabla eventos' AS que,
       CASE WHEN to_regclass('public.eventos') IS NOT NULL THEN 'listo' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'solo lo ven los elegidos y los admin',
       CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.eventos'::regclass)
                 AND (SELECT count(*) FROM pg_policies WHERE tablename = 'eventos') = 1
                 AND to_regprocedure('public.puede_ver_eventos()') IS NOT NULL
            THEN 'listo' ELSE 'REVISAR' END
UNION ALL
SELECT 'nadie se da el permiso solo',
       CASE WHEN position('ve_eventos' IN pg_get_functiondef('public.protect_profile_fields()'::regprocedure)) > 0
            THEN 'listo' ELSE 'FALTA' END
UNION ALL
SELECT 'personas con permiso (sin contar admin)',
       count(*)::text || coalesce(': ' || string_agg(full_name, ', ' ORDER BY full_name), '')
FROM profiles WHERE ve_eventos AND role <> 'admin';
