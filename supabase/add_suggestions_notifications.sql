-- ============================================================
-- MIGRACIÓN: Sugerencias, Notificaciones y Resultados Generales
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Permitir que todos los usuarios autenticados vean resultados aprobados
--    (necesario para la página "Resultados Generales")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'exam_results'
      AND policyname = 'All authenticated can view passed results'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "All authenticated can view passed results"
        ON exam_results FOR SELECT
        USING (auth.role() = 'authenticated')
    $policy$;
  END IF;
END $$;

-- 2. Permitir que todos los usuarios autenticados lean perfiles
--    (necesario para mostrar nombres en el leaderboard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'All authenticated can read profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "All authenticated can read profiles"
        ON profiles FOR SELECT
        USING (auth.role() = 'authenticated')
    $policy$;
  END IF;
END $$;

-- 3. Tabla de sugerencias y reclamos
CREATE TABLE IF NOT EXISTS suggestions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content     TEXT        NOT NULL,
  category    TEXT        DEFAULT 'sugerencia'
                          CHECK (category IN ('sugerencia', 'reclamo')),
  is_read     BOOLEAN     DEFAULT false,
  read_at     TIMESTAMPTZ,
  read_by     UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suggestions' AND policyname = 'Users insert own suggestions') THEN
    CREATE POLICY "Users insert own suggestions" ON suggestions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suggestions' AND policyname = 'Users read own admins read all') THEN
    CREATE POLICY "Users read own admins read all" ON suggestions
      FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suggestions' AND policyname = 'Admins update suggestions') THEN
    CREATE POLICY "Admins update suggestions" ON suggestions
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- 4. Tabla de notificaciones internas
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message     TEXT        NOT NULL,
  is_seen     BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users read own notifications') THEN
    CREATE POLICY "Users read own notifications" ON notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users update own notifications') THEN
    CREATE POLICY "Users update own notifications" ON notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Admins insert notifications') THEN
    CREATE POLICY "Admins insert notifications" ON notifications
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'Migración completada: suggestions, notifications y políticas RLS creadas.'; END $$;
