-- ============================================================
-- Planilla maestra: los empleados nuevos de octubre, al final de la hoja
--
-- Ficharon en octubre pero no estaban en la planilla de septiembre. Van al
-- final, en el orden en que empezaron (su primera fichada), con su número del
-- reloj (Enzo les corrigió el nombre en CrossChex el 01/11). El cargo queda
-- vacío para completar, como los últimos de septiembre.
--
--   610 FEDERICO FERNANDEZ   desde el 06/10 · Camareros · usuario de la app
--   611 LAUREANO             desde el 11/10 · Comiss / Runners
--   399 LURDES MORENO        desde el 16/10 · Cocina (en el reloj: "LURDES COCINA")
--   614 ALMA                 desde el 28/10
--   615 GIULIANA             desde el 28/10
--   646 ABRIL CASTRO         desde el 31/10 · Camareros · usuario de la app
--   647 MOISES               desde el 01/11 · Cocina (en el reloj: "MOISES COCINA")
--
-- Después le pide a la app que recalcule desde el 1/10 hasta hoy, así
-- aparecen sus horas de octubre (lo cargado a mano no se toca).
--
-- Se puede correr dos veces: no duplica a nadie.
-- ============================================================

BEGIN;

INSERT INTO planilla_empleados (nombre, cargo, orden, profile_id, nombres_horario)
SELECT v.nombre, NULL, (SELECT coalesce(max(orden), 0) FROM planilla_empleados) + v.n,
       (SELECT p.id FROM profiles p WHERE p.id = v.perfil), v.horario
FROM (VALUES
  (1, 'FEDERICO FERNANDEZ', 'c71063e7-ee29-4067-ab86-35b30c18f024'::uuid, ARRAY['Federico Fernandez']),
  (2, 'LAUREANO', NULL::uuid, ARRAY['Laureano']),
  (3, 'LURDES MORENO', NULL::uuid, ARRAY['Lurdes Moreno']),
  (4, 'ALMA', NULL::uuid, '{}'::text[]),
  (5, 'GIULIANA', NULL::uuid, '{}'::text[]),
  (6, 'ABRIL CASTRO', '2e4201bb-83f1-46aa-8e7f-a5632f7dafc8'::uuid, ARRAY['Abril Castro']),
  (7, 'MOISES', NULL::uuid, ARRAY['Moises'])
) AS v(n, nombre, perfil, horario)
WHERE NOT EXISTS (SELECT 1 FROM planilla_empleados e WHERE e.nombre = v.nombre)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO planilla_reloj_alias (userid, empleado_id, ignorar)
SELECT v.userid, e.id, false
FROM (VALUES
  ('610', 'FEDERICO FERNANDEZ'),
  ('611', 'LAUREANO'),
  ('399', 'LURDES MORENO'),
  ('614', 'ALMA'),
  ('615', 'GIULIANA'),
  ('646', 'ABRIL CASTRO'),
  ('647', 'MOISES')
) AS v(userid, nombre)
JOIN planilla_empleados e ON e.nombre = v.nombre
ON CONFLICT (userid) DO NOTHING;

-- Freno: los 7 tienen que haber quedado con su número del reloj.
DO $$
BEGIN
  IF (SELECT count(*) FROM planilla_reloj_alias
      WHERE userid IN ('610', '611', '399', '614', '615', '646', '647') AND empleado_id IS NOT NULL) <> 7 THEN
    RAISE EXCEPTION 'No quedaron los 7 números del reloj asociados: se cancela todo.';
  END IF;
END $$;

COMMIT;

-- Recalcular desde el 1/10 hasta hoy (la jornada de hoy, que empieza a las 07:00).
SELECT net.http_post(
  url := (SELECT url FROM planilla_config WHERE id = 1) || '/api/planilla/actualizar',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-clave', (SELECT clave FROM planilla_config WHERE id = 1)),
  body := jsonb_build_object(
    'desde', '2026-10-01',
    'hasta', to_char((now() AT TIME ZONE 'America/Argentina/Buenos_Aires' - interval '7 hours')::date, 'YYYY-MM-DD')),
  timeout_milliseconds := 60000
) AS recalculo;

-- ------------------------------------------------------------
-- Verificación: los 7 al final, cada uno con su número del reloj.
-- ------------------------------------------------------------
SELECT e.orden, e.nombre, coalesce(e.cargo, '(completar)') AS cargo,
       string_agg(a.userid, ', ' ORDER BY a.userid) AS reloj,
       CASE WHEN e.profile_id IS NULL THEN '-' ELSE 'sí' END AS usuario_app
FROM planilla_empleados e
LEFT JOIN planilla_reloj_alias a ON a.empleado_id = e.id
WHERE e.orden > 68
GROUP BY e.id
ORDER BY e.orden;
