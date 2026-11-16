-- ============================================================
-- Eventos: borrar los de septiembre y octubre de la planilla de Enzo
--
-- Enzo, 12/11: "borrá los de septiembre y octubre que ya pasaron". Son los
-- cuatro que había cargado add_eventos_privados_noviembre.sql:
--   - 18/09 Reunión de trabajo South Post (Hula Kai)
--   - 26/09 Cumpleaños Miguel Lavena (Ala Wai)
--   - 03/10 XV Emma Giri (Ala Wai)
--   - 06/10 Cena Lam Weston (Ala Wai)
-- Borra solo esos (por fecha y nombre), nada más. Se puede correr dos veces.
-- ============================================================

-- Freno: si antes de noviembre hay algo que no sea uno de esos cuatro, se
-- cancela para no borrar lo que cargó otra persona.
DO $$
DECLARE
  v_otros text;
BEGIN
  SELECT string_agg(to_char(fecha, 'DD/MM') || ' ' || nombre, ', ') INTO v_otros
  FROM eventos
  WHERE fecha < date '2026-11-01'
    AND (fecha, nombre) NOT IN (
      (date '2026-09-18', 'Reunión de trabajo South Post'),
      (date '2026-09-26', 'Cumpleaños Miguel Lavena'),
      (date '2026-10-03', 'XV Emma Giri'),
      (date '2026-10-06', 'Cena Lam Weston')
    );
  IF v_otros IS NOT NULL THEN
    RAISE EXCEPTION 'Antes de noviembre hay otros cargados (%): no se borra nada. Avisale a Claude.', v_otros;
  END IF;
END $$;

DELETE FROM eventos
WHERE (fecha, nombre) IN (
  (date '2026-09-18', 'Reunión de trabajo South Post'),
  (date '2026-09-26', 'Cumpleaños Miguel Lavena'),
  (date '2026-10-03', 'XV Emma Giri'),
  (date '2026-10-06', 'Cena Lam Weston')
);

-- Verificación: tiene que decir 0 antes de noviembre, y cuántos quedan de noviembre en adelante.
SELECT 'antes de noviembre' AS que, count(*)::text AS cuantos FROM eventos WHERE fecha < date '2026-11-01'
UNION ALL
SELECT 'de noviembre en adelante', count(*)::text FROM eventos WHERE fecha >= date '2026-11-01';
