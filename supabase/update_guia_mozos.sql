-- ============================================================
-- Guía para Mozos, Runners y Comisses 2025
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- ============================================================
DO $$
DECLARE
  v_guide_id uuid;
  v_exam_id  uuid;
BEGIN

  SELECT id INTO v_guide_id FROM guides WHERE title = 'Guía para Mozos, Runners y Comisses' LIMIT 1;

  IF v_guide_id IS NULL THEN
    INSERT INTO guides (title, description, content, puestos)
    VALUES (
      'Guía para Mozos, Runners y Comisses',
      'Roles, responsabilidades, protocolos, criterios de evaluación y propinas para el equipo de salón.',
      '',
      ARRAY['todos']
    )
    RETURNING id INTO v_guide_id;
  END IF;

  UPDATE guides SET
    description = 'Roles, responsabilidades, protocolos, criterios de evaluación y propinas para el equipo de salón.',
    puestos = ARRAY['todos'],
    content = $content$# Guía para Mozos, Runners y Comisses
**Mirador Waikiki — Mar del Plata, Buenos Aires — 2025**

---

## Presentación

Bienvenidos a la Guía para Mozos, Runners y Comisses. En Mirador Waikiki entendemos que un gran servicio no depende de una sola persona, sino de un equipo bien organizado, comprometido y alineado. Por eso creamos esta guía con el objetivo de definir claramente los roles y responsabilidades de cada integrante del salón.

Nuestro objetivo es que todos crezcan, aprendan y puedan alcanzar el 100% del rendimiento y las propinas. Para eso necesitamos compromiso, comunicación y ganas de hacer las cosas cada vez mejor.

---

## 1. Introducción

### 1.1 ¿Para qué sirve esta guía?

Esta guía fue pensada para que cualquier persona que trabaje como mozo, runner o comiss tenga claras sus responsabilidades, rutinas y formas de trabajar. Ya tengas experiencia o estés recién empezando, este material te va a ayudar a entender:

- Qué se espera de vos
- Cómo nos organizamos en el salón
- Cuáles son las tareas compartidas y cuáles son específicas según el rol
- Qué cosas valoramos como equipo y cómo hacemos para que el servicio salga bien todos los días

Buscamos que el servicio sea ordenado, profesional y con buena energía, sin depender de una sola persona. Acá todo funciona si hay comunicación, ritmo, compromiso y respeto por lo que hace el otro.

---

### 1.2 Nuestro Estilo de Servicio

En Waikiki no queremos un servicio robótico ni frío, pero tampoco desprolijo ni desatento. Nuestro objetivo es que los clientes vivan una experiencia relajada, pero bien atendida.

1. **Buena onda siempre** — Sonrisa, amabilidad, energía. Si tenés un mal día, lo dejás en la puerta.
2. **Agilidad sin apuro** — Llegar rápido a la mesa, estar presente, pero sin correr ni transmitir apuro.
3. **Atención a los detalles** — El cliente no tiene que andar pidiendo cosas básicas.
4. **Comunicación clara y directa** — Tanto con los clientes como entre nosotros. Si hay un error o algo raro, se habla al toque. Sin vueltas.
5. **Orden y limpieza constante**

> ⚠️ **Regla de oro:** Si algo está fuera de lugar, acomodalo. Si no sabés algo, preguntá. Si ves algo mal, avisá.

---

### 1.3 Roles dentro del salón

| Rol | Responsables |
|-----|-------------|
| **Encargados de Salón** | Facundo Núñez y Enzo Espiño |
| **Encargado de Barra** | Bruno Molina |
| **Encargada de Recepción** | Paz Rave |
| Caja, Comisses, Calientaplatos, Bacha y Limpieza | Según asignación |

---

## 2. Tareas Compartidas

### 2.1 Presentación Personal

- Uniforme limpio y completo.
- Uñas cortas, pelo atado si es largo, sin perfume fuerte.
- Calzado cerrado, cómodo y en buen estado.
- No se permite trabajar con gorras personales, auriculares, piercings excesivos ni ropa fuera del uniforme.

### 2.2 Mantenimiento del Puesto

- Cada uno se encarga de mantener su puesto ordenado.
- No se dejan cosas sucias "para después".
- Si comés o tomás algo en el descanso, dejás limpio.
- Las estaciones deben estar presentables todo el turno.

---

### 2.3 Apertura (08:00 hs a 10:00 hs)

Durante las primeras horas del día, todos deben colaborar para que el lugar esté impecable y listo para recibir clientes:

- Limpieza de mesas con Blem.
- Barrido general del salón.
- Chequeo y reposición de servilleteros (que estén completos).
- Armado del balcón, si el clima lo permite.
- Retirar los servilleteros y azucareros que hayan quedado afuera la noche anterior.
- Armado de los sectores de descanso del personal.
- Rallado de queso (si corresponde al día).
- Cortado de limones.
- Chequeo de aceites de oliva y aderezos (que estén limpios, llenos y en condiciones).
- Acomodar almohadones y sillas en caso de estar desordenadas.
- Armado de salón Ala Wai en caso de que se utilice.

