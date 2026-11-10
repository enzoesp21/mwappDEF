-- ============================================================
-- Charla de Seguridad e Higiene (ART) para todo el personal
--
-- Enzo (06/11): la ART dio una charla de seguridad e higiene para TODO el
-- personal. Al entrar a la app, arriba de todo en Inicio, se pregunta
-- "¿Participaste de la charla?" SÍ / NO. Con SÍ rinden el examen de una, sin
-- la información del curso, para ver si prestaron atención; con NO queda
-- registrado y no rinden. Lo hecho queda en el perfil de cada uno. Las
-- preguntas son sobre:
--   - las clases de fuego A, B y C;
--   - para dónde es el matafuego K (la cocina: aceites y grasas animales y
--     vegetales) y de qué color es (gris);
--   - qué hace falta para que haya fuego (combustible, calor y oxígeno);
--   - qué hacer con un charco de agua en el salón (secarlo en el momento y
--     avisarle al encargado);
--   - si un alargue puede quedar instalado (no: es una instalación temporal).
--
-- - guides.para_todos: es para todo el personal, también para quien está en
--   período de prueba (puede_usar_guia la deja pasar). El examen cuelga de
--   una guía, pero no es una guía para leer: no va en el recorrido de ningún
--   puesto (guide_paths) y la app no muestra su contenido.
-- - capacitacion_asistencias: qué contestó cada uno (participo). Cada uno
--   contesta solo por sí mismo y una sola vez; los encargados ven a todos y
--   pueden borrar una respuesta para que se le vuelva a preguntar.
-- - El examen: 10 preguntas de opción múltiple, se aprueba con 90. La
--   correcta nunca es la más larga y las posiciones van repartidas parejo
--   (A 3, B 3, C 2, D 2). Como todos, termina con la firma de cada uno.
--
-- La primera versión (también 06/11) la ponía al final del recorrido de los
-- 11 puestos y pedía "anotarse": si se corrió esa, el cambio lo hace
-- fix_charla_art_examen_en_inicio.sql (este archivo también la deja bien).
--
-- Nunca borra preguntas ya cargadas: eso borraría las respuestas de quien ya
-- rindió. Se puede correr dos veces.
-- ============================================================

-- Freno: necesita el bloqueo del período de prueba y los recorridos.
DO $$
BEGIN
  IF to_regprocedure('public.puede_usar_guia(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Falta el bloqueo del período de prueba: corré primero supabase/add_bloqueo_prueba.sql.';
  END IF;
  IF to_regclass('public.guide_paths') IS NULL THEN
    RAISE EXCEPTION 'Faltan los recorridos por puesto (guide_paths): corré primero supabase/add_guide_paths.sql.';
  END IF;
END $$;

BEGIN;

-- 1) Guías para todo el personal.
ALTER TABLE guides ADD COLUMN IF NOT EXISTS para_todos boolean NOT NULL DEFAULT false;

-- 2) Quien está a prueba puede usar la guía principal y las que son para todos.
CREATE OR REPLACE FUNCTION puede_usar_guia(p_guide_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      is_admin()
      -- Del equipo (o sin elegir todavía en la bienvenida): todo habilitado.
      OR COALESCE((SELECT experience FROM profiles WHERE id = auth.uid()), '') <> 'nuevo'
      -- En prueba: la guía principal y las que son para todo el personal.
      OR COALESCE((SELECT is_primary OR para_todos FROM guides WHERE id = p_guide_id), false)
    );
$$;

-- 3) Qué contestó cada uno a "¿Participaste de la charla?".
CREATE TABLE IF NOT EXISTS capacitacion_asistencias (
  guide_id   uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  participo  boolean NOT NULL DEFAULT true,
  PRIMARY KEY (guide_id, user_id)
);
ALTER TABLE capacitacion_asistencias ADD COLUMN IF NOT EXISTS participo boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN capacitacion_asistencias.participo IS
  'Lo que contestó a "¿Participaste de la charla?": true = sí (rinde el examen), false = no (no rinde).';
