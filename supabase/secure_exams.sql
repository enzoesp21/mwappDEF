-- ============================================================
-- Seguridad del examen
--
-- Antes: el navegador recibía exam_questions con correct_option y
-- calculaba la nota, y después insertaba el resultado con el puntaje
-- que quisiera. Cualquiera podía ver las respuestas o cargarse un 100%.
--
-- Ahora: las respuestas no salen de la base y la nota se calcula acá.
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

-- 1) Preguntas SIN la respuesta correcta.
CREATE OR REPLACE FUNCTION get_exam_questions(p_exam_id uuid)
RETURNS TABLE (id uuid, question text, options jsonb, "order" int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT q.id, q.question, q.options, q."order"
  FROM exam_questions q
  WHERE q.exam_id = p_exam_id
    AND auth.uid() IS NOT NULL
  ORDER BY q."order", q.id;
$$;

-- 2) Corrección. El cliente manda solo sus respuestas.
--    p_answers va en el mismo orden que devuelve get_exam_questions.
CREATE OR REPLACE FUNCTION grade_exam(p_exam_id uuid, p_answers int[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total   int;
  v_correct int;
  v_score   int;
  v_passing int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT passing_score INTO v_passing FROM exams WHERE id = p_exam_id;
  IF v_passing IS NULL THEN
    RAISE EXCEPTION 'El examen no existe';
  END IF;

  WITH ordered AS (
    SELECT q.correct_option,
           row_number() OVER (ORDER BY q."order", q.id) AS rn
    FROM exam_questions q
    WHERE q.exam_id = p_exam_id
  )
  SELECT count(*)::int,
         count(*) FILTER (WHERE p_answers[rn] = correct_option)::int
    INTO v_total, v_correct
  FROM ordered;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'El examen no tiene preguntas';
  END IF;

  v_score := round((v_correct::numeric / v_total) * 100);

  RETURN jsonb_build_object(
    'score',   v_score,
    'passed',  v_score >= v_passing,
    'correct', v_correct,
    'total',   v_total
  );
END;
$$;

-- 3) Guardado del resultado. Vuelve a corregir acá, así el puntaje
--    que se guarda nunca depende de lo que diga el navegador.
CREATE OR REPLACE FUNCTION save_exam_result(
  p_exam_id   uuid,
  p_answers   int[],
  p_signature text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  v_grade := grade_exam(p_exam_id, p_answers);

  INSERT INTO exam_results (user_id, exam_id, score, passed, signature_data)
  VALUES (
    auth.uid(),
    p_exam_id,
    (v_grade->>'score')::int,
    (v_grade->>'passed')::boolean,
    p_signature
  );

  RETURN v_grade;
END;
$$;

GRANT EXECUTE ON FUNCTION get_exam_questions(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION grade_exam(uuid, int[])               TO authenticated;
GRANT EXECUTE ON FUNCTION save_exam_result(uuid, int[], text)   TO authenticated;

-- 4) Cerrar el acceso directo a la tabla de preguntas.
--    Los empleados ahora solo llegan por get_exam_questions().
DROP POLICY IF EXISTS "exam_questions_select_staff" ON exam_questions;

DROP POLICY IF EXISTS "exam_questions_select_admin" ON exam_questions;
CREATE POLICY "exam_questions_select_admin" ON exam_questions
  FOR SELECT USING (is_admin());

-- 5) Que nadie pueda cargarse un resultado a mano.
--    Los resultados entran únicamente por save_exam_result().
DROP POLICY IF EXISTS "exam_results_insert_own" ON exam_results;

-- 6) Diagnóstico.
SELECT 'policy' AS tipo, policyname AS nombre, cmd AS detalle
FROM pg_policies
WHERE tablename IN ('exam_questions', 'exam_results')
UNION ALL
SELECT 'function', proname, 'ok'
FROM pg_proc
WHERE proname IN ('get_exam_questions', 'grade_exam', 'save_exam_result')
ORDER BY tipo, nombre;