---

### 2.4 Cierre (19:00 hs a 20:00 hs)

Al finalizar el día, el salón tiene que quedar impecable y todo guardado en su lugar:

- Cierre de sombrillas.
- Entrar y rellenar servilleteros del exterior.
- Desarmado de los sillones de afuera (entrar almohadones y colchones).
- Entrada de azucareros.
- Rellenado de servilleteros internos (servilletas, azúcar y edulcorante).
- Desarmado de queseras.
- Relleno y guardado de aderezos, aceite de oliva, saleros y acetos.
- Barrido profundo del salón y del exterior.
- Limpieza de cartas.
- Limpieza de bandejas.
- Relleno de pimenteros y palillos.
- Fajinado final (orden general de pasillos, estaciones y zonas comunes).

---

### 2.5 Respeto

- Se habla con respeto, sin gritos ni sarcasmo.
- Las diferencias se resuelven con los encargados, no en público.
- Si alguien necesita ayuda, se da una mano.
- Si hay un error, se avisa sin echar culpas.

### 2.6 Uso del Celular

- Prohibido durante el servicio, salvo autorización del encargado.
- Solo se permite en descanso o zona autorizada.
- En caso de urgencia personal, se avisa.

---

## 3. Protocolos

### 3.1 Problemas entre Compañeros

- Todo problema se habla fuera del salón y con respeto.
- Si no se puede resolver entre ustedes, se le comunica al encargado.
- No se grita ni se discute frente al cliente ni al resto del equipo.
- Generar mal ambiente o faltar el respeto es motivo de sanción y/o apercibimiento.

### 3.2 Sugerencias y Mejoras

- Todo lo que sume es bienvenido. Si ves una forma de mejorar algo, comentala.
- Las sugerencias se pueden hacer al encargado o por el grupo, con respeto.
- Todos tenemos margen para crecer. La buena actitud vale más que la experiencia.

---

### 3.3 Requisitos para ser Mozo o Runner

Para poder trabajar como mozo o runner y obtener los beneficios en cuanto a la propina (100%), es **obligatorio** haber leído y comprendido las siguientes guías:

1. Guía para Nuevos y No tan Nuevos
2. Guía de Platos e Ingredientes
3. Guía de Tortas y Tartas
4. Guía de Mozos y Runners (esta guía)

Una vez leídas, debés avisar al encargado para que te evalúen y se considere aprobada.

---

## 4. Mozos

### 4.1 ¿Qué hace un mozo?

El mozo es quien atiende directamente al cliente. Es la cara visible del lugar. Su trabajo no es solo llevar platos: es acompañar la experiencia de la persona que vino a almorzar, merendar o cenar, con amabilidad, orden, conocimiento y ritmo.

---

### 4.2 Durante Desayuno o Merienda

- Armar y mantener la plaza limpia y con los descansos completos.
- Servir cafés, jugos, medialunas, tostadas, tortas, etc. retirados en la barra.
- Recibir a los clientes con buena onda.
- Asesorar si preguntan qué se puede pedir.
- Cobrar en mesa o derivar a caja según el caso.
- Despejar mesas apenas se retiran los clientes.
- Reposición constante de servilletas, azúcar, bandejas, etc.
- Fajinado general de tu zona.

---

### 4.3 Durante Almuerzo o Cena (12:00 a 16:00 y 21:00 a 00:00)

**Inicio de servicio:**
- Armado de plaza completa y en orden.
- Control del sistema: computadora encendida, conexión estable, stock actualizado.
- Rejilla, destapador, lapiceras y herramientas de trabajo listas.

**Durante el servicio:**
- Presentación de la mesa (servilletas, agua, carta, recomendaciones si aplica).
- Toma de pedidos (clara, sin errores, y cargada al momento en la tablet).
- Buena comunicación con cocina y barra para evitar demoras.
- Servicio profesional (bebidas, flambeado de panqueques, trinchado, etc.)
- Supervisión de tiempos: saber cuándo retirar platos y cuándo sugerir el postre o café.
- Cobro prolijo, entrega de ticket, atención hasta el último minuto.
- Comunicación constante con el runner (platos listos, cambios, devoluciones).

**Fin de servicio:**
- Limpieza y orden de la plaza (barrido, relleno de azucareros y edulcorantes, relleno de servilleteros).
- Desarmado de descansos o reposición para el siguiente turno si corresponde.
- Feedback al encargado sobre lo que pasó, cómo salió la comida, predisposición de los clientes.

---

### 4.4 Qué se Espera de un Buen Mozo

