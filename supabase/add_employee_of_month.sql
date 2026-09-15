-- ============================================================
-- Empleado del mes + votación del equipo
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- 1) El empleado del mes publicado. Un registro por período ('2026-09').
CREATE TABLE IF NOT EXISTS employee_of_month (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period       text NOT NULL UNIQUE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url    text,
  message      text,
  created_at   timestamptz DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_eom_period ON employee_of_month (period DESC);

ALTER TABLE employee_of_month ENABLE ROW LEVEL SECURITY;

-- Todo el personal lo ve; solo el admin publica o edita.
DROP POLICY IF EXISTS "eom_select_all" ON employee_of_month;
CREATE POLICY "eom_select_all" ON employee_of_month
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "eom_write_admin" ON employee_of_month;
CREATE POLICY "eom_write_admin" ON employee_of_month
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 2) Votos. Uno por persona y período; no se puede votar a uno mismo.
CREATE TABLE IF NOT EXISTS employee_votes (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period       text NOT NULL,
  voter_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  candidate_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment      text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (period, voter_id),
  CONSTRAINT employee_votes_no_self CHECK (voter_id <> candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_period ON employee_votes (period);

ALTER TABLE employee_votes ENABLE ROW LEVEL SECURITY;

-- Cada uno maneja su propio voto. El admin los ve todos (los votos no son
-- anónimos: eso se le avisa al empleado en la pantalla de votación).
DROP POLICY IF EXISTS "votes_select" ON employee_votes;
CREATE POLICY "votes_select" ON employee_votes
  FOR SELECT USING (auth.uid() = voter_id OR is_admin());

DROP POLICY IF EXISTS "votes_insert_own" ON employee_votes;
CREATE POLICY "votes_insert_own" ON employee_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "votes_update_own" ON employee_votes;
CREATE POLICY "votes_update_own" ON employee_votes
  FOR UPDATE USING (auth.uid() = voter_id) WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "votes_delete_own" ON employee_votes;
CREATE POLICY "votes_delete_own" ON employee_votes
  FOR DELETE USING (auth.uid() = voter_id OR is_admin());

-- 3) Diagnóstico.
SELECT 'tabla' AS tipo, table_name AS nombre FROM information_schema.tables
WHERE table_name IN ('employee_of_month','employee_votes')
UNION ALL
SELECT 'policy', policyname FROM pg_policies
WHERE tablename IN ('employee_of_month','employee_votes')
ORDER BY tipo, nombre;
