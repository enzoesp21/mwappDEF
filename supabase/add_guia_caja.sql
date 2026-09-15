-- ============================================================
-- MW - Procedimiento de Caja
--
-- Carga la guia con el contenido del manual de procedimientos de caja,
-- su examen (25 de opcion multiple + 5 escritas, se aprueba con 90) y la
-- suma al recorrido de Mozos, Caja, Barra y Recepcion.
--
-- Las opciones estan armadas para que no se puedan deducir: la respuesta
-- correcta nunca es la mas larga y las posiciones quedan repartidas
-- parejo entre A, B, C y D (7/6/6/6).
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente: si se vuelve a
-- correr, reemplaza el contenido y las preguntas sin duplicar nada.
-- ============================================================

BEGIN;

-- 1) La guia.
INSERT INTO guides (title, description, content, puestos)
SELECT 'MW - Procedimiento de Caja',
       'Como se cobra: responsabilidad sobre las cuentas, registro de horas, POSNETS, cambios de mesa y facturas A.',
       '
*Mirador Waikiki — Mar del Plata, Buenos Aires · 2026*

---

## PRESENTACIÓN

Este manual define **cómo se cobra en Mirador Waikiki**: quién es responsable de cada cuenta, cómo se registran las horas, cómo se usan los POSNETS, qué hacer cuando un cliente cambia de mesa y cómo se manejan las facturas.

No es burocracia. Cada punto de acá existe porque un error en el cobro termina en una mesa que se va sin pagar, en una propina mal repartida o en un cliente incómodo.

> Leelo completo. Lo que acá figura como procedimiento tiene consecuencias concretas sobre tu propina y la del equipo.

---

## CAPÍTULO 1 — ENTREGA Y COBRO DE CUENTAS

**Responsables principales:** los mozos (equipo completo de camareros).

### 1.1 Procedimiento general

- Cada mozo es **plenamente responsable del cobro de sus mesas**: pedir la cuenta, esperar el pago y asegurarse de entregar correctamente el dinero.
- En pagos en efectivo, el dinero va **únicamente en el sector de efectivo de la caja**. Nunca en el espacio de propinas ni en ningún otro lugar.
- Cada cobro debe ir acompañado de **la taquilla y el ticket correspondiente**, para que la cajera tenga claridad absoluta sobre el estado de la mesa.

### 1.2 Responsabilidad compartida

Cuando un mozo se ausenta por descanso, almuerzo o por ir al baño, la responsabilidad pasa a ser **compartida entre el titular de la plaza y quien lo cubre**.

Antes de retirarse, el mozo debe:

- **Informar al compañero** sobre las novedades y los pendientes de su plaza.
- **Avisar al cliente** que otro compañero continúa la atención, para evitar confusiones.

### 1.3 Medidas disciplinarias

- Si un mozo comete **tres errores o más** en cobros, cierres, manejo de cuentas, o errores y demoras en la adición de platos, recibe una sanción del **50 % de su propina durante tres días consecutivos**, o en su defecto se le cobra el plato correspondiente.
- Si **una mesa se retira sin pagar** o hay un cobro mal realizado, el monto faltante se descuenta **de la propina general del equipo de mozos**, sin excepción.

> Esto último es importante: un error de uno lo paga todo el equipo.

---

## CAPÍTULO 2 — REGISTRO DE HORAS TRABAJADAS

**Responsables principales:** los mozos (equipo completo de camareros).

### 2.1 Procedimiento general

- Al terminar la jornada, cada mozo **registra sus horas en la planilla ubicada junto al fichero**.
- Ese registro diario es lo que le permite a la cajera cerrar la jornada, calcular los montos de reparto y armar el informe de propinas.
- Se hace **antes de retirarse del establecimiento**, sin excepción.

### 2.2 Plazo límite

Si te olvidaste de anotarte al salir, tenés tiempo **hasta media hora antes del cierre del local**.

> Ejemplo: si el local cierra a la 1:00, el plazo máximo es hasta las 12:30.

Dentro de ese plazo lo podés hacer de tres formas válidas:

1. Anotándote personalmente en la planilla.
2. Enviando un mensaje al **grupo de mozos de WhatsApp**.
3. Comunicándote con **cualquiera de los encargados o con la cajera del turno**.

Pasado ese horario, **no se aceptan registros de horas**.