- Que sepas lo que vendés. Si te preguntan por un plato, lo explicás con seguridad.
- Que cargues el pedido bien y sin errores.
- Que mantengas tu plaza limpia, ordenada y en control.
- Que tu mesa no tenga que pedirte nada: vos ya lo viste antes.
- Que trates al cliente con buena onda, incluso si está difícil.
- Que sepas trinchar, flambear, servir bebidas con las técnicas correspondientes.
- Que te preocupes por la experiencia del cliente.

> ✅ Un buen mozo no solo atiende bien: hace que la gente quiera volver.

---

## 5. Runners

### 5.1 ¿Qué hace un runner?

El runner es quien se encarga de llevar los platos y bebidas a la mesa, retirarlos cuando terminan, y asegurarse de que a los clientes no les falte nada. Es el puente entre cocina, barra y salón. Siempre en movimiento y siempre atento.

> Es un puesto que solo existe durante el almuerzo o cena. En desayuno y merienda los runners y los mozos se unifican.

---

### 5.2 Durante el Servicio

- Recibir los platos del calientaplatos, revisar que estén completos y bien presentados.
- Llevar los platos correctos a la mesa correcta, siempre con seguridad y prolijidad.
- Al servir, preguntar siempre si falta algo (sal, pimienta, etc.)
- Retirar platos vacíos apenas el cliente termina, preguntar siempre cómo estuvo todo.
- Ver si en alguna mesa falta pan, hielo, servilletas, etc. y reponer sin que lo pidan.
- Mantener el área de pasaplatos ordenada y limpia.
- Dar aviso inmediato si algo está mal en el plato (falta guarnición, viene frío, no es lo que pidió el cliente).
- Acompañar a los mozos en lo que necesiten.

### 5.3 Cómo Moverse

- Siempre con ritmo, pero sin correr.
- Siempre con buena cara, incluso si estás con cinco platos encima.
- Nunca entrar a una mesa sin saber qué llevás y a dónde.
- Si tenés dudas, preguntás antes de salir del pasaplatos.

### 5.4 Qué se Espera de un Buen Runner

- Que estés en control del salón, aunque no tomes pedidos.
- Que seas rápido, pero preciso.
- Que te adelantes a lo que va a faltar, sin esperar que te lo pidan.
- Que ayudes al mozo a que su mesa esté impecable.
- Que seas prolijo para llevar, retirar y presentar los platos.

---

## 6. Habilidades Técnicas y Actitud

### Presentación y Actitud

- Buena presencia: uniforme limpio, higiene, postura profesional.
- Puntualidad y asistencia constante.
- Actitud de servicio: predisposición, empatía y buena energía con clientes y compañeros.
- Comunicación verbal y no verbal adecuada (trato cordial, sin modismos fuera de lugar).
- Aceptar correcciones con humildad y disposición a mejorar.

### Habilidades Técnicas

- Manejo correcto de la bandeja (cafetería, bebidas y platos).
- Conocimiento completo de la carta (comidas, bebidas y promociones).
- Saber explicar platos sin TACC, opciones veggie y vegetarianas.
- Conocer los tiempos estimados de cada preparación.
- Capacidad de sugerir platos y bebidas con enfoque en la venta.
- Apertura y servicio correcto de vinos.
- Toma de comandas precisa y manejo del sistema sin errores.
- Buen armado de bandejas y presentación prolija en desayunos y meriendas.

### Comportamiento en Equipo

- Colaborar en cualquier tarea asignada, sin excusas.
- Adaptación a los ritmos del salón (rendir en días de alto flujo, no colgarse en días tranquilos).
- Disposición a cambiar de rol o repetir plaza cuando sea necesario.
- Participación activa en reuniones y capacitaciones.

### Actitud de Crecimiento

- Demostrar interés genuino por aprender y mejorar.
- Escuchar devoluciones sin ponerse a la defensiva.
- Buscar oportunidades para aportar al equipo y al servicio.

---

## 7. Criterios de Evaluación

En Mirador Waikiki medimos el desempeño diario no solo en base al cumplimiento de tareas, sino también a la actitud, el compromiso y el trato con compañeros y clientes.

- 🟥 **Muy mal** → Comportamientos que afectan gravemente el funcionamiento del equipo o la experiencia del cliente. Pueden derivar en apercibimiento, suspensión o no ser tenido en cuenta para futuras oportunidades.
- 🟧 **Mal** → Actitudes que no suman, generan desgaste o muestran poca responsabilidad. Se corrigen hablando, pero si se repiten, bajan la imagen que el equipo y los encargados tienen de vos.
- 🟨 **Bien** → Lo mínimo esperable. Se valora, pero no se premia lo que simplemente es una obligación básica.
- 🟩 **Muy bien** → Actitudes que suman, elevan al equipo y generan confianza. Estas personas son consideradas para liderar, crecer y mantenerse siempre en el grupo.

---

