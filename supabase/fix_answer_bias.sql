-- ============================================================
-- Corrige el sesgo de posición en las respuestas correctas
--
-- Al escribir las preguntas quedó la respuesta correcta casi siempre en
-- la opción B (122 de 181), y la D casi nunca. Eligiendo siempre B se
-- aprobaba sin saber el contenido.
--
-- Baraja las opciones de cada pregunta de opción múltiple y recalcula
-- correct_option a la nueva posición del MISMO texto correcto.
--
-- El orden es determinístico (md5 del id + posición), así que volver a
-- correrlo no vuelve a mover nada.
--
-- Correr entero en Supabase -> SQL Editor.
-- ============================================================

-- Foto previa, para poder verificar que no se rompió nada.
DROP TABLE IF EXISTS _antes_del_barajado;
CREATE TEMP TABLE _antes_del_barajado AS
SELECT id,
       options -> correct_option AS texto_correcto,
       correct_option            AS posicion_vieja,
       jsonb_array_length(options) AS cantidad_opciones
FROM exam_questions
WHERE question_type = 'multiple_choice';

-- Barajado.
WITH exploded AS (
  SELECT q.id AS qid,
         q.correct_option,
         (e.ord - 1) AS old_idx,
         e.val,
         md5(q.id::text || '|' || e.ord::text) AS sortkey
  FROM exam_questions q
  CROSS JOIN LATERAL jsonb_array_elements(q.options) WITH ORDINALITY AS e(val, ord)
  WHERE q.question_type = 'multiple_choice'
),
shuffled AS (
  SELECT qid,
         jsonb_agg(val ORDER BY sortkey) AS new_options,
         (array_position(array_agg(old_idx ORDER BY sortkey), correct_option) - 1) AS new_correct
  FROM exploded
  GROUP BY qid, correct_option
)
UPDATE exam_questions q
SET options        = s.new_options,
    correct_option = s.new_correct
FROM shuffled s
WHERE q.id = s.qid;

-- Verificación: las tres primeras columnas tienen que dar iguales, y
-- 'texto_cambiado' y 'opciones_perdidas' tienen que dar 0.
SELECT
  count(*)                                                              AS preguntas,
  count(*) FILTER (WHERE a.texto_correcto = q.options -> q.correct_option) AS conservaron_la_correcta,
  count(*) FILTER (WHERE a.texto_correcto <> q.options -> q.correct_option) AS texto_cambiado,
  count(*) FILTER (WHERE a.cantidad_opciones <> jsonb_array_length(q.options)) AS opciones_perdidas
FROM exam_questions q
JOIN _antes_del_barajado a ON a.id = q.id;

-- Nueva distribución por examen.
SELECT e.title AS examen,
       count(*) AS total,
       count(*) FILTER (WHERE q.correct_option = 0) AS a,
       count(*) FILTER (WHERE q.correct_option = 1) AS b,
       count(*) FILTER (WHERE q.correct_option = 2) AS c,
       count(*) FILTER (WHERE q.correct_option = 3) AS d
FROM exam_questions q
JOIN exams e ON e.id = q.exam_id
WHERE q.question_type = 'multiple_choice'
GROUP BY e.title
ORDER BY e.title;
