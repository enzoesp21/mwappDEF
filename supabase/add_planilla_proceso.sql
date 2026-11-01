-- ============================================================
-- Fichadas y Planilla Maestra — parte 3: la planilla se llena sola
--
-- Cada 2 horas (07:20, 09:20, 11:20... hora de Argentina) Supabase le avisa a
-- la app (/api/planilla/actualizar). La app recalcula la jornada anterior, la
-- de hoy y los 3 días de antes, y guarda las celdas. La primera vez que toca
-- un mes lo calcula entero: así octubre se arma solo.
--
-- Qué crea:
--   1. planilla_config: la clave con la que Supabase llama a la app y la
--      dirección de la app. Desde la app nadie la puede leer; solo desde este
--      editor.
--   2. planilla_datos y planilla_guardar: lo único que se puede hacer con esa
--      clave (leer lo necesario y guardar la planilla). También las usa el
--      botón "Actualizar ahora" de un admin. La base es el freno: no pisa
--      celdas bloqueadas, manuales, de código ni de papel, y no toca meses
--      cerrados.
--   3. Activa pg_net y pg_cron (las extensiones para que Supabase llame solo)
--      y programa la tarea "planilla-actualizar".
--   4. El número 612 del reloj (MORENA) es Morena Ruiz (lo confirmó Enzo).
--   5. Una primera llamada ahora mismo, para que arme octubre.
--
-- ANTES de correrlo, la app tiene que estar publicada con la parte 3. Si no,
-- la primera llamada falla, pero se reintenta sola a las 2 horas.
--
-- Se puede correr dos veces: no cambia la clave ni duplica la tarea.
-- ============================================================

BEGIN;

-- 1. La clave con la que Supabase llama a la app --------------------------------
CREATE TABLE IF NOT EXISTS planilla_config (
  id     int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  clave  text NOT NULL,
  url    text NOT NULL,                       -- la dirección de la app publicada
  creado timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE planilla_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON planilla_config FROM anon, authenticated;

-- 64 caracteres al azar. Solo se genera la primera vez.
INSERT INTO planilla_config (id, clave, url)
VALUES (1, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
        'https://mwappdef.vercel.app')
ON CONFLICT (id) DO NOTHING;

-- ¿Puede leer o guardar la planilla? Un admin con su sesión, o quien traiga la clave.
CREATE OR REPLACE FUNCTION planilla_puede(p_clave text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin()
      OR (p_clave IS NOT NULL AND EXISTS (SELECT 1 FROM planilla_config WHERE id = 1 AND clave = p_clave));
$$;
REVOKE ALL ON FUNCTION planilla_puede(text) FROM PUBLIC, anon, authenticated;

-- 2a. Lo que necesita la cuenta para un rango de jornadas -----------------------
CREATE OR REPLACE FUNCTION planilla_datos(p_clave text, p_desde date, p_hasta date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desde  date;
  v_inicio timestamptz;
  v_fin    timestamptz;
BEGIN
  IF NOT planilla_puede(p_clave) THEN
    RAISE EXCEPTION 'Sin permiso para leer la planilla.' USING ERRCODE = '42501';
  END IF;
  IF p_desde IS NULL OR p_hasta IS NULL OR p_hasta < p_desde OR p_hasta - p_desde > 62 THEN
    RAISE EXCEPTION 'Las fechas no son válidas (como mucho 2 meses).';
  END IF;

  -- Un mes que nunca se calculó se calcula entero (el primero, o uno que empieza).
  SELECT least(p_desde, min(m)::date) INTO v_desde
  FROM generate_series(date_trunc('month', p_desde), date_trunc('month', p_hasta), interval '1 month') AS m
  WHERE NOT EXISTS (SELECT 1 FROM planilla_meses pm
                    WHERE pm.periodo = m::date AND pm.ultima_actualizacion IS NOT NULL);

  -- 30 días antes para el "habitual" de cada uno, y hasta la mañana siguiente
  -- del último día (las salidas de madrugada son de la jornada anterior).
  v_inicio := (v_desde - 31)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_fin    := (p_hasta + 2)::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires';

  RETURN jsonb_build_object(
    'desde', v_desde,
    'hasta', p_hasta,
    'empleados', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                      'id', e.id, 'nombre', e.nombre, 'calendario', e.jornada_calendario,
                      'nombres_horario', to_jsonb(e.nombres_horario)) ORDER BY e.orden), '[]'::jsonb)
                  FROM planilla_empleados e),
    'alias', (SELECT coalesce(jsonb_agg(jsonb_build_array(a.userid, a.empleado_id)), '[]'::jsonb)
              FROM planilla_reloj_alias a
              WHERE NOT a.ignorar AND a.empleado_id IS NOT NULL),
    'fichadas', (SELECT coalesce(jsonb_agg(jsonb_build_array(
                     f.logid, f.userid, floor(extract(epoch FROM f.fecha_hora) * 1000)::bigint)
                     ORDER BY f.fecha_hora), '[]'::jsonb)
                 FROM fichadas f
                 WHERE f.fecha_hora >= v_inicio AND f.fecha_hora < v_fin),
    'manuales', (SELECT coalesce(jsonb_agg(jsonb_build_array(
                     m.empleado_id, floor(extract(epoch FROM m.fecha_hora) * 1000)::bigint, m.fuente)), '[]'::jsonb)
                 FROM fichadas_manuales m
                 WHERE m.fecha_hora >= v_inicio AND m.fecha_hora < v_fin),
    -- Solo semanas publicadas. La anterior también, por los días extra (lunes feriado).
    'semanas', (SELECT coalesce(jsonb_agg(jsonb_build_object('week_start', w.week_start, 'data', w.data)), '[]'::jsonb)
                FROM schedule_weeks w
                WHERE w.status = 'published' AND w.week_start BETWEEN v_desde - 13 AND p_hasta),
    'existentes', (SELECT coalesce(jsonb_agg(jsonb_build_array(
                       c.empleado_id, c.periodo + c.dia - 1, c.origen, c.bloqueada)), '[]'::jsonb)
                   FROM planilla_celdas c
                   WHERE c.periodo BETWEEN date_trunc('month', v_desde)::date AND p_hasta
                     AND c.periodo + c.dia - 1 BETWEEN v_desde AND p_hasta),
    'cerrados', (SELECT coalesce(jsonb_agg(pm.periodo), '[]'::jsonb)
                 FROM planilla_meses pm
                 WHERE pm.estado = 'cerrado' AND pm.periodo BETWEEN date_trunc('month', v_desde)::date AND p_hasta)
  );
