-- ============================================================
-- Faltas graves: cambia el punto 2
--
-- Antes: "Salir a fumar sin avisar a tu referente o al encargado."
-- Ahora: "Salir a fumar fuera del horario de descanso."
--
-- Actualiza la copia que está dentro de la guía de Conocimientos
-- Fundamentales. La de la app (bienvenida e Inicio) ya está cambiada en el
-- código, en lib/faltas-graves.ts.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente: si ya está
-- cambiado, no hace nada.
-- ============================================================

BEGIN;

UPDATE guides
SET content = replace(
      content,
      '2. **Salir a fumar sin avisar** a tu referente o al encargado.',
      '2. **Salir a fumar fuera del horario de descanso.**'
    )
WHERE is_primary = true
  AND content LIKE '%2. **Salir a fumar sin avisar** a tu referente o al encargado.%';

-- Freno: el punto nuevo tiene que quedar, y el viejo no.
DO $$
DECLARE ok boolean;
BEGIN
  SELECT content LIKE '%Salir a fumar fuera del horario de descanso%'
     AND content NOT LIKE '%Salir a fumar sin avisar%'
  INTO ok
  FROM guides WHERE is_primary = true;

  IF NOT COALESCE(ok, false) THEN
    RAISE EXCEPTION 'El punto 2 no quedó actualizado en la guía principal: se cancela.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: cómo quedó el punto 2 en la guía.
-- ------------------------------------------------------------
SELECT substring(content from position('2. **Salir a fumar' in content) for 60) AS punto_2
FROM guides WHERE is_primary = true;
