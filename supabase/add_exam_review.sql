-- ============================================================
-- Revisión del examen rendido
--
-- Devuelve, para un intento, cada pregunta con lo que contestó la persona
-- y si estuvo bien o mal. NO devuelve correct_option a propósito: ver la
-- respuesta correcta permitiría rendir mal, anotarla y volver a rendir.
--
-- Va por SECURITY DEFINER porque exam_questions solo la lee el admin.
-- Dentro valida que el intento sea propio (o que quien llama sea admin).
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

DROP FUNCTION IF EXISTS get_exam_review(uuid);

CREATE OR REPLACE FUNCTION get_exam_review(p_result_id uuid)
RETURNS TABLE (
  question_id     uuid,
  question        text,
  question_type   text,
  options         jsonb,
  selected_option int,
  answer_text     text,
  is_correct      boolean,
  comment         text,
  orden           int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT q.id, q.question, q.question_type, q.options,
         a.selected_option, a.answer_text, a.is_correct, a.comment, q."order"
  FROM exam_answers a
  JOIN exam_questions q ON q.id = a.question_id
  JOIN exam_results  r ON r.id = a.result_id
  WHERE a.result_id = p_result_id
    AND (r.user_id = auth.uid() OR is_admin())
  ORDER BY q."order", q.id;
$$;

GRANT EXECUTE ON FUNCTION get_exam_review(uuid) TO authenticated;

SELECT proname AS funcion,
       CASE WHEN prosecdef THEN 'security definer' ELSE 'invoker' END AS modo
FROM pg_proc WHERE proname = 'get_exam_review';