END;
$$;
REVOKE ALL ON FUNCTION planilla_datos(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION planilla_datos(text, date, date) TO anon, authenticated;

-- 2b. Guardar lo calculado -----------------------------------------------------
-- p_celdas: [{fecha, empleado_id, horas, minutos, estado, origen, entrada,
-- salida, tramos, fichadas_usadas, horario, sugerencia, avisos}, ...]
CREATE OR REPLACE FUNCTION planilla_guardar(
  p_clave text, p_desde date, p_hasta date, p_celdas jsonb, p_forzar_papel boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes       date;
  v_desde     date;
  v_hasta     date;
  v_cerrados  text[] := '{}';
  v_guardadas int := 0;
  v_borradas  int := 0;
  v_cuantas   int;
BEGIN
  IF NOT planilla_puede(p_clave) THEN
    RAISE EXCEPTION 'Sin permiso para guardar la planilla.' USING ERRCODE = '42501';
  END IF;
  IF p_desde IS NULL OR p_hasta IS NULL OR p_hasta < p_desde OR p_hasta - p_desde > 92 THEN
    RAISE EXCEPTION 'Las fechas no son válidas.';
  END IF;
  IF jsonb_typeof(p_celdas) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Las celdas tienen que venir en una lista.';
  END IF;

  FOR v_mes IN
    SELECT m::date FROM generate_series(date_trunc('month', p_desde), date_trunc('month', p_hasta), interval '1 month') AS m
  LOOP
    v_desde := greatest(p_desde, v_mes);
    v_hasta := least(p_hasta, (v_mes + interval '1 month')::date - 1);

    -- Mes nuevo: la foto del orden con todos los activos, también los que no tienen horas.
    INSERT INTO planilla_meses (periodo, empleados)
    SELECT v_mes, coalesce(jsonb_agg(jsonb_build_object(
             'empleado_id', e.id, 'nombre', e.nombre, 'cargo', e.cargo, 'orden', e.orden) ORDER BY e.orden), '[]'::jsonb)
    FROM planilla_empleados e
    WHERE e.activo
    ON CONFLICT (periodo) DO NOTHING;

    IF EXISTS (SELECT 1 FROM planilla_meses WHERE periodo = v_mes AND estado = 'cerrado') THEN
      v_cerrados := v_cerrados || to_char(v_mes, 'MM/YYYY');
      CONTINUE;
    END IF;

    -- Lo calculado. Lo que tocó un admin (bloqueado, manual, código) o vino de
    -- papel no se pisa; papel solo si se pidió rehacerlo (al cargar papel).
    WITH nuevas AS (
      SELECT (c->>'empleado_id')::uuid AS empleado_id, extract(day FROM (c->>'fecha')::date)::int AS dia, c
      FROM jsonb_array_elements(p_celdas) AS c
      WHERE (c->>'fecha')::date BETWEEN v_desde AND v_hasta
    )
    INSERT INTO planilla_celdas AS pc (periodo, empleado_id, dia, horas, minutos, estado, origen, entrada, salida,
                                       tramos, fichadas_usadas, horario, sugerencia, avisos, updated_by, updated_at)
    SELECT v_mes, n.empleado_id, n.dia,
           (n.c->>'horas')::numeric, (n.c->>'minutos')::int, n.c->>'estado', n.c->>'origen',
           (n.c->>'entrada')::time, (n.c->>'salida')::time,
           n.c->'tramos',
           ARRAY(SELECT x::bigint FROM jsonb_array_elements_text(coalesce(n.c->'fichadas_usadas', '[]'::jsonb)) AS x),
           n.c->>'horario', nullif(n.c->'sugerencia', 'null'::jsonb), coalesce(n.c->'avisos', '[]'::jsonb),
           auth.uid(), now()
    FROM nuevas n
    ON CONFLICT (periodo, empleado_id, dia) DO UPDATE SET
      horas = excluded.horas, minutos = excluded.minutos, estado = excluded.estado, origen = excluded.origen,
      entrada = excluded.entrada, salida = excluded.salida, tramos = excluded.tramos,
      fichadas_usadas = excluded.fichadas_usadas, horario = excluded.horario,
      sugerencia = excluded.sugerencia, avisos = excluded.avisos,
      updated_by = excluded.updated_by, updated_at = excluded.updated_at
    WHERE NOT pc.bloqueada
      AND (pc.origen = 'reloj' OR (p_forzar_papel AND pc.origen = 'papel'));
    GET DIAGNOSTICS v_cuantas = ROW_COUNT;
    v_guardadas := v_guardadas + v_cuantas;

    -- Lo que salió del reloj y ya no corresponde (por ejemplo, un número del
    -- reloj que se asoció a otra persona) se borra. Lo de un admin, nunca.
    WITH nuevas AS (
      SELECT DISTINCT (c->>'empleado_id')::uuid AS empleado_id, (c->>'fecha')::date AS fecha
      FROM jsonb_array_elements(p_celdas) AS c
    )
    DELETE FROM planilla_celdas pc
    WHERE pc.periodo = v_mes
      AND pc.dia BETWEEN extract(day FROM v_desde)::int AND extract(day FROM v_hasta)::int
      AND NOT pc.bloqueada
      AND (pc.origen = 'reloj' OR (p_forzar_papel AND pc.origen = 'papel'))
      AND NOT EXISTS (SELECT 1 FROM nuevas n WHERE n.empleado_id = pc.empleado_id AND n.fecha = v_mes + pc.dia - 1);
    GET DIAGNOSTICS v_cuantas = ROW_COUNT;
    v_borradas := v_borradas + v_cuantas;

    -- Al final de la hoja: quien tiene horas este mes y no estaba en la foto,
    -- y los empleados nuevos (dados de alta hasta este mes).
    UPDATE planilla_meses m
    SET empleados = m.empleados || coalesce((
          SELECT jsonb_agg(jsonb_build_object(
                   'empleado_id', e.id, 'nombre', e.nombre, 'cargo', e.cargo, 'orden', e.orden) ORDER BY e.orden)
          FROM planilla_empleados e
          WHERE (EXISTS (SELECT 1 FROM planilla_celdas c WHERE c.periodo = v_mes AND c.empleado_id = e.id)
                 OR (e.activo AND e.created_at < (v_mes + interval '1 month')))
            AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(m.empleados) x WHERE x->>'empleado_id' = e.id::text)
        ), '[]'::jsonb)
    WHERE m.periodo = v_mes;

    -- Totales del mes: HORAS y DÍAS (= horas / 8,5) de cada uno.
    UPDATE planilla_meses m
    SET ultima_actualizacion = now(),
        totales = (
          SELECT jsonb_build_object(
                   'horas_total', coalesce(sum(t.horas), 0),
                   'incompletos', coalesce(sum(t.incompletos), 0),
                   'por_empleado', coalesce(jsonb_object_agg(t.empleado_id::text,
                                     jsonb_build_object('horas', t.horas, 'dias', round(t.horas / 8.5, 2))), '{}'::jsonb))
          FROM (SELECT c.empleado_id, coalesce(sum(c.horas), 0) AS horas,
                       count(*) FILTER (WHERE c.estado = 'incompleto') AS incompletos
                FROM planilla_celdas c WHERE c.periodo = v_mes GROUP BY c.empleado_id) t)
    WHERE m.periodo = v_mes;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'guardadas', v_guardadas, 'borradas', v_borradas,
                            'meses_cerrados', to_jsonb(v_cerrados));