### 2.3 Consecuencias

- Si no registrás tus horas dentro del plazo, **perdés automáticamente la propina de ese día**.
- Esa propina se reparte entre el resto del personal, sin excepción ni reclamo posterior.
- Si se repite, se evalúan sanciones adicionales por falta de compromiso con el procedimiento.

### 2.4 Objetivo

Fomentar la responsabilidad individual y la organización, evitando confusiones, reclamos o desconfianza entre compañeros, y garantizando un reparto justo de las propinas.

---

## CAPÍTULO 3 — USO Y CONTROL DE POSNETS

### 3.1 Procedimiento general

- Cada POSNET es una **herramienta de trabajo compartida**: debe permanecer visible, operativa y en su sector asignado durante todo el servicio.
- Está **terminantemente prohibido guardar, esconder o retener POSNETS** fuera del sector que corresponde.
- Si necesitás usar el POSNET de otro sector, **avisá al compañero o a la cajera** y devolvelo apenas termines el cobro.
- Si por error hacés un **cierre de lote**, llevá inmediatamente el ticket del cierre a caja para que quede registrado.
- Si no lo hacés, esa operación queda sin control y genera pérdidas de tiempo y confusión en los cierres de turno. Eso **perjudica directamente a los mozos**, porque retrasa los cálculos de propinas y el cambio de cajeros.

### 3.2 Sectorización

- Los POSNETS están **sectorizados según el plano del salón** e identificados con etiquetas o numeración visible.
- Cada sector es responsable del cuidado y la devolución del equipo asignado al terminar la jornada.
- En caso de pérdida, daño o falta de devolución, **el equipo completo del sector asume la responsabilidad** hasta que se aclare la situación.

### 3.3 Cantidad de equipos

- Por el tamaño del salón y el flujo de clientes, se recomienda **aumentar la cantidad de POSNETS** disponibles para agilizar los cobros.
- Ese aumento hace que el cierre de lote sea más largo para la cajera, pero evita esperas innecesarias en las mesas.

### 3.4 Objetivo

Garantizar el uso equitativo y responsable de los POSNETS, optimizando los tiempos de cobro, reduciendo errores y asegurando un servicio rápido y profesional.

---

## CAPÍTULO 4 — CAMBIOS DE MESA

### 4.1 Procedimiento general

- Todo cambio de mesa —de interior a exterior, de barra a salón o entre sectores— se hace **en el momento exacto en que el cliente se traslada**, no después.
- El responsable de la mesa debe hacer el cambio en el sistema **o avisar de inmediato a caja** para que la cuenta se traslade correctamente.
- **Ninguna mesa puede quedar "en el aire"**: sin ubicación o con consumos no registrados.

### 4.2 Responsabilidad compartida

El cambio de mesa involucra a **tres áreas**:

| Área | Qué le toca |
|---|---|
| **Camareros** | Registrar y acompañar el traslado del cliente y sus consumos. |
| **Barra** | Trasladar correctamente los productos o tragos asociados a esa mesa. |
| **Recepción** | Actualizar la ubicación en el sistema o planilla, y comunicarlo a caja y al mozo. |

Así la responsabilidad es compartida y no recae únicamente sobre los camareros. Cada sector debe garantizar que el cambio quede **informado, registrado y confirmado**.

### 4.3 Errores comunes a evitar

- No avisar a tiempo que el cliente cambió de ubicación.
- Dejar consumos en distintas mesas sin unificar.
- No mover correctamente el pedido o los productos a la nueva mesa.

> Estos errores generan confusión, duplicación de tickets y pérdidas económicas.

### 4.4 Medidas correctivas

- Si una mesa queda mal trasladada y eso genera confusión o pérdida de cobro, se considera **falla de procedimiento compartida**.
- El encargado evalúa el caso y determina la responsabilidad de cada sector (mozo, barra o recepción).
- Si se repite, se aplican advertencias formales o reducción parcial de propinas.

### 4.5 Objetivo

Promover el trabajo coordinado entre camareros, barra y recepción, asegurando trazabilidad en los cobros, orden en el servicio y una experiencia fluida para el cliente.

---

## CAPÍTULO 5 — FACTURAS "A"

### 5.1 Procedimiento general

