-- ============================================================
-- Horarios semanales del personal
--
-- Cada semana se guarda entera como un documento (sectores, personas y los
-- siete días), con el mismo texto libre de la planilla: "9 A 17.30", "11C",
-- "X", "VAC", "LIC", "M9".
--
-- Una semana arranca como BORRADOR: solo la ven los administradores y se
-- puede ir armando durante la semana. Al publicarla la ve todo el personal.
--
-- No se ata a los usuarios de la app porque la mayoría del personal (cocina,
-- maestranza) no tiene usuario.
--
-- De yapa carga la semana del 21 al 27 de septiembre, transcripta de la
-- planilla que se mandó al grupo, COMO BORRADOR. Revisala antes de
-- publicarla: se pasó a mano desde una foto. Sirve también de base para
-- armar la semana siguiente con "copiar la anterior".
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente: no pisa una
-- semana que ya exista.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS schedule_weeks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- El lunes de la semana. Una sola planilla por semana.
  week_start   date NOT NULL UNIQUE,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  data         jsonb NOT NULL DEFAULT '{"sectores": []}'::jsonb,
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Se usa para no pisar cambios: si dos encargados editan a la vez, el
  -- segundo que guarda se entera en lugar de borrar lo del primero.
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT schedule_weeks_empieza_en_lunes CHECK (extract(isodow FROM week_start) = 1)
);

ALTER TABLE schedule_weeks ENABLE ROW LEVEL SECURITY;

-- El personal ve solo lo publicado. Los borradores, solo los administradores.
DROP POLICY IF EXISTS schedule_weeks_read ON schedule_weeks;
CREATE POLICY schedule_weeks_read ON schedule_weeks
  FOR SELECT TO authenticated
  USING (status = 'published' OR is_admin());

