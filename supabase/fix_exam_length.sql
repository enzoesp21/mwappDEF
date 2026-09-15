-- ============================================================
-- Exámenes: máximo 30 preguntas de opción múltiple y 5 escritas en todos
--
-- 1. Recorta a 30 los exámenes con más, tomando una muestra pareja a lo
--    largo del examen para no perder la cobertura de ningún tema.
-- 2. Agrega 5 preguntas escritas a los exámenes que no tenían ninguna.
-- 3. Renumera el orden: primero las de opción múltiple, después las escritas.
--
-- Correr entero en Supabase -> SQL Editor.
-- ============================================================

-- Freno de seguridad: borrar preguntas arrastra las respuestas guardadas.
-- Si hay un examen sin corregir, su nota se recalcularía mal al cerrarlo.
DO $$
DECLARE v_pend int;
BEGIN
  SELECT count(*) INTO v_pend FROM exam_results WHERE review_status = 'pending_review';
  IF v_pend > 0 THEN
    RAISE EXCEPTION 'Hay % examen(es) sin corregir. Corregilos en Correcciones y volve a correr esto.', v_pend;
  END IF;
END $$;

-- 1) Recorte a 30, con muestra pareja a lo largo del examen.
WITH grandes AS (
  SELECT exam_id
  FROM exam_questions
  WHERE question_type = 'multiple_choice'
  GROUP BY exam_id
  HAVING count(*) > 30
),
ranked AS (
  SELECT q.id, q.exam_id, q."order",
         ntile(30) OVER (PARTITION BY q.exam_id ORDER BY q."order", q.id) AS bucket
  FROM exam_questions q
  JOIN grandes g ON g.exam_id = q.exam_id
  WHERE q.question_type = 'multiple_choice'
),
conservar AS (
  SELECT DISTINCT ON (exam_id, bucket) id
  FROM ranked
  ORDER BY exam_id, bucket, "order", id
)
DELETE FROM exam_questions q
WHERE q.question_type = 'multiple_choice'
  AND q.exam_id IN (SELECT exam_id FROM grandes)
  AND q.id NOT IN (SELECT id FROM conservar);

