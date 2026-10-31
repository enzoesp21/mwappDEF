-- ============================================================
-- Fichadas del reloj (EP300 Pro) en la app, casi en tiempo real
--
-- CrossChex, en la PC de la caja, recibe las fichadas del reloj y las guarda
-- en su base (CrossChex.mdb). Un programa chico en esa misma PC
-- (fichero/sincronizar-fichadas.ps1) lee las nuevas cada minuto y las manda
-- acá con la función registrar_fichadas. El panel de admin las muestra en
-- Fichadas: quién está adentro ahora y lo que se fichó en el día.
--
-- Seguridad:
--   - El programa de la caja NO usa un usuario de la app. Entra con la clave
--     del fichero (fichero_config.token), que se genera sola acá y se copia
--     una vez en la PC. Con esa clave solo puede AGREGAR fichadas y nombres:
--     no puede leer ni borrar nada.
--   - Las fichadas, los nombres y el estado los ven solo los admin (RLS).
--   - Del reloj solo se guarda número, nombre y sector de cada persona. Nada
--     de huellas, documentos ni teléfonos.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente: si se corre dos
-- veces no duplica nada ni cambia la clave del fichero.
-- Al final muestra la clave del fichero: copiala en la configuración del
-- programa de la caja (config.json, campo "clave").
-- ============================================================

BEGIN;

