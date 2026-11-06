-- ============================================================
-- Charla de Seguridad e Higiene (ART) para todo el personal
--
-- Enzo (06/11): la ART dio una charla de seguridad e higiene para TODO el
-- personal. Al entrar a la app, cada uno se anota a la charla y responde un
-- examen corto. Las preguntas son sobre:
--   - las clases de fuego A, B y C;
--   - para dónde es el matafuego K (la cocina) y de qué color es (gris);
--   - qué hace falta para que haya fuego (algo que se pueda prender, algo que
--     lo prenda y oxígeno);
--   - qué hacer con un charco de agua en el salón (resolverlo);
--   - si un alargue puede quedar instalado (no: es una instalación temporal).
--
-- - guides.para_todos: la guía es para todo el personal, también para quien
--   está en período de prueba (puede_usar_guia la deja pasar).
-- - capacitacion_asistencias: quién se anotó a la charla. Cada uno se anota
--   solo; los encargados ven a todos.
-- - La guía con el resumen de la charla y su examen: 10 preguntas de opción
--   múltiple, se aprueba con 90. La correcta nunca es la más larga y las
--   posiciones van repartidas parejo (A 3, B 3, C 2, D 2). Como todos, el
--   examen termina con la firma de cada uno.
-- - Va al final del recorrido de los 11 puestos.
--
-- Nunca borra preguntas ya cargadas: eso borraría las respuestas de quien ya
-- rindió. Se puede correr dos veces.
-- ============================================================

-- Freno: necesita el bloqueo del período de prueba y los recorridos.
DO $$
BEGIN
  IF to_regprocedure('public.puede_usar_guia(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Falta el bloqueo del período de prueba: corré primero supabase/add_bloqueo_prueba.sql.';
  END IF;
  IF to_regclass('public.guide_paths') IS NULL THEN
    RAISE EXCEPTION 'Faltan los recorridos por puesto (guide_paths): corré primero supabase/add_guide_paths.sql.';
  END IF;
END $$;

BEGIN;

-- 1) Guías para todo el personal.
ALTER TABLE guides ADD COLUMN IF NOT EXISTS para_todos boolean NOT NULL DEFAULT false;

-- 2) Quien está a prueba puede usar la guía principal y las que son para todos.
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
      -- En prueba: la guía principal y las que son para todo el personal.
      OR COALESCE((SELECT is_primary OR para_todos FROM guides WHERE id = p_guide_id), false)
    );
$$;

-- 3) Quién se anotó a cada charla.
CREATE TABLE IF NOT EXISTS capacitacion_asistencias (
  guide_id   uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guide_id, user_id)
);
ALTER TABLE capacitacion_asistencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS capacitacion_asistencias_ver ON capacitacion_asistencias;
CREATE POLICY capacitacion_asistencias_ver ON capacitacion_asistencias
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS capacitacion_asistencias_anotarse ON capacitacion_asistencias;
CREATE POLICY capacitacion_asistencias_anotarse ON capacitacion_asistencias
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM guides g WHERE g.id = guide_id AND g.para_todos)
  );
-- Un encargado puede sacar a alguien que se anotó por error.
DROP POLICY IF EXISTS capacitacion_asistencias_sacar ON capacitacion_asistencias;
CREATE POLICY capacitacion_asistencias_sacar ON capacitacion_asistencias
  FOR DELETE TO authenticated
  USING (is_admin());

-- 4) La guía.
INSERT INTO guides (title, description, content, puestos, para_todos)
SELECT 'Charla de Seguridad e Higiene (ART)',
       'Lo que vimos en la charla de la ART: las clases de fuego, el matafuego K, qué hace falta para que haya fuego, los charcos y los alargues. Anotate y respondé el examen.',
       '
*Mirador Waikiki — Charla de la ART para todo el personal*

---

## PARA QUÉ ES ESTO

La ART nos dio una charla de **seguridad e higiene** a todo el personal. Acá está lo más importante para repasar.

1. **Anotate** arriba: así queda registrado que estuviste en la charla.
2. Después **respondé el examen** del final. Son 10 preguntas y se aprueba con 90.

---

## LAS CLASES DE FUEGO

No todos los fuegos son iguales: según **qué se está quemando**, se apagan distinto.

