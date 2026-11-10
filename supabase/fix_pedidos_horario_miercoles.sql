-- ============================================================
-- Pedidos de horario: el plazo pasa al miércoles a las 22
--
-- Enzo (10/11): los cambios de horario se piden hasta el MIÉRCOLES anterior
-- a las 22:00 (hora de Argentina). Antes era hasta el jueves a las 23:59.
--
-- Qué hace:
--   1) pedidos_horario_abierta(semana): abierta mientras sea antes del
--      miércoles anterior a esa semana a las 22:00. La usan pedir y cancelar.
--   2) pedir_cambio_horario: lo mismo de siempre, con el mensaje nuevo
--      ("era hasta el miércoles 11/11 a las 22").
--
-- No toca los pedidos ya hechos. Se puede correr dos veces.
-- ============================================================

-- Freno: primero tienen que estar los pedidos (add_pedidos_horario.sql).
DO $$
BEGIN
  IF to_regclass('public.pedidos_horario') IS NULL
     OR to_regprocedure('public.pedir_cambio_horario(date[], text, time, time, text)') IS NULL THEN
    RAISE EXCEPTION 'Faltan los pedidos de horario: corré primero supabase/add_pedidos_horario.sql.';
  END IF;
END $$;

BEGIN;

-- 1) Abierta hasta el miércoles anterior a las 22:00 de Argentina
--    (el lunes de la semana menos 5 es ese miércoles).
CREATE OR REPLACE FUNCTION pedidos_horario_abierta(p_semana date)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires') < (p_semana - 5) + time '22:00'
$$;

-- 2) Pedir un cambio: igual que antes, con el plazo nuevo en el mensaje.
CREATE OR REPLACE FUNCTION pedir_cambio_horario(
  p_fechas date[],
  p_tipo text,
  p_desde time,
  p_hasta time,
  p_motivo text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_semana date;
  v_id uuid;
  v_franja boolean := p_tipo IN ('solo_franja', 'no_franja');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved') THEN
    RAISE EXCEPTION 'Tu usuario todavía no está aprobado: no podés pedir cambios.' USING ERRCODE = '42501';
  END IF;
  IF p_fechas IS NULL OR cardinality(p_fechas) = 0 THEN
    RAISE EXCEPTION 'Elegí al menos un día.';
  END IF;
  SELECT min(date_trunc('week', f)::date) INTO v_semana FROM unnest(p_fechas) f;
  IF EXISTS (SELECT 1 FROM unnest(p_fechas) f WHERE f IS NULL OR date_trunc('week', f)::date <> v_semana) THEN
    RAISE EXCEPTION 'Los días de un pedido tienen que ser de la misma semana.';
  END IF;
  IF NOT pedidos_horario_abierta(v_semana) THEN
    RAISE EXCEPTION 'Para la semana del % ya cerró el plazo: era hasta el miércoles % a las 22.',
      to_char(v_semana, 'DD/MM'), to_char(v_semana - 5, 'DD/MM');
  END IF;
  IF v_semana > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + 190 THEN
    RAISE EXCEPTION 'Se puede pedir con hasta seis meses de anticipación.';
  END IF;
  IF v_franja AND (p_desde IS NULL OR p_hasta IS NULL OR p_desde = p_hasta) THEN
    RAISE EXCEPTION 'Poné desde qué hora y hasta qué hora.';
  END IF;

  INSERT INTO pedidos_horario (user_id, semana, fechas, tipo, desde, hasta, motivo)
  VALUES (
    auth.uid(),
    v_semana,
    (SELECT array_agg(DISTINCT f ORDER BY f) FROM unnest(p_fechas) f),
    p_tipo,
    CASE WHEN v_franja THEN p_desde END,
    CASE WHEN v_franja THEN p_hasta END,
    btrim(p_motivo)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

COMMIT;

-- ------------------------------------------------------------
-- Verificación: el plazo nuevo y cómo están las próximas semanas ahora.
-- ------------------------------------------------------------
SELECT 'plazo: miércoles a las 22' AS que,
       CASE WHEN pg_get_functiondef('pedidos_horario_abierta(date)'::regprocedure) LIKE '%22:00%'
            THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'semana del ' || to_char(s, 'DD/MM') || ' (se pide hasta el mié ' || to_char(s - 5, 'DD/MM') || ' a las 22)',
       CASE WHEN pedidos_horario_abierta(s) THEN 'abierta' ELSE 'cerrada' END
FROM (
  SELECT (date_trunc('week', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date)::date + 7 * n) AS s
  FROM generate_series(1, 2) n
) x;
