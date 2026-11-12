-- ============================================================
-- Eventos: las primeras mesas personalizadas, y hora y salón opcionales
--
-- Enzo, 12/11, pasó las primeras cuatro mesas personalizadas. Dos no tienen
-- hora ("19 de Noviembre, Cena - 30 PAX - Carlos") y ninguna dice el salón.
-- Para no inventar esos datos:
--   - una mesa personalizada ya no necesita hora ni salón (en la pantalla dice
--     "Salón a definir"); sigue necesitando la cantidad de personas;
--   - un evento privado sigue necesitando el salón, porque lo ocupa.
--
-- Carga las cuatro como cargadas por Enzo:
--   - 19/11 cena, Carlos, 30 pax;
--   - 22/11 almuerzo 13:00, Sebastián, 20 pax;
--   - 29/11 almuerzo 13:00, 22 a 30 personas (sin nombre: se carga 30 y se
--     aclara en los detalles);
--   - 18/12 cena, Laboratorios Bernabó, 16 pax.
--
-- Se puede correr dos veces: no repite una mesa con la misma fecha y nombre.
-- ============================================================

-- Freno: tiene que estar el calendario (supabase/add_eventos.sql).
DO $$
BEGIN
  IF to_regclass('public.eventos') IS NULL THEN
    RAISE EXCEPTION 'Falta la tabla eventos: corré primero supabase/add_eventos.sql.';
  END IF;
END $$;

-- 1. Hora y salón opcionales en las mesas --------------------------------------

ALTER TABLE eventos ALTER COLUMN salon DROP NOT NULL;
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_mesa_completa;
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_mesa_pax;
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_evento_salon;
ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_salon;
ALTER TABLE eventos ADD CONSTRAINT eventos_mesa_pax CHECK (tipo <> 'mesa' OR pax IS NOT NULL);
ALTER TABLE eventos ADD CONSTRAINT eventos_evento_salon CHECK (tipo <> 'evento' OR salon IS NOT NULL);
ALTER TABLE eventos ADD CONSTRAINT eventos_salon CHECK (salon IS NULL OR char_length(btrim(salon)) BETWEEN 1 AND 60);

-- 2. Las cuatro mesas ----------------------------------------------------------

INSERT INTO eventos (fecha, tipo, comida, hora, nombre, pax, salon, notas, creado_por, actualizado_por)
SELECT m.fecha, 'mesa', m.comida, m.hora, m.nombre, m.pax, NULL, m.notas, enzo.id, enzo.id
FROM (VALUES
  (date '2026-11-19', 'cena',     NULL::time,   'Carlos',                    30, NULL),
  (date '2026-11-22', 'almuerzo', time '13:00', 'Sebastián',                 20, NULL),
  (date '2026-11-29', 'almuerzo', time '13:00', 'Mesa de 22 a 30 personas', 30,
     'Entre 22 y 30 personas: se cargó 30 para tener lugar. Falta a nombre de quién.'),
  (date '2026-12-18', 'cena',     NULL::time,   'Laboratorios Bernabó',      16, NULL)
) AS m(fecha, comida, hora, nombre, pax, notas)
LEFT JOIN LATERAL (
  SELECT id FROM profiles WHERE role = 'admin' AND full_name = 'Enzo Espiño' LIMIT 1
) enzo ON true
WHERE NOT EXISTS (
  SELECT 1 FROM eventos e WHERE e.fecha = m.fecha AND lower(e.nombre) = lower(m.nombre)
);

-- Verificación: las mesas cargadas, en orden. Tienen que estar las cuatro.
SELECT to_char(fecha, 'DD/MM/YYYY') AS fecha,
       comida,
       coalesce(to_char(hora, 'HH24:MI'), 'sin hora') AS hora,
       nombre,
       pax,
       coalesce(salon, 'a definir') AS salon,
       (SELECT full_name FROM profiles WHERE id = creado_por) AS cargo
FROM eventos
ORDER BY eventos.fecha, eventos.hora NULLS LAST;
