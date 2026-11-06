-- ============================================================
-- Comida semanal: opción "No vengo"
--
-- Enzo (06/11): no todos trabajan todos los días, y a quien no viene algún
-- día "Te faltan elegir comidas" le seguía diciendo que le faltaban 2 o 3,
-- aunque ya hubiera elegido las suyas. Ahora cada comida se puede contestar
-- con "No vengo" (preference = 'no'): cuenta como contestada y no le suma a
-- la cocina. Además, los días de franco del horario publicado ya aparecen
-- marcados como "No vengo" (eso lo hace la app, no se guarda).
--
-- Qué hace: amplía el CHECK de meal_signups.preference para aceptar 'no'.
-- No toca lo que ya se eligió. Se puede correr dos veces.
-- ============================================================

-- Freno: tiene que existir la tabla de la comida.
DO $$
BEGIN
  IF to_regclass('public.meal_signups') IS NULL THEN
    RAISE EXCEPTION 'No existe meal_signups: corré primero supabase/add_meal_signups.sql.';
  END IF;
END $$;

BEGIN;

-- Se saca el CHECK viejo de preference, se llame como se llame.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.meal_signups'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%preference%'
  LOOP
    EXECUTE format('ALTER TABLE meal_signups DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE meal_signups
  ADD CONSTRAINT meal_signups_preference_check
  CHECK (preference IN ('tradicional', 'vegetariano', 'vegano', 'celiaco', 'propio', 'no'));

COMMIT;

-- Verificación: tiene que decir "lista".
SELECT 'opción No vengo' AS que,
       CASE WHEN EXISTS (SELECT 1 FROM pg_constraint
                         WHERE conrelid = 'public.meal_signups'::regclass AND contype = 'c'
                           AND pg_get_constraintdef(oid) ILIKE '%''no''%')
            THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'comidas ya elegidas (no se tocan)', count(*)::text FROM meal_signups;
