-- ============================================================
-- Rutas de aprendizaje por puesto
--
-- Cada puesto tiene un recorrido ordenado de guias, que la app muestra
-- como una linea de tiempo en la pestaña Guias:
--
--   Guía 1      la base, igual para todos
--   Guía 1 bis  la del sector de esa persona, si tiene una
--   Guía 2..n   las generales, que le sirven a todo el salon
--
-- No bloquea nada: marca el orden sugerido y cual es la que sigue, pero
-- cualquiera puede entrar a la guia que quiera. Si alguien cubre postres
-- un sabado, va directo a esa guia sin aprobar las anteriores. Las guias
-- que no entran en la ruta de su puesto siguen estando a mano, mas abajo.
--
-- La ruta es curada a proposito, no derivada de guides.puestos: hoy casi
-- todas las guias estan asignadas a todos los puestos, asi que derivarla
-- le metia a Caja y a Limpieza la guia de Ensaladas en el recorrido.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente: rearma las
-- rutas desde cero cada vez.
-- ============================================================

CREATE TABLE IF NOT EXISTS guide_paths (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  puesto   text NOT NULL,
  guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  orden    int  NOT NULL,
  etiqueta text NOT NULL,
  UNIQUE (puesto, guide_id)
);

ALTER TABLE guide_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guide_paths_read ON guide_paths;
CREATE POLICY guide_paths_read ON guide_paths
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS guide_paths_admin_write ON guide_paths;
CREATE POLICY guide_paths_admin_write ON guide_paths
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

BEGIN;

DELETE FROM guide_paths;

WITH puestos AS (
  SELECT unnest(ARRAY[
    'Calienta Platos','Cocina','Barra','Bacha','Caja','Limpieza',
    'Ensaladas','Pastelería','Mozos','Commis','Recepción'
  ]) AS puesto
),

-- Cual es "la guia del sector" de cada puesto. Los que no figuran acá
-- no tienen guia propia todavia y pasan directo a las generales.
sector AS (
  SELECT * FROM (VALUES
    ('Mozos',           '%Mozos, Runners%'),
    ('Commis',          '%Mozos, Runners%'),
    ('Calienta Platos', '%Calienta Platos%'),
    ('Ensaladas',       '%Ensaladas%'),
    ('Pastelería',      '%Tortas y Tartas%')
  ) AS s(puesto, patron)
),

-- Las generales, en el orden en que conviene leerlas.
generales AS (
  SELECT * FROM (VALUES
    (1, '%Platos e Ingredientes%'),
    (2, '%Tortas y Tartas%')
  ) AS g(pos, patron)
),

-- Resolucion de patrones a guias reales.
guia_base AS (
  SELECT id FROM guides WHERE is_primary = true LIMIT 1
),
guia_sector AS (
  SELECT s.puesto, g.id AS guide_id
  FROM sector s
  JOIN guides g ON g.title ILIKE s.patron
),
guia_general AS (
  SELECT ge.pos, g.id AS guide_id
  FROM generales ge
  JOIN guides g ON g.title ILIKE ge.patron
),

-- Armado del recorrido.
pasos AS (
  SELECT p.puesto, (SELECT id FROM guia_base) AS guide_id, 1 AS rango, 0 AS pos
  FROM puestos p
  WHERE EXISTS (SELECT 1 FROM guia_base)

  UNION ALL

  SELECT p.puesto, gs.guide_id, 2, 0
  FROM puestos p
  JOIN guia_sector gs ON gs.puesto = p.puesto

  UNION ALL

  -- Las generales, salteando la que ya es la guia de sector de ese puesto.
  SELECT p.puesto, gg.guide_id, 3, gg.pos
  FROM puestos p
  CROSS JOIN guia_general gg
  WHERE NOT EXISTS (
    SELECT 1 FROM guia_sector gs
    WHERE gs.puesto = p.puesto AND gs.guide_id = gg.guide_id
  )
),
numeradas AS (
  SELECT puesto, guide_id, rango,
         row_number() OVER (PARTITION BY puesto ORDER BY rango, pos) AS orden,
         row_number() OVER (PARTITION BY puesto, rango ORDER BY pos) AS dentro
  FROM pasos
)
INSERT INTO guide_paths (puesto, guide_id, orden, etiqueta)
SELECT puesto, guide_id, orden::int,
       CASE rango
         WHEN 1 THEN 'Guía 1'
         WHEN 2 THEN 'Guía 1 bis'
         ELSE 'Guía ' || (dentro + 1)::text
       END
FROM numeradas;

-- Freno: si algun patron no resolvio, la ruta queda coja y conviene saberlo.
DO $$
DECLARE sin_ruta int;
BEGIN
  SELECT count(*) INTO sin_ruta
  FROM (VALUES
    ('Calienta Platos'),('Cocina'),('Barra'),('Bacha'),('Caja'),('Limpieza'),
    ('Ensaladas'),('Pastelería'),('Mozos'),('Commis'),('Recepción')
  ) AS p(puesto)
  WHERE NOT EXISTS (SELECT 1 FROM guide_paths gp WHERE gp.puesto = p.puesto);

  IF sin_ruta > 0 THEN
    RAISE EXCEPTION 'Quedaron % puestos sin ninguna guia en su ruta: se cancela.', sin_ruta;
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: el recorrido de cada puesto.
-- ------------------------------------------------------------
SELECT gp.puesto,
       count(*) AS pasos,
       string_agg(gp.etiqueta || ': ' || g.title, '  ->  ' ORDER BY gp.orden) AS recorrido
FROM guide_paths gp
JOIN guides g ON g.id = gp.guide_id
GROUP BY gp.puesto
ORDER BY gp.puesto;
