-- ============================================================
-- Onboarding: preguntar si la persona es nueva o ya lleva tiempo
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- NULL = todavía no respondió, así que le mostramos la bienvenida.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS experience text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass AND conname = 'profiles_experience_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_experience_check
      CHECK (experience IS NULL OR experience IN ('nuevo', 'experimentado'));
  END IF;
END $$;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- Cada usuario puede actualizar su propio perfil (para guardar la respuesta).
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

SELECT
  COALESCE(experience, 'sin responder') AS experiencia,
  count(*) AS cantidad
FROM profiles
GROUP BY 1
ORDER BY 1;