### Estación de Trabajo
- 🟥 Muy mal: Terminar el turno y dejar todo sucio para que otro limpie.
- 🟧 Mal: Limpiar por encima sin verificar bien.
- 🟨 Bien: Limpiar su puesto correctamente al retirarse.
- 🟩 Muy bien: Limpiar su puesto y, si hay tiempo, ayudar a dejar todo en orden general.

### Menús
- 🟥 Muy mal: No mencionarlos nunca, actuar de manera indiferente.
- 🟧 Mal: Mencionarlos pero sin ganas ni información clara.
- 🟨 Bien: Ofrecer los menús como una opción más, sabiendo lo que incluyen.
- 🟩 Muy bien: Sugerir los menús destacando sus beneficios (precio, rapidez, sabor) y venderlos con entusiasmo y conocimiento.

### Iniciativa
- 🟥 Muy mal: Estar parado sin hacer nada cuando hay cosas para hacer.
- 🟧 Mal: Cumplir solo las tareas básicas sin iniciativa.
- 🟨 Bien: Consultar si pueden ayudar en algo más.
- 🟩 Muy bien: Anticiparse a las necesidades, mantener todo ordenado, y resolver sin esperar órdenes.

### Comandas
- 🟥 Muy mal: Anotar mal seguido y responsabilizar a cocina o barra.
- 🟧 Mal: Olvidarse cosas por no verificar bien.
- 🟨 Bien: Anotar con claridad y repasar antes de enviar.
- 🟩 Muy bien: Confirmar con el cliente, detallar bien y asegurar que salga perfecto.

### Atención al Cliente
- 🟥 Muy mal: Mostrar desgano, mala cara o ignorar al cliente.
- 🟧 Mal: Atender por cumplir, sin conexión.
- 🟨 Bien: Ser correcto, amable y responder dudas.
- 🟩 Muy bien: Mostrar entusiasmo, recomendar con criterio, anticiparse a lo que el cliente puede necesitar y generar una experiencia memorable.

### Desayuno / Merienda
- 🟥 Muy mal: No prestar atención a la plaza por estar desayunando o merendando. Se abandona la atención al cliente.
- 🟧 Mal: Extenderse demasiado en el desayuno o charlar más de lo necesario.
- 🟨 Bien: Merienda breve, sin perder totalmente la atención. Se mantiene el respeto por el ritmo de trabajo.
- 🟩 Muy bien: Tomar el café o la merienda de manera ágil, sin descuidar la plaza. Si hay otro mozo en la misma plaza, se turnan correctamente.

### Conducta y Vocabulario
- 🟥 Muy mal: Carcajadas, gritos, lenguaje vulgar o desubicado. Afecta directamente la imagen del lugar.
- 🟧 Mal: Risas fuertes o comentarios que se escuchan desde el sector cliente.
- 🟨 Bien: Buena conducta, con algún tono relajado pero respetuoso.
- 🟩 Muy bien: Actitud profesional. Voz baja, respeto por el entorno y por los compañeros. Se transmite seriedad y calidad.

### Plazas y Mozos a la Vista
- 🟥 Muy mal: La plaza queda completamente desatendida. El mozo está en otro sector sin motivo. Falta grave.
- 🟧 Mal: No hay nadie visible durante varios minutos. El cliente empieza a buscar atención.
- 🟨 Bien: Aunque no esté siempre visible, el mozo responde con rapidez y atención.
- 🟩 Muy bien: Siempre hay un mozo a la vista, atento y disponible. El cliente se siente cuidado desde el primer momento.

### Conocimiento de la Carta
- 🟥 Muy mal: Decir "no sé" o inventar lo que incluye un plato.
- 🟧 Mal: Dudar o no transmitir seguridad al explicarlo.
- 🟨 Bien: Conocer los básicos del menú y consultar en caso de duda.
- 🟩 Muy bien: Saber cada ítem, recomendar con fundamento y transmitir confianza.

### Reposición
- 🟥 Muy mal: Ver que falta algo y seguir trabajando igual, dejando que otro lo note.
- 🟧 Mal: Avisar pero no reponer.
- 🟨 Bien: Reponer o avisar en el momento.
- 🟩 Muy bien: Reponer, organizar y dejar mejor de lo que estaba. Anticiparse a lo que pueda faltar.

### Uso del Handy
- 🟥 Muy mal: Apagar el handy o dejarlo sin volumen sin avisar. No responder llamados importantes. Hacer chistes fuera de lugar o interrumpir el canal.
- 🟧 Mal: Tardar demasiado en responder. Usar el canal para comentarios personales o irrelevantes.
- 🟨 Bien: Responder rápido y de forma clara cuando te llaman. Usar el handy solo cuando es necesario.
- 🟩 Muy bien: Respuesta inmediata, comunicación clara y eficiente. Uso responsable del canal.

---

## 8. Propinas