END;
$$;
REVOKE ALL ON FUNCTION planilla_guardar(text, date, date, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION planilla_guardar(text, date, date, jsonb, boolean) TO anon, authenticated;

-- 3. Que Supabase llame a la app cada 2 horas ------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- A los 20 minutos de cada hora par en UTC = 07:20, 09:20, 11:20... en Argentina.
-- Con el mismo nombre, volver a correrlo actualiza la tarea en vez de duplicarla.
SELECT cron.schedule(
  'planilla-actualizar',
  '20 */2 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT url FROM public.planilla_config WHERE id = 1) || '/api/planilla/actualizar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-clave', (SELECT clave FROM public.planilla_config WHERE id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- 4. El 612 del reloj ("MORENA") es Morena Ruiz ------------------------------------
INSERT INTO planilla_reloj_alias (userid, empleado_id, ignorar)
SELECT '612', e.id, false FROM planilla_empleados e WHERE e.nombre = 'RUIZ MORENA'
ON CONFLICT (userid) DO NOTHING;

-- Freno: que esté todo en su lugar.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM planilla_config WHERE id = 1) THEN
    RAISE EXCEPTION 'No se creó la clave de la planilla: se cancela todo.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'planilla-actualizar' AND active) THEN
    RAISE EXCEPTION 'No quedó programada la tarea: se cancela todo.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM planilla_reloj_alias WHERE userid = '612' AND empleado_id IS NOT NULL) THEN
    RAISE EXCEPTION 'No se pudo asociar el 612 del reloj a Morena Ruiz: se cancela todo.';
  END IF;
END $$;

COMMIT;

-- 5. Primera llamada, ya (sale cuando termina de correr este SQL) ----------------
SELECT net.http_post(
  url := (SELECT url FROM planilla_config WHERE id = 1) || '/api/planilla/actualizar',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-clave', (SELECT clave FROM planilla_config WHERE id = 1)),
  body := '{}'::jsonb,
  timeout_milliseconds := 60000
) AS primera_llamada;

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
SELECT 'clave para que Supabase llame a la app' AS que,
       CASE WHEN EXISTS (SELECT 1 FROM planilla_config) THEN 'creada' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'dirección de la app', (SELECT url FROM planilla_config WHERE id = 1)
UNION ALL
SELECT 'tarea programada', coalesce((SELECT jobname || ' · ' || schedule || CASE WHEN active THEN ' · activa' ELSE ' · APAGADA' END
                                     FROM cron.job WHERE jobname = 'planilla-actualizar'), 'FALTA')
UNION ALL
SELECT 'reloj 612 (MORENA)', coalesce((SELECT e.nombre FROM planilla_reloj_alias a
                                       JOIN planilla_empleados e ON e.id = a.empleado_id WHERE a.userid = '612'), 'sin asociar');
