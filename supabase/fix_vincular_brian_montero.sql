-- ============================================================
-- Brian Emanuel (usuario de Barra) es Brian Monteros de la planilla
--
-- Enzo (11/11): "sí, es Brian Montero". En el horario figura como "Braian
-- Montero" y en la planilla como "BRIAN MONTEROS": por nombre no se lo
-- encontraba. Con el vínculo, su horario sale de "Braian Montero".
--
-- Solo completa lo vacío. Se puede correr dos veces.
-- ============================================================

-- Freno: tiene que ser su usuario y la fila tiene que estar libre.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles
                 WHERE id = 'f741c190-d490-4141-ad2b-83c4d7d64a93'
                   AND lower(btrim(full_name)) = 'brian emanuel') THEN
    RAISE EXCEPTION 'No encontré el usuario de Brian Emanuel: no toco nada.';
  END IF;
  IF EXISTS (SELECT 1 FROM planilla_empleados
             WHERE nombre = 'BRIAN MONTEROS' AND profile_id IS NOT NULL
               AND profile_id <> 'f741c190-d490-4141-ad2b-83c4d7d64a93') THEN
    RAISE EXCEPTION 'BRIAN MONTEROS ya está vinculado a otro usuario: no toco nada.';
  END IF;
END $$;

UPDATE planilla_empleados
SET profile_id = 'f741c190-d490-4141-ad2b-83c4d7d64a93'
WHERE nombre = 'BRIAN MONTEROS'
  AND profile_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM planilla_empleados WHERE profile_id = 'f741c190-d490-4141-ad2b-83c4d7d64a93');

-- Verificación: tiene que decir Brian Emanuel · Braian Montero.
SELECT e.nombre, p.full_name AS usuario, array_to_string(e.nombres_horario, ' / ') AS en_el_horario_como
FROM planilla_empleados e LEFT JOIN profiles p ON p.id = e.profile_id
WHERE e.nombre = 'BRIAN MONTEROS';
