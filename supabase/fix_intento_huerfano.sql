-- ============================================================
-- Borrar el intento de Lucas que quedó sin respuestas
--
-- QUE PASO
-- El 15/9 a las 00:18 Lucas rindió el examen de Mozos y sus respuestas se
-- guardaron bien. Catorce minutos después, a las 00:32, alguien abrió esa
-- guía en el panel de administración y la guardó. El editor de entonces
-- borraba y volvía a crear todas las preguntas en cada guardado, y como
-- exam_answers cuelga de exam_questions con borrado en cascada, se llevó
-- puestas todas sus respuestas.
--
-- El intento quedó marcado como "pendiente de corrección" pero sin nada
-- que corregir: no hay respuestas escritas para leer ni opciones para
-- revisar. Es imposible ponerle nota, así que va a quedar ahí para
-- siempre mostrando 0.
--
-- QUE HACE ESTE ARCHIVO
-- Borra ese intento vacío para que Lucas pueda rendir de nuevo. No toca
-- ningún otro resultado.
--
-- OJO: esto borra datos de una persona. Avisale a Lucas que tiene que
-- volver a rendir el examen de Mozos antes de correrlo.
--
-- El problema de fondo ya está arreglado: el editor conserva los ids
-- desde el 15/9 y esto no se puede repetir.
--
-- Correr entero en Supabase -> SQL Editor.
-- ============================================================

BEGIN;

-- Freno: solo borra si efectivamente quedó sin ninguna respuesta.
DO $$
DECLARE afectados int;
BEGIN
  SELECT count(*) INTO afectados
  FROM exam_results r
  JOIN profiles p ON p.id = r.user_id
  JOIN exams e ON e.id = r.exam_id
  WHERE p.full_name ILIKE 'Lucas%'
    AND e.title = 'Examen: Mozos, Runners y Comisses'
    AND r.review_status = 'pending_review'
    AND NOT EXISTS (SELECT 1 FROM exam_answers a WHERE a.result_id = r.id);

  IF afectados <> 1 THEN
    RAISE EXCEPTION 'Se esperaba 1 intento vacío y se encontraron %: se cancela.', afectados;
  END IF;
END $$;

DELETE FROM exam_results r
USING profiles p, exams e
WHERE p.id = r.user_id
  AND e.id = r.exam_id
  AND p.full_name ILIKE 'Lucas%'
  AND e.title = 'Examen: Mozos, Runners y Comisses'
  AND r.review_status = 'pending_review'
  AND NOT EXISTS (SELECT 1 FROM exam_answers a WHERE a.result_id = r.id);

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: no tiene que quedar ningun intento pendiente sin
-- respuestas. Los que aparezcan acá sí se pueden corregir.
-- ------------------------------------------------------------
SELECT p.full_name AS persona,
       e.title      AS examen,
       r.completed_at::date AS rindio,
       count(a.id)  AS respuestas_para_corregir
FROM exam_results r
JOIN profiles p ON p.id = r.user_id
JOIN exams e ON e.id = r.exam_id
LEFT JOIN exam_answers a ON a.result_id = r.id
WHERE r.review_status = 'pending_review'
GROUP BY p.full_name, e.title, r.completed_at
ORDER BY r.completed_at;
