-- ============================================================
-- Reparto parejo de la posicion de la respuesta correcta
--
-- Despues del recorte a 30 quedaron examenes desbalanceados: en Mozos
-- la correcta cae en la C en 14 de 30 preguntas, y en Ensaladas en la B
-- en 7 de 12 y en la C en ninguna. Con eso alcanza para que alguien note
-- el patron.
--
-- Que hace: rota las opciones de cada pregunta para que, dentro de cada
-- examen, la correcta caiga en A, B, C y D casi la misma cantidad de
-- veces. El destino se sortea con el hash del id, asi que el orden no es
-- predecible (no queda A, B, C, D, A, B, C, D...) y es siempre el mismo
-- si se vuelve a correr.
--
-- IMPORTANTE: rotar las opciones cambia el significado de los indices ya
-- guardados en exam_answers. Por eso la misma sentencia corrige tambien
-- las respuestas de los examenes ya rendidos, con la misma rotacion. Sin
-- ese paso, la pantalla de "en que me equivoque" les mostraria a los que
-- ya rindieron una respuesta que nunca eligieron.
--
-- Va todo en UNA sola sentencia con CTE, no en una tabla temporal: el
-- editor de Supabase no mantiene las tablas temporales entre sentencias.
-- Las dos partes leen la misma foto de los datos, asi que la rotacion que
-- se aplica a las preguntas y a las respuestas es exactamente la misma.
--
-- No cambia el texto de ninguna opcion ni cual es la respuesta correcta,
-- y las notas ya puestas no se mueven.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

WITH rot AS (
  SELECT s.id,
         s.destino,
         ((s.destino - s.correct_option) % 4 + 4) % 4 AS giro
  FROM (
    SELECT q.id,
           q.correct_option,
           ((row_number() OVER (PARTITION BY q.exam_id
                                ORDER BY md5(q.id::text)))::int - 1) % 4 AS destino
    FROM exam_questions q
    WHERE q.question_type = 'multiple_choice'
      AND jsonb_array_length(q.options) = 4
  ) s
),
-- 1) Rotar las opciones y mover el indice de la correcta.
preguntas AS (
  UPDATE exam_questions q
  SET options = jsonb_build_array(
        q.options -> ((0 - r.giro + 4) % 4),
        q.options -> ((1 - r.giro + 4) % 4),
        q.options -> ((2 - r.giro + 4) % 4),
        q.options -> ((3 - r.giro + 4) % 4)
      ),
      correct_option = r.destino
  FROM rot r
  WHERE r.id = q.id AND r.giro <> 0
  RETURNING q.id
),
-- 2) Mover con la misma rotacion lo que ya contestaron los examenes viejos.
respuestas AS (
  UPDATE exam_answers a
  SET selected_option = (a.selected_option + r.giro) % 4
  FROM rot r
  WHERE r.id = a.question_id
    AND r.giro <> 0
    AND a.selected_option IS NOT NULL
  RETURNING a.id
)
SELECT (SELECT count(*) FROM preguntas) AS preguntas_rotadas,
       (SELECT count(*) FROM respuestas) AS respuestas_viejas_corregidas;

-- ------------------------------------------------------------
-- Verificacion 1: reparto de A / B / C / D por examen.
-- Los de 30 preguntas tienen que quedar 8/8/7/7 y los de 12, 3/3/3/3.
-- ------------------------------------------------------------
SELECT e.title AS examen,
       count(*) FILTER (WHERE q.correct_option = 0) AS a,
       count(*) FILTER (WHERE q.correct_option = 1) AS b,
       count(*) FILTER (WHERE q.correct_option = 2) AS c,
       count(*) FILTER (WHERE q.correct_option = 3) AS d,
       count(*) AS preguntas
FROM exam_questions q
JOIN exams e ON e.id = q.exam_id
WHERE q.question_type = 'multiple_choice'
GROUP BY e.title
ORDER BY e.title;

-- ------------------------------------------------------------
-- Verificacion 2: las notas de los examenes ya rendidos no cambiaron.
-- "coinciden" tiene que dar igual a "respuestas_guardadas".
-- ------------------------------------------------------------
SELECT count(*) AS respuestas_guardadas,
       count(*) FILTER (
         WHERE a.is_correct IS NOT DISTINCT FROM (a.selected_option = q.correct_option)
       ) AS coinciden
FROM exam_answers a
JOIN exam_questions q ON q.id = a.question_id
WHERE q.question_type = 'multiple_choice'
  AND a.selected_option IS NOT NULL;
