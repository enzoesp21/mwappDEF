-- ============================================================
-- Propinas del salón
--
-- Pasa a la app la calculadora de propinas que se usaba aparte. El cajero
-- carga cada día (al día siguiente) el total, la parte general y las horas de
-- cada mozo; la app hace el reparto y arma el mensaje para el grupo.
--
-- Qué agrega:
--   1. profiles.carga_propinas: quién puede cargar. Lo tilda un admin en
--      Usuarios. Los admin pueden siempre.
--   2. tip_days: un día de propinas (total y general).
--   3. tip_entries: cada persona de ese día, con sus horas, lo que le tocó y
--      cómo se le pagó (transferencia, efectivo o las dos).
--   4. guardar_propinas(): guarda el día y su gente en una sola operación,
--      para que nunca quede un día a medio guardar.
--
-- Quién ve qué (lo frena la base, no solo la pantalla):
--   - Quien carga propinas y los admin ven todo.
--   - Cada mozo ve SOLO sus propias filas, y los totales de los días en los
--     que trabajó (lo mismo que ya le llega por el grupo).
--
-- De paso ajusta protect_profile_fields para dos cosas:
--   - que nadie se pueda dar a sí mismo el permiso de cargar propinas;
--   - que quien está en prueba no se pueda pasar solo al equipo desde el
--     navegador. Antes el freno de la prueba se podía saltear cambiando
--     "experience" a mano; ahora cada uno solo la elige la primera vez (en la
--     bienvenida) y después la cambia un encargado.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

-- 1. Permiso para cargar propinas -----------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS carga_propinas boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION puede_cargar_propinas()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_admin() OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND carga_propinas AND status = 'approved'
  );
$$;

-- El trigger de siempre, con dos frenos más al final.
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- El admin puede cambiar cualquier cosa de cualquiera.
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

  -- Se elige una sola vez, en la bienvenida. Después la cambia un encargado.
  IF OLD.experience IS NOT NULL AND NEW.experience IS DISTINCT FROM OLD.experience THEN
    RAISE EXCEPTION 'Pasar al equipo lo hace un encargado.';
  END IF;

  RETURN NEW;
END;
$$;

-- 2 y 3. Tablas -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tip_days (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha      date NOT NULL UNIQUE,
  -- "Propina Total General" y "Propina General (1.5%)". Salón = total - general.
  total      integer NOT NULL CHECK (total >= 0),
  general    integer NOT NULL CHECK (general >= 0),
  -- Lo que salió cada hora completa, guardado tal cual se calculó.
  por_hora   numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Control de versión: si dos personas editan el mismo día, la segunda que
  -- guarda se entera en lugar de pisar lo de la primera.
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT tip_days_general_no_supera_total CHECK (general <= total)
);

CREATE TABLE IF NOT EXISTS tip_entries (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id    uuid NOT NULL REFERENCES tip_days(id) ON DELETE CASCADE,
  orden     integer NOT NULL DEFAULT 0,
  nombre    text NOT NULL CHECK (btrim(nombre) <> ''),
  -- El usuario de la app de esa persona, si tiene. Es lo que le deja ver lo suyo.
  user_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- camarero = 100 %, reducido = 75 %, prueba = 50 % de la hora.
  grupo     text NOT NULL CHECK (grupo IN ('camarero', 'reducido', 'prueba')),
  horas     numeric(4, 2) NOT NULL CHECK (horas > 0 AND horas <= 24),
  monto     integer NOT NULL CHECK (monto >= 0),
  -- Cómo se le pagó: tr = transferencia, ef = efectivo, tr_ef = las dos.
  pago      text CHECK (pago IN ('tr', 'ef', 'tr_ef')),
  -- Cuánto fue en efectivo cuando se pagó con las dos.
  efectivo  integer CHECK (efectivo >= 0),
  CONSTRAINT tip_entries_efectivo_solo_mixto CHECK (efectivo IS NULL OR pago = 'tr_ef')
);

CREATE INDEX IF NOT EXISTS tip_entries_day_idx ON tip_entries(day_id);
CREATE INDEX IF NOT EXISTS tip_entries_user_idx ON tip_entries(user_id);

ALTER TABLE tip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE tip_entries ENABLE ROW LEVEL SECURITY;

-- Filas: quien carga ve todas; cada uno, las suyas.
DROP POLICY IF EXISTS tip_entries_read ON tip_entries;
CREATE POLICY tip_entries_read ON tip_entries
  FOR SELECT TO authenticated
  USING (puede_cargar_propinas() OR user_id = auth.uid());

DROP POLICY IF EXISTS tip_entries_write ON tip_entries;
CREATE POLICY tip_entries_write ON tip_entries
  FOR ALL TO authenticated
  USING (puede_cargar_propinas())
  WITH CHECK (puede_cargar_propinas());

-- Días: quien carga ve todos; cada uno, los días en que tiene una fila.
DROP POLICY IF EXISTS tip_days_read ON tip_days;
CREATE POLICY tip_days_read ON tip_days
  FOR SELECT TO authenticated
  USING (
    puede_cargar_propinas()
    OR EXISTS (SELECT 1 FROM tip_entries e WHERE e.day_id = tip_days.id AND e.user_id = auth.uid())
  );

