-- ============================================================
-- Planilla: recalcular apenas llegan fichadas atrasadas
--
-- Enzo, 17/11: el 16/11 la PC de la caja se apagó a las 21 y dejó de mandar
-- fichadas. Al otro día, a las 12:01, mandó todo lo atrasado (30 fichadas,
-- entre ellas la salida de Ariana Mastrella de las 21:12), pero la planilla se
-- había recalculado a las 11:20 y la próxima pasada era a las 13:20: el 16/11
-- seguía "incompleto" aunque la fichada ya estaba.
--
-- Ahora, cuando la caja manda una tanda con fichadas de hace más de 30
-- minutos (lo que quedó guardado mientras la PC estuvo apagada o sin
-- internet), la base le pide a la app que recalcule la planilla desde el día
-- de la más vieja hasta hoy, en el momento. Lo de todos los días (las
-- fichadas que llegan al minuto) sigue con la pasada de cada 2 horas.
--
-- Es un trigger en "fichadas" (una vez por tanda, no por fichada) que usa
-- la misma dirección y clave que el proceso automático (planilla_config). No
-- toca ninguna fichada. Los meses cerrados, el proceso los saltea solo.
--
-- Al final, recalcula una vez del 10/11 a hoy, así se arregla ya el 16/11.
-- Se puede correr dos veces.
-- ============================================================

-- Freno: tiene que estar el proceso automático de la planilla.
DO $$
BEGIN
  IF to_regclass('public.fichadas') IS NULL THEN
    RAISE EXCEPTION 'Falta la tabla de fichadas: corré primero supabase/add_fichadas.sql.';
  END IF;
  IF to_regclass('public.planilla_config') IS NULL OR NOT EXISTS (SELECT 1 FROM planilla_config WHERE id = 1) THEN
    RAISE EXCEPTION 'Falta el proceso automático de la planilla: corré primero supabase/add_planilla_proceso.sql.';
  END IF;
  IF to_regprocedure('net.http_post(text, jsonb, jsonb, jsonb, integer)') IS NULL THEN
    RAISE EXCEPTION 'Falta la extensión pg_net (la usa el proceso automático de la planilla).';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION planilla_recalcular_atrasadas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vieja timestamptz;
  v_desde date;
  v_hasta date := (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
BEGIN
  SELECT min(fecha_hora) INTO v_vieja
  FROM nuevas
  WHERE fecha_hora < now() - interval '30 minutes';
  IF v_vieja IS NULL THEN
    RETURN NULL; -- Llegaron al minuto: alcanza con la pasada de cada 2 horas.
  END IF;

  -- La jornada de la planilla arranca a las 07:00: una fichada de las 06:30 es
  -- del día anterior. El proceso acepta hasta 2 meses por vez.
  v_desde := greatest(
    ((v_vieja AT TIME ZONE 'America/Argentina/Buenos_Aires') - interval '7 hours')::date,
    v_hasta - 55
  );

  PERFORM net.http_post(
    url := (SELECT url FROM planilla_config WHERE id = 1) || '/api/planilla/actualizar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-clave', (SELECT clave FROM planilla_config WHERE id = 1)),
    body := jsonb_build_object('desde', v_desde, 'hasta', v_hasta),
    timeout_milliseconds := 60000
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Nunca puede frenar que se guarden las fichadas: si el pedido falla, queda
  -- la pasada de cada 2 horas.
  RAISE WARNING 'No se pudo pedir el recálculo de la planilla: %', SQLERRM;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION planilla_recalcular_atrasadas() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS planilla_recalcular_atrasadas ON fichadas;
CREATE TRIGGER planilla_recalcular_atrasadas
  AFTER INSERT ON fichadas
  REFERENCING NEW TABLE AS nuevas
  FOR EACH STATEMENT EXECUTE FUNCTION planilla_recalcular_atrasadas();

-- Ahora mismo: del 10/11 a hoy, así el 16/11 de Ariana (y lo demás) queda bien.
SELECT net.http_post(
  url := (SELECT url FROM planilla_config WHERE id = 1) || '/api/planilla/actualizar',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-clave', (SELECT clave FROM planilla_config WHERE id = 1)),
  body := jsonb_build_object('desde', '2026-11-10', 'hasta', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  timeout_milliseconds := 60000
) AS pedido_de_recalculo;

-- Verificación: "listo". Para ver si el recálculo anduvo, a los 30 segundos:
--   select status_code, content from net._http_response order by created desc limit 1;
-- tiene que decir 200 y "ok":true.
SELECT 'recalcular al llegar fichadas atrasadas' AS que,
       CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'planilla_recalcular_atrasadas')
            THEN 'listo' ELSE 'FALTA' END AS resultado;
