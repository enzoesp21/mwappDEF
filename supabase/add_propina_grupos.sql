-- ============================================================
-- Propinas: grupos de propina (quién cobra la hora al 100, al 75 o al 50 %)
--
-- Enzo, como encargado, configura una vez el grupo de cada persona del
-- salón, y cuando la cajera carga un día ya la ve en su sección (Al 100 %,
-- Al 75 %, Al 50 %), sin elegirlo a mano para cada uno.
--
-- - propina_grupos: un grupo por empleado de la planilla (la lista del reloj,
--   que tiene a todos, con o sin usuario de la app). Solo los admin la leen
--   y la cambian.
-- - grupos_para_propinas(): les deja ver esos grupos a quienes cargan
--   propinas (las cajeras no son admin), y nada más.
--
-- Si alguien tiene nivel en Progresión, manda el nivel (1 = 50 %, 2 = 75 %,
-- 3 = 100 %): eso lo resuelve la app. No toca ninguna tabla que ya exista.
-- Se puede correr dos veces.
-- ============================================================

-- Freno: necesita la planilla maestra y las propinas ya instaladas.
DO $$
BEGIN
  IF to_regclass('public.planilla_empleados') IS NULL THEN
    RAISE EXCEPTION 'Falta la planilla maestra: corré primero supabase/add_fichadas_planilla.sql.';
  END IF;
  IF to_regprocedure('public.puede_cargar_propinas()') IS NULL THEN
    RAISE EXCEPTION 'Faltan las propinas: corré primero supabase/add_propinas.sql.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS propina_grupos (
  empleado_id uuid PRIMARY KEY REFERENCES planilla_empleados(id) ON DELETE CASCADE,
  grupo       text NOT NULL CHECK (grupo IN ('camarero', 'reducido', 'prueba')),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE propina_grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS propina_grupos_admin ON propina_grupos;
CREATE POLICY propina_grupos_admin ON propina_grupos
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Para la cajera: los grupos configurados, con los nombres para reconocer a
-- cada uno en la lista del día (el de la planilla, los de Horarios y su usuario).
CREATE OR REPLACE FUNCTION grupos_para_propinas()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT puede_cargar_propinas() THEN
    RAISE EXCEPTION 'Solo quien carga propinas puede ver los grupos.' USING ERRCODE = '42501';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'nombre', e.nombre,
      'profile_id', e.profile_id,
      'nombres_horario', to_jsonb(coalesce(e.nombres_horario, '{}')),
      'grupo', g.grupo
    ) ORDER BY e.orden)
    FROM propina_grupos g
    JOIN planilla_empleados e ON e.id = g.empleado_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION grupos_para_propinas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION grupos_para_propinas() TO authenticated;

-- Verificación: "lista", "solo admin", "lista" y cuántos grupos hay cargados
-- (la primera vez, 0: se cargan desde Propinas → Grupos).
SELECT 'tabla propina_grupos' AS que,
       CASE WHEN to_regclass('public.propina_grupos') IS NOT NULL THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'quién la puede tocar',
       CASE WHEN (SELECT count(*) FROM pg_policies WHERE tablename = 'propina_grupos') = 1
                 AND (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.propina_grupos'::regclass)
            THEN 'solo admin' ELSE 'REVISAR' END
UNION ALL
SELECT 'función grupos_para_propinas',
       CASE WHEN to_regprocedure('grupos_para_propinas()') IS NOT NULL
                 AND NOT has_function_privilege('anon', 'grupos_para_propinas()', 'EXECUTE')
            THEN 'lista' ELSE 'FALTA' END
UNION ALL
SELECT 'grupos configurados', count(*)::text FROM propina_grupos;