- **Antes de cerrar cualquier cuenta**, el mozo pregunta expresamente al cliente si necesita **factura "A" o factura "B"**.
- Si pide factura "A", hay que **avisar de inmediato a la cajera o encargada** para que se emita antes del cobro.
- Una vez cobrada la mesa con factura "B", **no se puede revertir la operación** ni emitir una factura "A" sobre ese mismo consumo.

### 5.2 Recomendación práctica

- Consultale al cliente **en el mismo momento en que pide la cuenta** si va a necesitar algún tipo de factura especial. Ese paso evita confusiones, reclamos y pérdida de tiempo.
- Si el cliente paga con tarjeta, al escribir el número de mesa en el ticket **agregá la aclaración "FACTURA A"** cuando corresponda, para que la cajera lo identifique con claridad.

### 5.3 Responsabilidades

- Es responsabilidad del **mozo** verificar este punto antes de entregar la cuenta o hacer el cobro.
- Es responsabilidad de la **cajera** registrar correctamente la solicitud y emitir el comprobante fiscal adecuado.
- Ante la duda, consultá con el encargado o con administración **antes de cerrar la cuenta**.

### 5.4 Por qué importa

- Emitir la factura correcta no es solo una cuestión administrativa: es una muestra de profesionalismo y respeto hacia el cliente.
- Los errores en este punto generan **inconvenientes fiscales** y mala imagen del establecimiento.
- Recordá siempre que **el cliente no debe pagar los platos rotos por nuestros errores**.

### 5.5 Objetivo

Garantizar un cierre fiscal correcto y profesional, evitando reclamos, errores administrativos y situaciones incómodas con el cliente.

---

*MW - Procedimiento de Caja — Mar del Plata, Buenos Aires. 2026*

**¡SIGAMOS CRECIENDO JUNTOS!**
',
       ARRAY['Mozos','Caja','Barra','Recepción']::text[]
WHERE NOT EXISTS (SELECT 1 FROM guides WHERE title = 'MW - Procedimiento de Caja');

-- Si ya existia, se actualiza el contenido.
UPDATE guides
SET description = 'Como se cobra: responsabilidad sobre las cuentas, registro de horas, POSNETS, cambios de mesa y facturas A.',
    content = '
*Mirador Waikiki — Mar del Plata, Buenos Aires · 2026*

---

## PRESENTACIÓN

Este manual define **cómo se cobra en Mirador Waikiki**: quién es responsable de cada cuenta, cómo se registran las horas, cómo se usan los POSNETS, qué hacer cuando un cliente cambia de mesa y cómo se manejan las facturas.

No es burocracia. Cada punto de acá existe porque un error en el cobro termina en una mesa que se va sin pagar, en una propina mal repartida o en un cliente incómodo.

> Leelo completo. Lo que acá figura como procedimiento tiene consecuencias concretas sobre tu propina y la del equipo.

---

## CAPÍTULO 1 — ENTREGA Y COBRO DE CUENTAS

**Responsables principales:** los mozos (equipo completo de camareros).

### 1.1 Procedimiento general

- Cada mozo es **plenamente responsable del cobro de sus mesas**: pedir la cuenta, esperar el pago y asegurarse de entregar correctamente el dinero.
- En pagos en efectivo, el dinero va **únicamente en el sector de efectivo de la caja**. Nunca en el espacio de propinas ni en ningún otro lugar.
- Cada cobro debe ir acompañado de **la taquilla y el ticket correspondiente**, para que la cajera tenga claridad absoluta sobre el estado de la mesa.

### 1.2 Responsabilidad compartida

Cuando un mozo se ausenta por descanso, almuerzo o por ir al baño, la responsabilidad pasa a ser **compartida entre el titular de la plaza y quien lo cubre**.

Antes de retirarse, el mozo debe:

- **Informar al compañero** sobre las novedades y los pendientes de su plaza.
- **Avisar al cliente** que otro compañero continúa la atención, para evitar confusiones.

### 1.3 Medidas disciplinarias

- Si un mozo comete **tres errores o más** en cobros, cierres, manejo de cuentas, o errores y demoras en la adición de platos, recibe una sanción del **50 % de su propina durante tres días consecutivos**, o en su defecto se le cobra el plato correspondiente.
- Si **una mesa se retira sin pagar** o hay un cobro mal realizado, el monto faltante se descuenta **de la propina general del equipo de mozos**, sin excepción.