### Funcionamiento y Criterios

**¿Dónde se deja la propina?**
Toda la propina recolectada durante el turno debe dejarse en el sector de caja, sin excepciones. No está permitido guardar o repartir propina por cuenta propia.

**¿Cómo se reparte la propina?**
La propina se reparte diariamente entre el equipo y se enviará un informe al grupo de WhatsApp "MOZOS - MW" detallando el reparto. El monto se encontrará depositado en las gabetas del sector de caja. Para retirarla, deberán solicitarla al cajero o al encargado de turno.

**¿Cómo funciona para los nuevos?**
- Personal nuevo: cobra el **50%** de la propina correspondiente a sus horas trabajadas.
- Una vez demostrado compromiso y rendimiento, sumado a las capacitaciones, podrá pasar al **100%**.

**¿Qué puede afectar el porcentaje?**
Quienes hayan alcanzado el 100% pero tengan reiterados comportamientos evaluados como MAL o MUY MAL, sin responder a advertencias, podrán:
- Perder prioridad para los días de mayor volumen de trabajo.
- Tener una reducción temporal de propina al 75% o 50%, según corresponda y a criterio de los encargados.
- Cambio de puesto.

---

## 9. Dinámica Diaria — Preguntas Frecuentes

**¿Cuál es mi plaza o sector asignado?**
La plaza será asignada diariamente por el encargado de turno. Las asignaciones se anotan en el cuaderno de plazas, que debe ser consultado al comenzar el turno.

**¿Cómo se hace el armado de mesa?**
- Almuerzo: individual, plato, cuchillo, tenedor, copa.
- Cena: igual que almuerzo, pero se agrega un copón de vino y servilleta símil tela.

**¿Qué hago si un cliente me pide algo fuera de mi plaza?**
Ante cualquier pedido, se debe resolver directamente. Si una mesa pide sal, servilleta o cualquier otro elemento, no se delega: se lo llevamos nosotros, aunque no sea nuestra plaza.

**¿Quién toma las comandas?**
Cualquier miembro del equipo puede tomar una comanda si el cliente se dirige a él. Si sos runner y una mesa necesita que tomes el pedido, lo tomás y se lo pasás al mozo de esa plaza.

**¿Quién repone las servilletas, vasos o cubiertos?**
Es responsabilidad del mozo asignado a la plaza. Debe tener la plaza "barrida" y lista para trabajar: servilleteros llenos, azucareros, edulcorantes, saleros, aceiteros, aceto, queseras, platos, copas y descanso. Si el mozo está muy ocupado, debe pedir ayuda al resto del equipo.

**¿Quién limpia las mesas?**
La limpieza está a cargo del mozo asignado a la plaza. Sin embargo, cualquier persona que vea una mesa sucia debe colaborar si está disponible. Se penalizará a quienes eludan responsabilidades esperando que otros limpien por ellos.

**¿Qué hago si hay una queja o accidente con un cliente?**
- Si es una queja leve, se intenta resolver con amabilidad.
- Si se puede brindar una atención o solución, se consulta antes con el encargado de turno.
- Si el cliente se predispone mal o la situación escala, se llama de inmediato al encargado para que intervenga.

