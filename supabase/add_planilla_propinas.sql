-- ============================================================
-- Propinas: traer las horas del reloj (planilla maestra) al cargar un día
--
-- En Propinas, el botón "Traer horas del reloj" completa las horas de cada
-- mozo con lo que dice la planilla maestra de ese día, en vez de copiarlas a
-- mano. La planilla es solo para admin, pero las propinas también las carga
-- quien tiene tildado "Carga propinas" (Ornela): esta función le deja ver
-- SOLO las horas de ese día, y solo a quien puede cargar propinas.
--
-- Se puede correr dos veces.
-- ============================================================

CREATE OR REPLACE FUNCTION horas_para_propinas(p_fecha date)
RETURNS TABLE (nombre text, profile_id uuid, nombres_horario text[], horas numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT puede_cargar_propinas() THEN
    RAISE EXCEPTION 'Solo quien carga propinas puede traer las horas del reloj.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT e.nombre, e.profile_id, e.nombres_horario, c.horas
    FROM planilla_celdas c
    JOIN planilla_empleados e ON e.id = c.empleado_id
    WHERE c.periodo = date_trunc('month', p_fecha)::date
      AND c.dia = extract(day FROM p_fecha)::int
      AND c.horas > 0
    ORDER BY e.orden;
END;
$$;
REVOKE ALL ON FUNCTION horas_para_propinas(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION horas_para_propinas(date) TO authenticated;

-- Verificación: tiene que decir "lista" y "solo usuarios con sesión".
SELECT 'función horas_para_propinas' AS que,
       CASE WHEN to_regprocedure('horas_para_propinas(date)') IS NOT NULL THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'quién la puede usar',
       CASE WHEN has_function_privilege('anon', 'horas_para_propinas(date)', 'EXECUTE') THEN 'MAL: cualquiera'
            ELSE 'solo usuarios con sesión (y adentro se fija si cargan propinas)' END;
