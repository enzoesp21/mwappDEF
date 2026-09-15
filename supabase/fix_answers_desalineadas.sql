-- ============================================================
-- Reparar las respuestas de los examenes ya rendidos
--
-- QUE PASO
-- Cada vez que se reordenaron las opciones de una pregunta (el barajado
-- de posiciones, la reescritura por largo y la rotacion de ayer), en
-- exam_answers quedo guardado el NUMERO de opcion que la persona toco,
-- no el texto. Al moverse las opciones, ese numero pasa a apuntar a otra
-- cosa. Ninguna de esas migraciones corrigio exam_answers.
--
-- QUE NO SE ROMPIO
-- Las notas. exam_results.score y exam_answers.is_correct se calcularon
-- al momento de rendir y no los toco nada. Nadie aprobo ni desaprobo por
-- esto, y el ranking esta bien.
--
-- QUE SI SE ROMPIO
-- Solo la pantalla "en que me equivoque": para los 5 intentos ya
-- rendidos puede mostrar, como respuesta elegida, una opcion que la
-- persona nunca toco.
--
-- POR QUE NO SE PUEDE RECONSTRUIR
-- Habria que saber en que orden estaban las opciones en el momento
-- exacto en que cada uno rindio. Ademas, en 62 preguntas el texto de las
-- opciones incorrectas se reescribio entero, asi que la opcion que esa
-- persona eligio literalmente ya no existe.
--
-- QUE HACE ESTE ARCHIVO
-- Borra el numero guardado en las 19 respuestas erradas de los intentos
-- viejos, en lugar de dejar un dato que es mentira. La pregunta sigue
-- apareciendo como "te equivocaste en esta", pero sin inventar cual
-- opcion eligio. Las respuestas acertadas no se tocan: esas nunca se
-- muestran en la pantalla de revision.
--
-- De aca en adelante no vuelve a pasar: las opciones ya no se van a
-- reordenar, y si alguna vez hiciera falta, hay que mover exam_answers
-- en la misma sentencia.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

UPDATE exam_answers a
SET selected_option = NULL
FROM exam_questions q
WHERE q.id = a.question_id
  AND q.question_type = 'multiple_choice'
  AND a.is_correct IS FALSE
  AND a.selected_option IS NOT NULL
  AND a.created_at < '2026-09-15'::timestamptz;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion 1: no queda ninguna respuesta desalineada.
-- "desalineadas" tiene que dar 0.
-- ------------------------------------------------------------
SELECT count(*) AS mc_con_opcion_guardada,
       count(*) FILTER (WHERE a.is_correct <> (a.selected_option = q.correct_option)) AS desalineadas
FROM exam_answers a
JOIN exam_questions q ON q.id = a.question_id
WHERE q.question_type = 'multiple_choice'
  AND a.selected_option IS NOT NULL;

-- ------------------------------------------------------------
-- Verificacion 2: las notas siguen intactas.
-- ------------------------------------------------------------
SELECT p.full_name AS persona,
       e.title     AS examen,
       r.score     AS nota,
       r.passed    AS aprobo,
       count(*) FILTER (WHERE a.is_correct)       AS acerto,
       count(*) FILTER (WHERE a.is_correct IS FALSE) AS erro
FROM exam_results r
JOIN profiles p ON p.id = r.user_id
JOIN exams e ON e.id = r.exam_id
LEFT JOIN exam_answers a ON a.result_id = r.id
GROUP BY p.full_name, e.title, r.score, r.passed, r.completed_at
ORDER BY r.completed_at;
