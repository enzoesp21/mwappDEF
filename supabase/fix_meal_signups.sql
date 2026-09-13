-- ============================================================
-- meal_signups: constraint e RLS necesarios para que el guardado funcione
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- 1) El upsert usa onConflict (user_id, meal_date, meal_type).
--    Sin este UNIQUE, cada guardado falla.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'meal_signups'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%user_id%meal_date%meal_type%'
  ) THEN
    ALTER TABLE meal_signups
      ADD CONSTRAINT meal_signups_user_date_type_key
      UNIQUE (user_id, meal_date, meal_type);
    RAISE NOTICE 'UNIQUE creado.';
  ELSE
    RAISE NOTICE 'UNIQUE ya existia.';
  END IF;
END $$;

-- 2) RLS: cada usuario maneja sus propias filas.
ALTER TABLE meal_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own meal signups" ON meal_signups;
CREATE POLICY "Users select own meal signups" ON meal_signups
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own meal signups" ON meal_signups;
CREATE POLICY "Users insert own meal signups" ON meal_signups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own meal signups" ON meal_signups;
CREATE POLICY "Users update own meal signups" ON meal_signups
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own meal signups" ON meal_signups;
CREATE POLICY "Users delete own meal signups" ON meal_signups
  FOR DELETE USING (auth.uid() = user_id);

-- 3) El admin ve todo.
DROP POLICY IF EXISTS "Admins read all meal signups" ON meal_signups;
CREATE POLICY "Admins read all meal signups" ON meal_signups
  FOR SELECT USING (public.is_admin());

-- 4) Diagnostico: que quedo configurado.
SELECT 'constraint' AS tipo, conname AS nombre, pg_get_constraintdef(oid) AS detalle
FROM pg_constraint
WHERE conrelid = 'meal_signups'::regclass AND contype IN ('u', 'p')
UNION ALL
SELECT 'policy', policyname, cmd
FROM pg_policies
WHERE tablename = 'meal_signups'
ORDER BY tipo, nombre;
