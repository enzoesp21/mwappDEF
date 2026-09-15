-- ============================================================
-- Reparar las respuestas ACERTADAS de los examenes ya rendidos
--
-- Complemento de fix_answers_desalineadas.sql, que limpio las erradas.
-- Quedaron 24 respuestas marcadas como acertadas cuyo indice guardado
-- apunta a otra opcion, por el mismo motivo: las opciones se reordenaron
-- y exam_answers guarda el numero, no el texto.
--
-- Estas SI se recuperan con certeza, no hay que adivinar nada: si la
-- persona acerto, eligio el texto correcto, y ese texto hoy esta en
-- correct_option. Asi que selected_option tiene que ser correct_option.
--
-- Igual que antes, las notas no cambian: is_correct y score se calcularon
-- al momento de rendir y no se tocan.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

UPDATE exam_answers a
SET selected_option = q.correct_option
FROM exam_questions q
WHERE q.id = a.question_id
  AND q.question_type = 'multiple_choice'
  AND a.is_correct IS TRUE
  AND a.selected_option IS DISTINCT FROM q.correct_option;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: ahora si, "desalineadas" tiene que dar 0.
-- ------------------------------------------------------------
SELECT count(*)                                        AS respuestas_mc,
       count(*) FILTER (WHERE a.selected_option IS NOT NULL) AS con_indice,
       count(*) FILTER (WHERE a.selected_option IS NULL
                          AND a.is_correct IS FALSE)   AS erradas_sin_indice,
       count(*) FILTER (WHERE a.selected_option IS NOT NULL
                          AND a.is_correct <> (a.selected_option = q.correct_option)) AS desalineadas
FROM exam_answers a
JOIN exam_questions q ON q.id = a.question_id
WHERE q.question_type = 'multiple_choice';
