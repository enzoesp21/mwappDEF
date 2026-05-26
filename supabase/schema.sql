-- ============================================================
-- Mirador Waikiki App — Database Schema
-- Run this in the Supabase SQL Editor before seed.sql
-- ============================================================

-- ============================================================
-- HELPER FUNCTION: is_admin()
-- Returns true if the currently authenticated user has role='admin'
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;


-- ============================================================
-- TABLE: profiles
-- One row per auth.users entry; created automatically via trigger
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name   text NOT NULL,
  role        text NOT NULL DEFAULT 'staff'
                CHECK (role IN ('staff', 'admin')),
  puesto      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Index: look up profiles by role (admin checks)
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON profiles (role);
-- Index: look up profiles by puesto (guide visibility)
CREATE INDEX IF NOT EXISTS idx_profiles_puesto ON profiles (puesto);


-- ============================================================
-- TABLE: guides
-- Training guides; puestos[] controls which roles see each guide
-- ============================================================
CREATE TABLE IF NOT EXISTS guides (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text NOT NULL,
  content     text NOT NULL,
  puestos     text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

-- Index: GIN index for fast array membership lookups
CREATE INDEX IF NOT EXISTS idx_guides_puestos ON guides USING GIN (puestos);


-- ============================================================
-- TABLE: exams
-- Each guide can have one (or more) associated exams
-- ============================================================
CREATE TABLE IF NOT EXISTS exams (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id      uuid REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
  title         text NOT NULL,
  passing_score int  NOT NULL DEFAULT 70,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exams_guide_id ON exams (guide_id);


-- ============================================================
-- TABLE: exam_questions
-- Multiple-choice questions belonging to an exam
-- options: JSONB array of 4 strings
-- correct_option: 0-based index into options array
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_questions (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id        uuid REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  question       text  NOT NULL,
  options        jsonb NOT NULL,           -- ["A","B","C","D"]
  correct_option int   NOT NULL,           -- 0-3
  "order"        int   NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_order   ON exam_questions (exam_id, "order");


-- ============================================================
-- TABLE: exam_results
-- Records each staff member's exam attempt
-- signature_data: base64-encoded PNG from the canvas signature pad
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_results (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exam_id        uuid REFERENCES exams(id)      ON DELETE CASCADE NOT NULL,
  score          int     NOT NULL,   -- percentage 0-100
  passed         boolean NOT NULL,
  completed_at   timestamptz DEFAULT now(),
  signature_data text                -- base64 PNG
);

CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results (user_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_id ON exam_results (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user_exam ON exam_results (user_id, exam_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results   ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- RLS: profiles
-- ------------------------------------------------------------

-- Staff: read own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Staff: update own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin: read all profiles
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admin: update any profile
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Service role / trigger: insert new profiles
-- (service_role bypasses RLS by default, but we add an explicit policy
--  so the trigger function — which runs as SECURITY DEFINER — can insert)
CREATE POLICY "profiles_insert_service"
  ON profiles FOR INSERT
  WITH CHECK (true);


-- ------------------------------------------------------------
-- RLS: guides
-- ------------------------------------------------------------

-- Staff: read guides where their puesto is in the puestos array
--        OR 'todos' is in the puestos array
CREATE POLICY "guides_select_staff"
  ON guides FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR 'todos' = ANY(puestos)
    OR auth.uid() IN (
      SELECT id FROM profiles WHERE puesto = ANY(guides.puestos)
    )
  );

-- Admin: insert guides
CREATE POLICY "guides_insert_admin"
  ON guides FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admin: update guides
CREATE POLICY "guides_update_admin"
  ON guides FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin: delete guides
CREATE POLICY "guides_delete_admin"
  ON guides FOR DELETE
  TO authenticated
  USING (is_admin());


-- ------------------------------------------------------------
-- RLS: exams
-- ------------------------------------------------------------

-- Staff: read exams whose guide they can access
CREATE POLICY "exams_select_staff"
  ON exams FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM guides g
      WHERE g.id = exams.guide_id
        AND (
          'todos' = ANY(g.puestos)
          OR auth.uid() IN (
            SELECT id FROM profiles WHERE puesto = ANY(g.puestos)
          )
        )
    )
  );

-- Admin: insert exams
CREATE POLICY "exams_insert_admin"
  ON exams FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admin: update exams
CREATE POLICY "exams_update_admin"
  ON exams FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin: delete exams
CREATE POLICY "exams_delete_admin"
  ON exams FOR DELETE
  TO authenticated
  USING (is_admin());


-- ------------------------------------------------------------
-- RLS: exam_questions
-- ------------------------------------------------------------

-- Staff: read questions for exams they can access
CREATE POLICY "exam_questions_select_staff"
  ON exam_questions FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM exams e
      JOIN guides g ON g.id = e.guide_id
      WHERE e.id = exam_questions.exam_id
        AND (
          'todos' = ANY(g.puestos)
          OR auth.uid() IN (
            SELECT id FROM profiles WHERE puesto = ANY(g.puestos)
          )
        )
    )
  );

-- Admin: insert questions
CREATE POLICY "exam_questions_insert_admin"
  ON exam_questions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admin: update questions
CREATE POLICY "exam_questions_update_admin"
  ON exam_questions FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin: delete questions
CREATE POLICY "exam_questions_delete_admin"
  ON exam_questions FOR DELETE
  TO authenticated
  USING (is_admin());


-- ------------------------------------------------------------
-- RLS: exam_results
-- ------------------------------------------------------------

-- Users: read their own results
CREATE POLICY "exam_results_select_own"
  ON exam_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Users: insert their own results
CREATE POLICY "exam_results_insert_own"
  ON exam_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin: update results (e.g., corrections)
CREATE POLICY "exam_results_update_admin"
  ON exam_results FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin: delete results
CREATE POLICY "exam_results_delete_admin"
  ON exam_results FOR DELETE
  TO authenticated
  USING (is_admin());


-- ============================================================
-- TRIGGER: auto-create profile on new auth.users row
-- Reads full_name, puesto and role from raw_user_meta_data
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, puesto, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'),
    COALESCE(NEW.raw_user_meta_data->>'puesto',    'Sin puesto'),
    COALESCE(NEW.raw_user_meta_data->>'role',      'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists (idempotent re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
