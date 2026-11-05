-- ============================================================
-- Horarios: pedidos de cambio del personal
--
-- Pedido de Facundo (encargado de los horarios), 05/11: que el personal
-- tenga hasta el JUEVES A LA NOCHE para pedir un cambio de horario o avisar
-- qué día no puede venir, o en qué franja, y por qué. Los encargados
-- deciden si lo aprueban o no.
--
-- Lo que decidió Enzo:
--   - Aprobar NO cambia el horario solo: queda marcado en el editor, al
--     lado de esa persona y ese día, y Facu arma la semana con eso.
--   - El plazo cierra el jueves anterior a las 23:59 (hora de Argentina).
--     Después ya no se puede pedir para esa semana: lo frena esta base.
--   - Se puede pedir para la semana que viene y para cualquiera más
--     adelante (un turno médico, un examen, un viaje).
--
-- - pedidos_horario: un pedido por persona, con uno o más días de la misma
--   semana, qué necesita (no puede venir, puede solo en una franja, no puede
--   en una franja u otro cambio), el motivo y la respuesta del encargado.
--   Cada uno ve los suyos; los admin, todos. Nadie escribe directo:
-- - pedir_cambio_horario(): pide (con el freno del plazo).
-- - cancelar_pedido_horario(): borra el propio, si sigue sin respuesta y en
--   plazo.
-- - responder_pedido_horario(): solo admin. Aprueba, no aprueba o lo vuelve a
--   dejar sin responder, y le avisa a la persona en la campanita.
--
-- No toca ninguna tabla que ya exista. Se puede correr dos veces.
-- ============================================================

-- Freno: necesita los usuarios, is_admin() y las notificaciones.
DO $$
BEGIN
  IF to_regprocedure('public.is_admin()') IS NULL THEN
    RAISE EXCEPTION 'Falta la función is_admin(): corré primero supabase/schema.sql.';
  END IF;
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'Faltan las notificaciones: corré primero supabase/add_suggestions_notifications.sql.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS pedidos_horario (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- El lunes de la semana del pedido: todos los días son de esa semana.
  semana         date NOT NULL,
  fechas         date[] NOT NULL,
  tipo           text NOT NULL CHECK (tipo IN ('no_puedo', 'solo_franja', 'no_franja', 'otro')),
  -- La franja, solo para "puedo solo" y "no puedo" en un horario.
  desde          time,
  hasta          time,
  motivo         text NOT NULL,
  estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  respuesta      text,
  respondido_por uuid REFERENCES profiles(id) ON DELETE SET NULL,
  respondido_en  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedidos_horario_lunes CHECK (extract(isodow FROM semana) = 1),
  CONSTRAINT pedidos_horario_dias CHECK (cardinality(fechas) BETWEEN 1 AND 7),
  CONSTRAINT pedidos_horario_franja CHECK (
    (tipo IN ('solo_franja', 'no_franja')) = (desde IS NOT NULL AND hasta IS NOT NULL)
    AND (desde IS NULL OR desde <> hasta)
  ),
  CONSTRAINT pedidos_horario_motivo CHECK (char_length(btrim(motivo)) BETWEEN 3 AND 500),
  CONSTRAINT pedidos_horario_respuesta CHECK (respuesta IS NULL OR char_length(respuesta) <= 500)
);
CREATE INDEX IF NOT EXISTS pedidos_horario_semana_idx ON pedidos_horario (semana);
CREATE INDEX IF NOT EXISTS pedidos_horario_usuario_idx ON pedidos_horario (user_id, semana);

ALTER TABLE pedidos_horario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pedidos_horario_ver ON pedidos_horario;
CREATE POLICY pedidos_horario_ver ON pedidos_horario
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
-- Sin políticas para escribir: se pide, se cancela y se responde con las funciones de abajo.