DROP POLICY IF EXISTS tip_days_write ON tip_days;
CREATE POLICY tip_days_write ON tip_days
  FOR ALL TO authenticated
  USING (puede_cargar_propinas())
  WITH CHECK (puede_cargar_propinas());

-- 4. Guardar un día entero ---------------------------------------------------
--
-- p_version: el updated_at que se leyó al abrir el día, tal cual vino de la
-- base (texto). NULL si es un día nuevo. Si no coincide, alguien lo cambió
-- mientras tanto y no se guarda.
--
-- p_personas: [{nombre, user_id, grupo, horas, monto, pago, efectivo}, ...]
--
-- Corre con los permisos de quien llama: las políticas de arriba deciden.

CREATE OR REPLACE FUNCTION guardar_propinas(
  p_fecha     date,
  p_total     integer,
  p_general   integer,
  p_por_hora  numeric,
  p_personas  jsonb,
  p_version   text
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_id      uuid;
  v_version timestamptz;
BEGIN
  IF NOT puede_cargar_propinas() THEN
    RAISE EXCEPTION 'No tenés permiso para cargar propinas.';
  END IF;

  SELECT id, updated_at INTO v_id, v_version FROM tip_days WHERE fecha = p_fecha FOR UPDATE;

  IF v_id IS NULL THEN
    IF p_version IS NOT NULL THEN
      RAISE EXCEPTION 'Ese día se borró mientras lo editabas.';
    END IF;
    INSERT INTO tip_days (fecha, total, general, por_hora, updated_by)
    VALUES (p_fecha, p_total, p_general, p_por_hora, auth.uid())
    RETURNING id INTO v_id;
  ELSE
    IF p_version IS NULL THEN
      RAISE EXCEPTION 'Ya hay propinas cargadas para ese día. Abrilo desde la lista para editarlo.';
    END IF;
    IF v_version <> p_version::timestamptz THEN
      RAISE EXCEPTION 'Alguien cambió este día mientras lo editabas. Recargá la página para ver lo último.';
    END IF;
    UPDATE tip_days
    SET total = p_total, general = p_general, por_hora = p_por_hora,
        updated_at = now(), updated_by = auth.uid()
    WHERE id = v_id;
  END IF;

  -- La gente del día se reemplaza entera. Acá no cuelga nada de tip_entries,
  -- así que borrar y volver a insertar no pierde información.
  DELETE FROM tip_entries WHERE day_id = v_id;

  INSERT INTO tip_entries (day_id, orden, nombre, user_id, grupo, horas, monto, pago, efectivo)
  SELECT v_id,
         (p.ord - 1)::int,
         btrim(p.x->>'nombre'),
         NULLIF(p.x->>'user_id', '')::uuid,
         p.x->>'grupo',
         (p.x->>'horas')::numeric,
         (p.x->>'monto')::int,
         NULLIF(p.x->>'pago', ''),
         (p.x->>'efectivo')::int
  FROM jsonb_array_elements(p_personas) WITH ORDINALITY AS p(x, ord);

  RETURN (SELECT updated_at::text FROM tip_days WHERE id = v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION guardar_propinas(date, integer, integer, numeric, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION puede_cargar_propinas() TO authenticated;

-- Freno: todo tiene que haber quedado creado.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'carga_propinas') THEN
    RAISE EXCEPTION 'Falta la columna profiles.carga_propinas: se cancela.';
  END IF;
  IF to_regclass('public.tip_days') IS NULL OR to_regclass('public.tip_entries') IS NULL THEN
    RAISE EXCEPTION 'Faltan las tablas de propinas: se cancela.';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE tablename IN ('tip_days', 'tip_entries')) <> 4 THEN
    RAISE EXCEPTION 'Las políticas de propinas no quedaron bien: se cancela.';
  END IF;
  IF position('carga_propinas' IN pg_get_functiondef('protect_profile_fields'::regproc)) = 0 THEN
    RAISE EXCEPTION 'El trigger de perfiles no quedó actualizado: se cancela.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT 'tablas' AS que,
       (SELECT count(*) FROM tip_days)::text || ' días, ' ||
       (SELECT count(*) FROM tip_entries)::text || ' filas' AS resultado
UNION ALL
SELECT 'políticas', string_agg(tablename || '.' || policyname, ', ' ORDER BY tablename, policyname)
FROM pg_policies WHERE tablename IN ('tip_days', 'tip_entries')
UNION ALL
SELECT 'cargan propinas (además de los admin)',
       COALESCE(string_agg(full_name, ', '), 'nadie todavía: tildalo en Usuarios')
FROM profiles WHERE carga_propinas
UNION ALL
SELECT 'trigger de perfiles', CASE WHEN position('carga_propinas' IN pg_get_functiondef('protect_profile_fields'::regproc)) > 0
                                   THEN 'actualizado' ELSE 'SIN ACTUALIZAR' END;