> Esto último es importante: un error de uno lo paga todo el equipo.

---

## CAPÍTULO 2 — REGISTRO DE HORAS TRABAJADAS

**Responsables principales:** los mozos (equipo completo de camareros).

### 2.1 Procedimiento general

- Al terminar la jornada, cada mozo **registra sus horas en la planilla ubicada junto al fichero**.
- Ese registro diario es lo que le permite a la cajera cerrar la jornada, calcular los montos de reparto y armar el informe de propinas.
- Se hace **antes de retirarse del establecimiento**, sin excepción.

### 2.2 Plazo límite

Si te olvidaste de anotarte al salir, tenés tiempo **hasta media hora antes del cierre del local**.

> Ejemplo: si el local cierra a la 1:00, el plazo máximo es hasta las 12:30.

Dentro de ese plazo lo podés hacer de tres formas válidas:

1. Anotándote personalmente en la planilla.
2. Enviando un mensaje al **grupo de mozos de WhatsApp**.
3. Comunicándote con **cualquiera de los encargados o con la cajera del turno**.

Pasado ese horario, **no se aceptan registros de horas**.

### 2.3 Consecuencias

- Si no registrás tus horas dentro del plazo, **perdés automáticamente la propina de ese día**.
- Esa propina se reparte entre el resto del personal, sin excepción ni reclamo posterior.
- Si se repite, se evalúan sanciones adicionales por falta de compromiso con el procedimiento.

### 2.4 Objetivo

Fomentar la responsabilidad individual y la organización, evitando confusiones, reclamos o desconfianza entre compañeros, y garantizando un reparto justo de las propinas.

---

## CAPÍTULO 3 — USO Y CONTROL DE POSNETS

### 3.1 Procedimiento general

- Cada POSNET es una **herramienta de trabajo compartida**: debe permanecer visible, operativa y en su sector asignado durante todo el servicio.
- Está **terminantemente prohibido guardar, esconder o retener POSNETS** fuera del sector que corresponde.
- Si necesitás usar el POSNET de otro sector, **avisá al compañero o a la cajera** y devolvelo apenas termines el cobro.
- Si por error hacés un **cierre de lote**, llevá inmediatamente el ticket del cierre a caja para que quede registrado.
- Si no lo hacés, esa operación queda sin control y genera pérdidas de tiempo y confusión en los cierres de turno. Eso **perjudica directamente a los mozos**, porque retrasa los cálculos de propinas y el cambio de cajeros.

### 3.2 Sectorización

- Los POSNETS están **sectorizados según el plano del salón** e identificados con etiquetas o numeración visible.
- Cada sector es responsable del cuidado y la devolución del equipo asignado al terminar la jornada.
- En caso de pérdida, daño o falta de devolución, **el equipo completo del sector asume la responsabilidad** hasta que se aclare la situación.

### 3.3 Cantidad de equipos

- Por el tamaño del salón y el flujo de clientes, se recomienda **aumentar la cantidad de POSNETS** disponibles para agilizar los cobros.
- Ese aumento hace que el cierre de lote sea más largo para la cajera, pero evita esperas innecesarias en las mesas.

### 3.4 Objetivo

Garantizar el uso equitativo y responsable de los POSNETS, optimizando los tiempos de cobro, reduciendo errores y asegurando un servicio rápido y profesional.

---

## CAPÍTULO 4 — CAMBIOS DE MESA

### 4.1 Procedimiento general

- Todo cambio de mesa —de interior a exterior, de barra a salón o entre sectores— se hace **en el momento exacto en que el cliente se traslada**, no después.
- El responsable de la mesa debe hacer el cambio en el sistema **o avisar de inmediato a caja** para que la cuenta se traslade correctamente.
- **Ninguna mesa puede quedar "en el aire"**: sin ubicación o con consumos no registrados.

### 4.2 Responsabilidad compartida

El cambio de mesa involucra a **tres áreas**:

| Área | Qué le toca |
|---|---|
| **Camareros** | Registrar y acompañar el traslado del cliente y sus consumos. |
| **Barra** | Trasladar correctamente los productos o tragos asociados a esa mesa. |
| **Recepción** | Actualizar la ubicación en el sistema o planilla, y comunicarlo a caja y al mozo. |

Así la responsabilidad es compartida y no recae únicamente sobre los camareros. Cada sector debe garantizar que el cambio quede **informado, registrado y confirmado**.

