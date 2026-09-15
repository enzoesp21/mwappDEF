-- ============================================================
-- Preguntas abiertas con corrección manual del administrador
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- 1) Tipo de pregunta. Las que ya existen quedan como multiple choice.
ALTER TABLE exam_questions
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'multiple_choice';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid='exam_questions'::regclass
                   AND conname='exam_questions_type_check') THEN
    ALTER TABLE exam_questions ADD CONSTRAINT exam_questions_type_check
      CHECK (question_type IN ('multiple_choice','open'));
  END IF;
END $$;

-- En las abiertas no hay opción correcta.
ALTER TABLE exam_questions ALTER COLUMN correct_option DROP NOT NULL;

-- Referencia para quien corrige (no la ve el empleado).
ALTER TABLE exam_questions
  ADD COLUMN IF NOT EXISTS answer_guide text;

-- 2) Estado de corrección del intento.
ALTER TABLE exam_results
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'graded';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid='exam_results'::regclass
                   AND conname='exam_results_review_check') THEN
    ALTER TABLE exam_results ADD CONSTRAINT exam_results_review_check
      CHECK (review_status IN ('pending_review','graded'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_results_review ON exam_results (review_status);

-- 3) Respuesta por pregunta. Es lo que el admin corrige.
CREATE TABLE IF NOT EXISTS exam_answers (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id       uuid REFERENCES exam_results(id)   ON DELETE CASCADE NOT NULL,
  question_id     uuid REFERENCES exam_questions(id) ON DELETE CASCADE NOT NULL,
  selected_option int,
  answer_text     text,
  is_correct      boolean,      -- NULL = abierta sin corregir
  comment         text,
  graded_by       uuid REFERENCES auth.users(id),
  graded_at       timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_answers_result ON exam_answers (result_id);

ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exam_answers_select" ON exam_answers;
CREATE POLICY "exam_answers_select" ON exam_answers
  FOR SELECT USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM exam_results r
      WHERE r.id = exam_answers.result_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "exam_answers_update_admin" ON exam_answers;
CREATE POLICY "exam_answers_update_admin" ON exam_answers
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- 4) Preguntas para el empleado: sin correct_option ni answer_guide.
--    Se borra primero porque ahora devuelve question_type y Postgres no
--    permite cambiar el tipo de retorno con CREATE OR REPLACE.
DROP FUNCTION IF EXISTS get_exam_questions(uuid);

CREATE OR REPLACE FUNCTION get_exam_questions(p_exam_id uuid)
RETURNS TABLE (id uuid, question text, options jsonb, question_type text, "order" int)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT q.id, q.question, q.options, q.question_type, q."order"
  FROM exam_questions q
  WHERE q.exam_id = p_exam_id AND auth.uid() IS NOT NULL
  ORDER BY q."order", q.id;
$$;

-- 5) Recalcula nota y estado a partir de las respuestas ya corregidas.
CREATE OR REPLACE FUNCTION finalize_exam_result(p_result_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total int; v_correct int; v_pending int;
  v_score int; v_passing int; v_exam_id uuid; v_user_id uuid;
  v_guide_title text;
BEGIN
  SELECT exam_id, user_id INTO v_exam_id, v_user_id
  FROM exam_results WHERE id = p_result_id;
  IF v_exam_id IS NULL THEN RAISE EXCEPTION 'El intento no existe'; END IF;

  SELECT count(*)::int,
         count(*) FILTER (WHERE is_correct IS TRUE)::int,
         count(*) FILTER (WHERE is_correct IS NULL)::int
    INTO v_total, v_correct, v_pending
  FROM exam_answers WHERE result_id = p_result_id;

  IF v_total = 0 THEN RAISE EXCEPTION 'El intento no tiene respuestas'; END IF;
  IF v_pending > 0 THEN
    RETURN jsonb_build_object('review_status','pending_review','pending',v_pending);
  END IF;

  SELECT e.passing_score, g.title INTO v_passing, v_guide_title
  FROM exams e LEFT JOIN guides g ON g.id = e.guide_id
  WHERE e.id = v_exam_id;

  v_score := round((v_correct::numeric / v_total) * 100);

  UPDATE exam_results
     SET score = v_score,
         passed = v_score >= COALESCE(v_passing, 70),
         review_status = 'graded'
   WHERE id = p_result_id;

  INSERT INTO notifications (user_id, message)
  VALUES (v_user_id,
    'Ya corrigieron tu examen de ' || COALESCE(v_guide_title, 'la guía') ||
    '. Obtuviste ' || v_score || '%: ' ||
    CASE WHEN v_score >= COALESCE(v_passing, 70) THEN 'aprobaste.' ELSE 'no alcanzó para aprobar.' END);

  RETURN jsonb_build_object(
    'review_status','graded','score',v_score,
    'passed', v_score >= COALESCE(v_passing, 70),
    'correct',v_correct,'total',v_total);
END; $$;

-- 6) Envío del examen. Guarda cada respuesta y corrige sola las de opción.
--    Las abiertas quedan en NULL esperando al admin.
CREATE OR REPLACE FUNCTION submit_exam(
  p_exam_id   uuid,
  p_answers   jsonb,     -- [{"question_id":"...","selected_option":2}, {"question_id":"...","answer_text":"..."}]
  p_signature text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result_id uuid;
  v_open int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF jsonb_array_length(COALESCE(p_answers,'[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'No se recibieron respuestas';
  END IF;

  INSERT INTO exam_results (user_id, exam_id, score, passed, signature_data, review_status)
  VALUES (auth.uid(), p_exam_id, 0, false, p_signature, 'pending_review')
  RETURNING id INTO v_result_id;

  INSERT INTO exam_answers (result_id, question_id, selected_option, answer_text, is_correct)
  SELECT
    v_result_id,
    q.id,
    CASE WHEN q.question_type = 'multiple_choice'
         THEN (a->>'selected_option')::int END,
    CASE WHEN q.question_type = 'open'
         THEN a->>'answer_text' END,
    CASE WHEN q.question_type = 'multiple_choice'
         THEN ((a->>'selected_option')::int IS NOT DISTINCT FROM q.correct_option)
         ELSE NULL END
  FROM jsonb_array_elements(p_answers) AS a
  JOIN exam_questions q ON q.id = (a->>'question_id')::uuid
  WHERE q.exam_id = p_exam_id;

  SELECT count(*)::int INTO v_open
  FROM exam_answers WHERE result_id = v_result_id AND is_correct IS NULL;

  IF v_open = 0 THEN
    RETURN finalize_exam_result(v_result_id) || jsonb_build_object('result_id', v_result_id);
  END IF;

  RETURN jsonb_build_object(
    'review_status','pending_review',
    'pending', v_open,
    'result_id', v_result_id);
END; $$;

-- 7) El admin marca una respuesta abierta. Si fue la última, cierra la nota.
CREATE OR REPLACE FUNCTION grade_open_answer(
  p_answer_id  uuid,
  p_is_correct boolean,
  p_comment    text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result_id uuid;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Solo un administrador puede corregir'; END IF;

  UPDATE exam_answers
     SET is_correct = p_is_correct,
         comment    = p_comment,
         graded_by  = auth.uid(),
         graded_at  = now()
   WHERE id = p_answer_id
  RETURNING result_id INTO v_result_id;

  IF v_result_id IS NULL THEN RAISE EXCEPTION 'La respuesta no existe'; END IF;

  RETURN finalize_exam_result(v_result_id);
END; $$;

GRANT EXECUTE ON FUNCTION get_exam_questions(uuid)                    TO authenticated;
GRANT EXECUTE ON FUNCTION submit_exam(uuid, jsonb, text)              TO authenticated;
GRANT EXECUTE ON FUNCTION grade_open_answer(uuid, boolean, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_exam_result(uuid)                  TO authenticated;

-- Las funciones viejas ya no se usan.
DROP FUNCTION IF EXISTS grade_exam(uuid, int[]);
DROP FUNCTION IF EXISTS save_exam_result(uuid, int[], text);

-- 8) Diagnóstico.
SELECT 'funcion' AS tipo, proname AS nombre FROM pg_proc
WHERE proname IN ('get_exam_questions','submit_exam','grade_open_answer','finalize_exam_result')
UNION ALL
SELECT 'columna', column_name FROM information_schema.columns
WHERE table_name='exam_questions' AND column_name IN ('question_type','answer_guide')
UNION ALL
SELECT 'tabla', 'exam_answers' FROM information_schema.tables WHERE table_name='exam_answers'
ORDER BY tipo, nombre;