-- La clave con la que entra el programa de la caja. Una sola fila.
-- Sin políticas de RLS: nadie la puede leer desde la app, solo desde el
-- editor SQL.
CREATE TABLE IF NOT EXISTS fichero_config (
  id      int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token   text NOT NULL,
  creado  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fichero_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fichero_config FROM anon, authenticated;

-- 64 caracteres al azar. Solo se genera la primera vez.
INSERT INTO fichero_config (id, token)
VALUES (1, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (id) DO NOTHING;

-- Las personas como están cargadas en CrossChex. Es una lista aparte de los
-- usuarios de la app (igual que en horarios): mucha gente ficha y no tiene
-- usuario.
CREATE TABLE IF NOT EXISTS fichero_personas (
  userid      text PRIMARY KEY,           -- el "Usuario Nro." de CrossChex
  nombre      text NOT NULL,
  sector      text,                       -- el departamento de CrossChex
  actualizado timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fichero_personas ENABLE ROW LEVEL SECURITY;

-- Cada fichada. logid es el número correlativo que pone CrossChex.
-- tipo: 0 entrada, 1 salida, 2 break, 3 fin de break (tabla Status de CrossChex).
CREATE TABLE IF NOT EXISTS fichadas (
  logid       bigint PRIMARY KEY,
  userid      text NOT NULL,
  fecha_hora  timestamptz NOT NULL,
  tipo        smallint NOT NULL,
  dispositivo int,
  recibida    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fichadas_una_por_segundo UNIQUE (userid, fecha_hora)
);
CREATE INDEX IF NOT EXISTS idx_fichadas_fecha ON fichadas (fecha_hora DESC);
ALTER TABLE fichadas ENABLE ROW LEVEL SECURITY;

-- Cómo anda el programa de la caja. Una sola fila, la pisa cada minuto.
-- Sirve para avisar en la app si la PC se apagó o CrossChex dejó de bajar.
CREATE TABLE IF NOT EXISTS fichero_estado (
  id                       int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ultima_conexion          timestamptz,  -- la última vez que el programa habló
  ultima_fichada_crosschex timestamptz,  -- la fichada más nueva que hay en CrossChex
  ultimo_logid             bigint NOT NULL DEFAULT 0,  -- hasta dónde ya se mandó
  version                  text,
  equipo                   text,
  error                    text
);
ALTER TABLE fichero_estado ENABLE ROW LEVEL SECURITY;
INSERT INTO fichero_estado (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Solo los admin ven fichadas, nombres y estado. Nadie escribe desde la app:
-- todo entra por registrar_fichadas.
DROP POLICY IF EXISTS fichadas_admin_lee ON fichadas;
CREATE POLICY fichadas_admin_lee ON fichadas
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS fichero_personas_admin_lee ON fichero_personas;
CREATE POLICY fichero_personas_admin_lee ON fichero_personas
  FOR SELECT TO authenticated USING (is_admin());

DROP POLICY IF EXISTS fichero_estado_admin_lee ON fichero_estado;
CREATE POLICY fichero_estado_admin_lee ON fichero_estado
  FOR SELECT TO authenticated USING (is_admin());

-- Lo que llama el programa de la caja cada minuto.
--   p_fichadas: [{"id": 132314, "u": "423", "t": "2026-10-31 09:58:12", "k": 0, "d": 5}, ...]
--               (t es la hora de Argentina, tal cual la guarda CrossChex)
--   p_personas: [{"u": "423", "n": "Nombre Apellido", "s": "Cocina"}, ...] o null si no cambiaron
--   p_info:     {"ultima": "2026-10-31 09:58:12", "version": "1", "equipo": "CAJA", "error": null}
-- Devuelve hasta qué logid ya tiene guardado, para que el programa siga desde ahí.
CREATE OR REPLACE FUNCTION registrar_fichadas(
  p_token    text,
  p_fichadas jsonb DEFAULT '[]'::jsonb,
  p_personas jsonb DEFAULT NULL,
  p_info     jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_nuevas  int := 0;
  v_hasta   bigint;
BEGIN
  IF p_token IS NULL OR NOT EXISTS (SELECT 1 FROM fichero_config WHERE id = 1 AND token = p_token) THEN
    RAISE EXCEPTION 'La clave del fichero no es correcta.';
  END IF;

  p_fichadas := coalesce(p_fichadas, '[]'::jsonb);
  IF jsonb_typeof(p_fichadas) <> 'array' THEN
    RAISE EXCEPTION 'Las fichadas tienen que venir en una lista.';
  END IF;
  IF jsonb_array_length(p_fichadas) > 1000 THEN
    RAISE EXCEPTION 'Demasiadas fichadas juntas: mandá de a 1000 como mucho.';
  END IF;

  -- Las repetidas (mismo logid, o misma persona en el mismo segundo) se saltean.
  INSERT INTO fichadas (logid, userid, fecha_hora, tipo, dispositivo)
  SELECT (f->>'id')::bigint,
         f->>'u',
         (f->>'t')::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires',
         (f->>'k')::smallint,
         (f->>'d')::int
  FROM jsonb_array_elements(p_fichadas) f
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_nuevas = ROW_COUNT;

  IF p_personas IS NOT NULL AND jsonb_typeof(p_personas) = 'array' THEN
    INSERT INTO fichero_personas (userid, nombre, sector, actualizado)
    SELECT p->>'u', coalesce(nullif(trim(p->>'n'), ''), 'Nro. ' || (p->>'u')), nullif(trim(p->>'s'), ''), now()
    FROM jsonb_array_elements(p_personas) p
    WHERE coalesce(p->>'u', '') <> ''
    ON CONFLICT (userid) DO UPDATE
      SET nombre = excluded.nombre, sector = excluded.sector, actualizado = now()
      WHERE fichero_personas.nombre IS DISTINCT FROM excluded.nombre
         OR fichero_personas.sector IS DISTINCT FROM excluded.sector;
  END IF;

  -- El avance se guarda aparte del máximo de la tabla: si las últimas que
  -- llegaron eran repetidas, igual hay que pasarlas para no mandarlas de nuevo.
  UPDATE fichero_estado
  SET ultima_conexion = now(),
      ultima_fichada_crosschex = coalesce(
        (nullif(p_info->>'ultima', ''))::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires',
        ultima_fichada_crosschex),
      ultimo_logid = greatest(
        ultimo_logid,
        coalesce((SELECT max((f->>'id')::bigint) FROM jsonb_array_elements(p_fichadas) f), 0)),
      version = left(p_info->>'version', 20),
      equipo  = left(p_info->>'equipo', 50),
      error   = left(nullif(p_info->>'error', ''), 500)
  WHERE id = 1
  RETURNING ultimo_logid INTO v_hasta;

  RETURN jsonb_build_object('ok', true, 'nuevas', v_nuevas, 'ultimo_logid', v_hasta);
END;
$$;

REVOKE ALL ON FUNCTION registrar_fichadas(text, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_fichadas(text, jsonb, jsonb, jsonb) TO anon, authenticated;

-- Freno: la clave tiene que haber quedado generada.
DO $$
BEGIN
  IF (SELECT length(token) FROM fichero_config WHERE id = 1) IS DISTINCT FROM 64 THEN
    RAISE EXCEPTION 'No se generó la clave del fichero: se cancela todo.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: copiá la clave en config.json de la PC de la caja
-- ------------------------------------------------------------
SELECT (SELECT token FROM fichero_config WHERE id = 1)  AS clave_del_fichero,
       (SELECT count(*) FROM fichadas)                   AS fichadas_cargadas,
       (SELECT count(*) FROM fichero_personas)           AS personas,
       (SELECT ultima_conexion FROM fichero_estado)      AS ultima_conexion_de_la_caja;
