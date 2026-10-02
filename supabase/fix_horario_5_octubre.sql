-- ============================================================
-- Horario de la semana del 5 al 11 de octubre: se carga el del PDF
--
-- Enzo pidió reemplazar el borrador de esa semana por el horario del PDF
-- "Horarios MW 5 al 11 de octubre (2)", que es el que hay que seguir editando.
-- El PDF salió de la app el 1/10. Se cargó tal cual, celda por celda, y se
-- comprobó que la fila "Trabajan" de cada sector da igual que en el PDF.
--
-- Servicio de noche: viernes, sábado y domingo (así estaba cuando se sacó
-- el PDF; se cambia en el editor si hace falta). Sin feriados.
--
-- Lo que había antes en el borrador quedó guardado en el repo:
-- supabase/respaldos/horario_2026-10-05_antes_del_pdf.json
--
-- La semana sigue como BORRADOR. Si alguien tiene abierto el editor de esa
-- semana, que lo cierre antes: al correr esto la semana cambia de versión.
--
-- Correr entero en Supabase -> SQL Editor. Se puede correr dos veces: deja
-- siempre lo mismo.
-- ============================================================

BEGIN;

-- Freno: la semana tiene que existir y seguir en borrador.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM schedule_weeks WHERE week_start = '2026-10-05') THEN
    RAISE EXCEPTION 'No existe la semana del 5 de octubre: se cancela.';
  END IF;
  IF EXISTS (SELECT 1 FROM schedule_weeks WHERE week_start = '2026-10-05' AND status <> 'draft') THEN
    RAISE EXCEPTION 'La semana del 5 de octubre ya está publicada: se cancela para no cambiarle el horario al personal sin avisar.';
  END IF;
END $$;

