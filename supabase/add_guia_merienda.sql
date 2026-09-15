-- ============================================================
-- MW - Procedimiento de Merienda
--
-- Carga la guia de consumiciones del personal: que se puede pedir, a que
-- precio, y que corresponde segun el horario de ingreso.
--
-- Su examen tiene 22 preguntas de opcion multiple y 5 escritas, y se
-- aprueba con 90. La respuesta correcta nunca es la mas larga y las
-- posiciones quedan repartidas parejo entre A, B, C y D (6/6/5/5).
--
-- Va al recorrido de los 11 puestos: las consumiciones aplican a todos.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

-- 1) La guia.
INSERT INTO guides (title, description, content, puestos)
SELECT 'MW - Procedimiento de Merienda', 'Que puede consumir el personal, en que turno y a que precio. Todo se abona en el momento.', '
*Mirador Waikiki — Documento interno · 2026*

---

## PRESENTACIÓN

Esta guía define **qué puede consumir el personal, cuándo y a qué precio**.

Las consumiciones están pensadas según el **horario de ingreso**: no todos los turnos tienen lo mismo. La idea es simple: ordenarnos para que el trabajo sea más prolijo para todos y para que los sectores sigan funcionando con normalidad.

> **Todo lo que se comande debe abonarse en el momento del pedido, sin excepciones.**

---

## LO QUE SE PUEDE PEDIR

**Solo se permite consumir lo que figura en esta lista.** No se contemplan tortas, sándwiches ni ningún otro producto fuera del menú.

### Comestibles

| Producto | Precio personal |
|---|---|
| Medialuna | $800 |
| Medialuna de jamón y queso | $1.600 |
| Alfajor negro | $2.700 |
| Alfajor blanco | $2.700 |
| 2 rodajas de budín | $3.300 |
| Vaso de ensalada de fruta | $3.500 |
| Alfajor de pistacho | $3.600 |
| Yoghurt con granola y fruta | $4.000 |
| Medio tostado de miga | $4.500 |

### Bebidas

| Producto | Precio personal |
|---|---|
| Café con leche | $1.500 |
| Latte | $1.500 |
| Cortado | $1.500 |
| Doble cortado | $1.500 |
| Café doble | $1.500 |
| Café espresso | $1.500 |
| Americano | $1.500 |
| Lágrima | $1.500 |
| Exprimido chico | $1.500 |
| Tazón de café con leche o latte | $2.500 |
| Exprimido grande | $2.500 |
| Licuado | $3.500 |

### Adicionales

| Adicional | Precio |
|---|---|
| Leche de almendras o leche de coco | +$500 |

---

## CONSUMICIONES POR TURNO

### 🌅 Ingreso 7:30 / 8:00 — Apertura

- **Desayuno incluido sin cargo:** café con leche y tostadas o similar.
- **Almuerzo incluido** en el horario de descanso.
- A partir de las **9:00 el desayuno ya no está incluido**: se abona a precio personal.
- Se pide cerrar la plaza ordenada y entregar en tiempo y forma.

### ☕ Ingreso 9:00

- **Café al ingresar permitido**, se abona a precio personal.
- **Almuerzo incluido** al mediodía.

### 🍽️ Ingreso 10:00 / 11:00 — Turno hasta aprox. 18:30 / 19:30

- **Almuerzo incluido** en el descanso.
- **Merienda:** café con algo para comer, se abona a precio personal.

### 🌇 Ingreso 16:00 — Turno tarde / cierre

- **Café al ingresar permitido**, se abona a precio personal.
- **No se contempla nada más:** sin tostados, tortas, medialunas ni comidas.

---

## RECORDATORIOS

### ☕ Café antes del cierre — de domingo a jueves

Los días que cerramos a las **21:00**, el personal puede pedir un café antes del cierre. **No se contemplan comidas.**

### 🔄 Orden en los descansos

Organicémonos para que los sectores sigan cubiertos y **no queden descubiertos** durante los momentos de consumición.

### 🥗 Sector de ensaladas