### 4.3 Errores comunes a evitar

- No avisar a tiempo que el cliente cambió de ubicación.
- Dejar consumos en distintas mesas sin unificar.
- No mover correctamente el pedido o los productos a la nueva mesa.

> Estos errores generan confusión, duplicación de tickets y pérdidas económicas.

### 4.4 Medidas correctivas

- Si una mesa queda mal trasladada y eso genera confusión o pérdida de cobro, se considera **falla de procedimiento compartida**.
- El encargado evalúa el caso y determina la responsabilidad de cada sector (mozo, barra o recepción).
- Si se repite, se aplican advertencias formales o reducción parcial de propinas.

### 4.5 Objetivo

Promover el trabajo coordinado entre camareros, barra y recepción, asegurando trazabilidad en los cobros, orden en el servicio y una experiencia fluida para el cliente.

---

## CAPÍTULO 5 — FACTURAS "A"

### 5.1 Procedimiento general

- **Antes de cerrar cualquier cuenta**, el mozo pregunta expresamente al cliente si necesita **factura "A" o factura "B"**.
- Si pide factura "A", hay que **avisar de inmediato a la cajera o encargada** para que se emita antes del cobro.
- Una vez cobrada la mesa con factura "B", **no se puede revertir la operación** ni emitir una factura "A" sobre ese mismo consumo.

### 5.2 Recomendación práctica

- Consultale al cliente **en el mismo momento en que pide la cuenta** si va a necesitar algún tipo de factura especial. Ese paso evita confusiones, reclamos y pérdida de tiempo.
- Si el cliente paga con tarjeta, al escribir el número de mesa en el ticket **agregá la aclaración "FACTURA A"** cuando corresponda, para que la cajera lo identifique con claridad.

### 5.3 Responsabilidades

- Es responsabilidad del **mozo** verificar este punto antes de entregar la cuenta o hacer el cobro.
- Es responsabilidad de la **cajera** registrar correctamente la solicitud y emitir el comprobante fiscal adecuado.
- Ante la duda, consultá con el encargado o con administración **antes de cerrar la cuenta**.

### 5.4 Por qué importa

- Emitir la factura correcta no es solo una cuestión administrativa: es una muestra de profesionalismo y respeto hacia el cliente.
- Los errores en este punto generan **inconvenientes fiscales** y mala imagen del establecimiento.
- Recordá siempre que **el cliente no debe pagar los platos rotos por nuestros errores**.

### 5.5 Objetivo

Garantizar un cierre fiscal correcto y profesional, evitando reclamos, errores administrativos y situaciones incómodas con el cliente.

---

*MW - Procedimiento de Caja — Mar del Plata, Buenos Aires. 2026*

**¡SIGAMOS CRECIENDO JUNTOS!**
',
    puestos = ARRAY['Mozos','Caja','Barra','Recepción']::text[]
WHERE title = 'MW - Procedimiento de Caja';

-- 2) El examen.
INSERT INTO exams (guide_id, title, passing_score)
SELECT g.id, 'Examen: Procedimiento de Caja', 90
FROM guides g
WHERE g.title = 'MW - Procedimiento de Caja'
  AND NOT EXISTS (SELECT 1 FROM exams e WHERE e.guide_id = g.id);

UPDATE exams SET title = 'Examen: Procedimiento de Caja', passing_score = 90
WHERE guide_id IN (SELECT id FROM guides WHERE title = 'MW - Procedimiento de Caja');

-- 3) Las preguntas. Se borran las anteriores de este examen y se cargan
--    de nuevo. Es seguro: es un examen nuevo, nadie lo rindio todavia.
DELETE FROM exam_questions
WHERE exam_id IN (
  SELECT e.id FROM exams e JOIN guides g ON g.id = e.guide_id
  WHERE g.title = 'MW - Procedimiento de Caja'
);

