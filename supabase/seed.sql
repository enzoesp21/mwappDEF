-- ============================================================
-- Mirador Waikiki App — Seed Data
-- Run this AFTER schema.sql
-- Idempotent: deletes existing guides by title before re-inserting
-- ============================================================

-- Clean up existing seed data (cascade deletes exams + questions too)
DELETE FROM guides WHERE title IN (
  'Guía por Sector – Calienta Platos',
  'Guía de Platos e Ingredientes 2025',
  'Guía por Sector – Ensaladas & Postres',
  'Guía de Tortas y Tartas 2025'
);


-- ============================================================
-- GUIDE 1: Calienta Platos
-- ============================================================
DO $$
DECLARE
  guide1_id uuid;
  exam1_id  uuid;
BEGIN

  INSERT INTO guides (title, description, content, puestos)
  VALUES (
    'Guía por Sector – Calienta Platos',
    'Guía completa para el puesto de Calienta Platos de Mirador Waikiki.',
    $content$# Guía por Sector: Calienta Platos
**Mirador Waikiki — 2025**

## Presentación

En Mirador Waikiki entendemos que un gran servicio no depende de una sola persona, sino de un equipo bien organizado, comprometido y alineado. Por eso creamos esta guía con el objetivo de definir claramente los roles y responsabilidades de cada integrante del salón.

El puesto de Calienta Platos es ocupado por una única persona y cumple un rol clave como nexo entre la cocina y el salón. Es el responsable de recibir, revisar, mantener y despachar los platos que suben desde cocina, garantizando su correcta presentación y temperatura, coordinando con mozos y runners para lograr un servicio ágil y de calidad.

---

## Rutina Diaria

### Inicio del Turno

Al llegar a tu sector, verificá 3 cosas fundamentales:

**Orden:**
Limpiar y ordenar de arriba hacia abajo: microondas, calienta platos, montacargas, tacho de basura (vacío), muebles, puertas del monta, vidrios, piso.

**Reposición:**
Reponer todo lo necesario: pilas de platos (con y sin servilletas), cubiertos para trinchar, servilletas, limón, brotes, salsas, trapos limpios.

**Verificación:**
Asegurarse de que funcione bien: microondas, calienta platos, montacargas. Verificar que los productos estén aptos: limones, decoraciones, brotes, salsas, etc.

---

### Despacho — Recepción y Filtrado de Platos

- Los platos suben por el montacargas junto con la comanda.
- Verificá que estén bien cocidos, presentados y completos.
- Prestá atención a modificaciones en la comanda: cambios de guarnición, salsas, etc.
- Si el plato no está bien:
  - Consultá primero con cocina si se puede solucionar sin bajarlo.
  - Solo si es necesario, hacelo rehacer (esto impacta en el tiempo, así que cuanto antes se detecte, mejor).
- Ordená los platos en el calientaplatos y usá un cristal para manipularlos sin quemarte.
- **Importante: nunca mezcles platos de diferentes comandas.**

---

### Comunicación y Mantenimiento de Temperatura

- Los platos se colocan en el calientaplatos eléctrico.
- Puede usarse el microondas para mantener o recalentar temperatura si fuera necesario (evitando secar el plato).
- Se deben mantener ordenados y limpios los estantes inferiores del mueble, donde se guardan utensilios y elementos de apoyo.

---

### Elementos que deben estar siempre disponibles en el sector

- Limones
- Cucharas y tenedores (especialmente para trinchar)
- Servilletas
- Trapo limpio
- Brotes frescos para decoración

---

### Comunicación con el Salón

- Avisá por handy de forma clara lo que está listo: entrada, principal, etc.
- Asegurate que el runner sepa exactamente lo que está llevando.
- Coordiná con el mozo de la mesa que ya retiró lo anterior, si aplica.
- El runner baja los platos a la mesa.
- **Vos sos el filtro, el responsable de lo que baja.**

---

### Derivaciones

Todo lo que suba por el monta y no sea para servicio directo, derivalo al sector correspondiente: tortas, frutas, medialunas, pollo para ensalada, crema, verduras, tazas, vasos, cortesías, etc.

---

### Limpieza del Sector

Al comenzar y finalizar el turno, el sector debe estar:
- Limpio
- Ordenado
- Sin restos de comida ni utensilios sucios
- Con los estantes abastecidos y listos para el próximo turno
- Equipos apagados, en caso de no volver a usarse ese día

---

## Consideraciones Clave

- El calientaplatos **no es un puesto pasivo**: requiere atención, velocidad, coordinación y criterio estético.
- Es la **última barrera de calidad** antes de que el plato llegue al cliente.
- La presentación y el orden del puesto reflejan la seriedad del restaurante.

---

## ¿Qué esperamos de vos?

- Que identifiques correctamente cada plato, prestando especial atención a los cambios o aclaraciones realizados por los camareros en la comanda (por ejemplo, modificaciones en guarniciones).
- Que mantengas una comunicación clara y constante tanto con el salón como con la cocina, utilizando los handys con eficiencia.
- Que estés siempre atento al stock de los elementos indispensables del puesto: limones, queso, brotes, servilletas, platos, cucharas, tenedores, trapos limpios, etc.
- Que conozcas el contenido de los platos para poder asesorar a mozos nuevos o responder consultas puntuales con seguridad.
- Que actúes como filtro final antes de que el plato llegue al cliente y tengas la capacidad de gestionar devoluciones de manera responsable y ordenada cuando sea necesario.
- Que mantengas el sector limpio y prolijo, con estantes ordenados, el piso barrido y sin elementos fuera de lugar durante todo el turno.
- Que asumas la responsabilidad total del sector, tratándolo como propio y garantizando su correcto funcionamiento de inicio a fin de la jornada.
- Que puedas mantener un clima tranquilo a pesar de que sea un día complicado, logrando así que no se vea afectado el estado de ánimo ni el desempeño de los runners o cocineros.$content$,
    ARRAY['Calienta Platos']
  )
  RETURNING id INTO guide1_id;

  -- Exam 1
  INSERT INTO exams (guide_id, title, passing_score)
  VALUES (guide1_id, 'Examen: Calienta Platos', 70)
  RETURNING id INTO exam1_id;

  -- Questions for Exam 1
  INSERT INTO exam_questions (exam_id, question, options, correct_option, "order") VALUES
    (exam1_id,
     '¿Cuáles son las 3 verificaciones fundamentales al llegar al sector?',
     '["Orden, Reposición y Verificación","Limpieza, Comunicación y Reposición","Temperatura, Limpieza y Stock","Comunicación, Rapidez y Orden"]'::jsonb,
     0, 1),

    (exam1_id,
     '¿Qué hacer si un plato sube con mala presentación?',
     '["Devolverlo inmediatamente sin consultar","Consultar primero con cocina si se puede solucionar sin bajarlo","Mandarlo igual al cliente","Llamar al encargado antes de cualquier acción"]'::jsonb,
     1, 2),

    (exam1_id,
     '¿Se pueden mezclar platos de diferentes comandas en el calientaplatos?',
     '["Sí, si son del mismo tipo de plato","Solo en momentos de mucho trabajo","No, nunca","Sí, siempre que estén a la misma temperatura"]'::jsonb,
     2, 3),

    (exam1_id,
     '¿Qué elemento se usa para manipular los platos calientes sin quemarse?',
     '["Guantes de horno","Un cristal","Trapos húmedos","Pinzas de cocina"]'::jsonb,
     1, 4),

    (exam1_id,
     '¿Cómo se avisa al salón que un plato está listo?',
     '["Gritando desde el sector","Yendo personalmente a buscar al mozo","Por handy de forma clara","Enviando un mensaje de texto"]'::jsonb,
     2, 5),

    (exam1_id,
     '¿Quién lleva los platos a la mesa?',
     '["El calienta platos","El cocinero","El runner","El encargado"]'::jsonb,
     2, 6),

    (exam1_id,
     '¿Qué elementos deben estar SIEMPRE disponibles en el sector?',
     '["Limones, cubiertos para trinchar, servilletas, trapo limpio, brotes","Solo limones y servilletas","Salsas, queso y cubiertos","Platos, tazas y vasos"]'::jsonb,
     0, 7),

    (exam1_id,
     '¿Qué se hace con los elementos que suben por el monta y no son para servicio directo?',
     '["Se guardan en el sector","Se devuelven a cocina","Se derivan al sector correspondiente","Se descartan"]'::jsonb,
     2, 8),

    (exam1_id,
     '¿El puesto de Calienta Platos es considerado?',
     '["Un puesto pasivo de simple espera","Un puesto activo que requiere atención, velocidad y criterio estético","Un puesto auxiliar sin responsabilidad","Un puesto temporal"]'::jsonb,
     1, 9),

    (exam1_id,
     '¿Cuándo deben estar apagados los equipos del sector?',
     '["Siempre al terminar el turno si no se vuelven a usar","Solo cuando lo indica el encargado","Nunca, deben estar siempre encendidos","Solo en invierno"]'::jsonb,
     0, 10),

    (exam1_id,
     '¿Cuál es el rol del Calienta Platos respecto a la calidad del servicio?',
     '["Última barrera de calidad antes de que el plato llegue al cliente","Solo mantiene la temperatura","Verifica solo la presentación visual","Prepara los platos junto con cocina"]'::jsonb,
     0, 11),

    (exam1_id,
     '¿Con qué frecuencia debe limpiarse el sector?',
     '["Solo al final del turno","Al comenzar y finalizar el turno","Solo cuando está visiblemente sucio","Una vez por semana"]'::jsonb,
     1, 12);

