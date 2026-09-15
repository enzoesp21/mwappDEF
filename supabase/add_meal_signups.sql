-- ============================================================
-- MIGRACIÓN: Anotaciones comida semanal
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_signups (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start   DATE        NOT NULL,
  preference   TEXT        NOT NULL CHECK (preference IN ('tradicional', 'vegetariano', 'vegano', 'celiaco')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE meal_signups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_signups' AND policyname = 'Users read own meal signups') THEN
    CREATE POLICY "Users read own meal signups" ON meal_signups
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_signups' AND policyname = 'Users insert own meal signups') THEN
    CREATE POLICY "Users insert own meal signups" ON meal_signups
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_signups' AND policyname = 'Users update own meal signups') THEN
    CREATE POLICY "Users update own meal signups" ON meal_signups
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_signups' AND policyname = 'Admins read all meal signups') THEN
    CREATE POLICY "Admins read all meal signups" ON meal_signups
      FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'Migración completada: meal_signups creada.'; END $$;
