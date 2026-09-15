-- ============================================================
-- Sube el mínimo para aprobar a 90% en todos los exámenes
--
-- No toca los resultados ya rendidos: quien aprobó bajo la regla
-- anterior sigue figurando aprobado.
-- ============================================================

UPDATE exams SET passing_score = 90;

SELECT title AS examen, passing_score AS minimo FROM exams ORDER BY title;
