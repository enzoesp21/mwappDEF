-- ============================================================
-- Hoja de plazas de los mozos (la que se imprime todos los días)
--
-- Enzo, 21/11: la hoja "Plazas Mozos" que imprimen todos los días para armar
-- las plazas y anotar las horas. Que las cajeras puedan agregar al mozo nuevo
-- que entra o sacar al que se va, que se vea al momento para todas, y después
-- imprimirla. Facu la completa con lapicera. Y poder sumar filas a una
-- sección (merienda, cena...) cuando hay más mozos que lo normal, sin que la
-- hoja se salga de la A4.
--
-- - plazas_mozos: los mozos de la hoja, en orden. Van en la tabla del
--   Almuerzo y en los recuadros de "Horas del día".
-- - plazas_secciones: cuántas filas lleva cada sección (y en el Almuerzo y
--   las horas, cuántas en blanco de más).
-- - Las ven y las cambian solo quienes cargan propinas (las cajeras con el
--   permiso) y los encargados: puede_cargar_propinas(). Los mozos, nada.
-- - plazas_mover(): sube o baja a un mozo en la lista.
--
-- La primera vez arranca con la lista y las filas de la hoja de hoy (el PDF
-- de Enzo). Si se vuelve a correr, no toca lo que hayan cambiado.
-- ============================================================

-- Freno: necesita el permiso de propinas.
DO $$
BEGIN
  IF to_regprocedure('public.puede_cargar_propinas()') IS NULL THEN
    RAISE EXCEPTION 'Falta puede_cargar_propinas(): corré primero supabase/add_propinas.sql.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS plazas_mozos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  orden      integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plazas_mozos_nombre CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 40)
);
CREATE INDEX IF NOT EXISTS plazas_mozos_orden_idx ON plazas_mozos (orden);

CREATE TABLE IF NOT EXISTS plazas_secciones (
  clave      text PRIMARY KEY
             CHECK (clave IN ('desayuno_8', 'desayuno_10', 'almuerzo', 'merienda', 'cena', 'horas')),
  filas      integer NOT NULL CHECK (filas BETWEEN 0 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Como en la hoja de hoy: desayunos 5 y 8 filas, almuerzo con 1 en blanco
-- después de los mozos, merienda 10, cena 8 y 3 recuadros de horas vacíos.
INSERT INTO plazas_secciones (clave, filas) VALUES
  ('desayuno_8', 5), ('desayuno_10', 8), ('almuerzo', 1), ('merienda', 10), ('cena', 8), ('horas', 3)
ON CONFLICT (clave) DO NOTHING;

-- La lista de la hoja de hoy, solo si todavía está vacía.
INSERT INTO plazas_mozos (nombre, orden)
SELECT n.nombre, n.orden
FROM (VALUES
  ('Brisa D.', 1), ('Nicolás F.', 2), ('Rocio C.', 3), ('Pamela A.', 4), ('Raquel A.', 5),
  ('Lucas I.', 6), ('Lucas L.', 7), ('Agustin A.', 8), ('Gabriel C.', 9), ('Morena C.', 10),
  ('Azul P.', 11), ('Micaela D.', 12), ('Cinthia I.', 13), ('Martina B.', 14), ('Lucia L.', 15),
  ('Belén S.', 16)
) AS n(nombre, orden)
WHERE NOT EXISTS (SELECT 1 FROM plazas_mozos);

ALTER TABLE plazas_mozos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plazas_secciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plazas_mozos_cajeras ON plazas_mozos;
CREATE POLICY plazas_mozos_cajeras ON plazas_mozos
  FOR ALL TO authenticated
  USING (puede_cargar_propinas())
  WITH CHECK (puede_cargar_propinas());
DROP POLICY IF EXISTS plazas_secciones_cajeras ON plazas_secciones;
CREATE POLICY plazas_secciones_cajeras ON plazas_secciones
  FOR ALL TO authenticated
  USING (puede_cargar_propinas())
  WITH CHECK (puede_cargar_propinas());
GRANT SELECT, INSERT, UPDATE, DELETE ON plazas_mozos TO authenticated;
GRANT SELECT, UPDATE ON plazas_secciones TO authenticated;

-- Sube (-1) o baja (+1) a un mozo un lugar en la lista: cambia de lugar con el
-- de al lado, en una sola operación (así dos cajeras a la vez no se pisan).
CREATE OR REPLACE FUNCTION plazas_mover(p_id uuid, p_paso integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_orden   integer;
  v_vecino  uuid;
  v_orden_v integer;
BEGIN
  IF NOT puede_cargar_propinas() THEN
    RAISE EXCEPTION 'No tenés permiso para cambiar la hoja de plazas.' USING ERRCODE = '42501';
  END IF;
  -- Primero se dejan los números de orden seguidos (1, 2, 3...).
  UPDATE plazas_mozos m SET orden = o.nuevo
  FROM (SELECT id, row_number() OVER (ORDER BY orden, created_at) AS nuevo FROM plazas_mozos) o
  WHERE m.id = o.id AND m.orden <> o.nuevo;

  SELECT orden INTO v_orden FROM plazas_mozos WHERE id = p_id;
  IF v_orden IS NULL THEN
    RAISE EXCEPTION 'Ese mozo ya no está en la hoja.';
  END IF;
  SELECT id, orden INTO v_vecino, v_orden_v FROM plazas_mozos WHERE orden = v_orden + sign(p_paso)::int;
  IF v_vecino IS NULL THEN
    RETURN; -- Ya está primero o último.
  END IF;
  UPDATE plazas_mozos SET orden = v_orden_v WHERE id = p_id;
  UPDATE plazas_mozos SET orden = v_orden WHERE id = v_vecino;
END;
$$;
REVOKE ALL ON FUNCTION plazas_mover(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION plazas_mover(uuid, integer) TO authenticated;

-- Verificación: cuatro filas, las dos primeras "listo".
SELECT 'tablas de la hoja de plazas' AS que,
       CASE WHEN to_regclass('public.plazas_mozos') IS NOT NULL AND to_regclass('public.plazas_secciones') IS NOT NULL
            THEN 'listo' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'solo cajeras con permiso y encargados',
       CASE WHEN (SELECT count(*) FROM pg_policies WHERE tablename IN ('plazas_mozos', 'plazas_secciones')) = 2
            THEN 'listo' ELSE 'REVISAR' END
UNION ALL
SELECT 'mozos en la hoja', count(*)::text || ': ' || string_agg(nombre, ', ' ORDER BY orden) FROM plazas_mozos
UNION ALL
SELECT 'filas por sección', string_agg(clave || ' ' || filas, ' · ' ORDER BY clave) FROM plazas_secciones;