END $$;


-- ============================================================
-- GUIDE 2: Platos e Ingredientes 2025
-- ============================================================
DO $$
DECLARE
  guide2_id uuid;
  exam2_id  uuid;
BEGIN

  INSERT INTO guides (title, description, content, puestos)
  VALUES (
    'Guía de Platos e Ingredientes 2025',
    'Conocé el detalle de cada plato del menú: ingredientes, preparación y cómo sugerirlo al cliente.',
    $content$# Guía de Platos e Ingredientes 2025
**Mirador Waikiki — 2025**

## Nuestra Historia

Mirador Waikiki abrió sus puertas en **1999** con la visión de crear un espacio gastronómico de referencia frente al mar. Desde entonces, nos hemos consolidado como uno de los restaurantes más reconocidos de la región, combinando una cocina de autor con ingredientes frescos y de primera calidad.

Nuestro grupo también opera **Mirador 9**, un balneario y restaurante de la misma empresa, y el **Hotel ili ili**, inaugurado en **diciembre de 2023**, que amplió nuestra propuesta de hospitalidad.

---

## Información General para el Personal

### Estacionamiento
Los clientes que consumen en el restaurante tienen derecho a **2 horas** de estacionamiento sin costo adicional. Pasado ese tiempo se aplica tarifa normal.

### Íconos del Menú
- 🌾 **Sin TACC** — apto para celíacos
- 🌿 **Vegetariano**
- 🌱 **Vegano**

---

## ENTRADAS

### Langostinos Empanados
**10 langostinos** empanados crujientes, servidos con salsa tártara casera y limón.
- Langostinos frescos, pan rallado japonés (panko), huevo, harina, aceite.
- Sugerencia: destacar la cantidad y la fritura liviana.

### Cazuela de Mariscos
Cazuela cremosa con mejillones, almejas, calamares y langostinos en caldo de pescado con crema y hierbas.
- Ideal para presentar como entrada contundente o plato principal liviano.

### Tabla de Fiambres
Selección de fiambres artesanales, quesos y acompañamientos. Ideal para compartir.

---

## ARROCES

### La Paella ⭐ Plato de la Casa
**El plato estrella de Mirador Waikiki.**
- Arroz **azafranado** con frutos de mar: langostinos, mejillones, almejas y calamares.
- Cocinado en paellera tradicional con caldo de pescado (fumé).
- El fondo crocante ("socarrat") es parte de la experiencia.
- Sugerencia: avisar al cliente que tiene un tiempo de elaboración de 25-30 minutos.

### Risotto con Frutos de Mar
Arroz cremoso estilo italiano con frutos de mar frescos, manteca y parmesano.

### Arroz Negro
Arroz teñido con tinta de calamar, servido con alioli casero.

---

## PESCADOS

### Abadejo a la Crema de Limón 🌾
Filete de abadejo grillado con salsa de crema, limón y alcaparras. Servido con puré duquesa.

**Puré Duquesa:** puré de papas con **2 yemas de huevo y queso rallado**, moldeado y gratinado al horno. Se diferencia del puré común por su textura firme y presentación elegante.

### Salmón Grillado
Filete de salmón rosado grillado con guarnición del día y limón.

### Merluza al Vapor 🌾
Filete de merluza al vapor con vegetales salteados y aceite de oliva.

---

## PASTAS

### Fideos con Salsa Cuatro Quesos
Pasta con salsa cremosa de **queso azul, gouda, pategrás y fontina**.
- La salsa se prepara fundiendo los quesos en crema de leche con una base de manteca y cebolla.

### Ñoquis de la Casa
Ñoquis caseros de papa con salsa a elección: fileto, bolognesa o cuatro quesos.

### Ravioles de Ricota y Espinaca
Pasta rellena con ricota, espinaca y nuez moscada. Salsa de tomates frescos.

---

## CARNES

### Bife de Chorizo
Corte de 350g grillado a punto, servido con papas fritas y ensalada.

### Pollo a la Plancha 🌾
Suprema de pollo grillada con guarnición de vegetales salteados.

---

## POSTRES

### Cheesecake New York
**El único cheesecake que va cocido al horno** (a diferencia de las versiones frías con gelatina).
- Base de galletitas tipo Digestive, relleno de queso crema, huevos y azúcar.
- Se sirve con coulis de frutos rojos.

### Cheesecake de Dulce de Leche
Versión fría con base de galletitas, relleno de queso crema y dulce de leche.

### Cheesecake de Oreo
Base de galletitas Oreo, relleno de queso crema, chips de Oreo y cobertura de chocolate.

---

## CONCEPTOS TÉCNICOS IMPORTANTES

### Caldo de Pescado (Fumé)
Preparación base para paella, cazuela y otras elaboraciones:
- **Cocción lenta de recortes de langostinos, piel y cabeza de pescado con vegetales** (cebolla, apio, puerro, zanahoria).
- Se cocina a fuego bajo durante 30-40 minutos, se cuela y se usa como base.
- Le da profundidad y sabor marino a los platos.

### El Socarrat
La capa crujiente que se forma en el fondo de la paella cuando el arroz absorbe todo el líquido y comienza a tostarse. Es muy valorado por los conocedores de la paella tradicional española.

---

## PREGUNTAS FRECUENTES DEL CLIENTE (FAQ)

**¿La paella lleva gluten?**
No, el arroz es naturalmente sin TACC. Verificar siempre el caldo y los condimentos.

**¿Cuánto tarda la paella?**
Entre 25 y 30 minutos desde que se toma el pedido.

**¿Tienen opciones vegetarianas?**
Sí, consultar los platos marcados con 🌿 en el menú.

**¿El estacionamiento es gratis?**
2 horas sin costo para quienes consumen en el restaurante.

**¿Qué es el puré duquesa?**
Puré de papas con 2 yemas de huevo y queso rallado, gratinado al horno. Es más firme y sabroso que el puré convencional.$content$,
    ARRAY['todos']
  )
  RETURNING id INTO guide2_id;

  -- Exam 2
  INSERT INTO exams (guide_id, title, passing_score)
  VALUES (guide2_id, 'Examen: Platos e Ingredientes', 70)
  RETURNING id INTO exam2_id;

  -- Questions for Exam 2
  INSERT INTO exam_questions (exam_id, question, options, correct_option, "order") VALUES
    (exam2_id,
     '¿Cuál es el plato de la casa en Mirador Waikiki?',
     '["Risotto con Frutos de Mar","La Paella","Cazuela de Mariscos","Abadejo a la Crema de Limón"]'::jsonb,
     1, 1),

    (exam2_id,
     '¿Qué es el Puré Duquesa?',
     '["Puré de batatas con manteca","Puré de papas con 2 yemas de huevo y queso rallado para gratinar","Puré de papas con crema de leche","Puré de zapallo con queso"]'::jsonb,
     1, 2),

    (exam2_id,
     '¿En qué año se inauguró Mirador Waikiki?',
     '["1995","2000","1999","2004"]'::jsonb,
     2, 3),

    (exam2_id,
     '¿Qué diferencia al Cheesecake New York de los otros cheesecakes?',
     '["Tiene base de galletitas Oreo","Es el único que va cocido al horno","Lleva dulce de leche en el centro","Se sirve tibio"]'::jsonb,
     1, 4),

    (exam2_id,
     '¿Cuántos langostinos trae el plato Langostinos Empanados?',
     '["5 langostinos","8 langostinos","10 langostinos","12 langostinos"]'::jsonb,
     2, 5),

    (exam2_id,
     '¿Qué ingredientes lleva la salsa Cuatro Quesos?',
     '["Queso azul, gouda, parmesano y mozzarella","Queso azul, gouda, pategrás y fontina","Queso crema, ricota, gruyere y brie","Queso azul, cheddar, provolone y gouda"]'::jsonb,
     1, 6),

    (exam2_id,
     '¿Qué es el caldo de pescado o fumé?',
     '["Caldo de pollo con mariscos","Cocción lenta de recortes de langostinos, piel y cabeza de pescado con vegetales","Agua con sal y hierbas","Caldo concentrado de verduras con algas"]'::jsonb,
     1, 7),

    (exam2_id,
     '¿Cuánto tiempo puede permanecer un auto en el estacionamiento habiendo consumido?',
     '["1 hora","3 horas","2 horas","Sin límite"]'::jsonb,
     2, 8),

    (exam2_id,
     '¿La Paella lleva qué tipo de arroz?',
     '["Arroz blanco común","Arroz azafranado","Arroz negro con tinta de calamar","Arroz integral"]'::jsonb,
     1, 9),

    (exam2_id,
     '¿Qué es Mirador 9?',
     '["Un hotel boutique","Un balneario y restaurante de la misma empresa","El nombre antiguo de Mirador Waikiki","Una sucursal en Buenos Aires"]'::jsonb,
     1, 10),

    (exam2_id,
     '¿Cuándo se inauguró el Hotel ili ili?',
     '["Enero 2023","Diciembre 2023","Marzo 2024","Julio 2022"]'::jsonb,
     1, 11),

    (exam2_id,
     'El ícono 🌾 en el menú indica:',
     '["Plato vegano","Plato sin TACC (apto celíaco)","Plato vegetariano","Plato de temporada"]'::jsonb,
     1, 12);

