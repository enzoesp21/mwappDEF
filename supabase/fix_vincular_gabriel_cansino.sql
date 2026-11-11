-- ============================================================
-- Gabriel Cansino se sumó a la app (11/11): vincular sus propinas y su planilla
--
-- Enzo: "se unió Gabriel Cansino, enlazalo también". Sus 8 días de propinas
-- se cargaron antes de que se registrara y quedaron sin dueño. En la planilla
-- figura como "GABRIEL CRASINO" (en Horarios, "Gabriel Cansino").
--
-- Solo completa lo vacío; no toca montos ni horas. La app ya lo haría sola
-- en el próximo guardado de un día, pero así lo ve desde ahora. Se puede
-- correr dos veces.
-- ============================================================

-- Freno: tiene que ser su usuario.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles
                 WHERE id = '349a8fd2-7a37-441b-8b6a-92b435056466'
                   AND lower(btrim(full_name)) = 'gabriel cansino') THEN
    RAISE EXCEPTION 'No encontré el usuario de Gabriel Cansino: no toco nada.';
  END IF;
END $$;

BEGIN;

-- 1) Sus propinas, sin dejarle dos filas el mismo día.
UPDATE tip_entries t
SET user_id = '349a8fd2-7a37-441b-8b6a-92b435056466'
WHERE t.nombre = 'Gabriel Cansino'
  AND t.user_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM tip_entries o
                  WHERE o.day_id = t.day_id AND o.user_id = '349a8fd2-7a37-441b-8b6a-92b435056466');

-- 2) Su fila de la planilla.
UPDATE planilla_empleados
SET profile_id = '349a8fd2-7a37-441b-8b6a-92b435056466'
WHERE nombre = 'GABRIEL CRASINO'
  AND profile_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM planilla_empleados WHERE profile_id = '349a8fd2-7a37-441b-8b6a-92b435056466');

COMMIT;

-- Verificación: 8 propinas y "sí" en la planilla.
SELECT (SELECT count(*) FROM tip_entries WHERE user_id = '349a8fd2-7a37-441b-8b6a-92b435056466') AS propinas_que_ve,
       CASE WHEN EXISTS (SELECT 1 FROM planilla_empleados WHERE profile_id = '349a8fd2-7a37-441b-8b6a-92b435056466')
            THEN 'sí' ELSE 'NO' END AS en_la_planilla;
