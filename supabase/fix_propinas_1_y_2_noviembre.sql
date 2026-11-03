-- ============================================================
-- Propinas: el 01/11 y el 02/11, como los mandaron las cajeras al grupo
--
-- Enzo (03/11) pidió subir a la app los reportes de propinas del 01/11 y del
-- 02/11 que las cajeras mandaron al grupo "Mozos | MW" (los hicieron con la
-- calculadora vieja). Van iguales: mismos nombres, mismas horas, mismos
-- grupos y la misma plata, peso por peso. La cuenta de la app da exactamente
-- esos montos.
--
-- - 01/11: no estaba cargado. Total $ 1.002.000, General $ 217.000, 14 mozos.
--   La suma da $ 784.999, un peso menos que el salón, por el redondeo
--   (igual que en el reporte).
-- - 02/11: estaba la prueba de Enzo (una sola fila, "Prueba11") y se
--   reemplaza por el de verdad. Total $ 671.700, General $ 138.100, 7 mozos.
--   Lo mandó Ariana Mastrella, así que queda como cargado por ella.
--
-- Cada nombre lleva el usuario que le pone la app al guardar (hace falta
-- nombre y apellido: un nombre solo no alcanza). Así lo ven en su app Lucas
-- Lopez, Micaela Dolesor y Nicolás Fuentes. A Nicolás se le pone su usuario
-- de siempre, el de la planilla: el 03/11 se creó un segundo usuario con su
-- nombre.
--
-- Freno: si alguno de los dos días ya está cargado con otros datos (que no
-- sean la prueba ni estos mismos), no cambia nada. Se puede correr dos veces.
-- ============================================================

DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT d.fecha, d.total, d.general,
           (SELECT array_agg(e.nombre ORDER BY e.orden) FROM tip_entries e WHERE e.day_id = d.id) AS nombres
    FROM tip_days d
    WHERE d.fecha IN ('2026-11-01', '2026-11-02')
  LOOP
    IF NOT (
      (v.fecha = '2026-11-01' AND v.total = 1002000 AND v.general = 217000)
      OR (v.fecha = '2026-11-02' AND v.total = 671700 AND v.general = 138100)
      OR (v.fecha = '2026-11-02' AND v.nombres = ARRAY['Prueba11'])
    ) THEN
      RAISE EXCEPTION 'El % ya está cargado con otros datos (total $ %): no cambié nada.', to_char(v.fecha, 'DD/MM'), v.total;
    END IF;
  END LOOP;
END $$;

