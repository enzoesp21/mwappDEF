-- ============================================================
-- Mozos que se sumaron a la app: vincular sus propinas y su planilla
--
-- Enzo (10/11): muchos mozos se registraron estos días. El horario ya los
-- encuentra solo (por nombre), pero las propinas de los días que se cargaron
-- ANTES de que se registraran quedaron sin dueño, y por eso no las ven.
--
-- Qué hace:
--   1) Vincula esas 50 filas de propinas a su usuario:
--      - los nombres completos ("Brisa Di Scala"), con la misma regla que usa
--        la app al guardar;
--      - y los que la cajera cargó solo con el nombre ("Belen", "Lucia",
--        "Martina", "Marti", "Morena", "Giuliana", "Francia", "Agustin A."),
--        porque en Camareros del horario hay una sola persona con ese nombre.
--      Diego, Azul Pretel y Gabriel Cansino no tienen usuario: quedan igual.
--   2) Vincula a esos mozos con su fila de la planilla (profile_id), para que
--      "Traer horas del reloj" los reconozca directo.
--
-- Solo completa lo que está vacío: no cambia ningún vínculo que ya exista ni
-- toca montos u horas. De ahora en adelante esto lo hace la app sola cada
-- vez que se guarda un día de propinas. Se puede correr dos veces.
-- ============================================================

-- Freno: los usuarios tienen que ser los que se vieron el 10/11, y nadie
-- puede quedar con dos filas el mismo día ni con dos filas en la planilla.
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM profiles p
  JOIN (VALUES
    ('bb71e568-a65d-4957-8d6a-b5424896694c'::uuid, 'agustin arriaga'),
    ('9eaf1e1a-f0a9-4a5f-a122-9599ad83441d'::uuid, 'brisa di scala'),
    ('b20041e0-8892-4841-b961-75b0e8744bf3'::uuid, 'cinthia igoa'),
    ('2fb9fbd5-3fca-4563-b435-8e18c03d066e'::uuid, 'francia beron'),
    ('c64cd25a-ff30-49e6-ba5b-0757be592bcf'::uuid, 'lucas damián ibarra'),
    ('c2f66244-4a0e-4bce-805b-8f2b3b457480'::uuid, 'lucia leiva'),
    ('d1a89bdd-42f4-4506-9ef5-6aed0a06d2f6'::uuid, 'martina barcia'),
    ('e2421aa6-b5cc-425d-a574-9a2c44314070'::uuid, 'nicolas leandro fuentes'),
    ('2f8319e8-ea0d-43ed-a353-cb748349be9a'::uuid, 'pamela almada'),
    ('cedcb5fe-abc3-453b-8e44-c4794d153d7d'::uuid, 'raquel noemi aguirre'),
    ('6060e10f-1df6-4f28-a2c5-3f7938892921'::uuid, 'belen gallegos'),
    ('a8a8fa38-4037-469c-8a6a-f068923c73b9'::uuid, 'ruiz alvarez morena'),
    ('f558e325-94b6-473e-8d6b-33cc0f23876c'::uuid, 'giuliana bartellone benitez'),
    ('b53d00f3-733b-4302-a6a6-5fe8c4bceadb'::uuid, 'micaela dolesor')
  ) AS v(id, nombre) ON v.id = p.id AND lower(btrim(p.full_name)) = v.nombre;
  IF n <> 14 THEN
    RAISE EXCEPTION 'Los usuarios no son los esperados (encontré % de 14): no toco nada.', n;
  END IF;
END $$;

BEGIN;

