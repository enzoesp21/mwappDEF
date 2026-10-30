-- ============================================================
-- Progresión de los mozos: nivel 1 (50 %) → nivel 2 (75 %) → nivel 3 (100 %)
--
-- Cada mozo tiene un nivel que define qué parte de la propina por hora le
-- toca. Para subir tiene que cumplir los requisitos del nivel siguiente:
-- algunos los tilda un encargado (conocer la carta, cobro sin errores...),
-- los exámenes se toman solos de la app y el tiempo mínimo se cuenta desde
-- que llegó al nivel. Los requisitos están escritos en lib/progresion.ts.
--
-- Qué agrega:
--   1. mozo_niveles: el nivel de cada uno, desde cuándo, qué se le tildó y
--      cuándo fue la última revisión.
--   2. mozo_niveles_historial: cada subida o bajada, con el motivo.
--   3. cambiar_nivel_mozo() y marcar_requisito_mozo(): cambian todo en una
--      sola operación (el nivel y su historial, o una tilde), solo admin.
--
-- Quién ve qué: los admin, todo. Cada mozo, lo suyo. Quien carga propinas ve
-- los niveles (no las tildes) para que la calculadora ponga el grupo solo.
--
-- Nadie arranca con un nivel puesto: un mozo sin nivel sigue como hasta
-- ahora en propinas, hasta que un encargado le asigna el suyo.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS mozo_niveles (
  user_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  nivel       smallint NOT NULL CHECK (nivel BETWEEN 1 AND 3),
  -- Desde cuándo está en este nivel: de acá sale el tiempo mínimo para subir.
  desde       date NOT NULL DEFAULT current_date,
  -- Lo que tildó un encargado: { "carta": { "fecha": "...", "por": "uuid" }, ... }
  requisitos  jsonb NOT NULL DEFAULT '{}'::jsonb,
  revisado_at timestamptz,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS mozo_niveles_historial (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nivel_anterior smallint,
  nivel_nuevo    smallint NOT NULL CHECK (nivel_nuevo BETWEEN 1 AND 3),
  motivo         text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS mozo_niveles_historial_user_idx ON mozo_niveles_historial(user_id, created_at DESC);

ALTER TABLE mozo_niveles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mozo_niveles_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mozo_niveles_read ON mozo_niveles;
CREATE POLICY mozo_niveles_read ON mozo_niveles
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = auth.uid() OR puede_cargar_propinas());

DROP POLICY IF EXISTS mozo_niveles_write ON mozo_niveles;
CREATE POLICY mozo_niveles_write ON mozo_niveles
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS mozo_niveles_historial_read ON mozo_niveles_historial;
CREATE POLICY mozo_niveles_historial_read ON mozo_niveles_historial
  FOR SELECT TO authenticated
  USING (is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS mozo_niveles_historial_write ON mozo_niveles_historial;
CREATE POLICY mozo_niveles_historial_write ON mozo_niveles_historial
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Asigna, sube o baja el nivel. El tiempo en el nivel vuelve a contar desde
-- hoy. Al bajar se borran las tildes de los niveles que perdió: para volver a
-- subir las tiene que ganar de nuevo.
CREATE OR REPLACE FUNCTION cambiar_nivel_mozo(p_user_id uuid, p_nivel smallint, p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  v_anterior smallint;
  v_requisitos jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo un encargado puede cambiar el nivel.';
  END IF;
  IF p_nivel NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'El nivel tiene que ser 1, 2 o 3.';
  END IF;

  SELECT nivel, requisitos INTO v_anterior, v_requisitos
  FROM mozo_niveles WHERE user_id = p_user_id FOR UPDATE;

  IF v_anterior IS NOT DISTINCT FROM p_nivel THEN
    RAISE EXCEPTION 'Ya está en ese nivel.';
  END IF;

  IF v_anterior IS NULL THEN
    INSERT INTO mozo_niveles (user_id, nivel, desde, revisado_at, updated_by)
    VALUES (p_user_id, p_nivel, current_date, now(), auth.uid());
  ELSE
    -- Las claves de cada tilde empiezan con el nivel: "n2_carta", "n3_reclamos".
    IF p_nivel < v_anterior THEN
      SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb) INTO v_requisitos
      FROM jsonb_each(v_requisitos) AS t(k, v)
      WHERE substring(k FROM '^n(\d)_')::int <= p_nivel;
    END IF;
    UPDATE mozo_niveles
    SET nivel = p_nivel, desde = current_date, requisitos = v_requisitos,
        revisado_at = now(), updated_at = now(), updated_by = auth.uid()
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO mozo_niveles_historial (user_id, nivel_anterior, nivel_nuevo, motivo, created_by)
  VALUES (p_user_id, v_anterior, p_nivel, nullif(btrim(p_motivo), ''), auth.uid());
END;
$$;

-- Tilda o destilda un requisito que evalúa un encargado.
CREATE OR REPLACE FUNCTION marcar_requisito_mozo(p_user_id uuid, p_clave text, p_cumplido boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo un encargado puede marcar requisitos.';
  END IF;
  IF p_clave !~ '^n[1-3]_[a-z_]+$' THEN
    RAISE EXCEPTION 'Requisito desconocido.';
  END IF;

  UPDATE mozo_niveles
  SET requisitos = CASE
        WHEN p_cumplido THEN requisitos || jsonb_build_object(
          p_clave, jsonb_build_object('fecha', now(), 'por', auth.uid()))
        ELSE requisitos - p_clave
      END,
      revisado_at = now(), updated_at = now(), updated_by = auth.uid()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Primero asignale un nivel.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION cambiar_nivel_mozo(uuid, smallint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_requisito_mozo(uuid, text, boolean) TO authenticated;

-- Freno: tablas y políticas tienen que haber quedado.
DO $$
BEGIN
  IF to_regclass('public.mozo_niveles') IS NULL OR to_regclass('public.mozo_niveles_historial') IS NULL THEN
    RAISE EXCEPTION 'Faltan las tablas de progresión: se cancela.';
  END IF;
  IF (SELECT count(*) FROM pg_policies
      WHERE tablename IN ('mozo_niveles', 'mozo_niveles_historial')) <> 4 THEN
    RAISE EXCEPTION 'Las políticas de progresión no quedaron bien: se cancela.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: los mozos con usuario y su nivel (al principio, ninguno).
-- ------------------------------------------------------------
SELECT p.full_name AS mozo,
       coalesce('Nivel ' || n.nivel, 'sin nivel: asignalo en Progresión') AS nivel
FROM profiles p
LEFT JOIN mozo_niveles n ON n.user_id = p.id
WHERE p.puesto = 'Mozos' AND p.status = 'approved' AND p.role <> 'admin'
ORDER BY p.full_name;