ALTER TABLE capacitacion_asistencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS capacitacion_asistencias_ver ON capacitacion_asistencias;
CREATE POLICY capacitacion_asistencias_ver ON capacitacion_asistencias
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS capacitacion_asistencias_anotarse ON capacitacion_asistencias;
CREATE POLICY capacitacion_asistencias_anotarse ON capacitacion_asistencias
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM guides g WHERE g.id = guide_id AND g.para_todos)
  );
-- Un encargado puede borrar una respuesta (se le vuelve a preguntar).
DROP POLICY IF EXISTS capacitacion_asistencias_sacar ON capacitacion_asistencias;
CREATE POLICY capacitacion_asistencias_sacar ON capacitacion_asistencias
  FOR DELETE TO authenticated
  USING (is_admin());

-- 4) La guía que contiene el examen. Sin la información del curso (Enzo):
--    la app no la muestra, el examen se rinde de una desde Inicio.
INSERT INTO guides (title, description, content, puestos, para_todos)
SELECT 'Charla de Seguridad e Higiene (ART)',
       'Examen de la charla de la ART para todo el personal: se rinde desde Inicio.',
       'Examen de la charla de seguridad e higiene de la ART. No se muestra: el personal rinde el examen desde Inicio.',
       ARRAY['todos'],
       true
WHERE NOT EXISTS (SELECT 1 FROM guides WHERE title = 'Charla de Seguridad e Higiene (ART)');

UPDATE guides SET para_todos = true WHERE title = 'Charla de Seguridad e Higiene (ART)' AND NOT para_todos;

-- 5) El examen.
INSERT INTO exams (guide_id, title, passing_score)
SELECT g.id, 'Examen: Charla de Seguridad e Higiene', 90
FROM guides g
WHERE g.title = 'Charla de Seguridad e Higiene (ART)'
  AND NOT EXISTS (SELECT 1 FROM exams e WHERE e.guide_id = g.id);

-- 6) Las preguntas, solo si el examen todavía no tiene ninguna.
INSERT INTO exam_questions (exam_id, question, options, correct_option, question_type, answer_guide, "order")
SELECT e.id, v.question, v.options::jsonb, v.correct_option, 'multiple_choice', NULL, v.orden
FROM exams e
JOIN guides g ON g.id = e.guide_id
CROSS JOIN (VALUES
  ('¿Qué es un fuego clase A?', '["El de sólidos como madera, papel o tela", "El de líquidos inflamables como nafta o alcohol", "El de equipos eléctricos que están enchufados", "El de aceites y grasas de cocina en la freidora"]', 0, 0),
  ('¿Qué es un fuego clase B?', '["El de sólidos como madera, cartón o papel", "El de líquidos inflamables y gases", "El de equipos eléctricos con corriente", "El de metales que se prenden con el calor"]', 1, 1),
  ('¿Qué es un fuego clase C?', '["El de la grasa acumulada en la campana", "El de líquidos como nafta, alcohol o solventes", "El de sólidos que dejan brasa al apagarse", "El de equipos eléctricos con corriente"]', 3, 2),
  ('Se prende fuego una zapatilla eléctrica enchufada. ¿Qué clase de fuego es?', '["Clase A", "Clase B", "Clase C", "Clase K"]', 2, 3),
  ('¿Para dónde se usa el matafuego K?', '["Para la cocina: aceites y grasas animales y vegetales", "Para el tablero eléctrico del salón", "Para cualquier fuego, en cualquier lugar del restaurante", "Para los papeles y cartones del depósito"]', 0, 4),
  ('¿De qué color es el matafuego K?', '["Rojo", "Gris", "Verde", "Amarillo"]', 1, 5),
  ('En la cocina se prende fuego una sartén con aceite. ¿Con qué matafuego se apaga?', '["Con agua, que es lo más rápido", "Con cualquiera que esté más cerca", "Con el del tablero eléctrico", "Con el K, el gris"]', 3, 6),
  ('¿Qué hace falta para que se genere fuego?', '["Una chispa y gas, nada más", "Combustible y mucho viento", "Combustible, calor y oxígeno", "Solamente calor, aunque no haya nada que se pueda quemar"]', 2, 7),
  ('Ves un charco de agua en el salón. ¿Qué hacés?', '["Lo esquivo y sigo, no es mi sector", "Lo seco en el momento y le aviso al encargado", "Espero a que lo limpie alguien de limpieza", "Lo dejo así, total con el tiempo se termina secando solo"]', 1, 8),
  ('¿Está bien tener un alargue instalado todo el tiempo?', '["No: el alargue es una instalación temporal", "Sí, si está bien enchufado y no molesta", "Sí, mientras no se use para la cafetera", "Sí, siempre que sea un alargue nuevo y de marca"]', 0, 9)
) AS v(question, options, correct_option, orden)
WHERE g.title = 'Charla de Seguridad e Higiene (ART)'
  AND NOT EXISTS (SELECT 1 FROM exam_questions q WHERE q.exam_id = e.id);

