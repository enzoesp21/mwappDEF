-- ============================================================
-- Charla de la ART: se cierra
--
-- Enzo (10/11): la charla ya pasó. Sale de Inicio para todos y queda
-- solamente en el perfil de los que aprobaron el examen. Ya no se puede
-- rendir. Los encargados la siguen viendo en Guías, marcada "Cerrada".
--
-- Qué hace:
--   1) guides.capacitacion_cerrada (sirve también para charlas futuras).
--   2) Cierra la charla de la ART.
--
-- No borra nada: respuestas, exámenes y firmas quedan como están. Para
-- reabrirla, poner capacitacion_cerrada = false. Se puede correr dos veces.
-- ============================================================

-- Freno: tiene que existir la charla (add_charla_art.sql).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM guides WHERE title = 'Charla de Seguridad e Higiene (ART)') THEN
    RAISE EXCEPTION 'No encontré la charla de la ART: no toco nada.';
  END IF;
END $$;

BEGIN;

ALTER TABLE guides ADD COLUMN IF NOT EXISTS capacitacion_cerrada boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN guides.capacitacion_cerrada IS
  'Charla para todo el personal que ya pasó: sale de Inicio y queda solo en el perfil de los que aprobaron.';

UPDATE guides SET capacitacion_cerrada = true
WHERE title = 'Charla de Seguridad e Higiene (ART)' AND NOT capacitacion_cerrada;

COMMIT;

-- Verificación
SELECT 'charla de la ART' AS que,
       CASE WHEN (SELECT capacitacion_cerrada FROM guides WHERE title = 'Charla de Seguridad e Higiene (ART)')
            THEN 'cerrada' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'le queda en el perfil a (aprobaron)',
       (SELECT count(DISTINCT r.user_id)::text
        FROM exam_results r JOIN exams e ON e.id = r.exam_id JOIN guides g ON g.id = e.guide_id
        WHERE g.title = 'Charla de Seguridad e Higiene (ART)' AND r.passed);
