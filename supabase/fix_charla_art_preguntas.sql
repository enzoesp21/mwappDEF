-- ============================================================
-- Charla de la ART: correcciones de Enzo a tres preguntas (10/11)
--
--   - Matafuego K: es para aceites y grasas animales y vegetales (no
--     minerales). La correcta pasa a decir eso.
--   - Charco de agua: al encargado se le avisa en el momento, no al final
--     del turno. La correcta pasa a ser "Lo seco en el momento y le aviso al
--     encargado", y la de "al final del turno" se cambia por otra mal, para
--     que no queden dos que parezcan correctas.
--   - Qué hace falta para que haya fuego: combustible, calor y oxígeno.
--
-- Solo cambia el texto de las opciones: no borra preguntas ni respuestas, y
-- la correcta sigue en la misma letra, así que los exámenes ya rendidos no
-- cambian. La correcta nunca queda como la más larga. Se puede correr dos
-- veces.
-- ============================================================

-- Freno: las tres preguntas tienen que estar como se cargaron (misma letra
-- correcta). Si alguien las cambió desde el editor, no se toca nada.
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM exam_questions q JOIN exams e ON e.id = q.exam_id JOIN guides g ON g.id = e.guide_id
  WHERE g.title = 'Charla de Seguridad e Higiene (ART)'
    AND (q."order", q.correct_option) IN ((4, 0), (7, 2), (8, 1))
    AND jsonb_array_length(q.options) = 4;
  IF n <> 3 THEN
    RAISE EXCEPTION 'Las preguntas de la charla no están como se cargaron (encontré % de 3): no toco nada.', n;
  END IF;
END $$;

WITH charla AS (
  SELECT e.id
  FROM exams e JOIN guides g ON g.id = e.guide_id
  WHERE g.title = 'Charla de Seguridad e Higiene (ART)'
),
nuevas (orden, options) AS (
  VALUES
    (4, '["Para la cocina: aceites y grasas animales y vegetales", "Para el tablero eléctrico del salón", "Para cualquier fuego, en cualquier lugar del restaurante", "Para los papeles y cartones del depósito"]'::jsonb),
    (7, '["Una chispa y gas, nada más", "Combustible y mucho viento", "Combustible, calor y oxígeno", "Solamente calor, aunque no haya nada que se pueda quemar"]'::jsonb),
    (8, '["Lo esquivo y sigo, no es mi sector", "Lo seco en el momento y le aviso al encargado", "Espero a que lo limpie alguien de limpieza", "Lo dejo así, total con el tiempo se termina secando solo"]'::jsonb)
)
UPDATE exam_questions q
SET options = n.options
FROM nuevas n
WHERE q.exam_id IN (SELECT id FROM charla)
  AND q."order" = n.orden;

-- Verificación: las tres con la correcta nueva y "no" en la última columna.
SELECT q."order" + 1 AS pregunta,
       q.options ->> q.correct_option AS correcta,
       CASE WHEN length(q.options ->> q.correct_option) >=
                 (SELECT max(length(o)) FROM jsonb_array_elements_text(q.options) o)
            THEN 'SÍ (mal)' ELSE 'no' END AS es_la_mas_larga
FROM exam_questions q JOIN exams e ON e.id = q.exam_id JOIN guides g ON g.id = e.guide_id
WHERE g.title = 'Charla de Seguridad e Higiene (ART)' AND q."order" IN (4, 7, 8)
ORDER BY q."order";