-- 7) No va en el recorrido de ningún puesto: se rinde desde Inicio. Si la
--    primera versión de este archivo la había puesto ahí, se saca.
DELETE FROM guide_paths
WHERE guide_id IN (SELECT id FROM guides WHERE para_todos);

COMMIT;

-- ------------------------------------------------------------
-- Verificación: una fila por cosa, todas "lista".
-- ------------------------------------------------------------
SELECT 'guía para todo el personal' AS que,
       CASE WHEN (SELECT para_todos FROM guides WHERE title = 'Charla de Seguridad e Higiene (ART)')
            THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'examen (aprueba con)',
       coalesce((SELECT 'lista: ' || e.passing_score FROM exams e JOIN guides g ON g.id = e.guide_id
                 WHERE g.title = 'Charla de Seguridad e Higiene (ART)'), 'FALTA')
UNION ALL
SELECT 'preguntas (A/B/C/D, correctas más largas)',
       (SELECT count(*) || ' (' ||
               count(*) FILTER (WHERE q.correct_option = 0) || '/' ||
               count(*) FILTER (WHERE q.correct_option = 1) || '/' ||
               count(*) FILTER (WHERE q.correct_option = 2) || '/' ||
               count(*) FILTER (WHERE q.correct_option = 3) || ', ' ||
               count(*) FILTER (
                 WHERE length(q.options ->> q.correct_option) >
                       (SELECT max(length(o)) FROM jsonb_array_elements_text(q.options) o
                        WHERE o <> (q.options ->> q.correct_option))
               ) || ')'
        FROM exam_questions q JOIN exams e ON e.id = q.exam_id JOIN guides g ON g.id = e.guide_id
        WHERE g.title = 'Charla de Seguridad e Higiene (ART)')
UNION ALL
SELECT 'fuera del recorrido de los puestos',
       (SELECT CASE WHEN count(*) = 0 THEN 'lista' ELSE 'FALTA: sigue en ' || count(*) || ' puestos' END
        FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
        WHERE g.title = 'Charla de Seguridad e Higiene (ART)')
UNION ALL
SELECT 'la pueden rendir los que están a prueba',
       CASE WHEN pg_get_functiondef('puede_usar_guia(uuid)'::regprocedure) LIKE '%para_todos%'
            THEN 'lista' ELSE 'FALTA' END
UNION ALL
SELECT 'pregunta ¿participaste? SÍ / NO',
       CASE WHEN to_regclass('public.capacitacion_asistencias') IS NOT NULL
                 AND EXISTS (SELECT 1 FROM information_schema.columns
                             WHERE table_schema = 'public' AND table_name = 'capacitacion_asistencias'
                               AND column_name = 'participo')
                 AND (SELECT count(*) FROM pg_policies WHERE tablename = 'capacitacion_asistencias') = 3
            THEN 'lista' ELSE 'FALTA' END;