INSERT INTO exam_questions (exam_id, question, options, correct_option, question_type, answer_guide, "order")
SELECT e.id, v.question, v.options::jsonb, v.correct_option, v.question_type, v.answer_guide, v.orden
FROM exams e
JOIN guides g ON g.id = e.guide_id
CROSS JOIN (VALUES
  ('¿Quién es responsable del cobro de una mesa?', '["La cajera, que es quien recibe el dinero", "El mozo de esa mesa, de principio a fin", "El encargado de salón que esté de turno", "El runner que llevó los platos a esa mesa"]', 1, 'multiple_choice', NULL, 0),
  ('¿Dónde se coloca el dinero de un pago en efectivo?', '["En el sector de efectivo de la caja, y en ningún otro", "En el espacio de propinas, junto con el resto", "En el bolsillo del mozo hasta el cierre del turno, para entregarlo junto", "En cualquier sector libre de la caja del salón"]', 0, 'multiple_choice', NULL, 1),
  ('¿Qué tiene que acompañar a cada cobro?', '["La taquilla y el ticket correspondiente", "Solo el ticket del sistema, nada más", "El número de mesa anotado a mano en la taquilla", "La comanda original de la cocina"]', 0, 'multiple_choice', NULL, 2),
  ('Cuando un mozo se va al descanso, ¿de quién es la responsabilidad de sus mesas?', '["Únicamente del mozo titular, aunque no esté presente", "Únicamente de quien lo cubre mientras dura la ausencia del titular", "Compartida entre el titular de la plaza y quien lo cubre", "Del encargado de turno, que supervisa esa plaza"]', 2, 'multiple_choice', NULL, 3),
  ('Antes de retirarse al descanso, ¿qué tiene que hacer el mozo?', '["Cerrar todas las cuentas que tenga abiertas", "Informar al compañero y avisar al cliente", "Dejar la taquilla de cada mesa sobre la caja", "Pedirle permiso a la cajera del turno"]', 1, 'multiple_choice', NULL, 4),
  ('¿Qué sanción corresponde a tres errores o más en cobros y cuentas?', '["La pérdida total de la propina de esa jornada", "Una advertencia verbal del encargado, que queda registrada por escrito", "50 % de la propina durante tres días, o se cobra el plato", "Un día de suspensión sin goce de sueldo"]', 2, 'multiple_choice', NULL, 5),
  ('Si una mesa se retira sin pagar, ¿de dónde sale el monto faltante?', '["De la propina general del equipo de mozos", "Del sueldo del mozo responsable de esa mesa", "De un fondo que el restaurante tiene para eso", "De la propina de la cajera que estaba de turno"]', 0, 'multiple_choice', NULL, 6),
  ('¿Dónde se registran las horas trabajadas?', '["En el cuaderno del encargado de salón", "En el grupo de WhatsApp de los mozos", "En el sistema, con el usuario de cada uno", "En la planilla ubicada junto al fichero"]', 3, 'multiple_choice', NULL, 7),
  ('¿Cuándo hay que registrar las horas?', '["A la mañana siguiente, antes de entrar", "Antes de retirarse del establecimiento", "El último día de cada quincena trabajada", "Al empezar el turno, junto con la fichada"]', 1, 'multiple_choice', NULL, 8),
  ('Si un mozo se olvidó de anotar sus horas, ¿hasta cuándo tiene tiempo?', '["Hasta las 24 horas de terminada la jornada", "Hasta el final del turno siguiente que trabaje", "Hasta el cierre exacto del local, ni un minuto más", "Hasta media hora antes del cierre del local"]', 3, 'multiple_choice', NULL, 9),
  ('Si el local cierra a la 1:00, ¿hasta qué hora se puede registrar?', '["12:00", "1:00", "1:30", "12:30"]', 3, 'multiple_choice', NULL, 10),
  ('¿Cuáles son las tres formas válidas de registrar las horas?', '["La planilla, el sistema o un mensaje al encargado", "La planilla, el grupo de WhatsApp, o un encargado o la cajera", "El grupo de WhatsApp, el sistema o la cajera que esté de turno ese día", "La planilla, la cajera o el libro de novedades"]', 1, 'multiple_choice', NULL, 11),
  ('¿Qué pasa si un mozo no registra sus horas dentro del plazo?', '["Se le descuentan las horas del sueldo del mes", "Pierde automáticamente la propina de ese día", "Se le registran igual, pero con una advertencia", "Debe presentarse ante administración al día siguiente"]', 1, 'multiple_choice', NULL, 12),
  ('La propina no contabilizada por falta de registro, ¿qué destino tiene?', '["Se acumula para el reparto de fin de temporada", "Queda para el restaurante, que la retiene", "Se le paga al mozo en la quincena siguiente", "Se reparte entre el resto del personal"]', 3, 'multiple_choice', NULL, 13),
  ('¿Cómo debe estar un POSNET durante el servicio?', '["Apagado entre cobro y cobro, para cuidarlo", "Guardado en caja, y se pide cuando hace falta", "En la mano del mozo que tenga más mesas", "Visible, operativo y en su sector asignado"]', 3, 'multiple_choice', NULL, 14),
  ('¿Se puede guardar o retener un POSNET fuera de su sector?', '["No, está terminantemente prohibido", "Sí, si el sector propio no lo está usando", "Sí, siempre que se devuelva antes del cierre", "Solo en los momentos de mayor movimiento"]', 0, 'multiple_choice', NULL, 15),
  ('¿Qué hay que hacer para usar el POSNET de otro sector?', '["Avisar al compañero o a la cajera y devolverlo al terminar", "Pedirle autorización al encargado de salón antes de sacarlo del sector", "Usarlo sin más, porque son equipos compartidos", "Anotarlo en la planilla que está junto al fichero"]', 0, 'multiple_choice', NULL, 16),
  ('Si por error se hace un cierre de lote, ¿qué corresponde?', '["Llevar el ticket del cierre a caja de inmediato", "Avisarle al encargado de salón cuando termine el turno", "No hacer nada: la cajera lo detecta sola", "Anularlo desde el mismo POSNET en el momento en que se detecta"]', 0, 'multiple_choice', NULL, 17),
  ('Si se pierde o se daña un POSNET, ¿quién responde?', '["La cajera, que es la responsable de los equipos", "El mozo que lo usó por última vez", "El equipo completo del sector asignado", "El encargado que estaba a cargo del turno"]', 2, 'multiple_choice', NULL, 18),
  ('¿En qué momento se hace el cambio de mesa?', '["Al cerrar la cuenta, unificando los consumos", "En el momento exacto en que el cliente se traslada", "Cuando la cajera lo solicita para el cierre", "Al final del turno, junto con el resto de los ajustes"]', 1, 'multiple_choice', NULL, 19),
  ('¿Qué áreas intervienen en un cambio de mesa?', '["Camareros, cocina y recepción", "Camareros, caja y encargados", "Recepción, caja y barra", "Camareros, barra y recepción"]', 3, 'multiple_choice', NULL, 20),
  ('En un cambio de mesa, ¿qué le corresponde a la barra?', '["Actualizar la ubicación en el sistema", "Avisarle a la cajera que la mesa se movió", "Trasladar los productos o tragos de esa mesa", "Rehacer los tragos que hayan quedado servidos"]', 2, 'multiple_choice', NULL, 21),
  ('¿Cuándo hay que preguntarle al cliente por la factura "A"?', '["Antes de cerrar la cuenta", "Después de cobrar, si él lo menciona", "Al tomarle el pedido, junto con la comanda", "Cuando ya se emitió la factura \"B\""]', 0, 'multiple_choice', NULL, 22),
  ('Una mesa ya se cobró con factura "B" y el cliente pide la "A". ¿Qué se hace?', '["Se emite la \"A\" y se descarta la \"B\" en el cierre", "Se anula la \"B\" en el sistema y se emite la \"A\" por el mismo monto", "No se puede revertir: no se emite una \"A\" sobre ese consumo", "Lo resuelve administración al día siguiente"]', 2, 'multiple_choice', NULL, 23),
  ('Si el cliente paga con tarjeta y necesita factura "A", ¿qué se escribe en el ticket?', '["El CUIT del cliente anotado junto al número de mesa", "Solamente el número de mesa, como siempre", "El número de mesa y la aclaración \"FACTURA A\"", "El nombre del mozo y el total de la cuenta"]', 2, 'multiple_choice', NULL, 24),
  ('Explicá qué pasa si una mesa se retira sin pagar y por qué termina afectando a todo el equipo.', '[]', NULL, 'open', 'El monto faltante se descuenta de la propina general del equipo de mozos, sin excepción. Debería entender que el error de una persona lo termina pagando el grupo entero, y que por eso el control del cobro es responsabilidad de cada uno.', 25),
  ('Te vas al descanso. Contá paso a paso qué hacés con tu plaza y tus mesas antes de irte.', '[]', NULL, 'open', 'Informar al compañero que lo cubre sobre las novedades y los pendientes de la plaza, y avisarle al cliente que otro compañero sigue con la atención. Debería mencionar que la responsabilidad pasa a ser compartida entre el titular y quien cubre.', 26),
  ('Te olvidaste de anotar tus horas al salir. ¿Hasta cuándo podés hacerlo, de qué formas, y qué pasa si se te pasa el plazo?', '[]', NULL, 'open', 'Hasta media hora antes del cierre del local. Tres formas válidas: anotarse en la planilla junto al fichero, mandar un mensaje al grupo de mozos de WhatsApp, o avisarle a un encargado o a la cajera del turno. Pasado ese horario se pierde la propina de ese día, que se reparte entre el resto del personal.', 27),
  ('Un cliente se cambia de mesa en medio de la comida. Contá qué le toca hacer a cada sector.', '[]', NULL, 'open', 'Camareros: registrar y acompañar el traslado del cliente y sus consumos. Barra: trasladar los productos o tragos asociados a esa mesa. Recepción: actualizar la ubicación en el sistema o planilla y comunicarlo a caja y al mozo. Debería mencionar que se hace en el momento en que el cliente se mueve y que ninguna mesa puede quedar sin ubicación.', 28),
  ('Un cliente pide la cuenta. ¿Qué le preguntás antes de cerrarla y por qué no se puede arreglar después?', '[]', NULL, 'open', 'Hay que preguntarle si necesita factura A o B antes de cerrar la cuenta. Si pide A, se avisa a la cajera o encargada para emitirla antes del cobro. Una vez cobrada con factura B no se puede revertir la operación ni emitir una A sobre ese consumo, por eso el momento de preguntar es cuando pide la cuenta.', 29)
) AS v(question, options, correct_option, question_type, answer_guide, orden)
WHERE g.title = 'MW - Procedimiento de Caja';