No puede seguir pasando que el sector **se llene de platos, budines y cafés mientras está trabajando**. Además queda sucio y desordenado.

### 💵 Abono en el momento

Todo lo que se comande debe abonarse **en el momento del pedido, sin excepciones**.

---

*MW - Procedimiento de Merienda — Mirador Waikiki. Documento interno 2026*

**¡SIGAMOS CRECIENDO JUNTOS!**
', ARRAY['Calienta Platos','Cocina','Barra','Bacha','Caja','Limpieza','Ensaladas','Pastelería','Mozos','Commis','Recepción']::text[]
WHERE NOT EXISTS (SELECT 1 FROM guides WHERE title = 'MW - Procedimiento de Merienda');

UPDATE guides
SET description = 'Que puede consumir el personal, en que turno y a que precio. Todo se abona en el momento.',
    content = '
*Mirador Waikiki — Documento interno · 2026*

---

## PRESENTACIÓN

Esta guía define **qué puede consumir el personal, cuándo y a qué precio**.

Las consumiciones están pensadas según el **horario de ingreso**: no todos los turnos tienen lo mismo. La idea es simple: ordenarnos para que el trabajo sea más prolijo para todos y para que los sectores sigan funcionando con normalidad.

> **Todo lo que se comande debe abonarse en el momento del pedido, sin excepciones.**

---

## LO QUE SE PUEDE PEDIR

**Solo se permite consumir lo que figura en esta lista.** No se contemplan tortas, sándwiches ni ningún otro producto fuera del menú.

### Comestibles

| Producto | Precio personal |
|---|---|
| Medialuna | $800 |
| Medialuna de jamón y queso | $1.600 |
| Alfajor negro | $2.700 |
| Alfajor blanco | $2.700 |
| 2 rodajas de budín | $3.300 |
| Vaso de ensalada de fruta | $3.500 |
| Alfajor de pistacho | $3.600 |
| Yoghurt con granola y fruta | $4.000 |
| Medio tostado de miga | $4.500 |

### Bebidas

| Producto | Precio personal |
|---|---|
| Café con leche | $1.500 |
| Latte | $1.500 |
| Cortado | $1.500 |
| Doble cortado | $1.500 |
| Café doble | $1.500 |
| Café espresso | $1.500 |
| Americano | $1.500 |
| Lágrima | $1.500 |
| Exprimido chico | $1.500 |
| Tazón de café con leche o latte | $2.500 |
| Exprimido grande | $2.500 |
| Licuado | $3.500 |

### Adicionales

| Adicional | Precio |
|---|---|
| Leche de almendras o leche de coco | +$500 |

---

## CONSUMICIONES POR TURNO

### 🌅 Ingreso 7:30 / 8:00 — Apertura

- **Desayuno incluido sin cargo:** café con leche y tostadas o similar.
- **Almuerzo incluido** en el horario de descanso.
- A partir de las **9:00 el desayuno ya no está incluido**: se abona a precio personal.
- Se pide cerrar la plaza ordenada y entregar en tiempo y forma.

### ☕ Ingreso 9:00

- **Café al ingresar permitido**, se abona a precio personal.
- **Almuerzo incluido** al mediodía.

### 🍽️ Ingreso 10:00 / 11:00 — Turno hasta aprox. 18:30 / 19:30

- **Almuerzo incluido** en el descanso.
- **Merienda:** café con algo para comer, se abona a precio personal.

### 🌇 Ingreso 16:00 — Turno tarde / cierre

- **Café al ingresar permitido**, se abona a precio personal.
- **No se contempla nada más:** sin tostados, tortas, medialunas ni comidas.

---

## RECORDATORIOS

### ☕ Café antes del cierre — de domingo a jueves

Los días que cerramos a las **21:00**, el personal puede pedir un café antes del cierre. **No se contemplan comidas.**

### 🔄 Orden en los descansos

Organicémonos para que los sectores sigan cubiertos y **no queden descubiertos** durante los momentos de consumición.

### 🥗 Sector de ensaladas

