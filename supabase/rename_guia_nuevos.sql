-- ============================================================
-- Renombrar la "Guía para Nuevos y No Tan Nuevos"
--
-- Pasa a llamarse MIRADOR WAIKIKI - CONOCIMIENTOS BÁSICOS, y su examen
-- acompaña el cambio.
--
-- De paso arregla algo fragil: la pantalla de bienvenida buscaba esta
-- guia por su titulo ('%Nuevos y No Tan Nuevos%'). Con el renombre esa
-- busqueda dejaba de encontrarla y el boton "Empezá por acá" se quedaba
-- sin destino, sin ningun error a la vista. Se agrega guides.is_primary
-- para marcarla, asi el codigo la encuentra por esa marca y no por como
-- se llame. Si mañana le cambias el nombre de nuevo, no se rompe nada.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- 1) Marca de guia principal, independiente del titulo.
ALTER TABLE guides ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- 2) Marcar esta guia como la principal, por el titulo viejo o el nuevo.
UPDATE guides
SET is_primary = true
WHERE title ILIKE '%Nuevos y No Tan Nuevos%'
   OR title ILIKE '%Conocimientos B%sicos%';

-- Una sola guia principal.
UPDATE guides
SET is_primary = false
WHERE is_primary = true
  AND title NOT ILIKE '%Nuevos y No Tan Nuevos%'
  AND title NOT ILIKE '%Conocimientos B%sicos%';

-- 3) El nombre nuevo.
--    Solo renombra si todavia tiene el titulo viejo. Asi, si despues le
--    cambiaste el nombre a mano, volver a correr este archivo no te lo pisa.
UPDATE guides
SET title = 'MIRADOR WAIKIKI - CONOCIMIENTOS BÁSICOS'
WHERE is_primary = true
  AND title ILIKE '%Nuevos y No Tan Nuevos%';

-- 4) El examen acompaña, con el mismo cuidado.
UPDATE exams
SET title = 'Examen: Conocimientos Básicos'
WHERE title ILIKE '%Nuevos y No Tan Nuevos%'
  AND guide_id IN (SELECT id FROM guides WHERE is_primary = true);

-- ------------------------------------------------------------
-- Verificacion: tiene que aparecer la guia con el nombre nuevo,
-- marcada como principal, y su examen renombrado.
-- ------------------------------------------------------------
SELECT g.title        AS guia,
       g.is_primary   AS es_la_principal,
       e.title        AS examen,
       length(g.content) AS caracteres_de_contenido
FROM guides g
LEFT JOIN exams e ON e.guide_id = g.id
ORDER BY g.is_primary DESC, g.title;