| Clase | Qué se quema | Ejemplos |
|---|---|---|
| **A** | Sólidos comunes | Madera, papel, cartón, tela |
| **B** | Líquidos inflamables y gases | Nafta, alcohol, solventes, gas |
| **C** | Equipos eléctricos con corriente | Enchufes, zapatillas, cables, tableros |
| **K** | Aceites y grasas de cocina | Freidoras, sartenes, planchas |

> Si es eléctrico (clase C), nunca agua: el agua conduce la corriente.

---

## EL MATAFUEGO K

- Es el de la **cocina**: está hecho para fuegos de **aceites y grasas** (clase K), como una freidora o una sartén.
- Es de color **gris**.
- **Nunca le tires agua a un aceite prendido fuego**: salta y el fuego se agranda.

---

## QUÉ HACE FALTA PARA QUE HAYA FUEGO

Tienen que estar **las tres cosas juntas**:

1. **Algo que se pueda prender**: papel, madera, aceite, gas.
2. **Algo que lo prenda**: una llama, una chispa, mucho calor.
3. **Oxígeno**: el aire.

> Si falta una de las tres, no hay fuego. Apagar un fuego es justamente sacarle una.

---

## EN EL DÍA A DÍA

### Un charco de agua en el salón

No se pasa de largo ni se espera a que lo vea otro: **se resuelve en el momento**. Se seca enseguida, porque alguien se puede resbalar y lastimar, sea un cliente o un compañero.

### Los alargues

Un alargue es una **instalación temporal**: sirve para un rato y se saca. **No puede quedar instalado todo el tiempo.** Si en algún lugar hace falta un enchufe fijo, avisale a un encargado para que se haga como corresponde.
',
       ARRAY['todos'],
       true
WHERE NOT EXISTS (SELECT 1 FROM guides WHERE title = 'Charla de Seguridad e Higiene (ART)');

UPDATE guides SET para_todos = true WHERE title = 'Charla de Seguridad e Higiene (ART)' AND NOT para_todos;

-- 5) El examen.
INSERT INTO exams (guide_id, title, passing_score)
SELECT g.id, 'Examen: Charla de Seguridad e Higiene', 90
FROM guides g
WHERE g.title = 'Charla de Seguridad e Higiene (ART)'
  AND NOT EXISTS (SELECT 1 FROM exams e WHERE e.guide_id = g.id);

-- 6) Las preguntas, solo si el examen todavía no tiene ninguna.
INSERT INTO exam_questions (exam_id, question, options, correct_option, question_type, answer_guide, "order")
SELECT e.id, v.question, v.options::jsonb, v.correct_option, 'multiple_choice', NULL, v.orden
FROM exams e
JOIN guides g ON g.id = e.guide_id
CROSS JOIN (VALUES
  ('¿Qué es un fuego clase A?', '["El de sólidos como madera, papel o tela", "El de líquidos inflamables como nafta o alcohol", "El de equipos eléctricos que están enchufados", "El de aceites y grasas de cocina en la freidora"]', 0, 0),
  ('¿Qué es un fuego clase B?', '["El de sólidos como madera, cartón o papel", "El de líquidos inflamables y gases", "El de equipos eléctricos con corriente", "El de metales que se prenden con el calor"]', 1, 1),
  ('¿Qué es un fuego clase C?', '["El de la grasa acumulada en la campana", "El de líquidos como nafta, alcohol o solventes", "El de sólidos que dejan brasa al apagarse", "El de equipos eléctricos con corriente"]', 3, 2),
  ('Se prende fuego una zapatilla eléctrica enchufada. ¿Qué clase de fuego es?', '["Clase A", "Clase B", "Clase C", "Clase K"]', 2, 3),
  ('¿Para dónde se usa el matafuego K?', '["Para la cocina: aceites y grasas", "Para el tablero eléctrico del salón", "Para cualquier fuego, en cualquier lugar", "Para los papeles y cartones del depósito"]', 0, 4),
  ('¿De qué color es el matafuego K?', '["Rojo", "Gris", "Verde", "Amarillo"]', 1, 5),
  ('En la cocina se prende fuego una sartén con aceite. ¿Con qué matafuego se apaga?', '["Con agua, que es lo más rápido", "Con cualquiera que esté más cerca", "Con el del tablero eléctrico", "Con el K, el gris"]', 3, 6),
  ('¿Qué hace falta para que se genere fuego?', '["Una chispa y gas, nada más", "Algo que se pueda prender y mucho viento", "Algo que se pueda prender, algo que lo prenda y oxígeno", "Solamente calor, aunque no haya nada que se pueda quemar"]', 2, 7),
  ('Ves un charco de agua en el salón. ¿Qué hacés?', '["Lo esquivo y sigo, no es mi sector", "Lo resuelvo yo en el momento, secándolo", "Espero a que lo limpie alguien de limpieza", "Le aviso al encargado al final del turno"]', 1, 8),
  ('¿Está bien tener un alargue instalado todo el tiempo?', '["No: el alargue es una instalación temporal", "Sí, si está bien enchufado y no molesta", "Sí, mientras no se use para la cafetera", "Sí, siempre que sea un alargue nuevo y de marca"]', 0, 9)
) AS v(question, options, correct_option, orden)
WHERE g.title = 'Charla de Seguridad e Higiene (ART)'
  AND NOT EXISTS (SELECT 1 FROM exam_questions q WHERE q.exam_id = e.id);