No puede seguir pasando que el sector **se llene de platos, budines y cafés mientras está trabajando**. Además queda sucio y desordenado.

### 💵 Abono en el momento

Todo lo que se comande debe abonarse **en el momento del pedido, sin excepciones**.

---

*MW - Procedimiento de Merienda — Mirador Waikiki. Documento interno 2026*

**¡SIGAMOS CRECIENDO JUNTOS!**
',
    puestos = ARRAY['Calienta Platos','Cocina','Barra','Bacha','Caja','Limpieza','Ensaladas','Pastelería','Mozos','Commis','Recepción']::text[]
WHERE title = 'MW - Procedimiento de Merienda';

-- 2) El examen.
INSERT INTO exams (guide_id, title, passing_score)
SELECT g.id, 'Examen: Procedimiento de Merienda', 90
FROM guides g
WHERE g.title = 'MW - Procedimiento de Merienda'
  AND NOT EXISTS (SELECT 1 FROM exams e WHERE e.guide_id = g.id);

UPDATE exams SET title = 'Examen: Procedimiento de Merienda', passing_score = 90
WHERE guide_id IN (SELECT id FROM guides WHERE title = 'MW - Procedimiento de Merienda');

-- 3) Las preguntas. Se recargan enteras: es un examen nuevo, nadie lo rindio.
DELETE FROM exam_questions
WHERE exam_id IN (
  SELECT e.id FROM exams e JOIN guides g ON g.id = e.guide_id WHERE g.title = 'MW - Procedimiento de Merienda'
);