-- Una sola sentencia: los dos días (el 02/11 pisa la prueba), se borran sus
-- filas viejas y se ponen las de los reportes.
WITH dias (fecha, total, general, por_hora, cargado_por) AS (
  VALUES
    ('2026-11-01'::date, 1002000, 217000, 7969.54, NULL::uuid),
    ('2026-11-02'::date, 671700, 138100, 10834.52,
     (SELECT id FROM auth.users WHERE id = '49df540f-6c25-44f4-8fa3-588b4a13875b'))  -- Ariana Mastrella
),
guardados AS (
  INSERT INTO tip_days (fecha, total, general, por_hora, updated_by)
  SELECT fecha, total, general, por_hora, cargado_por FROM dias
  ON CONFLICT (fecha) DO UPDATE
    SET total = excluded.total, general = excluded.general, por_hora = excluded.por_hora,
        updated_by = excluded.updated_by, updated_at = now()
  RETURNING id, fecha
),
borradas AS (
  DELETE FROM tip_entries e USING guardados g WHERE e.day_id = g.id
  RETURNING e.id
),
filas (fecha, orden, nombre, usuario, grupo, horas, monto, pago, efectivo) AS (
  VALUES
    -- 01/11
    ('2026-11-01'::date, 0, 'Nicolas Fuentes', 'c3a897aa-c18e-402b-8852-f80f9a9f1430'::uuid, 'camarero', 10.00, 79695, NULL, NULL::int),
    ('2026-11-01', 1, 'Lucas Lopez', 'a1fe075d-b9dc-4232-8f2e-88662abd154b', 'camarero', 10, 79695, NULL, NULL),
    ('2026-11-01', 2, 'Brisa Di Scala', NULL, 'camarero', 10, 79695, NULL, NULL),
    ('2026-11-01', 3, 'Agustin A.', NULL, 'camarero', 9.25, 73718, NULL, NULL),
    ('2026-11-01', 4, 'Azul Pretel', NULL, 'camarero', 9, 71726, NULL, NULL),
    ('2026-11-01', 5, 'Pamela Almada', NULL, 'camarero', 8, 63756, NULL, NULL),
    ('2026-11-01', 6, 'Raquel Aguirre', NULL, 'camarero', 7, 55787, NULL, NULL),
    ('2026-11-01', 7, 'Lucas Ibarra', NULL, 'camarero', 7, 55787, NULL, NULL),
    ('2026-11-01', 8, 'Cinthia Igoa', NULL, 'camarero', 7, 55787, NULL, NULL),
    ('2026-11-01', 9, 'Gabriel Cansino', NULL, 'camarero', 6, 47817, NULL, NULL),
    ('2026-11-01', 10, 'Martina', NULL, 'reducido', 6.5, 38852, NULL, NULL),
    ('2026-11-01', 11, 'Morena', NULL, 'prueba', 8, 31878, NULL, NULL),
    ('2026-11-01', 12, 'Lucia', NULL, 'prueba', 7.5, 29886, NULL, NULL),
    ('2026-11-01', 13, 'Belen', NULL, 'prueba', 5.25, 20920, NULL, NULL),
    -- 02/11
    ('2026-11-02', 0, 'Brisa Di Scala', NULL, 'camarero', 10, 108345, NULL, NULL),
    ('2026-11-02', 1, 'Pamela Almada', NULL, 'camarero', 8.75, 94802, 'tr_ef', 10100),
    ('2026-11-02', 2, 'Micaela Dolesor', 'b53d00f3-733b-4302-a6a6-5fe8c4bceadb', 'camarero', 8, 86676, NULL, NULL),
    ('2026-11-02', 3, 'Lucas Lopez', 'a1fe075d-b9dc-4232-8f2e-88662abd154b', 'camarero', 7.75, 83968, NULL, NULL),
    ('2026-11-02', 4, 'Marti', NULL, 'reducido', 10, 81259, NULL, NULL),
    ('2026-11-02', 5, 'Giuliana', NULL, 'prueba', 9, 48755, NULL, NULL),
    ('2026-11-02', 6, 'Lucia', NULL, 'prueba', 5.5, 29795, NULL, NULL)
)
INSERT INTO tip_entries (day_id, orden, nombre, user_id, grupo, horas, monto, pago, efectivo)
SELECT g.id, f.orden, f.nombre,
       -- Si ese usuario ya no existe, la fila queda sin usuario.
       (SELECT p.id FROM profiles p WHERE p.id = f.usuario),
       f.grupo, f.horas, f.monto, f.pago, f.efectivo
FROM filas f
JOIN guardados g ON g.fecha = f.fecha;

-- Verificación: dos filas.
--   01/11 · 1002000 · 217000 · 7969.54 · 14 personas · 784999 repartido · Nicolas Fuentes, Lucas Lopez
--   02/11 ·  671700 · 138100 · 10834.52 · 7 personas · 533600 repartido · Micaela Dolesor, Lucas Lopez
SELECT to_char(d.fecha, 'DD/MM') AS dia,
       d.total, d.general, d.por_hora,
       count(e.id) AS personas,
       sum(e.monto) AS repartido,
       string_agg(e.nombre, ', ' ORDER BY e.orden) FILTER (WHERE e.user_id IS NOT NULL) AS lo_ven_en_su_app
FROM tip_days d
JOIN tip_entries e ON e.day_id = d.id
WHERE d.fecha IN ('2026-11-01', '2026-11-02')
GROUP BY d.fecha, d.total, d.general, d.por_hora
ORDER BY d.fecha;
