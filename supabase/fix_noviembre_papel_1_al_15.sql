-- ============================================================
-- Planilla: lo anotado en papel del 1 al 15 de noviembre
--
-- Enzo, 15/11, pasó dos hojas de la planilla en papel (entrada y salida
-- firmadas) y confirmó lo que no se leía bien. Se cargan como fichadas de
-- papel, igual que la pestaña Papel: una entrada y una salida por renglón.
-- Una salida antes de las 07:00 es de esa misma jornada (Juan Prado sale a la
-- 01:32: queda el día siguiente a esa hora).
--
-- - Nueve no estaban en la planilla (no tienen huella): se agregan al final,
--   sin cargo, como Honorio Sachett en octubre: HONORIO SACHETT, DIEGO
--   GARCIA, AGUSTINA ROLON, MATEO GAVIÑA, LUCIO PEREZ, JUAN PRADO, MARA
--   CHAPA, ADRIAN MORENO y MAITE ALONSO.
-- - Belén Gallegos (1/11 y 3/11, antes de tener huella) y Gonzalo Funes
--   (14/11 y 15/11, no fichó en el reloj) ya estaban.
-- - Pamela Almada (4/11) NO va: Enzo ya le cargó ese día a mano.
-- - Lo que confirmó Enzo: "3/10" y "4/10" eran 3/11 y 4/11; Mateo es Gaviña;
--   Juan Prado el 6/11 salió 19:40; Diego García el 4/11 salió 14:51, el 7/11
--   entró 10:00 y salió 18:00, y el 9/11 hizo 9 horas (8:56 a 17:56); la
--   segunda vez de Honorio y Adrián Moreno es del 13/11; Funes el 15/11 salió
--   18:19.
--
-- Las horas aparecen en la planilla después de tocar "Recalcular todo el mes"
-- en Fichadas -> Planilla del mes (noviembre). No pisa celdas cargadas a mano.
-- Se puede correr dos veces: no repite empleados ni fichadas.
-- ============================================================

-- Freno: noviembre tiene que estar abierto, y Belén y Funes tienen que estar.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM planilla_meses WHERE periodo = date '2026-11-01' AND estado = 'cerrado') THEN
    RAISE EXCEPTION 'Noviembre está cerrado: reabrilo desde la planilla antes de cargar el papel.';
  END IF;
  IF (SELECT count(*) FROM planilla_empleados WHERE nombre IN ('BELEN GALLEGOS', 'GONZALO FUNES')) <> 2 THEN
    RAISE EXCEPTION 'No se encuentran BELEN GALLEGOS y GONZALO FUNES en la planilla: no se carga nada.';
  END IF;
END $$;

-- 1. Los nueve nuevos, al final de la hoja ------------------------------------

INSERT INTO planilla_empleados (nombre, cargo, orden)
SELECT n.nombre, NULL, (SELECT coalesce(max(orden), 0) FROM planilla_empleados) + row_number() OVER (ORDER BY n.i)
FROM (VALUES
  (1, 'HONORIO SACHETT'), (2, 'DIEGO GARCIA'), (3, 'AGUSTINA ROLON'), (4, 'MATEO GAVIÑA'),
  (5, 'LUCIO PEREZ'), (6, 'JUAN PRADO'), (7, 'MARA CHAPA'), (8, 'ADRIAN MORENO'), (9, 'MAITE ALONSO')
) AS n(i, nombre)
WHERE NOT EXISTS (SELECT 1 FROM planilla_empleados e WHERE e.nombre = n.nombre);

-- 2. Las fichadas de papel ----------------------------------------------------

INSERT INTO fichadas_manuales (empleado_id, fecha_hora, fuente, nota, created_by)
SELECT e.id,
       -- Hora de Argentina; antes de las 07:00 es de madrugada: el día siguiente.
       (p.fecha + h.hora + CASE WHEN h.hora < time '07:00' THEN interval '1 day' ELSE interval '0' END)
         AT TIME ZONE 'America/Argentina/Buenos_Aires',
       'papel',
       'Planilla en papel del 1 al 15/11 (pasada por Enzo el 15/11)',
       (SELECT id FROM profiles WHERE role = 'admin' AND full_name = 'Enzo Espiño' LIMIT 1)
