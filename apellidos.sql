-- ============================================================
-- Horarios: nombres completos en las semanas anteriores
--
-- En la semana del 28/9 al 4/10 Enzo completó el apellido de quienes figuraban
-- solo con el nombre ("Bruno" -> "Bruno Molina"). Esto hace lo mismo en las
-- semanas anteriores (hoy, la del 21 al 27 de septiembre), para que la misma
-- persona se llame igual en todos los horarios.
--
-- Solo cambia nombres; los horarios de cada día no se tocan. Se cambia por
-- sector y nombre exacto, porque hay nombres que en cada sector son otra
-- persona: "Martina" en Pastelería es Martina Silvera y en Comiss / Runners
-- es Martina Barcia.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente: una vez cambiados
-- los nombres cortos ya no están, así que una segunda corrida no hace nada.
--
-- Si justo tenés abierto el editor de la semana del 21, cerralo antes: al
-- correr esto la semana cambia de versión y el editor te avisaría que alguien
-- la modificó.
-- ============================================================

BEGIN;

WITH cambios(sector, viejo, nuevo) AS (
  VALUES
    ('CAMAREROS',        'Micaela',        'Micaela Dolesor'),
    ('CAMAREROS',        'Nico Fuentes',   'Nicolás Fuentes'),
    ('BARRA',            'Bruno',          'Bruno Molina'),
    ('BARRA',            'Federico',       'Federico Caruso'),
    ('MAESTRANZA',       'Gabriel',        'Gabriel Gimenez'),
    ('MAESTRANZA',       'Jorgelina',      'Jorgelina Pelizardi'),
    ('ENSALADA',         'Gabriel',        'Gabriel Gimenez'),
    ('ENSALADA',         'Damian',         'Damian Ortiz'),
    ('PASTELERÍA',       'Martina',        'Martina Silvera'),
    ('CAJA',             'Nachito Lopez',  'Ignacio Lopez'),
    ('RECEPCIÓN',        'Lucrecia',       'Lucrecia Laspita'),
    ('RECEPCIÓN',        'Antonella',      'Antonella Coronel'),
    ('RECEPCIÓN',        'Valentina',      'Valentina Muzio'),
    ('RECEPCIÓN',        'Orne',           'Ornella Fernandez'),
    ('COMISS / RUNNERS', 'Martina',        'Martina Barcia'),
    ('COMISS / RUNNERS', 'Uriel',          'Uriel Zabala'),
    ('COMISS / RUNNERS', 'Emilia Burgart', 'Emilia Burgardt'),
    ('COMISS / RUNNERS', 'Francia',        'Francia Beron'),
    ('COCINA',           'Santi',          'Santiago')
),
-- Semanas que tienen al menos un nombre para cambiar.
afectadas AS (
  SELECT DISTINCT w.id
  FROM schedule_weeks w
  CROSS JOIN LATERAL jsonb_array_elements(w.data->'sectores') AS ss(s)
  CROSS JOIN LATERAL jsonb_array_elements(s->'personas') AS pp(p)
  JOIN cambios c ON c.sector = btrim(s->>'nombre') AND c.viejo = btrim(p->>'nombre')
)
UPDATE schedule_weeks w
SET data = jsonb_set(w.data, '{sectores}', (
      SELECT jsonb_agg(
        jsonb_set(s, '{personas}', COALESCE((
          SELECT jsonb_agg(
            CASE WHEN c.nuevo IS NULL THEN p
                 ELSE jsonb_set(p, '{nombre}', to_jsonb(c.nuevo)) END
            ORDER BY pi)
          FROM jsonb_array_elements(s->'personas') WITH ORDINALITY AS pp(p, pi)
          LEFT JOIN cambios c ON c.sector = btrim(s->>'nombre') AND c.viejo = btrim(p->>'nombre')
        ), '[]'::jsonb))
        ORDER BY si)
      FROM jsonb_array_elements(w.data->'sectores') WITH ORDINALITY AS ss(s, si)
    )),
    updated_at = now()
WHERE w.id IN (SELECT id FROM afectadas);

-- Freno: no puede quedar ningún nombre corto de la lista en ninguna semana.
DO $$
DECLARE quedan int;
BEGIN
  SELECT count(*) INTO quedan
  FROM schedule_weeks w
  CROSS JOIN LATERAL jsonb_array_elements(w.data->'sectores') AS ss(s)
  CROSS JOIN LATERAL jsonb_array_elements(s->'personas') AS pp(p)
  WHERE btrim(s->>'nombre') || ' | ' || btrim(p->>'nombre') IN (
    'CAMAREROS | Micaela', 'CAMAREROS | Nico Fuentes', 'BARRA | Bruno', 'BARRA | Federico',
    'MAESTRANZA | Gabriel', 'MAESTRANZA | Jorgelina', 'ENSALADA | Gabriel', 'ENSALADA | Damian',
    'PASTELERÍA | Martina', 'CAJA | Nachito Lopez', 'RECEPCIÓN | Lucrecia',
    'RECEPCIÓN | Antonella', 'RECEPCIÓN | Valentina', 'RECEPCIÓN | Orne',
    'COMISS / RUNNERS | Martina', 'COMISS / RUNNERS | Uriel',
    'COMISS / RUNNERS | Emilia Burgart', 'COMISS / RUNNERS | Francia', 'COCINA | Santi'
  );

  IF quedan > 0 THEN
    RAISE EXCEPTION 'Quedaron % nombres sin cambiar: se cancela y no se toca nada.', quedan;
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: cómo quedaron los nombres de cada semana, sector por sector.
-- ------------------------------------------------------------
SELECT w.week_start AS semana,
       s->>'nombre' AS sector,
       (SELECT string_agg(p->>'nombre', ', ' ORDER BY pi)
          FROM jsonb_array_elements(s->'personas') WITH ORDINALITY AS pp(p, pi)
         WHERE btrim(p->>'nombre') <> '') AS personas
FROM schedule_weeks w
CROSS JOIN LATERAL jsonb_array_elements(w.data->'sectores') WITH ORDINALITY AS ss(s, si)
ORDER BY w.week_start, si;