-- 1) Propinas sueltas -> su usuario.
WITH mapa(nombre, uid) AS (VALUES
  ('Agustin Arriaga', 'bb71e568-a65d-4957-8d6a-b5424896694c'::uuid),
  ('Agustin A.',      'bb71e568-a65d-4957-8d6a-b5424896694c'::uuid),
  ('Brisa Di Scala',  '9eaf1e1a-f0a9-4a5f-a122-9599ad83441d'::uuid),
  ('Cinthia Igoa',    'b20041e0-8892-4841-b961-75b0e8744bf3'::uuid),
  ('Francia Beron',   '2fb9fbd5-3fca-4563-b435-8e18c03d066e'::uuid),
  ('Francia',         '2fb9fbd5-3fca-4563-b435-8e18c03d066e'::uuid),
  ('Lucas Ibarra',    'c64cd25a-ff30-49e6-ba5b-0757be592bcf'::uuid),
  ('Lucia Leiva',     'c2f66244-4a0e-4bce-805b-8f2b3b457480'::uuid),
  ('Lucia',           'c2f66244-4a0e-4bce-805b-8f2b3b457480'::uuid),
  ('Martina Barcia',  'd1a89bdd-42f4-4506-9ef5-6aed0a06d2f6'::uuid),
  ('Martina',         'd1a89bdd-42f4-4506-9ef5-6aed0a06d2f6'::uuid),
  ('Marti',           'd1a89bdd-42f4-4506-9ef5-6aed0a06d2f6'::uuid),
  ('Nicolas Fuentes', 'e2421aa6-b5cc-425d-a574-9a2c44314070'::uuid),
  ('Nicolás Fuentes', 'e2421aa6-b5cc-425d-a574-9a2c44314070'::uuid),
  ('Pamela Almada',   '2f8319e8-ea0d-43ed-a353-cb748349be9a'::uuid),
  ('Raquel Aguirre',  'cedcb5fe-abc3-453b-8e44-c4794d153d7d'::uuid),
  ('Belen',           '6060e10f-1df6-4f28-a2c5-3f7938892921'::uuid),
  ('Morena',          'a8a8fa38-4037-469c-8a6a-f068923c73b9'::uuid),
  ('Giuliana',        'f558e325-94b6-473e-8d6b-33cc0f23876c'::uuid)
),
candidatas AS (
  SELECT t.id, t.day_id, m.uid
  FROM tip_entries t JOIN mapa m ON m.nombre = t.nombre
  WHERE t.user_id IS NULL
    -- Nunca dos filas de la misma persona el mismo día.
    AND NOT EXISTS (SELECT 1 FROM tip_entries o WHERE o.day_id = t.day_id AND o.user_id = m.uid)
)
UPDATE tip_entries t
SET user_id = c.uid
FROM candidatas c
WHERE t.id = c.id
  AND NOT EXISTS (SELECT 1 FROM candidatas c2 WHERE c2.day_id = c.day_id AND c2.uid = c.uid AND c2.id <> c.id);

-- 2) Planilla -> su usuario, solo donde está vacío y si ese usuario no está ya en otra fila.
WITH mapa(nombre, uid) AS (VALUES
  ('AGUIRRE RAQUEL NOEMI',    'cedcb5fe-abc3-453b-8e44-c4794d153d7d'::uuid),
  ('IBARRA LUCAS DAMIAN',     'c64cd25a-ff30-49e6-ba5b-0757be592bcf'::uuid),
  ('ALMADA CINTI PAMELA',     '2f8319e8-ea0d-43ed-a353-cb748349be9a'::uuid),
  ('BRISA DI SCALA',          '9eaf1e1a-f0a9-4a5f-a122-9599ad83441d'::uuid),
  ('IGOA CINTHIA',            'b20041e0-8892-4841-b961-75b0e8744bf3'::uuid),
  ('AGUSTIN ARRIAGA',         'bb71e568-a65d-4957-8d6a-b5424896694c'::uuid),
  ('MICA DOLESOR',            'b53d00f3-733b-4302-a6a6-5fe8c4bceadb'::uuid),
  ('FUENTES NICOLAS LEANDRO', 'e2421aa6-b5cc-425d-a574-9a2c44314070'::uuid),
  ('LUCIA LEIVA',             'c2f66244-4a0e-4bce-805b-8f2b3b457480'::uuid),
  ('MARTINA BARCIA',          'd1a89bdd-42f4-4506-9ef5-6aed0a06d2f6'::uuid),
  ('BELEN GALLEGOS',          '6060e10f-1df6-4f28-a2c5-3f7938892921'::uuid),
  ('FRANCIA BERON NICOLA',    '2fb9fbd5-3fca-4563-b435-8e18c03d066e'::uuid)
)
UPDATE planilla_empleados e
SET profile_id = m.uid
FROM mapa m
WHERE e.nombre = m.nombre
  AND e.profile_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM planilla_empleados o WHERE o.profile_id = m.uid);

COMMIT;

-- ------------------------------------------------------------
-- Verificación: cuántas propinas ve ahora cada mozo y si quedó en la planilla.
-- ------------------------------------------------------------
SELECT p.full_name AS mozo,
       (SELECT count(*) FROM tip_entries t WHERE t.user_id = p.id) AS propinas_que_ve,
       CASE WHEN EXISTS (SELECT 1 FROM planilla_empleados e WHERE e.profile_id = p.id)
            THEN 'sí' ELSE 'NO' END AS en_la_planilla
FROM profiles p
WHERE p.puesto = 'Mozos' AND p.role <> 'admin' AND p.status = 'approved'
  AND p.full_name NOT IN ('Prueba11', 'Enzo Espiño 1')
ORDER BY p.full_name;