END $$;


-- ============================================================
-- GUIDE 3: Ensaladas & Postres
-- ============================================================
DO $$
DECLARE
  guide3_id uuid;
  exam3_id  uuid;
BEGIN

  INSERT INTO guides (title, description, content, puestos)
  VALUES (
    'Guía por Sector – Ensaladas & Postres',
    'Guía completa del sector Ensaladas y Postres: rutina diaria, producción, despacho y uso de herramientas.',
    $content$# Guía por Sector: Ensaladas & Postres
**Mirador Waikiki — 2025**

## Presentación

El sector de Ensaladas & Postres es uno de los más dinámicos del salón. Requiere precisión, velocidad y mucho orden. Este puesto maneja tanto producciones frías como despacho en tiempo real, y tiene un impacto directo en la experiencia del cliente desde el primer plato hasta el último.

---

## Rutina Diaria

### Turno Día — Inicio

**Producción diaria obligatoria:**

1. **Crutons caseros**
   - Cortar el pan en cubos uniformes.
   - Condimentar con aceite de oliva, sal, ajo en polvo y hierbas.
   - Hornear a **180° por 15 minutos** hasta dorar.
   - Enfriar y guardar en recipiente hermético.

2. **Huevos hervidos**
   - Cocinar durante **15 minutos** desde que rompe el hervor.
   - Enfriar en agua con hielo, pelar y reservar.

3. **Lavado de hojas verdes**
   - Llenar la bacha con **agua fría y vinagre** (primer paso fundamental).
   - Sumergir las hojas y dejar reposar 5 minutos.
   - Enjuagar con agua fría.
   - Centrifugar en tandas (no sobrecargar la centrifugadora — puede romperse o funcionar mal).
   - Guardar en recipientes con papel absorbente en la cámara.

4. **Salsa Caesar**
   - Ingredientes: mayonesa, mostaza, alcaparras, atún, aceto.
   - Procesar hasta obtener salsa lisa. Reservar en frío.

5. **Crema Chantilly casera**
   - Usar **5 litros de crema Milkaut** por producción estándar.
   - Batir con azúcar impalpable hasta punto chantilly firme.
   - **No sobrebatir — se corta.**
   - Guardar tapada en la cámara.

---

### Turno Noche — Inicio

- Al reponer lo utilizado durante el día (no es una producción desde cero).
- Verificar stock de hojas, huevos, crutons, salsas, postres.
- Reponer lo que esté bajo según consumo del turno día.

---

## Despacho — Ensaladas

### Ensalada Mirador
**Base:** lechuga y rúcula mixta.
**Armado:** base lechuga/rúcula → cherry alrededor → queso crema al centro → langostinos por encima → crutons por encima.
- Servir con aderezo aparte (vinagreta o salsa a elección del cliente).

### Ensalada Salmón Rose
Ingredientes: lechuga, rúcula, salmón ahumado, queso crema, zanahoria rallada, alcaparras, cherry.
- Presentar con limón y aceite de oliva aparte.

### Ensalada Caesar
Lechuga romana, crutons, queso parmesano rallado, salsa Caesar casera.
- Armar al momento del despacho para que los crutons no se ablanden.

---

## Despacho — Postres

### Helados CIRANO
- Sabor más utilizado: **americana** (vainilla francesa).
- Porcionar con cuchara caliente para presentación prolija.

### Postres de pastelería
Los postres de tortas y tartas suben desde pastelería. El sector los presenta y completa:
- Agregar crema chantilly si corresponde.
- Decorar con frutos rojos, salsa de chocolate u otros según la ficha del postre.
- Verificar temperatura y presentación antes de despachar.

---

## Herramientas y Equipamiento del Sector

| Herramienta | Uso |
|---|---|
| Centrifugadora de hojas | Secar hojas lavadas. No sobrecargar. |
| Batidora de pie | Crema chantilly y otras preparaciones. |
| Cuchillos | Guardar en su lugar asignado: frapera o soporte magnético. |
| Balanza | Porcionar ingredientes con precisión. |
| Bowls de acero | Mezclas, reservas temporales. |
| Film y papel absorbente | Cubrir y conservar correctamente. |

**Importante:** los cuchillos siempre en su lugar asignado (frapera o soporte magnético). Nunca en la bacha con agua ni en cajones sin protección.

---

## Consideraciones Clave

- La temperatura de los ingredientes fríos es crítica: nunca dejar ensaladas armadas fuera de la cámara por más de 5 minutos antes de despachar.
- Comunicar con el salón cuando un postre requiere tiempo extra (ej.: el helado necesita temperarse).
- El sector debe estar limpio y ordenado en todo momento — es visible desde el salón.
- Los cuchillos se guardan siempre en su lugar asignado.

---

## ¿Qué esperamos de vos?

- Producción diaria completa y a tiempo.
- Despacho preciso, prolijo y con buena presentación.
- Stock siempre controlado y comunicado al encargado.
- Sector limpio, organizado y seguro durante toda la jornada.$content$,
    ARRAY['Ensaladas']
  )
  RETURNING id INTO guide3_id;

  -- Exam 3
  INSERT INTO exams (guide_id, title, passing_score)
  VALUES (guide3_id, 'Examen: Ensaladas & Postres', 70)
  RETURNING id INTO exam3_id;

  -- Questions for Exam 3
  INSERT INTO exam_questions (exam_id, question, options, correct_option, "order") VALUES
    (exam3_id,
     '¿A qué temperatura se hornean los crutons y por cuánto tiempo?',
     '["160° por 20 min","200° por 10 min","180° por 15 min","220° por 8 min"]'::jsonb,
     2, 1),

    (exam3_id,
     '¿Cuánto tiempo se cocinan los huevos hervidos?',
     '["8 minutos","10 minutos","15 minutos","20 minutos"]'::jsonb,
     2, 2),

    (exam3_id,
     '¿Cuál es el primer paso para lavar las hojas verdes?',
     '["Lavarlas bajo agua corriente","Llenar la bacha con agua fría y vinagre","Centrifugarlas directamente","Remojarlas en agua caliente"]'::jsonb,
     1, 3),

    (exam3_id,
     '¿Cómo se arma la Ensalada Mirador?',
     '["Cherry, langostinos, lechuga, queso crema, crutons","Base lechuga/rúcula, cherry alrededor, queso crema al centro, langostinos, crutons por encima","Rúcula, salmón, cherry, zanahoria, alcaparras","Lechuga, tomate, mariscos, morrón, cebolla"]'::jsonb,
     1, 4),

    (exam3_id,
     '¿Qué precaución hay que tener al batir la crema chantilly?',
     '["Batir a velocidad alta siempre","Agregar azúcar al final","No sobrebatir porque se corta","Enfriarla en el freezer antes de batir"]'::jsonb,
     2, 5),

    (exam3_id,
     '¿Qué lleva la salsa Caesar?',
     '["Mayonesa, mostaza, alcaparras, atún, aceto","Solo mayonesa y limón","Crema, queso parmesano y anchoas","Yogur, ajo y hierbas"]'::jsonb,
     0, 6),

    (exam3_id,
     '¿Cuándo se realiza la reposición en el turno noche?',
     '["Al inicio del turno","Solo cuando se acaban los ingredientes","Al reponer lo utilizado durante el día","No se repone en el turno noche"]'::jsonb,
     2, 7),

    (exam3_id,
     '¿Dónde deben guardarse los cuchillos?',
     '["En la bacha con agua","En cualquier lugar disponible","En su lugar asignado (frapera o soporte magnético)","En el cajón junto a otros utensilios"]'::jsonb,
     2, 8),

    (exam3_id,
     '¿Qué contiene la Ensalada Salmón Rose?',
     '["Lechuga, rúcula, salmón ahumado, queso crema, zanahoria, alcaparras, cherry","Lechuga, atún, tomate, huevo, aceitunas","Rúcula, burrata, cherry, nueces, tomates confitados","Lechuga, langostinos, cherry, crutons, queso crema"]'::jsonb,
     0, 9),

    (exam3_id,
     '¿Qué sabor de helado CIRANO se usa más frecuentemente para postres?',
     '["Chocolate","Vainilla","Americana","Dulce de leche"]'::jsonb,
     2, 10),

    (exam3_id,
     '¿Cuánta crema Milkaut se usa para hacer la crema chantilly casera?',
     '["1 litro","3 litros","5 litros","2 litros"]'::jsonb,
     2, 11),

    (exam3_id,
     '¿Qué pasa si se carga demasiado la centrifugadora de hojas?',
     '["Las hojas quedan más secas","Puede romperse o funcionar mal","Funciona más rápido","No hay consecuencias"]'::jsonb,
     1, 12);