-- 7) Al final del recorrido de los 11 puestos.
INSERT INTO guide_paths (puesto, guide_id, orden, etiqueta)
SELECT p.puesto,
       g.id,
       coalesce((SELECT max(orden) FROM guide_paths x WHERE x.puesto = p.puesto), 0) + 1,
       'Guía ' || (coalesce((SELECT count(*) FROM guide_paths x
                             WHERE x.puesto = p.puesto AND x.etiqueta NOT LIKE '%bis%'), 0) + 1)::text
FROM (VALUES ('Calienta Platos'),('Cocina'),('Barra'),('Bacha'),('Caja'),('Limpieza'),('Ensaladas'),('Pastelería'),('Mozos'),('Commis'),('Recepción')) AS p(puesto)
CROSS JOIN guides g
WHERE g.title = 'Charla de Seguridad e Higiene (ART)'
ON CONFLICT (puesto, guide_id) DO NOTHING;

COMMIT;

-- ------------------------------------------------------------
-- Verificación: una fila por cosa, todas "lista".
-- ------------------------------------------------------------
SELECT 'guía para todo el personal' AS que,
       CASE WHEN (SELECT para_todos FROM guides WHERE title = 'Charla de Seguridad e Higiene (ART)')
            THEN 'lista' ELSE 'FALTA' END AS resultado
UNION ALL
SELECT 'examen (aprueba con)',
       coalesce((SELECT 'lista: ' || e.passing_score FROM exams e JOIN guides g ON g.id = e.guide_id
                 WHERE g.title = 'Charla de Seguridad e Higiene (ART)'), 'FALTA')
UNION ALL
SELECT 'preguntas (A/B/C/D, correctas más largas)',
       (SELECT count(*) || ' (' ||
               count(*) FILTER (WHERE q.correct_option = 0) || '/' ||
               count(*) FILTER (WHERE q.correct_option = 1) || '/' ||
               count(*) FILTER (WHERE q.correct_option = 2) || '/' ||
               count(*) FILTER (WHERE q.correct_option = 3) || ', ' ||
               count(*) FILTER (
                 WHERE length(q.options ->> q.correct_option) >
                       (SELECT max(length(o)) FROM jsonb_array_elements_text(q.options) o
                        WHERE o <> (q.options ->> q.correct_option))
               ) || ')'
        FROM exam_questions q JOIN exams e ON e.id = q.exam_id JOIN guides g ON g.id = e.guide_id
        WHERE g.title = 'Charla de Seguridad e Higiene (ART)')
UNION ALL
SELECT 'en el recorrido de los puestos',
       (SELECT count(*)::text FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
        WHERE g.title = 'Charla de Seguridad e Higiene (ART)')
UNION ALL
SELECT 'la pueden rendir los que están a prueba',
       CASE WHEN pg_get_functiondef('puede_usar_guia(uuid)'::regprocedure) LIKE '%para_todos%'
            THEN 'lista' ELSE 'FALTA' END
UNION ALL
SELECT 'anotarse a la charla',
       CASE WHEN to_regclass('public.capacitacion_asistencias') IS NOT NULL
                 AND (SELECT count(*) FROM pg_policies WHERE tablename = 'capacitacion_asistencias') = 3
            THEN 'lista' ELSE 'FALTA' END;
