-- ============================================================
-- Horario: vincular a todo el personal con su nombre en Horarios
--
-- Enzo (11/11): "vinculá a todo el personal, más que nada para los horarios".
-- La app buscaba a cada uno en el horario solo por nombre, y fallaba:
--   - Luciano Pelizardi (Barra) figura como "Lucho Pelizardi" y veía el
--     horario del Luciano Pelizardi de Cocina, que es otra persona;
--   - "Ailen Shroeder", "Federico Caruso", "Giuseppe Rivas", "Jorgelina
--     Pelizardi", "Lazarte Lautaro Daniel" y "Ornella Fernandez" están
--     escritos distinto que su usuario y no se encontraban.
-- Ahora, si alguien está vinculado en la planilla (Fichadas → Empleados: su
-- usuario y sus "nombres en Horarios"), su horario sale de esos nombres
-- exactos. Si no, se lo busca por nombre como antes.
--
-- Qué hace:
--   1) mis_nombres_horario(): le devuelve a cada uno SUS nombres en Horarios
--      (la planilla es solo de admin; esto no deja ver nada más).
--   2) Vincula en la planilla a los que tienen usuario y faltaban: Ailen
--      Schroeder, Giuseppe Riva, Jorgelina, Gabriel Gimenez, Camila
--      Gassmann, Julieta Zelada y Gabriel Cansino.
--
-- No toca propinas ni horarios. Solo completa vínculos vacíos. Se puede
-- correr dos veces.
-- ============================================================

-- Freno: los usuarios tienen que ser los esperados.
DO $$
DECLARE
  n int;
BEGIN
  IF to_regclass('public.planilla_empleados') IS NULL THEN
    RAISE EXCEPTION 'Falta la planilla: corré primero supabase/add_fichadas_planilla.sql.';
  END IF;
  SELECT count(*) INTO n FROM profiles p
  JOIN (VALUES
    ('8860f9a2-322a-448a-b936-05781862396c'::uuid, 'ailen schroeder'),
    ('e601297b-3703-4e5f-86cd-abf7f6309783'::uuid, 'giuseppe riva'),
    ('383f7e16-0fcf-4a6c-b3df-c797c00431ac'::uuid, 'jorgelina'),
    ('eb0e3a86-fedf-492e-83ba-9429c35ed212'::uuid, 'gabriel gimenez'),
    ('b760f0ad-16dc-48c2-9501-d8d9e2fd3269'::uuid, 'camila gassmann'),
    ('f4917195-c661-4478-ad90-0619c8897477'::uuid, 'julieta zelada'),
    ('349a8fd2-7a37-441b-8b6a-92b435056466'::uuid, 'gabriel cansino')
  ) AS v(id, nombre) ON v.id = p.id AND lower(btrim(p.full_name)) = v.nombre;
  IF n <> 7 THEN
    RAISE EXCEPTION 'Los usuarios no son los esperados (encontré % de 7): no toco nada.', n;
  END IF;
END $$;

BEGIN;

-- 1) Sus propios nombres en Horarios.
CREATE OR REPLACE FUNCTION mis_nombres_horario()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT n), '{}')
  FROM planilla_empleados e, unnest(e.nombres_horario) n
  WHERE e.profile_id = auth.uid() AND e.activo AND btrim(n) <> ''
$$;
REVOKE ALL ON FUNCTION mis_nombres_horario() FROM public;
GRANT EXECUTE ON FUNCTION mis_nombres_horario() TO authenticated;

-- 2) Planilla -> usuario, solo donde está vacío y si ese usuario no está en otra fila.
WITH mapa(nombre, uid) AS (VALUES
  ('SCHROEDER AILEN',          '8860f9a2-322a-448a-b936-05781862396c'::uuid),
  ('GIUSEPPE RIVAS',           'e601297b-3703-4e5f-86cd-abf7f6309783'::uuid),
  ('PELIZARDI JORGELINA',      '383f7e16-0fcf-4a6c-b3df-c797c00431ac'::uuid),
  ('GABRIEL GIMENEZ',          'eb0e3a86-fedf-492e-83ba-9429c35ed212'::uuid),
  ('GASSMANN CAMILA GABRIELA', 'b760f0ad-16dc-48c2-9501-d8d9e2fd3269'::uuid),
  ('JULIETA ZELADA',           'f4917195-c661-4478-ad90-0619c8897477'::uuid),
  ('GABRIEL CRASINO',          '349a8fd2-7a37-441b-8b6a-92b435056466'::uuid)
)
UPDATE planilla_empleados e
SET profile_id = m.uid
FROM mapa m
WHERE e.nombre = m.nombre
  AND e.profile_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM planilla_empleados o WHERE o.profile_id = m.uid);

COMMIT;

-- ------------------------------------------------------------
-- Verificación: cada uno del personal y con qué nombre se lo busca en el horario.
-- ------------------------------------------------------------
SELECT p.full_name AS persona,
       p.puesto,
       coalesce((SELECT array_to_string(e.nombres_horario, ' / ')
                 FROM planilla_empleados e
                 WHERE e.profile_id = p.id AND e.activo AND cardinality(e.nombres_horario) > 0
                 LIMIT 1),
                'por nombre') AS en_el_horario_como
FROM profiles p
WHERE p.status = 'approved' AND p.role <> 'admin'
  AND p.full_name NOT IN ('Prueba11', 'Enzo Espiño 1')
ORDER BY p.puesto, p.full_name;