INSERT INTO exam_questions (exam_id, question, options, correct_option, question_type, answer_guide, "order")
SELECT e.id, v.question, v.options::jsonb, v.correct_option, v.question_type, v.answer_guide, v.orden
FROM exams e
JOIN guides g ON g.id = e.guide_id
CROSS JOIN (VALUES
  ('¿Cuándo se abona lo que se comanda?', '["Se descuenta del sueldo a fin de mes", "Al terminar el turno, todo junto en caja", "En el momento del pedido, sin excepciones", "Se descuenta de la propina de la quincena"]', 2, 'multiple_choice', NULL, 0),
  ('¿Se puede pedir algo que no esté en la lista de consumiciones?', '["No: solo se permite lo que figura en la lista", "Sí, pagando el precio de carta del producto", "Sí, si lo autoriza el encargado de salón de ese turno", "Sí, siempre que no sea un plato principal"]', 0, 'multiple_choice', NULL, 1),
  ('Entrando 7:30 u 8:00, ¿el desayuno se paga?', '["Se paga solo la comida, el café no", "Sí, a precio personal como todos", "No, está incluido sin cargo", "Se paga la mitad del precio personal"]', 2, 'multiple_choice', NULL, 2),
  ('¿Qué incluye el desayuno sin cargo del turno de apertura?', '["Café con leche y dos medialunas", "Café con leche y tostadas o similar", "Café solo, sin nada para comer", "Café con leche, tostadas y exprimido"]', 1, 'multiple_choice', NULL, 3),
  ('¿A partir de qué hora el desayuno deja de estar incluido?', '["A partir de las 11:00", "A partir de las 8:30", "A partir de las 10:00", "A partir de las 9:00"]', 3, 'multiple_choice', NULL, 4),
  ('El que ingresa a las 9:00, ¿puede tomar un café al entrar?', '["No, recién en el horario de descanso", "Sí, y va sin cargo por ser el ingreso", "Sí, y lo abona a precio personal", "Solo si ya terminó de armar su plaza"]', 2, 'multiple_choice', NULL, 5),
  ('El que ingresa a las 9:00, ¿tiene almuerzo?', '["Sí, incluido al mediodía", "Sí, pero lo abona a precio personal", "No, solo tiene derecho al café de ingreso", "Solo los días de mucho movimiento en el salón"]', 0, 'multiple_choice', NULL, 6),
  ('¿Qué consumiciones tiene el turno que ingresa 10:00 u 11:00?', '["Almuerzo incluido y merienda a precio personal", "Almuerzo y merienda, las dos sin ningún cargo", "Solo el almuerzo incluido en el descanso", "Almuerzo a precio personal y merienda incluida"]', 0, 'multiple_choice', NULL, 7),
  ('El que ingresa a las 16:00, ¿qué puede pedir?', '["Un café y también algo para comer, a precio personal", "Un café al ingresar, abonado a precio personal", "Merienda completa en el horario de descanso", "Lo mismo que el resto de los turnos del día"]', 1, 'multiple_choice', NULL, 8),
  ('El turno de las 16:00, ¿puede pedir un tostado o una medialuna?', '["Sí, pero solo antes de las 18:00", "Sí, abonándolo a precio personal", "No, no se contempla nada más que el café", "Sí, si lo autoriza el encargado de turno"]', 2, 'multiple_choice', NULL, 9),
  ('¿Qué días se puede pedir un café antes del cierre?', '["Solo los feriados y los fines de semana largos", "Todos los días de la semana, sin ninguna distinción", "De viernes a domingo, que son los días largos", "De domingo a jueves, cuando se cierra a las 21:00"]', 3, 'multiple_choice', NULL, 10),
  ('El café antes del cierre, ¿viene con algo para comer?', '["Sí, con una medialuna incluida", "No, no se contemplan comidas", "Sí, con lo que haya quedado del día", "Solo si sobró algo de la merienda"]', 1, 'multiple_choice', NULL, 11),
  ('¿Qué problema se señala con el sector de ensaladas?', '["Que se llena de platos, budines y cafés mientras trabaja", "Que el personal se demora de más en el horario de descanso", "Que se piden productos que no están en la lista", "Que no se abona lo consumido en el momento"]', 0, 'multiple_choice', NULL, 12),
  ('¿Por qué hay que organizarse con los descansos?', '["Para que la barra pueda cerrar el lote a tiempo", "Para que la cocina no tenga que hacer horas extra", "Para que los sectores no queden descubiertos", "Para que el encargado pueda controlar los consumos"]', 2, 'multiple_choice', NULL, 13),
  ('¿Cuánto sale una medialuna?', '["$2.700", "$1.600", "$1.500", "$800"]', 3, 'multiple_choice', NULL, 14),
  ('¿Cuánto sale la medialuna de jamón y queso?', '["$800", "$1.600", "$2.700", "$1.500"]', 1, 'multiple_choice', NULL, 15),
  ('¿Cuánto sale un café con leche?', '["$1.500", "$2.500", "$1.600", "$800"]', 0, 'multiple_choice', NULL, 16),
  ('¿Cuánto sale el tazón de café con leche o latte?', '["$2.500", "$1.500", "$3.500", "$3.300"]', 0, 'multiple_choice', NULL, 17),
  ('¿Cuánto sale un licuado?', '["$4.000", "$2.500", "$3.300", "$3.500"]', 3, 'multiple_choice', NULL, 18),
  ('¿Cuánto se paga por cambiar a leche de almendras o de coco?', '["Un adicional de $800", "Un adicional de $500", "Nada, va sin cargo", "Un adicional de $1.000"]', 1, 'multiple_choice', NULL, 19),
  ('¿Cuánto sale el alfajor de pistacho?', '["$3.300", "$2.700", "$3.500", "$3.600"]', 3, 'multiple_choice', NULL, 20),
  ('¿Cuánto sale el medio tostado de miga?', '["$4.000", "$4.500", "$3.500", "$3.300"]', 1, 'multiple_choice', NULL, 21),
  ('Entrás a las 7:30. Contá qué tenés incluido durante el turno y qué tenés que pagar.', '[]', NULL, 'open', 'Desayuno incluido sin cargo (café con leche y tostadas o similar) y almuerzo incluido en el horario de descanso. A partir de las 9:00 el desayuno ya no está incluido y se abona a precio personal. Suma que mencione cerrar la plaza ordenada y entregar en tiempo y forma.', 22),
  ('Entrás a las 16:00 y tenés hambre. ¿Qué podés pedir y qué no?', '[]', NULL, 'open', 'Solo un café al ingresar, abonado a precio personal. No se contempla nada más: sin tostados, tortas, medialunas ni comidas. Debería entender que el turno tarde tiene la consumición más acotada.', 23),
  ('Un compañero quiere pedir una porción de torta para la merienda. ¿Qué le decís y por qué?', '[]', NULL, 'open', 'Que no se puede: solo se permite consumir lo que figura en la lista de consumiciones, y las tortas y sándwiches están expresamente excluidos. Debería mencionar que la lista existe para ordenar los pedidos y que no depende de la buena voluntad de quien atiende.', 24),
  ('Explicá qué problema hay en el sector de ensaladas durante las consumiciones y cómo se evita.', '[]', NULL, 'open', 'El sector se llena de platos, budines y cafés mientras está trabajando, y queda sucio y desordenado. Se evita organizando los descansos para no amontonarse ahí y consumiendo donde corresponde, sin dejar el sector cubierto de cosas.', 25),
  ('¿Cuándo se abona lo que se pide y por qué existe esa regla?', '[]', NULL, 'open', 'En el momento del pedido, sin excepciones. Debería entender que si se deja para después se pierde el control de lo consumido, se le complica el cierre a la cajera y terminan apareciendo diferencias que nadie puede explicar.', 26)
) AS v(question, options, correct_option, question_type, answer_guide, orden)
WHERE g.title = 'MW - Procedimiento de Merienda';