DROP POLICY IF EXISTS schedule_weeks_admin_write ON schedule_weeks;
CREATE POLICY schedule_weeks_admin_write ON schedule_weeks
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- La semana del 21 al 27 de septiembre, como borrador.
INSERT INTO schedule_weeks (week_start, status, data)
VALUES ('2026-09-21', 'draft', '{"sectores": [{"nombre": "CAMAREROS", "personas": [{"nombre": "Raquel Aguirre", "dias": ["9 A 17.30", "X", "X", "7.30 A 16.30", "7.30 A 17.30", "7.30 A 18.30", "7.30 A 18.30"]}, {"nombre": "Pamela Almada", "dias": ["7.30 a 16.30", "X", "10 A 18.30", "11 A 19.30", "X", "7.30 A 18.30", "7.30 A 18.30"]}, {"nombre": "Lucas Ibarra", "dias": ["11 a 19.30", "X", "11C", "X", "10 a 18.30", "11 A 19", "10 a 19.30"]}, {"nombre": "Agustin Arriaga", "dias": ["11 A 19.30", "11C", "X", "X", "11 A 19.30", "11 A 19.30", "11C"]}, {"nombre": "Brisa Di Scala", "dias": ["11C", "11C", "X", "8 A 16.30", "11C", "11C", "11 A 19.30"]}, {"nombre": "Rocio Conde", "dias": ["X", "7.30 A 12", "7.30 A 12", "X", "X", "11C", "11 A 19.30"]}, {"nombre": "Camila Rodriguez", "dias": ["X", "X", "11C", "X", "11C", "11C", "11 A 19.30"]}, {"nombre": "Gabriel Cansino", "dias": ["X", "X", "10 A 19.30", "10 A 19.30", "11C", "11C", "11C"]}, {"nombre": "Azul Pretel", "dias": ["X", "9 A 17.30", "X", "X", "9 A 17.30", "9 a 18.30", "9 a 18.30"]}, {"nombre": "Micaela", "dias": ["X", "10 a 19.30", "9 A 17.30", "X", "11C", "10 A 19.30", "10 A 18.30"]}, {"nombre": "Cinthia Igoa", "dias": ["VAC", "VAC", "VAC", "13C", "9 a 16.30", "9 a 16.30", "9 a 16.30"]}, {"nombre": "Nico Fuentes", "dias": ["VAC", "VAC", "VAC", "VAC", "VAC", "VAC", "VAC"]}, {"nombre": "Lucas Lopez", "dias": ["11C", "11C", "X", "11C", "11C", "11 a 20", "11C"]}]}, {"nombre": "BARRA", "personas": [{"nombre": "Leonel Schroeder", "dias": ["X", "7.30 A 16", "7.30 A 16", "X", "7.30 A 16", "7.30 a 16", "7.30 a 16"]}, {"nombre": "Bruno", "dias": ["7.30 a 16.30", "X", "X", "7.30 A 16.30", "10 A 20", "10 a 23.30", "10 A 20"]}, {"nombre": "Federico", "dias": ["X", "X", "X", "X", "16C", "14C", "11C"]}, {"nombre": "Braian Montero", "dias": ["X", "X", "10 A 18.30", "10 A 18.30", "9 a 17.30", "10 A 20", "10 A 20"]}, {"nombre": "Lucho Pelizardi", "dias": ["10 A 18.30", "10 A 18.30", "X", "X", "X", "10 a 20", "10 a 20"]}, {"nombre": "Ignacio Gaston", "dias": ["X", "X", "11C", "11C", "10 A 18.30", "9 A 19.30", "9 A 19.30"]}, {"nombre": "Luciano Alfaro", "dias": ["8 A 16.30", "X", "X", "8 A 16.30", "8 A 16.30", "8 A 16.30", "8 A 16.30"]}, {"nombre": "Lazarte Lautaro Daniel", "dias": ["11C", "11C", "X", "X", "16C", "M9", "M9"]}]}, {"nombre": "MAESTRANZA", "personas": [{"nombre": "Julieta Zelada", "dias": ["8 A 16.30", "X", "X", "X", "11 A 22", "8 A 16.30", "8 A 16.30"]}, {"nombre": "Gabriel", "dias": ["X", "X", "10 A 14", "8 A 14", "8 A 16.30", "11 A 20", "X"]}, {"nombre": "Jorgelina", "dias": ["X", "9 A 17.30", "X", "11C", "16C", "14C", "14C"]}, {"nombre": "Ailen Shroeder", "dias": ["14C", "14C", "14C", "X", "X", "X", "11 A 20"]}]}, {"nombre": "ENSALADA", "personas": [{"nombre": "Sofia Cabo", "dias": ["VAC", "VAC", "VAC", "VAC", "VAC", "VAC", "VAC"]}, {"nombre": "Gabriel", "dias": ["X", "X", "10 A 18.30", "10 A 19.30", "X", "8 A 16.30", "8 A 16.30"]}, {"nombre": "Damian", "dias": ["10 A 19.30", "10 A 19.30", "X", "X", "10 A 23.30", "10 A 22.30", "10 A 20"]}]}, {"nombre": "PASTELERÍA", "personas": [{"nombre": "Nahuel", "dias": ["X", "X", "8 A 16.30", "8 A 16.30", "8 A 16.30", "8 A 16.30", "8 A 16.30"]}, {"nombre": "Martina", "dias": ["8 a 16.30", "8 A 16.30", "X", "X", "8 A 16.30", "8 A 16.30", "8 A 16.30"]}]}, {"nombre": "CAJA", "personas": [{"nombre": "Ariana Mastrella", "dias": ["14C", "8 A 14", "X", "8 A 14", "8 A 16", "16C", "14C"]}, {"nombre": "Nachito Lopez", "dias": ["X", "X", "X", "X", "X", "X", "X"]}, {"nombre": "Ornella Fernandez", "dias": ["X", "X", "14C", "14C", "X", "X", "X"]}, {"nombre": "Camila Gassmann", "dias": ["8 A 14", "14C", "8 a 14", "X", "16C", "8 A 16", "8 A 14"]}]}, {"nombre": "RECEPCIÓN", "personas": [{"nombre": "Lucrecia", "dias": ["X", "9 A 17.30", "9 A 17.30", "9 A 17.30", "11C", "11C", "10 A 18.30"]}, {"nombre": "Bianca Orazi", "dias": ["X", "X", "X", "X", "X", "X", "X"]}, {"nombre": "Antonella", "dias": ["X", "X", "X", "X", "X", "X", "X"]}, {"nombre": "Valentina", "dias": ["11C", "11C", "X", "X", "9 A 17.30", "10 A 20", "11C"]}, {"nombre": "Orne", "dias": ["X", "X", "11C", "X", "X", "7.30 A 17.30", "7.30 A 17.30"]}, {"nombre": "Paz Rave", "dias": ["9 A 17.30", "X", "X", "11C", "10 A 22.30", "10 a 22.30", "10 A 19.30"]}]}, {"nombre": "CALIENTA PLATOS", "personas": [{"nombre": "Facundo Viera", "dias": ["11 A 17.30", "X", "X", "X", "11 + NOCHE", "11 + NOCHE", "11 A 18.30"]}]}, {"nombre": "COMISS / RUNNERS", "personas": [{"nombre": "Martina", "dias": ["VAC", "VAC", "VAC", "VAC", "VAC", "VAC", "VAC"]}, {"nombre": "Uriel", "dias": ["9 A 17.30", "9 A 17.30", "X", "X", "14C", "14C", "11C"]}, {"nombre": "Emilia Burgart", "dias": ["X", "X", "X", "X", "10 A 18.30", "10 A 18.30", "10 A 18.30"]}, {"nombre": "Francia", "dias": ["X", "X", "9 A 17.30", "9 A 17.30", "8 A 17.30", "8 A 17.30", "8 A 17.30"]}]}, {"nombre": "COCINA", "personas": [{"nombre": "Alan Toledo", "dias": ["8 a 17", "9C", "8 A 16", "X", "8 a 17", "9C", "9 A 17.30"]}, {"nombre": "Luis Cajal", "dias": ["8 a 17", "8 A 16.30", "8 A 16.30", "9C", "8 A 16.30", "8 a 17.30", "8 a 17.30"]}, {"nombre": "Miguel Sachett", "dias": ["X", "X", "X", "X", "X", "X", "X"]}, {"nombre": "Luciano Pelizardi", "dias": ["X", "X", "X", "X", "12 a 16.30 + NOCHE", "12 a 16.30 + NOCHE", "12 A 16.30 + NOCHE"]}, {"nombre": "Rodrigo Alfaro", "dias": ["X", "9 A 17", "9 a 17.30", "9 a 17.30", "9C", "9C", "9C"]}, {"nombre": "Martin Bergera", "dias": ["9 A 17.30", "9 a 17", "9 a 17.30", "X", "X", "9 a 17.30", "9 A 17.30"]}, {"nombre": "Marcela Musmanno", "dias": ["X", "X", "X", "X", "12 A 20", "12 A 20", "12 A 20"]}, {"nombre": "Carolina Gamarra", "dias": ["X", "8 a 16.30", "8C", "X", "8 A 16.30", "8 A 16.30", "8 a 17.30"]}, {"nombre": "Giuseppe Rivas", "dias": ["8C", "8 A 16.30", "X", "8 A 16.30", "8C", "8C", "8 A 16.30"]}, {"nombre": "Gisel Vallejos", "dias": ["LIC", "LIC", "LIC", "LIC", "LIC", "LIC", "LIC"]}, {"nombre": "Gonzalo Funes", "dias": ["9 A 17.30", "X", "9 a 19.30", "10 A 18.30", "9C", "9C", "9C"]}, {"nombre": "Santi", "dias": ["X", "X", "9 a 19.30", "10 A 18.30", "9C", "19C", "19C"]}, {"nombre": "Ricardo Chapa", "dias": ["VAC", "VAC", "VAC", "VAC", "VAC", "VAC", "VAC"]}]}]}'::jsonb)
ON CONFLICT (week_start) DO NOTHING;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT week_start AS semana,
       status     AS estado,
       jsonb_array_length(data -> 'sectores') AS sectores,
       (SELECT sum(jsonb_array_length(s -> 'personas'))
        FROM jsonb_array_elements(data -> 'sectores') s) AS personas
FROM schedule_weeks
ORDER BY week_start DESC;
