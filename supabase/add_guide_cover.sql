-- ============================================================
-- Portada de las guías
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- URL pública de la imagen de portada. NULL = se usa un fondo generado
-- a partir del título, así ninguna guía se ve rota sin foto.
ALTER TABLE guides ADD COLUMN IF NOT EXISTS cover_image text;

SELECT title, CASE WHEN cover_image IS NULL THEN 'sin portada' ELSE 'con portada' END AS portada
FROM guides ORDER BY title;
