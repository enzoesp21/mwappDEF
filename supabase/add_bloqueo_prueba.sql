-- ============================================================
-- Período de prueba: solo la guía principal
--
-- Quien está en prueba (profiles.experience = 'nuevo') no puede rendir
-- ningún examen salvo el de la guía principal (Conocimientos
-- Fundamentales), hasta que un admin lo pase al equipo desde Usuarios.
--
-- El freno va acá, en las dos funciones por las que pasa un examen:
-- get_exam_questions (traer las preguntas) y submit_exam (entregar). Así no
-- se puede saltear armando los pedidos a mano desde el navegador.
--
-- Las pantallas de la app también esconden las otras guías, pero eso es la
-- parte visible: el candado de verdad es este.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

-- ¿La persona logueada puede ver y rendir esta guía?
CREATE OR REPLACE FUNCTION puede_usar_guia(p_guide_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      is_admin()
      -- Del equipo (o sin elegir todavía en la bienvenida): todo habilitado.
      OR COALESCE((SELECT experience FROM profiles WHERE id = auth.uid()), '') <> 'nuevo'
      -- En prueba: solo la guía principal.
      OR COALESCE((SELECT is_primary FROM guides WHERE id = p_guide_id), false)
    );
$$;

CREATE OR REPLACE FUNCTION puede_usar_examen(p_exam_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT puede_usar_guia(e.guide_id) FROM exams e WHERE e.id = p_exam_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION puede_usar_guia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION puede_usar_examen(uuid) TO authenticated;

-- Traer preguntas: igual que antes, más el freno. Sin respuestas correctas.
CREATE OR REPLACE FUNCTION get_exam_questions(p_exam_id uuid)
RETURNS TABLE (id uuid, question text, options jsonb, question_type text, "order" integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT q.id, q.question, q.options, q.question_type, q."order"
  FROM exam_questions q
  WHERE q.exam_id = p_exam_id
    AND auth.uid() IS NOT NULL
    AND puede_usar_examen(p_exam_id)
  ORDER BY q."order", q.id;
$$;

-- Entregar: igual que antes, más el freno al principio.
CREATE OR REPLACE FUNCTION submit_exam(p_exam_id uuid, p_answers jsonb, p_signature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result_id uuid; v_open int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  IF NOT puede_usar_examen(p_exam_id) THEN
    RAISE EXCEPTION 'Este examen se habilita cuando pases a formar parte del equipo.';
  END IF;

  IF jsonb_array_length(COALESCE(p_answers, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'No se recibieron respuestas';
  END IF;

  INSERT INTO exam_results (user_id, exam_id, score, passed, signature_data, review_status)
  VALUES (auth.uid(), p_exam_id, 0, false, p_signature, 'pending_review')
  RETURNING id INTO v_result_id;

  INSERT INTO exam_answers (result_id, question_id, selected_option, answer_text, is_correct)
  SELECT v_result_id, q.id,
    CASE WHEN q.question_type = 'multiple_choice' THEN (a->>'selected_option')::int END,
    CASE WHEN q.question_type = 'open' THEN a->>'answer_text' END,
    CASE WHEN q.question_type = 'multiple_choice'
         THEN ((a->>'selected_option')::int IS NOT DISTINCT FROM q.correct_option)
         ELSE NULL END
  FROM jsonb_array_elements(p_answers) AS a
  JOIN exam_questions q ON q.id = (a->>'question_id')::uuid
  WHERE q.exam_id = p_exam_id;

  SELECT count(*)::int INTO v_open
  FROM exam_answers
  WHERE result_id = v_result_id AND is_correct IS NULL;

  IF v_open = 0 THEN
    RETURN finalize_exam_result(v_result_id) || jsonb_build_object('result_id', v_result_id);
  END IF;
  RETURN jsonb_build_object('review_status', 'pending_review', 'pending', v_open, 'result_id', v_result_id);
END;
$$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: quién está en prueba ahora y qué ve.
-- ------------------------------------------------------------
SELECT p.full_name AS persona,
       p.experience AS situacion,
       CASE WHEN p.experience = 'nuevo'
            THEN 'solo la guía principal'
            ELSE 'todas las de su puesto' END AS que_ve
FROM profiles p
WHERE p.status = 'approved' AND p.role <> 'admin'
ORDER BY (p.experience = 'nuevo') DESC, p.full_name;
