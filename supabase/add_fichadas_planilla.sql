-- ============================================================
-- Fichadas y Planilla Maestra — parte 1: tablas y datos iniciales
--
-- Módulo nuevo, solo para administradores, que reemplaza la app suelta de
-- fichadas (enzofichadas1.vercel.app). Las fichadas del reloj ya llegan solas
-- a la tabla "fichadas"; esto agrega dónde guardar la planilla de cada mes y
-- todo lo que se calcula o se corrige a mano. La tabla "fichadas" NO se toca:
-- es la fuente cruda.
--
-- Qué crea:
--   1. planilla_empleados: los 68 de la planilla de septiembre, en su orden.
--      Los nuevos van siempre al final. Cada uno puede figurar con más de un
--      nombre en el horario (Ignacio está como "Ignacio Gaston" en Barra y
--      como "Ignacio Lopez" en Caja).
--   2. planilla_reloj_alias: qué número del reloj es cada empleado (64:
--      10 de la lista de Enzo y 54 por coincidencia de nombre) y a quiénes
--      ignorar (4).
--   3. planilla_meses: un registro por mes (abierto o cerrado, totales, Excel).
--   4. planilla_celdas: cada empleado × día, con horas o código.
--   5. fichadas_manuales: lo que se carga a mano o desde la planilla en papel.
--   6. planilla_eventos: quién cerró o reabrió cada mes, y cuándo.
--   7. Freno en la base: un mes cerrado no deja cambiar sus celdas.
--   8. Bucket privado "planillas" para guardar los Excel.
--
-- Todo con RLS: solo los admin leen y escriben (is_admin()).
--
-- Se corre entero en Supabase -> SQL Editor. Se puede correr dos veces: los
-- datos iniciales se cargan solo la primera vez, así que no se duplica nada
-- ni se pisa lo que después se cambie desde la app.
-- ============================================================

BEGIN;

