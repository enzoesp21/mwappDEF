-- ============================================================
-- Propinas: el grupo al 25 %, "no es mozo" y las entradas y salidas para la cajera
--
-- Pedidos de Enzo del 03/11:
--   1. "Agregame la parte de 25 % de propina": tip_entries.grupo y
--      propina_grupos.grupo aceptan 'cuarto' (la hora al 25 %).
--   2. "Sacame a mí, Enzo, que no soy mozo": en la planilla su cargo es MOZO
--      y "Traer horas del reloj" lo sumaba solo a la propina de los mozos.
--      propina_grupos.grupo acepta 'afuera' (no es mozo: el reloj no lo suma
--      ni lo ofrece) y Enzo (ESPIÑO ENZO LUCIANO) queda así. Si la cajera lo
--      escribe a mano, entra igual. Se cambia desde Propinas → Porcentaje de
--      cada mozo.
--   3. "Que las cajeras puedan ver si algún mozo no fichó la salida, y a qué
--      hora entraron y salieron": reloj_para_propinas() devuelve también la
--      entrada, la salida, los tramos (si cortó), qué fichada falta y de dónde
--      salen las horas (el reloj, el papel o un encargado a mano). Lo sigue
--      usando solo quien carga propinas, y de un solo día.
--
-- No toca ninguna propina ya cargada ni ninguna fichada. Se puede correr dos veces.
-- ============================================================

-- Freno: necesita las propinas, los grupos y la planilla, y a Enzo una sola vez en la planilla.
DO $$
BEGIN
  IF to_regclass('public.tip_entries') IS NULL OR to_regprocedure('public.puede_cargar_propinas()') IS NULL THEN
    RAISE EXCEPTION 'Faltan las propinas: corré primero supabase/add_propinas.sql.';
  END IF;
  IF to_regclass('public.propina_grupos') IS NULL THEN
    RAISE EXCEPTION 'Faltan los grupos de propina: corré primero supabase/add_propina_grupos.sql.';
  END IF;
  IF to_regclass('public.planilla_celdas') IS NULL OR to_regclass('public.planilla_empleados') IS NULL THEN
    RAISE EXCEPTION 'Falta la planilla maestra: corré primero supabase/add_fichadas_planilla.sql.';
  END IF;
  IF (SELECT count(*) FROM planilla_empleados WHERE nombre = 'ESPIÑO ENZO LUCIANO') <> 1 THEN
    RAISE EXCEPTION 'No encuentro a ESPIÑO ENZO LUCIANO en la planilla (o está dos veces): no cambié nada.';
  END IF;
END $$;

-- 1. La hora al 25 % ('cuarto'), en las propinas cargadas y en los porcentajes.
ALTER TABLE tip_entries DROP CONSTRAINT IF EXISTS tip_entries_grupo_check;
ALTER TABLE tip_entries ADD CONSTRAINT tip_entries_grupo_check
  CHECK (grupo IN ('camarero', 'reducido', 'prueba', 'cuarto'));

-- 2. "No es mozo" ('afuera'), y Enzo así.
ALTER TABLE propina_grupos DROP CONSTRAINT IF EXISTS propina_grupos_grupo_check;
ALTER TABLE propina_grupos ADD CONSTRAINT propina_grupos_grupo_check
  CHECK (grupo IN ('camarero', 'reducido', 'prueba', 'cuarto', 'afuera'));

INSERT INTO propina_grupos (empleado_id, grupo, updated_at)
SELECT id, 'afuera', now() FROM planilla_empleados WHERE nombre = 'ESPIÑO ENZO LUCIANO'
ON CONFLICT (empleado_id) DO UPDATE SET grupo = 'afuera', updated_at = now();

