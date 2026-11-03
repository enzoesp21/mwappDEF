-- ============================================================
-- Octubre: Honorio Sachett y sus fichadas de papel
--
-- Honorio Sachett (hermano de Angel Sachett, lo dijo Enzo el 02/11) trabajó en
-- octubre sin huella en el reloj y fichó en la planilla de papel. No estaba en
-- la planilla de la app. Esto:
--   1. lo agrega al final de la planilla, sin cargo (como los nuevos);
--   2. carga sus fichadas de papel de octubre (fuente 'papel'), leídas de la
--      foto de la planilla: 1, 2, 3, 13, 14, 20, 21, 27 y 28/10. El 3/10 no
--      tiene salida (queda incompleta) y la salida del 2/10 (20:00) no se lee
--      bien: revisar las dos en la planilla.
-- Después hay que tocar "Actualizar ahora" en la planilla de octubre, para que
-- arme sus celdas y lo sume a la hoja del mes.
--
-- Octubre está cerrado: hay que reabrirlo antes desde la app. Si no, el freno
-- de abajo no deja seguir. Se puede correr dos veces: no lo duplica a él ni a
-- sus fichadas.
-- ============================================================

-- Freno: tiene que estar la planilla, y octubre abierto.
DO $$
BEGIN
  IF to_regclass('public.fichadas_manuales') IS NULL OR to_regclass('public.planilla_empleados') IS NULL THEN
    RAISE EXCEPTION 'Falta la planilla maestra: corré primero supabase/add_fichadas_planilla.sql.';
  END IF;
  IF (SELECT estado FROM planilla_meses WHERE periodo = '2026-10-01') = 'cerrado' THEN
    RAISE EXCEPTION 'Octubre está cerrado. Reabrilo en la app (Fichadas → Planilla del mes → octubre → Reabrir) y volvé a correr esto.';
  END IF;
END $$;

-- 1. Al final de la planilla, sin cargo.
INSERT INTO planilla_empleados (nombre, cargo, orden)
SELECT 'HONORIO SACHETT', NULL, coalesce(max(orden), 0) + 1
FROM planilla_empleados
ON CONFLICT (nombre) DO NOTHING;

-- 2. Sus fichadas de papel, en hora de Argentina (todas antes de medianoche).
INSERT INTO fichadas_manuales (empleado_id, fecha_hora, fuente, nota)
SELECT e.id, (f.dia || ' ' || f.hora || ':00-03')::timestamptz, 'papel', 'Planilla de papel de octubre (foto del 02/11)'
FROM planilla_empleados e
CROSS JOIN (VALUES
  ('2026-10-01', '09:00'), ('2026-10-01', '17:00'),
  ('2026-10-02', '09:00'), ('2026-10-02', '20:00'),
  ('2026-10-03', '09:00'),
  ('2026-10-13', '09:00'), ('2026-10-13', '17:00'),
  ('2026-10-14', '09:00'), ('2026-10-14', '16:40'),
  ('2026-10-20', '09:00'), ('2026-10-20', '17:30'),
  ('2026-10-21', '09:00'), ('2026-10-21', '17:30'),
  ('2026-10-27', '09:00'), ('2026-10-27', '17:30'),
  ('2026-10-28', '09:00'), ('2026-10-28', '17:00')
) AS f(dia, hora)
WHERE e.nombre = 'HONORIO SACHETT'
ON CONFLICT (empleado_id, fecha_hora) DO NOTHING;

-- Verificación: "sí", 17 fichadas y octubre "abierto". Después tocá
-- "Actualizar ahora" en la planilla de octubre.
SELECT 'Honorio en la planilla' AS que,
       coalesce((SELECT 'sí, al final (orden ' || orden || ')' FROM planilla_empleados WHERE nombre = 'HONORIO SACHETT'), 'NO') AS resultado
UNION ALL
SELECT 'sus fichadas de papel en octubre',
       (SELECT count(*)::text FROM fichadas_manuales m JOIN planilla_empleados e ON e.id = m.empleado_id
        WHERE e.nombre = 'HONORIO SACHETT' AND m.fecha_hora >= '2026-10-01 07:00-03' AND m.fecha_hora < '2026-11-01 07:00-03')
UNION ALL
SELECT 'octubre', (SELECT estado FROM planilla_meses WHERE periodo = '2026-10-01');