UPDATE schedule_weeks
SET data = $json${"sectores":[{"nombre":"CAMAREROS","personas":[{"nombre":"Raquel Aguirre","dias":["X","7.30 A 16.30","X","7:30 a 16:00","7.30 A 17.30","7.30 A 18.30","7.30 A 18.30"]},{"nombre":"Pamela Almada","dias":["7.30 A 16.30","X","7.30 A 16.30","7.30 A 16.00","X","7.30 A 18.30","7.30 A 18.30"]},{"nombre":"Lucas Ibarra","dias":["10 A 18.30","X","X","11C","10 a 19","10 A 19","10 A 19"]},{"nombre":"Agustin Arriaga","dias":["X","X","X","X","16C","11C","11C"]},{"nombre":"Brisa Di Scala","dias":["11 A 19.30","X","X","X","9 A 17.30","11C","11C"]},{"nombre":"Rocio Conde","dias":["LIC","LIC","LIC","LIC","LIC","LIC","LIC"]},{"nombre":"Camila Rodriguez","dias":["X","X","11C","X","11C","11C","11 A 19.30"]},{"nombre":"Gabriel Cansino","dias":["X","X","X","11C","11 A 19.30","11C","11C"]},{"nombre":"Azul Pretel","dias":["X","11 A 19.30","11 A 19.30","X","11 A 19.30","9 a 18.30","11C"]},{"nombre":"Micaela Dolesor","dias":["9 A 17.30","9 a 17.30","X","X","11C","10 A 19.30","10 A 19.30"]},{"nombre":"Cinthia Igoa","dias":["X","X","11C","13C","9 a 17.30","11 A 19.30","9 A 17.30"]},{"nombre":"Nicolás Fuentes","dias":["X","X","X","X","16C","11 A 19.30","11C"]},{"nombre":"Lucas Lopez","dias":["11C","11C","X","X","16C","11C","11C"]},{"nombre":"Lucia Leiva","dias":["11C","11C","X","X","16C","11C","11C"]},{"nombre":"Morena Ruiz","dias":["X","X","7.30 A 16","9 A 16","7.30 A 16","7.30 A 16","7.30 A 16"]}]},{"nombre":"BARRA","personas":[{"nombre":"Leonel Schroeder","dias":["X","X","7.30 A 16","7.30 A 16","7.30 A 16","M9","M9"]},{"nombre":"Bruno Molina","dias":["7.30 a 16.30","7.30 A 16","X","9 A 17.30","10 A 20","10 a 23.30","10 A 20"]},{"nombre":"Federico Caruso","dias":["X","X","X","X","16C","14C","11C"]},{"nombre":"Braian Montero","dias":["X","X","9 A 17.30","X","10 A 18.30","10 A 20","10 A 20"]},{"nombre":"Lucho Pelizardi","dias":["11C","11C","X","X","X","10 a 20","10 a 20"]},{"nombre":"Ignacio Gaston","dias":["X","X","X","X","10 A 18.30","9 A 19.30","7.30 A 16"]},{"nombre":"Luciano Alfaro","dias":["8 A 16.30","X","X","X","8 A 16.30","8 A 16.30","8 A 16.30"]},{"nombre":"Lazarte Lautaro Daniel","dias":["X","X","11C","11C","16C","7.30 A 16","11C"]},{"nombre":"Maximiliano Rozalez","dias":["10 A 18.30","10 A 18.30","X","X","9 A 17.30","9 A 17.30","9 A 17.30"]}]},{"nombre":"MAESTRANZA","personas":[{"nombre":"Julieta Zelada","dias":["X","X","X","8 A 14","11 A 22","14C","11 A 20"]},{"nombre":"Gabriel Gimenez","dias":["X","X","9 A 14","14C","11 A 20","11 A 20","8 A 18.30"]},{"nombre":"Jorgelina Pelizardi","dias":["8 A 16.30","9 A 17.30","X","X","8 A 18.30","8 A 18.30","X"]},{"nombre":"Ailen Shroeder","dias":["14C","14C","14C","X","X","X","14C"]}]},{"nombre":"ENSALADA","personas":[{"nombre":"Sofia Cabo","dias":["X","X","X","X","X","8 A 16.30","8 A 16.30"]},{"nombre":"Gabriel Gimenez","dias":["X","X","10 A 18.30","10 A 19.30","X","X","X"]},{"nombre":"Damian Ortiz","dias":["10 A 19.30","10 A 19.30","X","X","10 A 23.30","10 A 23","10 A 23"]}]},{"nombre":"PASTELERÍA","personas":[{"nombre":"Nahuel Baldiviezo","dias":["X","X","8 A 16.30","8 A 16.30","8 A 16.30","8 A 16.30","8 A 16.30"]},{"nombre":"Martina Silvera","dias":["8 a 16.30","8 A 16.30","X","X","8 A 16.30","8 A 16.30","8 A 16.30"]}]},{"nombre":"CAJA","personas":[{"nombre":"Ariana Mastrella","dias":["14C","X","X","8 A 14","8 A 16","16C","16C"]},{"nombre":"Ignacio Lopez","dias":["X","8 A 14","8 A 14","X","X","X","X"]},{"nombre":"Ornella Fernandez","dias":["X","X","14C","14C","X","X","X"]},{"nombre":"Camila Gassmann","dias":["8 A 14","14C","X","X","16C","8 A 16","8 A 16"]}]},{"nombre":"RECEPCIÓN","personas":[{"nombre":"Lucrecia Laspita","dias":["9 a 17","X","9 A 17.30","X","7.30 A 17","11C","9 A 19"]},{"nombre":"Bianca Orazi","dias":["X","X","X","X","X","X","X"]},{"nombre":"Antonella Coronel","dias":["X","X","X","X","X","X","X"]},{"nombre":"Valentina Muzio","dias":["X","9 A 17","11C","9 A 17.30","9 A 17.30","11 A 22.30","11C"]},{"nombre":"Ornella Fernandez","dias":["X","11C","X","X","11 A 19.30","7.30 A 17.30","7.30 A 17.30"]},{"nombre":"Paz Rave","dias":["11C","X","X","11C","10 A 22.30","11C","10 A 22.30"]},{"nombre":"Juana Balsamo","dias":["X","X","X","X","20C","10 A 18.30","10 A 18.30"]}]},{"nombre":"CALIENTA PLATOS","personas":[{"nombre":"Facundo Viera","dias":["11 A 17.30","X","X","X","11 + NOCHE","11 + NOCHE","11+NOCHE"]}]},{"nombre":"COMISS / RUNNERS","personas":[{"nombre":"Martina Barcia","dias":["VAC","VAC","VAC","VAC","VAC","VAC","VAC"]},{"nombre":"Uriel Zabala","dias":["11C","9 A 17.30","X","X","14C","14C","11C"]},{"nombre":"Emilia Burgardt","dias":["X","X","X","X","X","9 A 18.30","9 A 18.30"]},{"nombre":"Francia Beron","dias":["8 A 16.30","X","9 A 17.30","9 A 17.30","8 A 17.30","8 A 17.30","8 A 17.30"]}]},{"nombre":"COCINA","personas":[{"nombre":"Alan Toledo","dias":["8 a 17","9C","8 A 16","X","8 a 17","9C","9C"]},{"nombre":"Luis Cajal","dias":["8 a 17","8 A 16.30","8 A 16.30","9C","8 A 16.30","8 a 17.30","8 a 17.30"]},{"nombre":"Miguel Sachett","dias":["X","9 A 17","9 A 17","X","X","X","X"]},{"nombre":"Luciano Pelizardi","dias":["X","X","X","X","12 a 16.30 + NOCHE","12 a 16.30 + NOCHE","12 A 16.30 + NOCHE"]},{"nombre":"Rodrigo Alfaro","dias":["8 A 17","X","9 a 17.30","9 a 17.30","9C","9C","9C"]},{"nombre":"Martin Bergera","dias":["9 A 17.30","X","X","9 A 17.30","9 A 17.30","9 a 17.30","9 A 17.30"]},{"nombre":"Marcela Musmanno","dias":["X","X","X","X","12 A 20","12 A 20","12 A 20"]},{"nombre":"Carolina Gamarra","dias":["X","8 a 16.30","8C","X","8 A 16.30","8 A 16.30","8 a 17.30"]},{"nombre":"Giuseppe Rivas","dias":["8C","8 A 16.30","X","8 A 16.30","8C","8 A 16.30","8C"]},{"nombre":"Gisel Vallejos","dias":["LIC","LIC","LIC","LIC","LIC","LIC","LIC"]},{"nombre":"Santiago","dias":["X","9 A 17.30","X","10 A 18.30","10C","19C","19C"]},{"nombre":"Ricardo Chapa","dias":["9 A 17.30","X","9 A 17.30","9 A 17.30","9 A 17.30","9 A 17.30","9 A 17.30"]}]}],"feriados":[],"noches":[4,5,6]}$json$::jsonb,
    updated_at = now()
WHERE week_start = '2026-10-05';

-- Freno: tienen que haber quedado los 10 sectores y las 61 personas.
DO $$
DECLARE s int; p int;
BEGIN
  SELECT jsonb_array_length(data->'sectores'),
         (SELECT count(*) FROM jsonb_array_elements(data->'sectores') x, jsonb_array_elements(x->'personas'))
  INTO s, p
  FROM schedule_weeks WHERE week_start = '2026-10-05';
  IF s <> 10 OR p <> 61 THEN
    RAISE EXCEPTION 'Quedaron % sectores y % personas, no 10 y 61: se cancela.', s, p;
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: personas por sector y estado de la semana.
-- ------------------------------------------------------------
SELECT x->>'nombre' AS sector,
       jsonb_array_length(x->'personas') AS personas,
       w.status AS estado,
       w.data->'noches' AS dias_con_noche
FROM schedule_weeks w, jsonb_array_elements(w.data->'sectores') WITH ORDINALITY AS t(x, i)
WHERE w.week_start = '2026-10-05'
ORDER BY i;
