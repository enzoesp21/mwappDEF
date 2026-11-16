-- ============================================================
-- Planilla: "ALMA" es Alma Montes
--
-- Enzo, 15/11: la que figura en la planilla solo como "ALMA" (nueva de
-- octubre, reloj 614) es ALMA MONTES. Se le pone el nombre completo, como los
-- demás (apellido y nombre). Solo cambia el nombre: sus horas, el número del
-- reloj y lo demás siguen igual. Se puede correr dos veces.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM planilla_empleados WHERE nombre = 'MONTES ALMA')
     AND EXISTS (SELECT 1 FROM planilla_empleados WHERE nombre = 'ALMA') THEN
    RAISE EXCEPTION 'Están "ALMA" y "MONTES ALMA" a la vez: no se cambia nada. Avisale a Claude.';
  END IF;
END $$;

UPDATE planilla_empleados SET nombre = 'MONTES ALMA' WHERE nombre = 'ALMA';

-- Verificación: tiene que decir MONTES ALMA.
SELECT nombre, cargo, activo FROM planilla_empleados WHERE nombre IN ('ALMA', 'MONTES ALMA');
