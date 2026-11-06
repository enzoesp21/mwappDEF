-- ============================================================
-- La charla de la ART pasa a ser un examen en Inicio
--
-- Enzo (06/11), después de ver la primera versión:
--   - no tiene que ser una guía nueva en el recorrido de todos los puestos;
--   - en vez de "Anotate a la charla", se pregunta "¿Participaste de la
--     charla?" SÍ / NO, arriba de todo en Inicio, ni bien entran;
--   - sin la información del curso: con SÍ rinden el examen de una, para ver
--     si prestaron atención;
--   - con NO queda registrado que no participó y no rinde. Un encargado puede
--     borrar la respuesta para que se le vuelva a preguntar;
--   - lo hecho queda en el perfil de cada uno.
--
-- Qué hace:
--   1) capacitacion_asistencias.participo: lo que contestó. Los que ya se
--      habían anotado con la versión anterior quedan con SÍ.
--   2) Saca las charlas para todo el personal del recorrido de los puestos
--      (guide_paths), donde las había puesto add_charla_art.sql.
--
-- No toca la guía, el examen, las preguntas ni los resultados. Se puede
-- correr dos veces.
-- ============================================================

-- Freno: primero tiene que estar la charla (supabase/add_charla_art.sql).
DO $$
BEGIN
  IF to_regclass('public.capacitacion_asistencias') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'guides' AND column_name = 'para_todos') THEN
    RAISE EXCEPTION 'Falta la charla: corré primero supabase/add_charla_art.sql.';
  END IF;
END $$;

BEGIN;

-- 1) Lo que contestó a "¿Participaste de la charla?".
ALTER TABLE capacitacion_asistencias ADD COLUMN IF NOT EXISTS participo boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN capacitacion_asistencias.participo IS
  'Lo que contestó a "¿Participaste de la charla?": true = sí (rinde el examen), false = no (no rinde).';

-- 2) Las charlas no van en el recorrido de ningún puesto: se rinden desde Inicio.
DELETE FROM guide_paths
WHERE guide_id IN (SELECT id FROM guides WHERE para_todos);

COMMIT;

-- ------------------------------------------------------------
-- Verificación
-- ------------------------------------------------------------
SELECT 'la charla en el recorrido de los puestos' AS que,
       CASE WHEN count(*) = 0 THEN 'afuera (lista)' ELSE 'FALTA: sigue en ' || count(*) || ' puestos' END AS resultado
FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
WHERE g.para_todos
UNION ALL
SELECT 'pregunta ¿participaste? SÍ / NO',
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_schema = 'public' AND table_name = 'capacitacion_asistencias'
                           AND column_name = 'participo')
            THEN 'lista' ELSE 'FALTA' END
UNION ALL
SELECT 'el examen sigue igual',
       (SELECT count(*) || ' preguntas'
        FROM exam_questions q JOIN exams e ON e.id = q.exam_id JOIN guides g ON g.id = e.guide_id
        WHERE g.para_todos)
UNION ALL
SELECT 'contestaron hasta ahora',
       (SELECT count(*) FILTER (WHERE participo) || ' sí, ' || count(*) FILTER (WHERE NOT participo) || ' no'
        FROM capacitacion_asistencias)
UNION ALL
SELECT 'recorrido de Mozos',
       (SELECT string_agg(g.title, ' · ' ORDER BY gp.orden)
        FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
        WHERE gp.puesto = 'Mozos');