FROM (VALUES
  (date '2026-11-01', 'BELEN GALLEGOS',  time '11:00', time '17:15'),
  (date '2026-11-01', 'MATEO GAVIÑA',    time '09:15', time '14:36'),
  (date '2026-11-03', 'HONORIO SACHETT', time '09:00', time '17:30'),
  (date '2026-11-03', 'DIEGO GARCIA',    time '09:00', time '14:04'),
  (date '2026-11-03', 'AGUSTINA ROLON',  time '09:00', time '14:00'),
  (date '2026-11-03', 'BELEN GALLEGOS',  time '11:00', time '20:20'),
  (date '2026-11-04', 'DIEGO GARCIA',    time '09:00', time '14:51'),
  (date '2026-11-04', 'HONORIO SACHETT', time '08:40', time '17:30'),
  (date '2026-11-04', 'AGUSTINA ROLON',  time '09:00', time '17:30'),
  (date '2026-11-05', 'LUCIO PEREZ',     time '08:58', time '18:00'),
  (date '2026-11-05', 'DIEGO GARCIA',    time '09:55', time '18:54'),
  (date '2026-11-06', 'LUCIO PEREZ',     time '09:06', time '16:58'),
  (date '2026-11-06', 'DIEGO GARCIA',    time '09:51', time '16:35'),
  (date '2026-11-06', 'JUAN PRADO',      time '16:00', time '19:40'),
  (date '2026-11-07', 'LUCIO PEREZ',     time '08:06', time '19:50'),
  (date '2026-11-07', 'DIEGO GARCIA',    time '10:00', time '18:00'),
  (date '2026-11-07', 'AGUSTINA ROLON',  time '10:00', time '18:17'),
  (date '2026-11-07', 'JUAN PRADO',      time '15:54', time '01:32'),
  (date '2026-11-08', 'LUCIO PEREZ',     time '07:57', time '20:24'),
  (date '2026-11-08', 'DIEGO GARCIA',    time '09:56', time '19:40'),
  (date '2026-11-08', 'JUAN PRADO',      time '13:00', time '01:10'),
  (date '2026-11-09', 'DIEGO GARCIA',    time '08:56', time '17:56'),
  (date '2026-11-09', 'JUAN PRADO',      time '14:30', time '23:51'),
  (date '2026-11-10', 'DIEGO GARCIA',    time '08:59', time '16:55'),
  (date '2026-11-10', 'MARA CHAPA',      time '09:05', time '15:00'),
  (date '2026-11-10', 'JUAN PRADO',      time '14:22', time '23:43'),
  (date '2026-11-11', 'MARA CHAPA',      time '08:51', time '17:00'),
  (date '2026-11-11', 'DIEGO GARCIA',    time '08:59', time '16:34'),
  (date '2026-11-12', 'MARA CHAPA',      time '08:45', time '18:20'),
  (date '2026-11-12', 'HONORIO SACHETT', time '08:00', time '17:30'),
  (date '2026-11-12', 'ADRIAN MORENO',   time '09:00', time '17:30'),
  (date '2026-11-13', 'HONORIO SACHETT', time '09:00', time '16:40'),
  (date '2026-11-13', 'ADRIAN MORENO',   time '09:30', time '23:33'),
  (date '2026-11-13', 'MAITE ALONSO',    time '10:00', time '17:30'),
  (date '2026-11-13', 'JUAN PRADO',      time '15:30', time '00:16'),
  (date '2026-11-14', 'MAITE ALONSO',    time '09:56', time '17:00'),
  (date '2026-11-14', 'JUAN PRADO',      time '14:00', time '00:00'),
  (date '2026-11-14', 'GONZALO FUNES',   time '16:00', time '23:30'),
  (date '2026-11-15', 'GONZALO FUNES',   time '09:00', time '18:19'),
  (date '2026-11-15', 'ADRIAN MORENO',   time '09:00', time '16:59'),
  (date '2026-11-15', 'DIEGO GARCIA',    time '08:55', time '17:30'),
  (date '2026-11-15', 'MAITE ALONSO',    time '10:00', time '15:00')
) AS p(fecha, nombre, entrada, salida)
JOIN planilla_empleados e ON e.nombre = p.nombre
CROSS JOIN LATERAL (VALUES (p.entrada), (p.salida)) AS h(hora)
ON CONFLICT (empleado_id, fecha_hora) DO NOTHING;

-- Verificación: una fila por persona, con cuántos días y fichadas de papel
-- quedaron cargados. Tienen que ser 11 personas, 42 días y 84 fichadas en total.
SELECT e.nombre,
       count(DISTINCT ((m.fecha_hora AT TIME ZONE 'America/Argentina/Buenos_Aires') - interval '7 hours')::date) AS dias,
       count(*) AS fichadas
FROM fichadas_manuales m
JOIN planilla_empleados e ON e.id = m.empleado_id
WHERE m.nota = 'Planilla en papel del 1 al 15/11 (pasada por Enzo el 15/11)'
GROUP BY e.nombre
ORDER BY e.nombre;