-- 3. Lo mismo que antes, más la entrada, la salida, los tramos, lo que falta y el origen.
CREATE OR REPLACE FUNCTION reloj_para_propinas(p_fecha date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio date;
  v_datos jsonb;
BEGIN
  IF NOT puede_cargar_propinas() THEN
    RAISE EXCEPTION 'Solo quien carga propinas puede traer las horas del reloj.' USING ERRCODE = '42501';
  END IF;

  -- La semana de Horarios que incluye ese día (publicada o en borrador). Si
  -- no hay, la última anterior: sirve para saber el sector, no la celda.
  SELECT week_start, data INTO v_inicio, v_datos
  FROM schedule_weeks
  WHERE week_start <= p_fecha
  ORDER BY week_start DESC
  LIMIT 1;

  RETURN (
    WITH gente AS (
      SELECT btrim(s->>'nombre') AS sector,
             btrim(p->>'nombre') AS nombre,
             -- Nombre comparable: sin tildes, en minúscula y con un solo espacio.
             lower(regexp_replace(translate(btrim(p->>'nombre'), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '\s+', ' ', 'g')) AS clave,
             -- La celda de ese día (si la semana es otra, el índice no existe y queda vacía).
             nullif(btrim(p->'dias'->>(p_fecha - v_inicio)), '') AS celda
      FROM jsonb_array_elements(coalesce(v_datos->'sectores', '[]'::jsonb)) s,
           jsonb_array_elements(coalesce(s->'personas', '[]'::jsonb)) p
      WHERE btrim(coalesce(p->>'nombre', '')) <> ''
    ),
    del_dia AS (
      SELECT e.orden, e.nombre, e.profile_id, e.cargo, coalesce(e.nombres_horario, '{}') AS nombres_horario,
             c.horas, c.minutos, c.estado, c.origen, c.entrada, c.salida, c.tramos,
             c.sugerencia->>'falta' AS falta,
             pr.puesto,
             ARRAY(
               SELECT lower(regexp_replace(translate(btrim(n), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'), '\s+', ' ', 'g'))
               FROM unnest(coalesce(e.nombres_horario, '{}')) n
             ) AS claves
      FROM planilla_celdas c
      JOIN planilla_empleados e ON e.id = c.empleado_id
      LEFT JOIN profiles pr ON pr.id = e.profile_id
      WHERE c.periodo = date_trunc('month', p_fecha)::date
        AND c.dia = extract(day FROM p_fecha)::int
        AND (c.horas > 0 OR c.estado <> 'ok')
    )
    SELECT jsonb_build_object(
      'semana', v_inicio,
      'personas', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'nombre', d.nombre,
          'profile_id', d.profile_id,
          'nombres_horario', to_jsonb(d.nombres_horario),
          'horas', d.horas,
          'minutos', d.minutos,
          'estado', d.estado,
          'origen', d.origen,
          'entrada', to_char(d.entrada, 'HH24:MI'),
          'salida', to_char(d.salida, 'HH24:MI'),
          'tramos', coalesce(d.tramos, '[]'::jsonb),
          'falta', d.falta,
          'cargo', d.cargo,
          'puesto', d.puesto,
          'horario', coalesce((
            SELECT jsonb_agg(jsonb_build_object('sector', g.sector, 'celda', g.celda))
            FROM gente g
            WHERE g.clave = ANY (d.claves)
          ), '[]'::jsonb)
        ) ORDER BY d.orden)
        FROM del_dia d
      ), '[]'::jsonb),
      'sin_reloj', coalesce((
        SELECT jsonb_agg(jsonb_build_object('sector', g.sector, 'nombre', g.nombre, 'celda', g.celda))
        FROM gente g
        WHERE g.celda IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM del_dia d WHERE g.clave = ANY (d.claves))
      ), '[]'::jsonb)
    )
  );
END;
$$;
REVOKE ALL ON FUNCTION reloj_para_propinas(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reloj_para_propinas(date) TO authenticated;

-- Verificación: cinco filas, todas "listo" (o "no es mozo" la de Enzo).
SELECT 'propinas al 25 %' AS que,
       CASE WHEN (SELECT pg_get_constraintdef(oid) FROM pg_constraint
                  WHERE conname = 'tip_entries_grupo_check' AND conrelid = 'public.tip_entries'::regclass) LIKE '%cuarto%'
            THEN 'listo' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'porcentajes: 25 % y "no es mozo"',
       CASE WHEN (SELECT pg_get_constraintdef(oid) FROM pg_constraint
                  WHERE conname = 'propina_grupos_grupo_check' AND conrelid = 'public.propina_grupos'::regclass) LIKE '%afuera%'
            THEN 'listo' ELSE 'FALTA' END
UNION ALL
SELECT 'Enzo (ESPIÑO ENZO LUCIANO)',
       coalesce((SELECT CASE g.grupo WHEN 'afuera' THEN 'no es mozo' ELSE 'MAL: ' || g.grupo END
                 FROM propina_grupos g JOIN planilla_empleados e ON e.id = g.empleado_id
                 WHERE e.nombre = 'ESPIÑO ENZO LUCIANO'), 'FALTA')
UNION ALL
SELECT 'entradas y salidas para la cajera',
       CASE WHEN pg_get_functiondef('reloj_para_propinas(date)'::regprocedure) LIKE '%''salida'', to_char%'
            THEN 'listo' ELSE 'FALTA: corré de nuevo este archivo entero' END
UNION ALL
SELECT 'quién puede usar esa función',
       CASE WHEN has_function_privilege('anon', 'reloj_para_propinas(date)', 'EXECUTE') THEN 'MAL: cualquiera'
            ELSE 'listo: solo quien carga propinas' END;