-- 4) Sumarla al recorrido de los puestos que la necesitan, al final.
INSERT INTO guide_paths (puesto, guide_id, orden, etiqueta)
SELECT p.puesto,
       g.id,
       coalesce((SELECT max(orden) FROM guide_paths x WHERE x.puesto = p.puesto), 0) + 1,
       'Guía ' || (coalesce((SELECT count(*) FROM guide_paths x
                             WHERE x.puesto = p.puesto AND x.etiqueta NOT LIKE '%bis%'), 0) + 1)::text
FROM (VALUES ('Mozos'),('Caja'),('Barra'),('Recepción')) AS p(puesto)
CROSS JOIN guides g
WHERE g.title = 'MW - Procedimiento de Caja'
ON CONFLICT (puesto, guide_id) DO NOTHING;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT g.title AS guia,
       length(g.content) AS caracteres,
       e.title AS examen,
       e.passing_score AS aprueba_con,
       count(*) FILTER (WHERE q.question_type = 'multiple_choice') AS opcion_multiple,
       count(*) FILTER (WHERE q.question_type = 'open') AS escritas
FROM guides g
JOIN exams e ON e.guide_id = g.id
LEFT JOIN exam_questions q ON q.exam_id = e.id
WHERE g.title = 'MW - Procedimiento de Caja'
GROUP BY g.title, g.content, e.title, e.passing_score;

-- Reparto de la correcta y control de que no sea la mas larga.
SELECT count(*) FILTER (WHERE q.correct_option = 0) AS a,
       count(*) FILTER (WHERE q.correct_option = 1) AS b,
       count(*) FILTER (WHERE q.correct_option = 2) AS c,
       count(*) FILTER (WHERE q.correct_option = 3) AS d,
       count(*) FILTER (
         WHERE length(q.options ->> q.correct_option) >
               (SELECT MAX(length(o)) FROM jsonb_array_elements_text(q.options) o
                WHERE o <> (q.options ->> q.correct_option))
       ) AS correcta_mas_larga
FROM exam_questions q
JOIN exams e ON e.id = q.exam_id
JOIN guides g ON g.id = e.guide_id
WHERE g.title = 'MW - Procedimiento de Caja' AND q.question_type = 'multiple_choice';

-- En que lugar del recorrido quedo en cada puesto.
SELECT gp.puesto, gp.etiqueta, gp.orden
FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
WHERE g.title = 'MW - Procedimiento de Caja'
ORDER BY gp.puesto;