END $$;


-- ============================================================
-- GUIDE 4: Tortas y Tartas 2025
-- ============================================================
DO $$
DECLARE
  guide4_id uuid;
  exam4_id  uuid;
BEGIN

  INSERT INTO guides (title, description, content, puestos)
  VALUES (
    'Guía de Tortas y Tartas 2025',
    'Conocé cada torta y tarta del menú: ingredientes, descripción y cómo sugerirla al cliente.',
    $content$# Guía de Tortas y Tartas 2025
**Mirador Waikiki — 2025**

## Conceptos Fundamentales

### ¿Cuál es la diferencia entre una torta y una tarta?

| Característica | Torta | Tarta |
|---|---|---|
| Base | Bizcochuelo en capas | Masa sablée (masa firme) |
| Estructura | Capas de relleno entre bizcochuelos | Relleno directo sobre la masa |
| Textura base | Esponjosa y húmeda | Crocante y firme |
| Ejemplos | Red Velvet, Moka, Bruce | Tarta de Manzana, Lemon Pie |

---

## Conceptos Técnicos de Pastelería

### Chocolate Cobertura vs. Baño de Repostería
- **Chocolate Cobertura:** contiene **manteca de cacao** real. Requiere templado. Resultado brillante y crocante.
- **Baño de Repostería:** contiene **grasas vegetales** en lugar de manteca de cacao. Más fácil de usar, no necesita templado. Resultado menos brillante pero estable.

### Frosting de Queso Crema
Preparación: **manteca, azúcar impalpable y queso crema** (también llamada crema de manteca con queso crema).
Se usa en Red Velvet y otras tortas que requieren cobertura firme y cremosa.

### Masa Sablée (base de tartas)
Ingredientes: **harina, huevos, manteca, azúcar, ralladura de limón, esencia de vainilla**.
Textura: arenosa, crocante, que se deshace suavemente en la boca. Base estándar de todas las tartas del menú.

### Almíbar de Café
Ingredientes: **azúcar, agua, café soluble y cáscara de naranja**.
Se usa para embebecer bizcochuelos y aportarles humedad y sabor.

### Crema Pastelera
Ingredientes: **leche, huevos, azúcar, maicena, harina**.
Base de múltiples rellenos y tartas. Se cocina a fuego medio hasta espesar.

### Ganache de Chocolate
Mezcla de chocolate cobertura y crema de leche caliente. Se usa como cobertura, relleno o glaseado según la consistencia.

---

## TORTAS

### Red Velvet
**Descripción:** Torta de bizcochuelo rojo aterciopelado con frosting de queso crema.
- **Color:** aportado por **colorante rojo y cacao** (no frutos rojos naturales ni remolacha).
- **Capas:** bizcochuelo rojo + frosting de queso crema entre cada capa y en la cobertura.
- **Presentación:** exterior cubierto de frosting blanco cremoso, decorado con migajas de bizcochuelo rojo.
- Sugerencia al cliente: sabor suave, no muy dulce, ideal para quienes no son fans del chocolate intenso.

### Torta Bruce
**Descripción:** Torta de chocolate intenso embebida con almíbar de café y cubierta con ganache de chocolate.
- **Bizcochuelo:** de chocolate negro.
- **Almíbar:** de café con cáscara de naranja (aporta humedad y contraste aromático).
- **Cobertura:** ganache de chocolate cobertura.
- Sugerencia: para amantes del chocolate. Intensa y húmeda.

### Torta Moka
**Descripción:** Torta de café y chocolate con crema de manteca al café.
- **Bizcochuelo:** embebido con almíbar de café.
- **Relleno y cobertura:** crema de manteca con **café soluble** (ingrediente característico).
- **Decoración:** granos de café o cacao en polvo.
- Sugerencia: elegante, sabor adulto. Para quienes disfrutan del café.

### Años Locos
**Descripción:** Torta festiva y colorida con capas de colores y crema de vainilla.
- Bizcochuelo multicolor, relleno de crema de vainilla y dulce de leche.
- Cobertura de buttercream colorido.
- Sugerencia: ideal para celebraciones, muy vistosa.

### Blondie
**Descripción:** Torta basada en **brownie de chocolate blanco** (blondie).
- Base y capas de brownie de chocolate blanco (sin cacao, con manteca y azúcar rubia).
- Relleno de dulce de leche y nueces.
- Cobertura de chocolate blanco.
- Sugerencia: para quienes prefieren sabores suaves y caramelizados.

### Chocotorta
**Descripción:** El clásico postre argentino en versión torta.
- **Base y estructura:** capas de **chocolinas, dulce de leche y queso crema** (sin hornear).
- No lleva bizcochuelo: la estructura la dan las capas de chocolinas húmedas.
- Sugerencia: perfecta para los que buscan algo reconocible y nostálgico.

---

## CHEESECAKES

### Cheesecake New York
**El único cheesecake cocido al horno.**
- Base de galletitas tipo Digestive.
- Relleno: queso crema, huevos, azúcar (cocido en horno a baja temperatura).
- Textura firme y cremosa. Se sirve frío con coulis de frutos rojos.
- **Diferencia clave:** es el único que va al horno. Los demás cheesecakes del menú son fríos (con gelatina).

### Cheesecake de Dulce de Leche
- Versión fría (sin horno).
- Base de galletitas, relleno de queso crema con dulce de leche, cubierto con dulce de leche.

### Cheesecake de Oreo
- Base de galletitas Oreo molidas.
- Relleno de queso crema con chips de Oreo.
- Cobertura de chocolate y galletas Oreo enteras.

---

## TARTAS

### Tarta de Manzana
- Base: masa sablée.
- Relleno: manzanas caramelizadas con canela, azúcar y manteca.
- Cubierta: masa sablée enrejada o cubierta completa.
- Se sirve tibia con crema chantilly o helado de americana.

### Lemon Pie
- Base: masa sablée.
- Relleno: crema de limón (lemon curd) — limón, huevos, azúcar, manteca.
- Cobertura: merengue italiano flameado al momento del despacho.
- Sugerencia: fresca y ácida. Ideal para el verano.

### Tarta de Ricota
- Base: masa sablée.
- Relleno: ricota, huevos, azúcar, ralladura de limón y esencia de vainilla.
- Textura suave y liviana. Se sirve fría.

---

## ¿Qué esperamos de vos?

- Conocer cada torta y tarta del menú para poder describirla al cliente con seguridad.
- Identificar correctamente los ingredientes clave (los que diferencian un producto de otro).
- Saber sugerir según el perfil del cliente (amante del chocolate, prefiere algo liviano, etc.).
- Manipular y presentar cada porción de forma prolija y a la temperatura correcta.$content$,
    ARRAY['Pastelería', 'Ensaladas']
  )
  RETURNING id INTO guide4_id;

  -- Exam 4
  INSERT INTO exams (guide_id, title, passing_score)
  VALUES (guide4_id, 'Examen: Tortas y Tartas', 70)
  RETURNING id INTO exam4_id;

  -- Questions for Exam 4
  INSERT INTO exam_questions (exam_id, question, options, correct_option, "order") VALUES
    (exam4_id,
     '¿Cuál es la principal diferencia entre una torta y una tarta?',
     '["La torta es salada y la tarta es dulce","La torta usa bizcochuelo en capas, la tarta usa masa firme (sablée) con relleno directo","La torta siempre lleva frutas y la tarta no","No hay diferencia, son lo mismo"]'::jsonb,
     1, 1),

    (exam4_id,
     '¿Qué ingrediente le da el color característico a la Red Velvet?',
     '["Solo cacao","Colorante rojo y cacao","Frutos rojos naturales","Remolacha"]'::jsonb,
     1, 2),

    (exam4_id,
     '¿Cuál es la base de la Chocotorta?',
     '["Bizcochuelo de chocolate","Masa sablée con cacao","Chocolinas, dulce de leche y queso crema","Brownie con dulce de leche"]'::jsonb,
     2, 3),

    (exam4_id,
     '¿Qué diferencia el Chocolate Cobertura del Baño de Repostería?',
     '["Solo el precio","El cobertura usa manteca de cacao, el baño usa grasas vegetales","El cobertura es más dulce","No hay diferencia técnica"]'::jsonb,
     1, 4),

    (exam4_id,
     '¿Con qué se prepara el Frosting de Queso Crema?',
     '["Solo queso crema y azúcar","Manteca, azúcar impalpable y queso crema (o crema de manteca)","Ricota, azúcar y esencia de vainilla","Crema de leche batida con queso"]'::jsonb,
     1, 5),

    (exam4_id,
     '¿Qué torta lleva brownie de chocolate blanco?',
     '["Torta Bruce","Años Locos","Blondie","Chocotorta"]'::jsonb,
     2, 6),

    (exam4_id,
     '¿Cuál es la diferencia del Cheesecake New York respecto a los otros cheesecakes?',
     '["Lleva base de Oreo","Es el único que va cocido al horno","Tiene corazón de dulce de leche","Se sirve frío con frutos secos"]'::jsonb,
     1, 7),

    (exam4_id,
     '¿Qué lleva el almíbar de café?',
     '["Azúcar, agua y café soluble","Azúcar, agua, café y cáscara de naranja","Solo café y agua caliente","Café, leche y caramelo"]'::jsonb,
     1, 8),

    (exam4_id,
     '¿Con qué se prepara la Masa Sablée?',
     '["Harina, huevos, manteca, azúcar, ralladura de limón, esencia de vainilla","Harina, agua, sal y manteca","Galletas molidas y manteca","Harina, leche, huevos y azúcar"]'::jsonb,
     0, 9),

    (exam4_id,
     '¿Qué torta está embebida con almíbar de café y lleva ganache de chocolate?',
     '["Torta Moka","Torta Bruce","Red Velvet","Años Locos"]'::jsonb,
     1, 10),

    (exam4_id,
     '¿La Torta Moka lleva qué ingrediente que la caracteriza?',
     '["Dulce de leche","Café soluble en la crema","Frutos rojos","Maracuyá"]'::jsonb,
     1, 11),

    (exam4_id,
     '¿Qué lleva la Crema Pastelera?',
     '["Leche, huevos, azúcar, maicena, harina","Solo leche y maicena","Crema de leche, azúcar y huevos","Leche, fécula y esencia de vainilla"]'::jsonb,
     0, 12);

END $$;