-- Si todavía se puede pedir para la semana de ese lunes: hasta el jueves
-- anterior a las 23:59 de Argentina (el lunes menos 3 es el viernes anterior).
CREATE OR REPLACE FUNCTION pedidos_horario_abierta(p_semana date)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_semana - 3 > (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
$$;

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
    RAISE EXCEPTION 'Para la semana del % ya cerró el plazo: era hasta el jueves % a las 23:59.',
      to_char(v_semana, 'DD/MM'), to_char(v_semana - 4, 'DD/MM');
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

CREATE OR REPLACE FUNCTION cancelar_pedido_horario(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v pedidos_horario%ROWTYPE;
BEGIN
  SELECT * INTO v FROM pedidos_horario WHERE id = p_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró ese pedido.';
  END IF;
  IF v.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Ese pedido ya tiene respuesta: si necesitás cambiarlo, hablalo con un encargado.';
  END IF;
  IF NOT pedidos_horario_abierta(v.semana) THEN
    RAISE EXCEPTION 'Ya cerró el plazo de esa semana: si necesitás cambiarlo, hablalo con un encargado.';
  END IF;
  DELETE FROM pedidos_horario WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION responder_pedido_horario(p_id uuid, p_estado text, p_respuesta text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v pedidos_horario%ROWTYPE;
  v_dias text;
  v_respuesta text := nullif(btrim(coalesce(p_respuesta, '')), '');
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Solo un encargado puede responder los pedidos.' USING ERRCODE = '42501';
  END IF;
  IF p_estado NOT IN ('aprobado', 'rechazado', 'pendiente') THEN
    RAISE EXCEPTION 'Esa respuesta no existe.';
  END IF;

  UPDATE pedidos_horario
  SET estado = p_estado,
      respuesta = CASE WHEN p_estado = 'pendiente' THEN NULL ELSE v_respuesta END,
      respondido_por = CASE WHEN p_estado = 'pendiente' THEN NULL ELSE auth.uid() END,
      respondido_en = CASE WHEN p_estado = 'pendiente' THEN NULL ELSE now() END
  WHERE id = p_id
  RETURNING * INTO v;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró ese pedido: puede que lo hayan cancelado.';
  END IF;

  -- A la persona le llega en la campanita.
  IF p_estado <> 'pendiente' THEN
    SELECT string_agg(to_char(f, 'DD/MM'), ', ' ORDER BY f) INTO v_dias FROM unnest(v.fechas) f;
    INSERT INTO notifications (user_id, message)
    VALUES (
      v.user_id,
      'Tu pedido de horario (' || v_dias || ') '
        || CASE WHEN p_estado = 'aprobado' THEN 'fue aprobado' ELSE 'no fue aprobado' END
        || coalesce(': ' || v_respuesta, '.')
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION pedir_cambio_horario(date[], text, time, time, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cancelar_pedido_horario(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION responder_pedido_horario(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pedir_cambio_horario(date[], text, time, time, text) TO authenticated;
GRANT EXECUTE ON FUNCTION cancelar_pedido_horario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION responder_pedido_horario(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION pedidos_horario_abierta(date) TO authenticated;

-- Verificación: cinco filas, todas "lista" (la última dice hasta cuándo se puede pedir).
SELECT 'tabla pedidos_horario' AS que,
       CASE WHEN to_regclass('public.pedidos_horario') IS NOT NULL THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'quién ve los pedidos',
       CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pedidos_horario'::regclass)
                 AND (SELECT count(*) FROM pg_policies WHERE tablename = 'pedidos_horario') = 1
            THEN 'lista: cada uno los suyos, los encargados todos' ELSE 'REVISAR' END
UNION ALL
SELECT 'funciones para pedir, cancelar y responder',
       CASE WHEN to_regprocedure('pedir_cambio_horario(date[], text, time, time, text)') IS NOT NULL
                 AND to_regprocedure('cancelar_pedido_horario(uuid)') IS NOT NULL
                 AND to_regprocedure('responder_pedido_horario(uuid, text, text)') IS NOT NULL
                 AND NOT has_function_privilege('anon', 'pedir_cambio_horario(date[], text, time, time, text)', 'EXECUTE')
            THEN 'lista' ELSE 'FALTA' END
UNION ALL
SELECT 'pedidos cargados', count(*)::text FROM pedidos_horario
UNION ALL
SELECT 'hoy se puede pedir desde la semana del',
       to_char(min(s), 'DD/MM')
FROM generate_series(date_trunc('week', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date,
                     date_trunc('week', now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + 21,
                     interval '7 days') AS g(s)
WHERE pedidos_horario_abierta(s::date);
