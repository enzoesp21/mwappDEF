-- ============================================================
-- Propinas: "Traer horas del reloj" suma a todos los mozos del día
--
-- Hasta ahora el botón solo completaba las horas de los nombres que ya
-- estaban en la lista (la del último día cargado): si un mozo no figuraba,
-- no lo agregaba. El 31/10 la lista arrancó con 2 nombres y trajo 1.
--
-- Esta función nueva devuelve, para una fecha:
--   - personas: todos los que tienen ese día en la planilla maestra (con
--     horas o incompletos), con el cargo de la planilla, el puesto de su
--     usuario y en qué sector de Horarios figuran esa semana (y qué dice su
--     celda ese día).
--   - sin_reloj: quienes tienen algo escrito en Horarios ese día y no
--     tienen nada en la planilla (no ficharon o no tienen número del reloj).
-- Con eso la app suma sola a los mozos que faltan, marca los incompletos y
-- ofrece sumar a los runners con un toque. Quién es mozo lo decide la app.
--
-- Igual que horas_para_propinas, la puede usar solo quien carga propinas y
-- muestra solo ese día. No cambia ninguna tabla. Se puede correr dos veces.
-- ============================================================

-- Freno: necesita la planilla maestra y las propinas ya instaladas.
DO $$
BEGIN
  IF to_regclass('public.planilla_celdas') IS NULL OR to_regclass('public.planilla_empleados') IS NULL THEN
    RAISE EXCEPTION 'Falta la planilla maestra: corré primero supabase/add_fichadas_planilla.sql.';
  END IF;
  IF to_regprocedure('public.puede_cargar_propinas()') IS NULL THEN
    RAISE EXCEPTION 'Faltan las propinas: corré primero supabase/add_propinas.sql.';
  END IF;
END $$;

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
             c.horas, c.estado, pr.puesto,
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
          'estado', d.estado,
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

-- Verificación: "lista", "solo usuarios con sesión" y cuántos mozos tienen
-- horas el 31/10 según la planilla (los que el botón tiene que sumar).
SELECT 'función reloj_para_propinas' AS que,
       CASE WHEN to_regprocedure('reloj_para_propinas(date)') IS NOT NULL THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'quién la puede usar',
       CASE WHEN has_function_privilege('anon', 'reloj_para_propinas(date)', 'EXECUTE') THEN 'MAL: cualquiera'
            ELSE 'solo usuarios con sesión (y adentro se fija si cargan propinas)' END
UNION ALL
SELECT 'mozos con horas el 31/10 en la planilla (cargo MOZO)', count(*)::text
FROM planilla_celdas c
JOIN planilla_empleados e ON e.id = c.empleado_id
WHERE c.periodo = '2026-10-01' AND c.dia = 31 AND c.horas > 0 AND upper(btrim(coalesce(e.cargo, ''))) = 'MOZO';
