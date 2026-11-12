-- ============================================================
-- Eventos: los eventos privados de la planilla de Enzo (12/11)
--
-- Enzo pasó su planilla de eventos (septiembre a diciembre de 2026). Se
-- cargan como eventos privados (ocupan el salón), cargados por Enzo:
--   - "AW" es el salón Ala Wai; también hay en Hula Kai y uno en "Waikiki"
--     (Gador, 12/11, 400 personas).
--   - Los de "M9" NO van: Mirador 9 es otro lugar (Enzo).
--   - La barra de tragos tampoco va (Enzo: "no tiene relevancia"). En los
--     detalles queda el menú, el postre y quién está a cargo ("(Enzo)",
--     "(Ger)"), cuando la planilla lo dice.
--   - El horario sale del nombre ("18 a 03am" -> 18:00 a 03:00). Si solo dice
--     la duración ("Cena Roche 3hs"), queda sin hora y la duración en los
--     detalles.
--   - Tres no dicen ni hora ni comida (Gador 12/11, Ética Paella 27/11 y
--     Gador 10/12): se cargan con la comida más probable y "Comida y horario
--     a confirmar" en los detalles. Los dos últimos estaban en amarillo en la
--     planilla.
--
-- Se puede correr dos veces: no repite un evento con la misma fecha y nombre.
-- ============================================================

-- Freno: tiene que estar el calendario con la hora y el salón opcionales en
-- las mesas (add_eventos.sql y fix_eventos_mesas_personalizadas.sql).
DO $$
BEGIN
  IF to_regclass('public.eventos') IS NULL THEN
    RAISE EXCEPTION 'Falta la tabla eventos: corré primero supabase/add_eventos.sql.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'eventos_evento_salon') THEN
    RAISE EXCEPTION 'Falta correr supabase/fix_eventos_mesas_personalizadas.sql.';
  END IF;
END $$;

INSERT INTO eventos (fecha, tipo, comida, hora, hora_fin, nombre, pax, salon, notas, creado_por, actualizado_por)
SELECT m.fecha, 'evento', m.comida, m.hora, m.hora_fin, m.nombre, m.pax, m.salon, m.notas, enzo.id, enzo.id
FROM (VALUES
  (date '2026-09-18', 'merienda', time '17:00', time '20:00', 'Reunión de trabajo South Post', 40,  'Hula Kai',
     'Menú: coffee. Postre: monoporciones.'),
  (date '2026-09-26', 'cena',     time '18:00', time '00:00', 'Cumpleaños Miguel Lavena',      100, 'Ala Wai',
     'Menú: finger 6 h. Postre: finger postre shots.'),
  (date '2026-10-03', 'cena',     time '21:30', time '05:30', 'XV Emma Giri',                  180, 'Ala Wai',
     'Menú: 3 pasos. Postre: mesa dulce, shots.'),
  (date '2026-10-06', 'cena',     NULL,         NULL,         'Cena Lam Weston',               120, 'Ala Wai',
     'Duración: 3 h. Menú: finger 3 h. Postre: finger postre shots.'),
  (date '2026-11-12', 'cena',     NULL,         NULL,         'Gador',                         400, 'Waikiki',
     'Comida y horario a confirmar (la planilla no los dice). Menú: 3 pasos. Postre: mesa dulce, shots.'),
  (date '2026-11-14', 'almuerzo', time '13:00', time '19:00', 'Bodas de Oro Araceli y Carlos', 56,  'Hula Kai',
     'Menú: finger. Postre: shots. A cargo: Enzo.'),
  (date '2026-11-14', 'cena',     time '18:00', time '03:00', 'Boda Renata y Claudio',         120, 'Ala Wai',
     'Menú: finger AI, italiana. Postre: mesa dulce, shots. A cargo: Ger.'),
  (date '2026-11-21', 'cena',     time '19:30', time '03:30', 'Boda Luciana y Bruno',          110, 'Ala Wai',
     'Menú: finger AI. Postre: mesa dulce, shots. A cargo: Enzo.'),
  (date '2026-11-25', 'cena',     NULL,         NULL,         'Cena Roche',                    80,  'Ala Wai',
     'Duración: 3 h. Menú: cena de 3 pasos. Postre: brownie.'),
  (date '2026-11-27', 'almuerzo', NULL,         NULL,         'Ética Paella',                  NULL, 'Hula Kai',
     'Comida, horario y cantidad de personas a confirmar (la planilla no los dice).'),
  (date '2026-11-28', 'cena',     time '21:00', time '01:00', 'XV años Mia',                   39,  'Hula Kai',
     'Menú: finger. A cargo: Enzo.'),
  (date '2026-11-28', 'cena',     time '19:00', time '03:00', 'Boda Virginia y Pablo',         100, 'Ala Wai',
     'Menú: finger AI. Postre: mesa dulce, shots. A cargo: Ger.'),
  (date '2026-12-04', 'cena',     time '20:00', time '02:00', 'EDEA',                          300, 'Ala Wai',
     'Menú: finger. Postre: mesa dulce, shots.'),
  (date '2026-12-05', 'cena',     time '19:30', time '03:30', 'Boda Cintia y Hector',          128, 'Ala Wai',
     'Menú: finger AI. Postre: mesa dulce, shots.'),
  (date '2026-12-10', 'cena',     NULL,         NULL,         'Gador',                         300, 'Ala Wai',
     'Comida y horario a confirmar (la planilla no los dice). Menú: finger. Postre: mesa dulce, shots.'),
  (date '2026-12-11', 'cena',     time '21:00', time '03:00', 'Dar Salud',                     110, 'Ala Wai',
     'Menú: 3 pasos. Postre: mesa dulce, shots.'),
  (date '2026-12-12', 'cena',     time '21:00', time '03:00', 'B. Braun',                      100, 'Ala Wai',
     'Menú: finger 6 h. Postre: mesa dulce, shots. A cargo: Ger.'),
  (date '2026-12-19', 'cena',     time '19:30', time '03:30', 'Boda Noelia y Nicolas',         115, 'Ala Wai',
     'Menú: finger AI. Postre: mesa dulce, shots.'),
  (date '2026-12-26', 'cena',     time '19:00', time '03:00', 'Boda Stefania y Federico',      150, 'Ala Wai',
     'Menú: finger AI. Postre: mesa dulce, shots.')
) AS m(fecha, comida, hora, hora_fin, nombre, pax, salon, notas)
LEFT JOIN LATERAL (
  SELECT id FROM profiles WHERE role = 'admin' AND full_name = 'Enzo Espiño' LIMIT 1
) enzo ON true
WHERE NOT EXISTS (
  SELECT 1 FROM eventos e WHERE e.fecha = m.fecha AND lower(e.nombre) = lower(m.nombre)
);

-- Verificación: los eventos privados cargados, en orden. Tienen que ser 19.
SELECT to_char(e.fecha, 'DD/MM/YYYY') AS fecha,
       e.comida,
       coalesce(to_char(e.hora, 'HH24:MI') || coalesce(' a ' || to_char(e.hora_fin, 'HH24:MI'), ''), 'sin hora') AS horario,
       e.nombre,
       e.pax,
       e.salon
FROM eventos e
WHERE e.tipo = 'evento'
ORDER BY e.fecha, e.hora NULLS LAST;