**¿Qué hago si no me acuerdo qué lleva un plato?**
No se pregunta al aire ni se improvisa. Se debe recurrir a la Guía de Platos e Ingredientes 2025, provista por los encargados. Es obligación del personal conocer los platos o estudiar el material disponible.$content$
  WHERE id = v_guide_id;

  SELECT id INTO v_exam_id FROM exams WHERE guide_id = v_guide_id LIMIT 1;

  IF v_exam_id IS NULL THEN
    INSERT INTO exams (guide_id, title, passing_score)
    VALUES (v_guide_id, 'Examen: Mozos, Runners y Comisses', 70)
    RETURNING id INTO v_exam_id;
  ELSE
    UPDATE exams SET title = 'Examen: Mozos, Runners y Comisses', passing_score = 70 WHERE id = v_exam_id;
  END IF;

  DELETE FROM exam_questions WHERE exam_id = v_exam_id;

  INSERT INTO exam_questions (exam_id, question, options, correct_option, "order") VALUES

  -- INTRODUCCIÓN Y ESTILO DE SERVICIO
  (v_exam_id, '¿Cuál es el objetivo principal del estilo de servicio en Waikiki?',
   '["Servicio rápido a toda costa","Que los clientes vivan una experiencia relajada pero bien atendida","Servicio formal y serio en todo momento","Servicio económico y eficiente"]'::jsonb, 1, 1),

  (v_exam_id, '¿Qué dice la "Regla de oro" de Waikiki?',
   '["Siempre sonreír al cliente","Si algo está fuera de lugar, acomodalo. Si no sabés algo, preguntá. Si ves algo mal, avisá.","El cliente siempre tiene razón","Nunca dejar una mesa sin atender más de 2 minutos"]'::jsonb, 1, 2),

  (v_exam_id, '¿Quiénes son los encargados de salón en Mirador Waikiki?',
   '["Bruno Molina y Paz Rave","Facundo Núñez y Enzo Espiño","El jefe de cocina y el sommelier","El encargado de barra y recepción"]'::jsonb, 1, 3),

  (v_exam_id, '¿Quién es el encargado de barra?',
   '["Facundo Núñez","Enzo Espiño","Bruno Molina","Paz Rave"]'::jsonb, 2, 4),

  -- TAREAS COMPARTIDAS
  (v_exam_id, '¿A qué hora comienza la apertura del salón?',
   '["06:00 hs","08:00 hs","10:00 hs","11:00 hs"]'::jsonb, 1, 5),

  (v_exam_id, '¿A qué hora comienza el cierre del salón?',
   '["17:00 hs","18:00 hs","19:00 hs","21:00 hs"]'::jsonb, 2, 6),

  (v_exam_id, '¿Qué producto se usa para limpiar las mesas durante la apertura?',
   '["Alcohol","Agua y jabón","Blem","Lavandina"]'::jsonb, 2, 7),

  (v_exam_id, '¿Cuál de estas NO es una tarea de cierre?',
   '["Cierre de sombrillas","Rallado de queso","Barrido profundo del salón","Relleno de pimenteros y palillos"]'::jsonb, 1, 8),

  (v_exam_id, '¿Está permitido usar el celular durante el servicio?',
   '["Sí, siempre","Solo para consultar la carta","No, salvo autorización del encargado","Sí, mientras no lo vea el cliente"]'::jsonb, 2, 9),

  (v_exam_id, '¿Qué se debe hacer si hay un problema entre compañeros?',
   '["Resolverlo en el salón frente a los clientes","Hablarlo fuera del salón y con respeto; si no se resuelve, comunicarlo al encargado","Ignorarlo y seguir trabajando","Contárselo a otros compañeros"]'::jsonb, 1, 10),

  -- REQUISITOS Y PROPINAS
  (v_exam_id, '¿Qué porcentaje de propina cobra el personal nuevo?',
   '["25%","50%","75%","100%"]'::jsonb, 1, 11),

  (v_exam_id, '¿Cuántas guías hay que leer para poder trabajar como mozo o runner con el 100% de propina?',
   '["1 guía","2 guías","3 guías","4 guías"]'::jsonb, 3, 12),

  (v_exam_id, '¿Dónde se debe dejar la propina recolectada?',
   '["En el bolsillo del mozo hasta el cierre","Repartida entre los que atendieron la mesa","En el sector de caja, sin excepciones","En una caja común en la estación de servicio"]'::jsonb, 2, 13),

  (v_exam_id, '¿Cómo se entera el personal del reparto de propinas?',
   '["Se reúnen al final del turno","El encargado lo dice verbalmente","Se envía un informe al grupo de WhatsApp MOZOS - MW","Cada uno cuenta lo que juntó"]'::jsonb, 2, 14),

  (v_exam_id, '¿Qué puede pasar si alguien con 100% de propina tiene comportamientos reiterados de MAL o MUY MAL?',
   '["Nada, el porcentaje es fijo","Puede tener una reducción temporal de propina al 75% o 50%","Se le descuenta directamente del sueldo","Solo se le da una advertencia verbal"]'::jsonb, 1, 15),

  -- ROL DEL MOZO
  (v_exam_id, '¿Cuál es el rol principal del mozo en Waikiki?',
   '["Llevar y retirar platos","Acompañar la experiencia del cliente con amabilidad, orden, conocimiento y ritmo","Tomar comandas y cobrar","Coordinar la cocina con el salón"]'::jsonb, 1, 16),

  (v_exam_id, '¿Cómo se arma el servicio para el almuerzo?',
   '["Solo plato y cubiertos","Individual, plato, cuchillo, tenedor y copa","Individual, plato, cubiertos, copa y copón de vino","Solo copa y cubiertos"]'::jsonb, 1, 17),

  (v_exam_id, '¿Qué se agrega en la cena que no está en el almuerzo?',
   '["Un postre de cortesía","Copón de vino y servilleta símil tela","Agua con gas","Pan de cortesía"]'::jsonb, 1, 18),

  (v_exam_id, '¿Qué debe tener listo el mozo al inicio del servicio de almuerzo?',
   '["Solo la carta","Computadora encendida, rejilla, destapador, lapiceras y herramientas de trabajo","Solo la tablet con el sistema","La carta y los menús del día"]'::jsonb, 1, 19),

  (v_exam_id, '¿Qué hace el mozo al finalizar el servicio?',
   '["Se va directamente","Limpieza y orden de la plaza, feedback al encargado sobre cómo salió el servicio","Solo barre su sector","Espera que llegue el siguiente turno"]'::jsonb, 1, 20),

  -- ROL DEL RUNNER
  (v_exam_id, '¿En qué turnos existe el puesto de runner?',
   '["Siempre, en todos los turnos","Solo en desayuno y merienda","Solo durante el almuerzo o cena","En temporada alta solamente"]'::jsonb, 2, 21),

  (v_exam_id, '¿Qué hace el runner antes de llevar un plato a la mesa?',
   '["Lo lleva directamente","Revisa que el plato esté completo y bien presentado antes de salir del pasaplatos","Pregunta al mozo si está correcto","Espera que el mozo lo acompañe"]'::jsonb, 1, 22),

  (v_exam_id, '¿Qué pregunta el runner al dejar los platos en la mesa?',
   '["¿Les gustó el lugar?","¿Necesitan más bebida?","¿Falta algo? (sal, pimienta, etc.)","¿Van a pedir postre?"]'::jsonb, 2, 23),

  (v_exam_id, '¿Qué pregunta el runner al retirar los platos vacíos?',
   '["¿Quieren la cuenta?","¿Cómo estuvo todo?","¿Les traigo el postre?","¿Necesitan algo más?"]'::jsonb, 1, 24),

  (v_exam_id, '¿Qué hace el runner si nota que a una mesa le falta pan o hielo?',
   '["Avisa al mozo para que lo lleve él","Lo repone sin esperar que lo pidan","Espera que el cliente lo solicite","Pregunta al encargado si puede reponerlo"]'::jsonb, 1, 25),

  (v_exam_id, '¿Cómo debe moverse el runner por el salón?',
   '["Corriendo para ser más rápido","Con ritmo pero sin correr, con buena cara","Caminando lento para no derramar","Solo cuando lo llaman"]'::jsonb, 1, 26),

  -- CRITERIOS DE EVALUACIÓN
  (v_exam_id, '¿Qué significa la evaluación 🟥 Muy mal?',
   '["Algo que se puede mejorar con tiempo","Comportamientos que afectan gravemente el equipo o la experiencia del cliente, pueden derivar en apercibimiento o suspensión","Una actitud que no suma pero no es grave","Lo mínimo esperable del puesto"]'::jsonb, 1, 27),

  (v_exam_id, '¿Qué evaluación recibe quien limpia su puesto y además ayuda a dejar todo en orden general?',
   '["🟨 Bien","🟧 Mal","🟩 Muy bien","🟥 Muy mal"]'::jsonb, 2, 28),

  (v_exam_id, '¿Qué evaluación recibe quien dice "no sé" o inventa lo que incluye un plato?',
   '["🟨 Bien","🟧 Mal","🟩 Muy bien","🟥 Muy mal"]'::jsonb, 3, 29),

  (v_exam_id, '¿Qué evaluación recibe quien anticipa las necesidades y resuelve sin esperar órdenes?',
   '["🟨 Bien","🟧 Mal","🟩 Muy bien","🟥 Muy mal"]'::jsonb, 2, 30),

  (v_exam_id, '¿Qué evaluación recibe quien abandona la atención al cliente por estar merendando?',
   '["🟨 Bien","🟧 Mal","🟩 Muy bien","🟥 Muy mal"]'::jsonb, 3, 31),

  (v_exam_id, '¿Qué evaluación recibe quien confirma el pedido con el cliente, detalla bien la comanda y asegura que salga perfecto?',
   '["🟥 Muy mal","🟧 Mal","🟨 Bien","🟩 Muy bien"]'::jsonb, 3, 32),

  -- DINÁMICA DIARIA
  (v_exam_id, '¿Dónde se consulta la plaza asignada para cada turno?',
   '["En el grupo de WhatsApp","En el cuaderno de plazas al comenzar el turno","Se lo dice el encargado verbalmente al llegar","En la pizarra de la cocina"]'::jsonb, 1, 33),

  (v_exam_id, '¿Qué hace un runner si una mesa le pide que tome el pedido?',
   '["Lo ignora porque no es su rol","Dice que esperen al mozo","Lo toma y se lo pasa al mozo de esa plaza","Llama al mozo por el handy"]'::jsonb, 2, 34),

  (v_exam_id, '¿Qué pasa si un cliente pide sal y no es tu plaza?',
   '["Se le dice que espere al mozo de esa plaza","Se lo delegás al mozo correspondiente","Se lo llevás vos de todas formas, no se delega","Se avisa al encargado"]'::jsonb, 2, 35),

  (v_exam_id, '¿Qué debe tener siempre lista la plaza del mozo?',
   '["Solo servilleteros y copas","Servilleteros, azucareros, edulcorantes, saleros, aceiteros, aceto, queseras, platos, copas y descanso","Solo los cubiertos y la carta","La carta y el menú del día"]'::jsonb, 1, 36),

  (v_exam_id, '¿Qué se hace si un cliente tiene una queja grave y la situación escala?',
   '["Intentar resolverlo solos a cualquier costo","Ignorar al cliente hasta que se calme","Llamar de inmediato al encargado para que intervenga","Ofrecer una bebida de cortesía sin consultar"]'::jsonb, 2, 37),

  (v_exam_id, '¿Qué se hace si no recordás qué lleva un plato?',
   '["Se improvisa con lo que uno sabe","Se le dice al cliente que no sabe","Se recurre a la Guía de Platos e Ingredientes 2025","Se le pregunta al cliente qué quiere"]'::jsonb, 2, 38),

  -- PRESENTACIÓN Y UNIFORMES
  (v_exam_id, '¿Cuál de estas opciones NO está permitida durante el trabajo?',
   '["Calzado cerrado y cómodo","Uniforme completo y limpio","Gorras personales, auriculares y piercings excesivos","Pelo atado si es largo"]'::jsonb, 2, 39),

  (v_exam_id, '¿Qué se espera en cuanto a conducta y vocabulario en el salón?',
   '["Que el equipo sea divertido y animado a cualquier volumen","Actitud profesional, voz baja, respeto por el entorno y los compañeros","Que haya buena onda aunque se escuche desde el sector cliente","Que cada uno tenga su propio estilo"]'::jsonb, 1, 40),

  -- USO DEL HANDY
  (v_exam_id, '¿Qué se considera MUY MAL en el uso del handy?',
   '["Responder rápido y claro","Apagar el handy o dejarlo sin volumen sin avisar","Usar el canal solo cuando es necesario","Hacer algún chiste breve si el momento lo permite"]'::jsonb, 1, 41),

  (v_exam_id, '¿Cuál es el uso correcto del handy?',
   '["Usarlo para conversar con compañeros en momentos libres","Responder rápido y claro, usarlo solo cuando es necesario","Tenerlo siempre al máximo volumen","No usarlo nunca para no molestar"]'::jsonb, 1, 42),

  -- HABILIDADES TÉCNICAS
  (v_exam_id, '¿Cuál de estas NO es una habilidad técnica requerida?',
   '["Apertura y servicio correcto de vinos","Manejo correcto de la bandeja","Saber cocinar los platos del menú","Toma de comandas precisa y manejo del sistema"]'::jsonb, 2, 43),

  (v_exam_id, '¿Qué se espera de un buen mozo respecto a la carta?',
   '["Conocer solo los platos más vendidos","Saber cada ítem, recomendar con fundamento y transmitir confianza","Solo saber los precios","Conocer los platos del día"]'::jsonb, 1, 44),

  (v_exam_id, '¿Qué significa "trinchar" en el servicio de salón?',
   '["Flambear un postre en la mesa","Servir el vino correctamente","Cortar y servir piezas de carne u otros alimentos en la mesa","Preparar una bandeja de desayuno"]'::jsonb, 2, 45),

  -- ACTITUD DE SERVICIO
  (v_exam_id, '¿Qué hace que un cliente quiera volver, según la guía?',
   '["La rapidez del servicio","Un mozo que no solo atiende bien, sino que genera una experiencia memorable","Los precios bajos","La variedad del menú"]'::jsonb, 1, 46),

  (v_exam_id, '¿Qué actitud se debe tener al recibir una corrección del encargado?',
   '["Defenderse explicando por qué se hizo así","Aceptarla con humildad y disposición a mejorar","Ignorarla si uno cree que está bien","Comentarla con otros compañeros"]'::jsonb, 1, 47),

  (v_exam_id, '¿Cómo se llama el salón que se arma cuando hay eventos o se necesita más espacio?',
   '["Salón Principal","Salón Ala Wai","Salón Mirador","Salón ili ili"]'::jsonb, 1, 48),

  (v_exam_id, '¿Cuál es la actitud esperada de alguien con "actitud de crecimiento"?',
   '["Hacer solo lo que le piden y nada más","Demostrar interés genuino por aprender, escuchar devoluciones sin ponerse a la defensiva y buscar aportar al equipo","Esperar a que le enseñen sin preguntar","Copiar lo que hacen los compañeros más experimentados"]'::jsonb, 1, 49),

  (v_exam_id, '¿Qué debe pasar con los problemas personales antes de entrar al trabajo?',
   '["Se pueden comentar con los compañeros durante el turno","Se dejan en la puerta: no se permite que afecten el servicio ni la actitud","Se resuelven durante el servicio si hay tiempo","Se le cuenta al encargado para que entienda"]'::jsonb, 1, 50);

  RAISE NOTICE 'Guía creada/actualizada. ID: %', v_guide_id;
  RAISE NOTICE 'Examen creado/actualizado. ID: %', v_exam_id;
  RAISE NOTICE '50 preguntas insertadas.';

END $$;