-- 2) Preguntas escritas para los exámenes que no tenían.
INSERT INTO exam_questions (exam_id, question, options, correct_option, question_type, answer_guide, "order")
SELECT v.exam_id::uuid, v.question, v.options, v.correct_option, v.question_type, v.answer_guide, v."order"
FROM (VALUES
  ('01e1503e-9b43-4561-a0a2-e499928dc2f6', 'Explicá con tus palabras la diferencia entre una torta y una tarta.', '[]'::jsonb, NULL, 'open', 'Torta: base de bizcochuelo en capas, con relleno entre capas, textura esponjosa y húmeda. Tarta: base de masa sablée firme y crocante, con el relleno directo sobre la masa.', 900),
  ('01e1503e-9b43-4561-a0a2-e499928dc2f6', 'Un cliente pregunta cuál de los cheesecakes es distinto a los demás y por qué. ¿Qué le contestás?', '[]'::jsonb, NULL, 'open', 'El New York es el único cocido al horno; los otros dos (dulce de leche y Oreo) son fríos, con gelatina. El New York tiene textura firme y cremosa y se sirve con coulis de frutos rojos.', 900),
  ('01e1503e-9b43-4561-a0a2-e499928dc2f6', '¿Qué diferencia hay entre chocolate cobertura y baño de repostería, y por qué importa saberlo?', '[]'::jsonb, NULL, 'open', 'El cobertura tiene manteca de cacao real, necesita templado y queda brillante y crocante. El baño usa grasas vegetales, no necesita templado, es más estable pero menos brillante. Importa porque define el resultado y el trabajo que lleva.', 900),
  ('01e1503e-9b43-4561-a0a2-e499928dc2f6', 'Viene un cliente que dice que no le gusta el chocolate muy intenso. ¿Qué le sugerís y cómo se lo describís?', '[]'::jsonb, NULL, 'open', 'Opciones válidas: Red Velvet (suave, no muy dulce), Blondie (chocolate blanco, suave y caramelizado) o alguna tarta. Debería describirla con sus palabras, no solo nombrarla.', 900),
  ('01e1503e-9b43-4561-a0a2-e499928dc2f6', 'Nombrá los ingredientes de la masa sablée y explicá qué textura buscamos con ella.', '[]'::jsonb, NULL, 'open', 'Harina, huevos, manteca, azúcar, ralladura de limón y esencia de vainilla. Textura arenosa y crocante, que se deshace suavemente en la boca.', 900),
  ('f568e69c-f24e-4813-9409-7984eb5b795b', '¿Por qué se dice que el calientaplatos es la última barrera de calidad? Explicá qué implica eso en tu trabajo.', '[]'::jsonb, NULL, 'open', 'Es el último que ve el plato antes de que llegue al cliente: si algo está mal y pasa, ya no hay vuelta atrás. Implica revisar cocción, presentación, que esté completo y que coincida con la comanda.', 900),
  ('f568e69c-f24e-4813-9409-7984eb5b795b', 'Sube un plato del monta y notás que le falta la guarnición que el cliente pidió cambiada. Contá paso a paso qué hacés.', '[]'::jsonb, NULL, 'open', 'Primero consultar con cocina si se puede resolver sin bajar el plato. Solo si es necesario, hacerlo rehacer. Debería mencionar que cuanto antes se detecta, menos impacta en el tiempo.', 900),
  ('f568e69c-f24e-4813-9409-7984eb5b795b', 'Nombrá las tres cosas que verificás al iniciar el turno y explicá por qué cada una importa.', '[]'::jsonb, NULL, 'open', 'Orden (limpiar de arriba hacia abajo: microondas, calientaplatos, montacargas, tacho, muebles, piso), reposición (platos, cubiertos de trinchar, servilletas, limón, brotes, salsas, trapos) y verificación de que los equipos funcionen y los productos estén aptos.', 900),
  ('f568e69c-f24e-4813-9409-7984eb5b795b', '¿Por qué nunca hay que mezclar platos de comandas distintas?', '[]'::jsonb, NULL, 'open', 'Porque se pierde la trazabilidad de qué va a cada mesa: el runner puede bajar un plato equivocado, o salir una mesa incompleta. Debería notar que él es el responsable de lo que baja.', 900),
  ('f568e69c-f24e-4813-9409-7984eb5b795b', 'Es un día complicado y la cocina viene atrasada. ¿Cómo manejás la comunicación con runners y cocina?', '[]'::jsonb, NULL, 'open', 'Debería mencionar avisar con claridad por handy qué está listo, asegurarse de que el runner sepa qué lleva, y sostener un clima tranquilo para no contagiar el estrés al resto.', 900),
  ('44a2fa24-6178-4ecd-b0fd-2ea9eba85155', 'Contá el proceso completo de lavado de hojas verdes, desde el primer paso.', '[]'::jsonb, NULL, 'open', 'Bacha con agua fría y vinagre, sumergir y dejar reposar 5 minutos, enjuagar con agua fría, centrifugar en tandas sin sobrecargar, y guardar en recipientes con papel absorbente en la cámara.', 900),
  ('44a2fa24-6178-4ecd-b0fd-2ea9eba85155', '¿Por qué la ensalada Caesar se arma recién al momento del despacho?', '[]'::jsonb, NULL, 'open', 'Para que los crutons no se ablanden. Debería entender que armarla antes arruina la textura, que es lo que la distingue.', 900),
  ('44a2fa24-6178-4ecd-b0fd-2ea9eba85155', 'Explicá cómo se hace la crema chantilly y qué pasa si te pasás batiendo.', '[]'::jsonb, NULL, 'open', 'Crema Milkaut batida con azúcar impalpable hasta punto firme. Si se sobrebate se corta. Se guarda tapada en la cámara.', 900),
  ('44a2fa24-6178-4ecd-b0fd-2ea9eba85155', 'Describí el armado de la Ensalada Mirador, en orden.', '[]'::jsonb, NULL, 'open', 'Base de lechuga y rúcula, cherry alrededor, queso crema al centro, langostinos por encima y crutons arriba. Se sirve con el aderezo aparte.', 900),
  ('44a2fa24-6178-4ecd-b0fd-2ea9eba85155', '¿Dónde se guardan los cuchillos y por qué no se dejan en la bacha?', '[]'::jsonb, NULL, 'open', 'En su lugar asignado: frapera o soporte magnético. Nunca en la bacha con agua ni en cajones sin protección, por seguridad y para no arruinar el filo.', 900),
  ('7590991c-1f39-4718-b654-a972f947a4aa', 'Explicá con tus palabras cuál es la diferencia entre el rol del runner y el del commis.', '[]'::jsonb, NULL, 'open', 'El runner es el nexo entre cocina y salón: lleva los platos, controla que salgan correctos y repone lo que falte en la mesa. El commis sostiene el orden del salón: fajina, arma mesas, repone las estaciones y limpia. Se tocan en el apoyo al mozo pero el foco es distinto.', 900),
  ('7590991c-1f39-4718-b654-a972f947a4aa', 'Un cliente te reclama molesto que su plato está tardando mucho. Contá paso a paso cómo lo manejarías.', '[]'::jsonb, NULL, 'open', 'Empatía y solución, sin justificarse ni culpar a cocina. Suma que mencione mantener la calma, chequear con cocina o el encargado, y mantener informado al cliente.', 900),
  ('7590991c-1f39-4718-b654-a972f947a4aa', 'Nombrá al menos cuatro tareas del cierre del salón y explicá por qué un mal cierre perjudica al turno siguiente.', '[]'::jsonb, NULL, 'open', 'Del cierre: limpieza de mesas, barrido, vajilla fajinada, descansos desarmados, puertas y ventanas, balcón acomodado con sombrillas cerradas, sin residuos. Lo importante es que entienda que el turno siguiente arranca atrasado si el cierre quedó mal.', 900),
  ('7590991c-1f39-4718-b654-a972f947a4aa', 'En el criterio "Esperar órdenes", ¿cuál es la diferencia entre hacerlo Bien y hacerlo Muy bien? ¿Por qué importa esa diferencia?', '[]'::jsonb, NULL, 'open', 'Bien es consultar si puede ayudar en algo más. Muy bien es anticiparse, mantener todo ordenado y resolver sin que se lo pidan. Debería notar que lo mínimo esperable no se premia y que la iniciativa es lo que abre oportunidades.', 900),
  ('7590991c-1f39-4718-b654-a972f947a4aa', 'Se te rompe una copa en pleno servicio, con clientes cerca. Contá la secuencia de lo que hacés.', '[]'::jsonb, NULL, 'open', 'Asumir el error, levantar rápido los restos y avisar a quien corresponda. Muy bien sería además pedir disculpas si molestó y reponer la copa sin que se lo pidan. No minimizar ni dejar que lo limpie otro.', 900),
  ('1b7b2b89-85b1-4157-b61d-b553834747a4', 'Un cliente celíaco pregunta qué puede comer. Explicá cómo lo resolvés y nombrá al menos tres opciones de la carta.', '[]'::jsonb, NULL, 'open', 'Debe apoyarse en las etiquetas de la guía y consultar a cocina ante la duda, sin improvisar. Opciones válidas: Gambas al Ajillo, Tortilla de Papa, Burrata, Paella, todos los pescados, las salsas para pastas, y las carnes de la carta.', 900),
  ('1b7b2b89-85b1-4157-b61d-b553834747a4', 'Un cliente vegetariano pide un plato principal. ¿Qué le ofrecés y por qué?', '[]'::jsonb, NULL, 'open', 'El Risotto Vegetariano es el principal apto (además es el único apto vegano). Puede mencionar las pastas Ñoquis Soufflé y Cintas Caseras con una salsa apta. No debería ofrecer nada sin etiqueta.', 900),
  ('1b7b2b89-85b1-4157-b61d-b553834747a4', 'Explicá qué es la salsa demi-glace y en qué platos de la carta aparece.', '[]'::jsonb, NULL, 'open', 'Reducción de caldo de carne con verduras y vino, cocinada lentamente hasta quedar espesa, oscura y sabrosa. Aparece en el Lomo al Champignon, el Bife de Chorizo al Malbec, el Bife a la Pimienta, el Solomillo Agridulce y la Chernia con salsa Mar del Plata.', 900),
  ('1b7b2b89-85b1-4157-b61d-b553834747a4', 'Describí la Paella como se la contarías a un cliente que nunca la pidió.', '[]'::jsonb, NULL, 'open', 'Arroz azafranado con pollo, langostinos y mariscos, todo cocinado en su propio caldo. Plato completo, abundante e ideal para compartir. Suma que mencione que es el plato de la casa.', 900),
  ('1b7b2b89-85b1-4157-b61d-b553834747a4', '¿Qué diferencia hay entre el ojo de bife y el bife de chorizo? ¿Cómo se lo explicarías a un cliente que duda entre los dos?', '[]'::jsonb, NULL, 'open', 'Ojo de bife: del centro del bife ancho (costillar), alto marmoleo, sabor intenso y textura muy suave. Bife de chorizo: del lomo corto, más grande, con capa de grasa externa que aporta sabor, textura más firme. Debería traducirlo a una recomendación según lo que busque el cliente.', 900)
) AS v(exam_id, question, options, correct_option, question_type, answer_guide, "order")
WHERE NOT EXISTS (
  SELECT 1 FROM exam_questions q
  WHERE q.exam_id = v.exam_id::uuid AND q.question_type = 'open'
);

-- 3) Renumerar: primero opción múltiple, después las escritas.
WITH ordenadas AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY exam_id
           ORDER BY (question_type = 'open'), "order", id
         ) - 1 AS nuevo_orden
  FROM exam_questions
)
UPDATE exam_questions q
SET "order" = o.nuevo_orden
FROM ordenadas o
WHERE q.id = o.id;

-- Verificación: todos tienen que quedar con <= 30 de opción múltiple y 5 escritas.
SELECT e.title AS examen,
       count(*) FILTER (WHERE q.question_type = 'multiple_choice') AS opcion_multiple,
       count(*) FILTER (WHERE q.question_type = 'open')            AS escritas,
       count(*)                                                    AS total
FROM exams e
LEFT JOIN exam_questions q ON q.exam_id = e.id
GROUP BY e.title
ORDER BY e.title;
