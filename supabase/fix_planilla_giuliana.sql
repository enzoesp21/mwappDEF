-- ============================================================
-- Planilla: la "GIULIANA" del reloj (615) es Giuliana Bartellone
--
-- Enzo confirmó que es la moza nueva que tiene usuario en la app (Giuliana
-- Bartellone Benitez). Se le pone el nombre completo en la planilla y se la
-- asocia a su usuario, que es lo que se usa para pasar sus horas a Propinas.
--
-- Se puede correr dos veces: la segunda no cambia nada.
-- ============================================================

UPDATE planilla_empleados
SET nombre = 'GIULIANA BARTELLONE',
    profile_id = (SELECT p.id FROM profiles p WHERE p.id = 'f558e325-94b6-473e-8d6b-33cc0f23876c')
WHERE nombre = 'GIULIANA';

-- Verificación: tiene que decir GIULIANA BARTELLONE, "con usuario" y 615.
SELECT e.orden, e.nombre,
       CASE WHEN e.profile_id IS NULL THEN 'sin usuario' ELSE 'con usuario' END AS app,
       string_agg(a.userid, ', ') AS reloj
FROM planilla_empleados e
LEFT JOIN planilla_reloj_alias a ON a.empleado_id = e.id
WHERE e.nombre LIKE 'GIULIANA%'
GROUP BY e.id;