-- 1. Empleados de la planilla, en su orden -----------------------------------
CREATE TABLE IF NOT EXISTS planilla_empleados (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre             text NOT NULL UNIQUE,      -- como figura en la planilla
  cargo              text,
  orden              int NOT NULL,              -- posición en la hoja
  activo             boolean NOT NULL DEFAULT true,   -- false = baja: no aparece en meses nuevos
  jornada_calendario boolean NOT NULL DEFAULT false,  -- true = su día va de 00:00 a 23:59
  profile_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  nombres_horario    text[] NOT NULL DEFAULT '{}',    -- cómo figura en los horarios
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- 2. Número del reloj -> empleado --------------------------------------------
CREATE TABLE IF NOT EXISTS planilla_reloj_alias (
  userid      text PRIMARY KEY,                 -- fichero_personas.userid
  empleado_id uuid REFERENCES planilla_empleados(id) ON DELETE SET NULL,
  ignorar     boolean NOT NULL DEFAULT false,   -- no es empleado de la planilla
  CONSTRAINT planilla_alias_empleado_o_ignorar CHECK (ignorar OR empleado_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS planilla_reloj_alias_empleado_idx ON planilla_reloj_alias(empleado_id);

-- 3. Un registro por mes -------------------------------------------------------
CREATE TABLE IF NOT EXISTS planilla_meses (
  periodo              date PRIMARY KEY CHECK (extract(day FROM periodo) = 1),  -- primer día del mes
  estado               text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  empleados            jsonb NOT NULL DEFAULT '[]'::jsonb,  -- foto del orden de ESE mes
  totales              jsonb,
  xlsx_path            text,                    -- el Excel, en el bucket "planillas"
  ultima_actualizacion timestamptz,
  cerrado_por          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  cerrado_en           timestamptz
);

-- 4. Celdas: empleado × día ----------------------------------------------------
CREATE TABLE IF NOT EXISTS planilla_celdas (
  periodo         date NOT NULL REFERENCES planilla_meses(periodo),
  empleado_id     uuid NOT NULL REFERENCES planilla_empleados(id),
  dia             int NOT NULL CHECK (dia BETWEEN 1 AND 31),
  horas           numeric(4, 1),                -- ya redondeado a media hora
  codigo          text CHECK (codigo IN ('VAC', 'CERT', 'LIC', 'FRANCO', 'NO VINO')),
  origen          text NOT NULL CHECK (origen IN ('reloj', 'papel', 'manual', 'codigo')),
  estado          text NOT NULL DEFAULT 'ok' CHECK (estado IN ('ok', 'incompleto', 'revisar')),
  entrada         time,
  salida          time,
  tramos          jsonb,                        -- [{desde, hasta}] si es horario cortado
  minutos         int,                          -- minutos reales, antes de redondear
  fichadas_usadas bigint[],                     -- logids del reloj
  horario         text,                         -- lo que decía el horario publicado ese día
  sugerencia      jsonb,                        -- {falta, habitual, segun_horario}
  avisos          jsonb NOT NULL DEFAULT '[]'::jsonb,  -- avisos suaves para mostrar
  nota            text,
  bloqueada       boolean NOT NULL DEFAULT false,  -- la tocó un admin: el proceso no la pisa
  updated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (periodo, empleado_id, dia)
);
CREATE INDEX IF NOT EXISTS planilla_celdas_empleado_idx ON planilla_celdas(empleado_id, periodo);

-- 5. Fichadas cargadas a mano --------------------------------------------------
CREATE TABLE IF NOT EXISTS fichadas_manuales (
  id          bigserial PRIMARY KEY,
  empleado_id uuid NOT NULL REFERENCES planilla_empleados(id),
  fecha_hora  timestamptz NOT NULL,
  fuente      text NOT NULL DEFAULT 'papel' CHECK (fuente IN ('papel', 'manual')),
  nota        text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Así el Excel de CrossChex se puede importar dos veces sin duplicar.
  CONSTRAINT fichadas_manuales_sin_duplicar UNIQUE (empleado_id, fecha_hora)
);
CREATE INDEX IF NOT EXISTS fichadas_manuales_fecha_idx ON fichadas_manuales(fecha_hora);

-- 6. Registro de cierres y reaperturas ----------------------------------------
CREATE TABLE IF NOT EXISTS planilla_eventos (
  id      bigserial PRIMARY KEY,
  periodo date NOT NULL,
  accion  text NOT NULL,                        -- 'cerrar' o 'reabrir'
  detalle text,
  por     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  en      timestamptz NOT NULL DEFAULT now()
);

-- 7. Freno: un mes cerrado es de solo lectura ---------------------------------
CREATE OR REPLACE FUNCTION planilla_mes_abierto()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND EXISTS (SELECT 1 FROM planilla_meses WHERE periodo = OLD.periodo AND estado = 'cerrado') THEN
    RAISE EXCEPTION 'El mes % está cerrado: para cambiarlo hay que reabrirlo.', to_char(OLD.periodo, 'MM/YYYY');
  END IF;
  IF TG_OP <> 'DELETE' AND EXISTS (SELECT 1 FROM planilla_meses WHERE periodo = NEW.periodo AND estado = 'cerrado') THEN
    RAISE EXCEPTION 'El mes % está cerrado: para cambiarlo hay que reabrirlo.', to_char(NEW.periodo, 'MM/YYYY');
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS planilla_celdas_mes_abierto ON planilla_celdas;
CREATE TRIGGER planilla_celdas_mes_abierto
  BEFORE INSERT OR UPDATE OR DELETE ON planilla_celdas
  FOR EACH ROW EXECUTE FUNCTION planilla_mes_abierto();

-- Cada vez que un mes se cierra o se reabre, queda anotado quién y cuándo.
CREATE OR REPLACE FUNCTION planilla_anotar_estado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO planilla_eventos (periodo, accion, por)
    VALUES (NEW.periodo, CASE WHEN NEW.estado = 'cerrado' THEN 'cerrar' ELSE 'reabrir' END, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planilla_meses_anotar_estado ON planilla_meses;
CREATE TRIGGER planilla_meses_anotar_estado
  AFTER UPDATE OF estado ON planilla_meses
  FOR EACH ROW EXECUTE FUNCTION planilla_anotar_estado();

-- RLS: solo admin, para leer y para escribir -----------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['planilla_empleados', 'planilla_reloj_alias', 'planilla_meses',
                           'planilla_celdas', 'fichadas_manuales', 'planilla_eventos'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_admin', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())',
                   t || '_admin', t);
  END LOOP;
END $$;

-- 8. Bucket privado para los Excel ---------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('planillas', 'planillas', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "planillas: solo admins" ON storage.objects;
CREATE POLICY "planillas: solo admins" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'planillas' AND is_admin())
  WITH CHECK (bucket_id = 'planillas' AND is_admin());

-- Datos iniciales: solo la primera vez (cuando todavía no hay empleados) ------
DO $$
DECLARE
  n int;
BEGIN
  IF EXISTS (SELECT 1 FROM planilla_empleados) THEN
    RAISE NOTICE 'Los empleados ya estaban cargados: no se tocan.';
    RETURN;
  END IF;

  -- Los 68 de la planilla de septiembre, en su orden.
  INSERT INTO planilla_empleados (nombre, cargo, orden, jornada_calendario, profile_id, nombres_horario)
  VALUES
    ('ESPIÑO ENZO LUCIANO', 'MOZO', 1, false, (SELECT id FROM profiles WHERE id = '39505461-9001-4230-b180-e83d182f6e63'), '{}'::text[]),
    ('BALDIVIEZO JORGE NAHUEL', 'PASTELERO', 2, false, (SELECT id FROM profiles WHERE id = '5b618e67-9b8c-4330-b54f-39d440002889'), ARRAY['Nahuel Baldiviezo']),
    ('FUENTES NICOLAS LEANDRO', 'MOZO', 3, false, (SELECT id FROM profiles WHERE id = 'c3a897aa-c18e-402b-8852-f80f9a9f1430'), ARRAY['Nicolás Fuentes']),
    ('MUSMANNO MARCELA FABIANA', 'JEFE DE PARTIDA O COCINER', 4, false, NULL, ARRAY['Marcela Musmanno']),
    ('GAMARRA SANDRA CAROLINA', 'COMIS DE COCINA', 5, false, NULL, ARRAY['Carolina Gamarra']),
    ('AGUIRRE RAQUEL NOEMI', 'MOZO', 6, false, NULL, ARRAY['Raquel Aguirre']),
    ('CABO MARIA SOFIA', 'FIAMBRERO - JEFE DE PARTID', 7, false, NULL, ARRAY['Sofia Cabo']),
    ('BERGERA CARLOS MARTIN', 'JEFE DE PARTIDA O COCINER', 8, false, NULL, ARRAY['Martin Bergera']),
    ('IBARRA LUCAS DAMIAN', 'MOZO', 9, false, NULL, ARRAY['Lucas Ibarra']),
    ('CAJAL LUIS OSCAR', 'AYUDANTE DE COCINA', 10, false, NULL, ARRAY['Luis Cajal']),
    ('VIERA FACUNDO ALEJANDRO', 'COMIS DE COCINA', 11, false, NULL, ARRAY['Facundo Viera']),
    ('TOLEDO ALAN EZEQUIEL', 'JEFE DE PARTIDA O COCINER', 12, false, NULL, ARRAY['Alan Toledo']),
    ('NUÑEZ FACUNDO RODRIGO', 'ENCARGADO', 13, false, (SELECT id FROM profiles WHERE id = 'e27cdacf-5373-4800-87e1-3df18f50e33c'), '{}'::text[]),
    ('MOLINA BRUNO EZEQUIEL', 'MOZO DE MOSTRADOR', 14, false, (SELECT id FROM profiles WHERE id = 'bf9e5c40-b9bf-4eb9-a2b3-aec309613139'), ARRAY['Bruno Molina']),
    ('GASSMANN CAMILA GABRIELA', 'CAJERO', 15, false, NULL, ARRAY['Camila Gassmann']),
    ('SCHROEDER LEONEL', 'MOZO DE MOSTRADOR', 16, false, (SELECT id FROM profiles WHERE id = '1de01aba-2d63-41e5-999a-cd07d0c31137'), ARRAY['Leonel Schroeder']),
    ('SACHETT ANGEL', 'JEFE DE PARTIDA O COCINER', 17, false, NULL, '{}'::text[]),
    ('VALLEJOS GISELLE MARIA', 'LAVACOPAS', 18, false, NULL, ARRAY['Gisel Vallejos']),
    ('LOPEZ IGNACIO GASTON', 'MOZO DE MOSTRADOR', 19, false, NULL, ARRAY['Ignacio Gaston', 'Ignacio Lopez']),
    ('RAVE MARIA PAZ', 'PORTERO', 20, false, (SELECT id FROM profiles WHERE id = '2ef889c8-dca3-4fce-ae9d-646faa5cdc2c'), ARRAY['Paz Rave']),
    ('ALMADA CINTI PAMELA', 'MOZO', 21, false, NULL, ARRAY['Pamela Almada']),
    ('FERNANDEZ ORNELLA', 'PORTERO', 22, false, (SELECT id FROM profiles WHERE id = '5a668770-00cf-41ab-9db4-d05d38d7221f'), ARRAY['Ornella Fernandez']),
    ('LAUTARO LAZARTE', 'MOZO DE MOSTRADOR', 23, false, (SELECT id FROM profiles WHERE id = 'db55af05-882e-415e-a404-def6e292b37d'), ARRAY['Lazarte Lautaro Daniel']),
    ('MIGUEL SACHETT', 'COCINERO', 24, false, NULL, ARRAY['Miguel Sachett']),
    ('SCHROEDER AILEN', 'LAVACOPAS', 25, false, NULL, ARRAY['Ailen Shroeder']),
    ('LUCAS LOPEZ', 'MOZO', 26, false, (SELECT id FROM profiles WHERE id = 'a1fe075d-b9dc-4232-8f2e-88662abd154b'), ARRAY['Lucas Lopez']),
    ('ROCIO CONDE', 'MOZO', 27, false, (SELECT id FROM profiles WHERE id = '4d532ef0-c853-41cb-b691-bfb9fca007f5'), ARRAY['Rocio Conde']),
    ('AZUL PRETEL', 'MOZO', 28, false, NULL, ARRAY['Azul Pretel']),
    ('LUCIANO PELLIZARDI', 'MOZO DE MOSTRADOR', 29, false, (SELECT id FROM profiles WHERE id = 'acdbc271-6077-4697-9661-42b3501fbc77'), ARRAY['Lucho Pelizardi']),
    ('ROMINA MARQUEZ', 'ADMINISTRATIVA', 30, false, NULL, '{}'::text[]),
    ('GERMAN ZELUK', 'ADMINISTRATIVO', 31, false, NULL, '{}'::text[]),
    ('RODRIGO ALFARO', 'COCINERO', 32, false, NULL, ARRAY['Rodrigo Alfaro']),
    ('RICARDO CHAPA', 'AYUDANTE DE COCINA', 33, false, NULL, ARRAY['Ricardo Chapa']),
    ('GIUSEPPE RIVAS', 'COCINERO', 34, false, NULL, ARRAY['Giuseppe Rivas']),
    ('ARIANA MASTRELLA', 'CAJERA', 35, false, (SELECT id FROM profiles WHERE id = '49df540f-6c25-44f4-8fa3-588b4a13875b'), ARRAY['Ariana Mastrella']),
    ('JULIETA ZELADA', 'LAVACOPAS', 36, false, NULL, ARRAY['Julieta Zelada']),
    ('ZULMA AGUILAR', 'LIMPIEZA', 37, true, NULL, '{}'::text[]),
    ('BRISA DI SCALA', 'MOZO', 38, false, NULL, ARRAY['Brisa Di Scala']),
    ('PELIZARDI JORGELINA', 'LAVACOPAS', 39, false, NULL, ARRAY['Jorgelina Pelizardi']),
    ('DAMIAN ORTIZ', 'FIAMBRERO', 40, false, NULL, ARRAY['Damian Ortiz']),
    ('LUCRECIA LASPITA', 'RECEPCIONISTA', 41, false, (SELECT id FROM profiles WHERE id = 'ee93f308-aa65-465d-987e-6ba4abb2999d'), ARRAY['Lucrecia Laspita']),
    ('GABRIEL CRASINO', 'MOZO', 42, false, NULL, ARRAY['Gabriel Cansino']),
    ('IGOA CINTHIA', 'MOZO', 43, false, NULL, ARRAY['Cinthia Igoa']),
    ('MATIAS MILLAN', 'MOZO DE MOSTRADOR', 44, false, NULL, '{}'::text[]),
    ('URIEL ZABALA', 'PEON GENERAL', 45, false, NULL, ARRAY['Uriel Zabala']),
    ('MARTINA BARCIA', 'PEON GENERAL', 46, false, NULL, ARRAY['Martina Barcia']),
    ('GABRIEL GIMENEZ', 'FIAMBRERO', 47, false, NULL, ARRAY['Gabriel Gimenez']),
    ('CAMILA RODRIGUEZ', 'MOZO', 48, false, NULL, ARRAY['Camila Rodriguez']),
    ('AGUSTIN ARRIAGA', 'MOZO', 49, false, NULL, ARRAY['Agustin Arriaga']),
    ('FRANCIA BERON NICOLA', 'PEON GENERAL', 50, false, NULL, ARRAY['Francia Beron']),
    ('MICA DOLESOR', 'MOZO', 51, false, NULL, ARRAY['Micaela Dolesor']),
    ('MARTINA SILVERA', 'AYUDANTE DE PASTELERIA', 52, false, NULL, ARRAY['Martina Silvera']),
    ('ANTONELA CORONEL', 'RECEPCIONISTA', 53, false, (SELECT id FROM profiles WHERE id = '31b3c833-8108-4123-9c7b-2301d77a5ac3'), ARRAY['Antonella Coronel']),
    ('BIANCA ORAZI', 'RECEPCIONISTA', 54, false, (SELECT id FROM profiles WHERE id = '76d17d74-1fc5-4340-9a2c-1098e6d0e59d'), ARRAY['Bianca Orazi']),
    ('EMILIA BURGARDT', 'PEON GENERAL', 55, false, NULL, ARRAY['Emilia Burgardt']),
    ('FEDERICO CARUSSO', 'MOZO DE MOSTRADOR', 56, false, (SELECT id FROM profiles WHERE id = 'f724de4e-d545-40f6-9273-d3a02fe85ade'), ARRAY['Federico Caruso']),
    ('BRIAN MONTEROS', 'MOZO DE MOSTRADOR', 57, false, NULL, ARRAY['Braian Montero']),
    ('MUZIO VALENTINA', 'RECEPCIONISTA', 58, false, (SELECT id FROM profiles WHERE id = '972ed3cd-4bd2-47a9-84a3-4b36e693327b'), ARRAY['Valentina Muzio']),
    ('GONZALO FUNES', 'COCINERO', 59, false, NULL, ARRAY['Gonzalo Funes']),
    ('LUCIANO ALFARO', 'MOZO DE MOSTRADOR', 60, false, NULL, ARRAY['Luciano Alfaro']),
    ('FEDERICO PUGLIESE', 'BARRA', 61, false, NULL, ARRAY['Federico Pugliese']),
    ('JUANA BALSAMO', 'RECEPCIONISTA', 62, false, (SELECT id FROM profiles WHERE id = '6b781d79-e605-4005-b959-d4ed2bcb624c'), ARRAY['Juana Balsamo']),
    ('LUCIA LEIVA', 'MOZO', 63, false, NULL, ARRAY['Lucia Leiva']),
    ('VELARDEZ SANTIAGO', NULL, 64, false, NULL, '{}'::text[]),
    ('MASTRODONATO AGUSTINA', NULL, 65, false, NULL, '{}'::text[]),
    ('ROZALEZ MAXIMILIANO', NULL, 66, false, (SELECT id FROM profiles WHERE id = '4227c855-ed1d-43b3-9e93-3142e818ea4b'), ARRAY['Maximiliano Rozalez']),
    ('RUIZ MORENA', NULL, 67, false, (SELECT id FROM profiles WHERE id = 'a8a8fa38-4037-469c-8a6a-f068923c73b9'), ARRAY['Morena Ruiz']),
    ('FERNANDEZ JAZMIN', NULL, 68, false, NULL, '{}'::text[]);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 68 THEN
    RAISE EXCEPTION 'Se esperaban 68 empleados y se cargaron %: se cancela todo.', n;
  END IF;

  -- Números del reloj de cada empleado.
  INSERT INTO planilla_reloj_alias (userid, empleado_id, ignorar)
  SELECT v.userid, e.id, false
  FROM (VALUES
    ('104', 'AGUIRRE RAQUEL NOEMI', 'AGUIRRE RAQUEL'),
    ('418', 'AGUSTIN ARRIAGA', 'AGUSTIN ARRIAGA'),
    ('293', 'SCHROEDER AILEN', 'AILEN SCHROEDER'),
    ('255', 'ALMADA CINTI PAMELA', 'ALMADA PAMELA'),
    ('415', 'ANTONELA CORONEL', 'ANTONELA CORONEL'),
    ('317', 'ARIANA MASTRELLA', 'ARIANA MASTRELLA'),
    ('277', 'AZUL PRETEL', 'AZUL GARCETE'),
    ('414', 'BIANCA ORAZI', 'BIANCA ORAZI'),
    ('433', 'BRIAN MONTEROS', 'BRIAN MONTERO'),
    ('335', 'BRISA DI SCALA', 'BRISA DI SCALA'),
    ('240', 'MOLINA BRUNO EZEQUIEL', 'BRUNO MOLINA'),
    ('275', 'MOLINA BRUNO EZEQUIEL', 'BRUNO MOLINA'),
    ('42', 'CABO MARIA SOFIA', 'CABO SOFIA'),
    ('226', 'CAJAL LUIS OSCAR', 'CAJAL LUIS'),
    ('428', 'CAMILA RODRIGUEZ', 'CAMILA RODRIGUEZ'),
    ('170', 'BERGERA CARLOS MARTIN', 'CARLOS BERGERA'),
    ('281', 'IGOA CINTHIA', 'CINTHIA IGOA'),
    ('394', 'DAMIAN ORTIZ', 'DAMIAN ORTIZ'),
    ('421', 'EMILIA BURGARDT', 'EMILIA BURGARDT'),
    ('125', 'ESPIÑO ENZO LUCIANO', 'ENZO ESPIÑO'),
    ('172', 'VIERA FACUNDO ALEJANDRO', 'FACUNDO VIERA'),
    ('453', 'FEDERICO CARUSSO', 'FEDERICO CARUSSO'),
    ('605', 'FEDERICO PUGLIESE', 'FEDERICO PUGLIESE'),
    ('230', 'FERNANDEZ ORNELLA', 'FERNANDEZ ORNELLA'),
    ('438', 'FRANCIA BERON NICOLA', 'FRANCIA BERON'),
    ('94', 'FUENTES NICOLAS LEANDRO', 'FUENTES NICOLAS'),
    ('416', 'GABRIEL CRASINO', 'GABRIEL CANSINO'),
    ('422', 'GABRIEL GIMENEZ', 'GABRIEL GIMENEZ'),
    ('5', 'GAMARRA SANDRA CAROLINA', 'GAMARRA CAROLINA'),
    ('248', 'GASSMANN CAMILA GABRIELA', 'GASSMANN CAMILA'),
    ('312', 'GIUSEPPE RIVAS', 'GIUSEPPE RIVA'),
    ('411', 'GONZALO FUNES', 'GONZALO COCINA'),
    ('207', 'IBARRA LUCAS DAMIAN', 'IBARRA LUCAS'),
    ('274', 'LOPEZ IGNACIO GASTON', 'IGNACIO LOPEZ'),
    ('608', 'FERNANDEZ JAZMIN', 'JAZMIN FERNANDEZ'),
    ('356', 'PELIZARDI JORGELINA', 'JORGELINA PELIZARDI'),
    ('603', 'JUANA BALSAMO', 'JUANA BALSAMO'),
    ('354', 'JULIETA ZELADA', 'JULIETA ZELADA'),
    ('272', 'LAUTARO LAZARTE', 'LAUTARO LAZARTE'),
    ('247', 'SCHROEDER LEONEL', 'LEONEL SCHROEDER'),
    ('283', 'LUCAS LOPEZ', 'LUCAS LOPEZ'),
    ('601', 'LUCIA LEIVA', 'LUCIA LEIVA'),
    ('435', 'LUCIANO ALFARO', 'LUCIANO ALFARO'),
    ('355', 'LUCRECIA LASPITA', 'LUCRECIA LASPITA'),
    ('412', 'MARTINA BARCIA', 'MARTINA BARCIA'),
    ('489', 'MARTINA SILVERA', 'MARTINA SOLER'),
    ('604', 'ROZALEZ MAXIMILIANO', 'MAXIMILIANO ROZALEZ'),
    ('445', 'MICA DOLESOR', 'MICAELA DOLESOR'),
    ('606', 'MIGUEL SACHETT', 'MIGUEL SACHETT'),
    ('8', 'BALDIVIEZO JORGE NAHUEL', 'NAHUEL BALDIVIEZO'),
    ('73', 'NUÑEZ FACUNDO RODRIGO', 'NUÑEZ FACUNDO'),
    ('307', 'LUCIANO PELLIZARDI', 'PELIZARDI LUCIANO'),
    ('257', 'RAVE MARIA PAZ', 'RAVE PAZ'),
    ('311', 'RICARDO CHAPA', 'RICARDO JORGE CHAPA'),
    ('282', 'ROCIO CONDE', 'ROCIO CONDE'),
    ('305', 'RODRIGO ALFARO', 'RODRIGO ALFARO'),
    ('607', 'RUIZ MORENA', 'RUIZ MORENA'),
    ('628', 'VELARDEZ SANTIAGO', 'SANTIAGO VELARDEZ'),
    ('165', 'TOLEDO ALAN EZEQUIEL', 'TOLEDO ALAN'),
    ('417', 'URIEL ZABALA', 'URIEL ZABALA'),
    ('522', 'MUZIO VALENTINA', 'VALENTINA MUZIO'),
    ('253', 'VALLEJOS GISELLE MARIA', 'VALLEJOS GISELA'),
    ('359', 'ZULMA AGUILAR', 'ZULMA AGUILAR'),
    ('12', 'MUSMANNO MARCELA FABIANA', 'MUSMANNO MARCELA')
  ) AS v(userid, planilla, reloj)
  JOIN planilla_empleados e ON e.nombre = v.planilla
  ON CONFLICT (userid) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 64 THEN
    RAISE EXCEPTION 'Se esperaban 64 números del reloj y se cargaron %: se cancela todo.', n;
  END IF;

  -- Del reloj, pero no son empleados de la planilla o ya son baja.
  INSERT INTO planilla_reloj_alias (userid, empleado_id, ignorar)
  VALUES
    ('259', NULL, true),  -- CALLARA CA
    ('431', NULL, true),  -- JUAN CRUZ CHAPPE
    ('298', NULL, true),  -- SANDRA SERRANO
    ('279', NULL, true)  -- VALENTINA MORINIGO
  ON CONFLICT (userid) DO NOTHING;
END $$;

-- Freno final: que esté todo en su lugar --------------------------------------
DO $$
DECLARE t text;
BEGIN
  IF (SELECT count(*) FROM planilla_empleados) < 68 THEN
    RAISE EXCEPTION 'Faltan empleados de la planilla: se cancela todo.';
  END IF;
  FOREACH t IN ARRAY ARRAY['planilla_empleados', 'planilla_reloj_alias', 'planilla_meses',
                           'planilla_celdas', 'fichadas_manuales', 'planilla_eventos'] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || t)::regclass)
       OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_admin') THEN
      RAISE EXCEPTION 'La tabla % quedó sin su seguridad: se cancela todo.', t;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'planillas' AND NOT public) THEN
    RAISE EXCEPTION 'El bucket "planillas" no quedó privado: se cancela todo.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificación: tiene que decir 68, 64, 4, las personas nuevas y "privado".
-- ------------------------------------------------------------
SELECT 'empleados en la planilla' AS que, count(*)::text AS resultado FROM planilla_empleados
UNION ALL
SELECT 'números del reloj asociados', count(*)::text FROM planilla_reloj_alias WHERE NOT ignorar
UNION ALL
SELECT 'números del reloj ignorados', count(*)::text FROM planilla_reloj_alias WHERE ignorar
UNION ALL
-- Incluye a los que el reloj todavía no mandó con nombre (salen como "sin nombre").
SELECT 'del reloj, con fichadas y sin asociar',
       coalesce(string_agg(coalesce(p.nombre, 'sin nombre') || ' (' || f.userid || ')', ', ' ORDER BY f.userid), 'ninguna')
FROM (SELECT DISTINCT userid FROM fichadas) f
LEFT JOIN fichero_personas p ON p.userid = f.userid
WHERE NOT EXISTS (SELECT 1 FROM planilla_reloj_alias a WHERE a.userid = f.userid)
UNION ALL
SELECT 'bucket planillas', CASE WHEN public THEN 'PÚBLICO (mal)' ELSE 'privado' END
FROM storage.buckets WHERE id = 'planillas';