-- 4) Al recorrido de todos los puestos, al final.
INSERT INTO guide_paths (puesto, guide_id, orden, etiqueta)
SELECT p.puesto,
       g.id,
       coalesce((SELECT max(orden) FROM guide_paths x WHERE x.puesto = p.puesto), 0) + 1,
       'Guía ' || (coalesce((SELECT count(*) FROM guide_paths x
                             WHERE x.puesto = p.puesto AND x.etiqueta NOT LIKE '%bis%'), 0) + 1)::text
FROM (VALUES ('Calienta Platos'),('Cocina'),('Barra'),('Bacha'),('Caja'),('Limpieza'),('Ensaladas'),('Pastelería'),('Mozos'),('Commis'),('Recepción')) AS p(puesto)
CROSS JOIN guides g
WHERE g.title = 'MW - Procedimiento de Merienda'
ON CONFLICT (puesto, guide_id) DO NOTHING;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT g.title AS guia, length(g.content) AS caracteres,
       e.title AS examen, e.passing_score AS aprueba_con,
       count(*) FILTER (WHERE q.question_type = 'multiple_choice') AS opcion_multiple,
       count(*) FILTER (WHERE q.question_type = 'open') AS escritas
FROM guides g JOIN exams e ON e.guide_id = g.id
LEFT JOIN exam_questions q ON q.exam_id = e.id
WHERE g.title = 'MW - Procedimiento de Merienda'
GROUP BY g.title, g.content, e.title, e.passing_score;

SELECT count(*) FILTER (WHERE q.correct_option = 0) AS a,
       count(*) FILTER (WHERE q.correct_option = 1) AS b,
       count(*) FILTER (WHERE q.correct_option = 2) AS c,
       count(*) FILTER (WHERE q.correct_option = 3) AS d,
       count(*) FILTER (
         WHERE length(q.options ->> q.correct_option) >
               (SELECT MAX(length(o)) FROM jsonb_array_elements_text(q.options) o
                WHERE o <> (q.options ->> q.correct_option))
       ) AS correcta_mas_larga
FROM exam_questions q JOIN exams e ON e.id = q.exam_id JOIN guides g ON g.id = e.guide_id
WHERE g.title = 'MW - Procedimiento de Merienda' AND q.question_type = 'multiple_choice';

SELECT gp.puesto, gp.etiqueta, gp.orden
FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
WHERE g.title = 'MW - Procedimiento de Merienda' ORDER BY gp.puesto;
