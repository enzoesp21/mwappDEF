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
**Mirador Waikiki — Mar del Plata, Buenos Aires**

---

## Presentación

Bienvenidos a la Guía de Platos e Ingredientes 2025. Este documento está diseñado para que puedan conocer el detalle de cada plato de nuestro menú, con descripciones claras y sencillas. Encontrarán ingredientes principales, acompañamientos y sugerencias para ofrecerlos con seguridad y profesionalismo.

Nuestro objetivo es que todos puedan conocer las preparaciones de nuestros platos para brindar mejor asesoramiento a los clientes y nutrir sus propios conocimientos.

---

## Íconos del Menú

- 🌾 **Sin TACC** — Se puede pedir apto para celíacos
- 🌿 **Vegetariano** — Se puede pedir apto Vegetariano
- 🌱 **Vegano** — Se puede pedir apto Vegano

---

## ENTRADAS

### Rabas
Aros de calamar rebozados en harina y fritos a punto justo, acompañados de salsa tártara (mayonesa, pickles, pepinillos).

**Ingredientes principales:** Calamar, harina, aceite.

**Cómo sugerirlo:** Entrada clásica para compartir.

---

### Gambas al Ajillo
Gambas salteadas con ajo, vino blanco y especias (pimentón, ½ cucharada de ají molido, pimienta y sal). Acompañadas con papas españolas.

**Ingredientes principales:** Gambas, ajo, vino blanco, caldo de pescado, manteca.

**Cómo sugerirlo:** Gambas a base de ajo, aceite de oliva, pimentón, vino blanco y papas españolas.

---

### Langostinos Empanados
Langostinos marinados y empanados en pan rallado, acompañados con ½ porción de papas fritas.

**Ingredientes principales:** Langostinos, huevo, condimentos (provenzal, ají molido y orégano), pan rallado.

**Cómo sugerirlo:** 10 langostinos acompañados con ½ porción de papas fritas, una entrada contundente.

---

### Mejillones a la Provenzal
Mejillones hervidos con caldo de pescado, ajo, limón y perejil.

**Ingredientes principales:** Mejillones, caldo de pescado, ajo, limón y perejil.

**Cómo sugerirlo:** Entrada para dos con aproximadamente 20 mejillones salteados a la provenzal.

---

### Tabla de Mar
Rabas, calamarettes, cornalitos, pesca blanca y langostinos rebozados en harina y fritos.

**Ingredientes principales:** Rabas, cornalitos, calamaretes, pesca blanca, langostinos, harina.

**Cómo sugerirlo:** Para compartir como entrada, de 2 a 4 personas. Ideal para acompañar con una ensalada de hojas verdes como la ensalada Mirador o una porción de papas fritas.

---

### Burrata
Burrata sobre colchón de rúcula acompañada de tomates cherry, tomates confitados y frutos secos.

**Ingredientes principales:** Burrata, rúcula, tomates cherry, tomates confitados, frutos secos.

**Cómo sugerirlo:** Queso de origen italiano elaborado a base de leche de vaca con un interior de crema e hilos de mozzarella, acompañado de hojas verdes, tomates cherry, tomates confitados y frutos secos. Ideal como entrada para 2 personas.

---

### Tortilla de Papa 🌿
Clásica tortilla con papas, cebolla y morrón.

**Ingredientes principales:** Papas, cebolla, morrón, huevos, sal, pimienta.

**Cómo sugerirlo:** Clásica tortilla a base de papas, huevo, cebolla, sal y pimienta.

---

## ARROCES

### Paella ⭐ Plato de la Casa
Cazuela de arroz azafranado con pollo, mariscos y vegetales.

**Ingredientes principales:** Pollo, langostinos, mejillones, vieiras, cayo de vieiras, arroz, caldo de pescado, arvejas, cholitos (mejillones pelados) y calamar.

**Cómo sugerirlo:** Es un arroz azafranado con pollo, langostinos y mariscos, todo cocinado en su propio caldo. Un plato completo, sabroso y bien tradicional.

---

### Risotto con Frutos de Mar
Risotto cremoso con mariscos, vino blanco, manteca y queso.

**Ingredientes principales:** Mariscos (mejillones ½ valva, vieyras, cayo de vieyras, langostinos, calamar), arroz carnaroli, vino blanco, manteca, queso, caldo de pescado.

**Cómo sugerirlo:** Arroz cremoso a base de mariscos, queso rallado y vino blanco.

---

### Caya Chilena
Arroz azafranado con pollo, lechuga, champiñones y jamón. Gratinado con crema y queso.

**Ingredientes principales:** Arroz azafranado, pollo, lechuga, champiñones, jamón, crema y queso gratinado.

**Cómo sugerirlo:** Arroz cremoso azafranado, a base de pollo, champiñones, jamón, lechuga, crema de leche y queso gratinado. Algo sencillo pero que sin dudas no falla.

---

### Risotto Vegetariano 🌿
Risotto suave con vegetales frescos.

**Ingredientes principales:** Arroz carnaroli, vegetales, caldo de vegetales, manteca, queso.

**Cómo sugerirlo:** Arroz cremoso a base de vegetales, con caldo de vegetales, manteca y queso rallado.

---

## PESCADOS

### Cazuela de Mariscos
Cazuela con langostinos, mariscos y salsa de mar.

**Ingredientes principales:** Langostinos, vieyras, cayo de vieyras, mejillones, tentáculo de calamar, aleta de calamar, salsa pomodoro, vino blanco, aceite de oliva, perejil.

**Cómo sugerirlo:** Cazuela con langostinos, callo de vieira, mejillones, aleta y tentáculo de calamar, todo salteado en "fumé de pescado" (caldo de pescado), vino blanco y manteca.

---

### Abadejo Grillé 🌾
El abadejo es un pescado de mar que se encuentra en aguas frías, especialmente frente a las costas argentinas y uruguayas. Es muy apreciado por su carne blanca, firme y delicada, con sabor suave. Se destaca por tener pocas espinas, lo que lo convierte en una opción cómoda y segura para todo tipo de comensales.

**Ingredientes principales:** Abadejo, aceite de oliva y limón con vegetales grillé (zanahoria, zucchini, cebolla, morrón).

**Cómo sugerirlo:** Pescado de carne blanca, con pocas espinas y muy liviano. Ideal para acompañar con vegetales salteados o salsas sin tanto volumen.

---

### Abadejo a la Crema de Limón 🌾
Abadejo con salsa cremosa de limón y cúrcuma. Servido con Puré Duquesa.

**Ingredientes principales:** Abadejo, crema de leche, limón, cúrcuma.

**Salsa:** Crema de leche, jugo de limón, ½ cucharada de cúrcuma, sal y pimienta. Se suma maicena para lograr una salsa más espesa.

**Puré Duquesa:** Puré de papas tradicional mezclado con 2 yemas de huevo y queso rallado para gratinar al horno.

**Cómo sugerirlo:** Pescado de carne blanca, con pocas espinas y muy liviano, con salsa a base de crema de leche, cúrcuma y jugo de limón, acompañado de puré duquesa.

---

### Trucha a la Manteca con Alcaparras
Pez de agua dulce de la Patagonia Argentina, de carne suave y sabrosa con alto contenido graso. Servida con vegetales y salsa de manteca, limón y alcaparras.

**Ingredientes principales:** Trucha, manteca, alcaparras, jugo de limón.

**Cómo sugerirlo:** Pescado suave, de alto contenido graso, a la manteca con alcaparras y jugo de limón, acompañado de vegetales.

---

### Salmón Rosado a la Crema de Camarones
El Salmón Rosado es un pescado de carne firme, grasa y muy sabrosa, con textura suave y mantecosa que se deshace en la boca. Se cocina a la plancha para conservar su jugosidad natural y se acompaña con una salsa cremosa de camarones.

**Ingredientes principales:** Salmón, camarones, crema de leche, cebolla, queso rallado.

**Salsa:** Camarones salteados con cebolla, crema de leche y queso rallado para gratinar.

**Cómo sugerirlo:** Pescado de carne firme, de alto contenido graso y muy sabroso, con una salsa de camarones a base de crema de leche, acompañado de puré duquesa.

---

### Chernia Grillé 🌾
La Chernia es un pez de mar que habita en aguas profundas y frías del Atlántico Sur. Muy apreciada por su carne blanca, firme y de sabor suave. Se cocina a la plancha con aceite de oliva y se acompaña con vegetales grillé como zanahoria, zucchini, cebolla y morrón.

**Ingredientes principales:** Chernia, aceite de oliva, vegetales grillé (zanahoria, zucchini, cebolla, morrón).

**Cómo sugerirlo:** Pescado de carne blanca, firme, con sabor delicado y muy pocas espinas. Ideal para quienes prefieren preparaciones livianas y saludables.

---

### Chernia con Salsa Mar del Plata
Chernia a la plancha con una generosa salsa de mariscos, manteca y vino blanco. La salsa incluye un salteado de cebolla, vieiras, callo de vieiras, gambas y mejillones, ligado con manteca y demi-glace. Se sirve con papas rústicas.

**Ingredientes principales:** Chernia, cebolla, vieiras, callo de vieiras, gambas, mejillones, manteca, vino blanco, salsa demi-glace, papas rústicas.

**Cómo sugerirlo:** Chernia grillada de sabor suave acompañada de una salsa abundante de mariscos salteados en manteca y vino blanco.

> **Salsa Demi-Glace:** Reducción de caldo de carne con verduras y vino, cocinada lentamente hasta lograr una salsa espesa, oscura y muy sabrosa. Ideal para acompañar carnes y pescados.

---

## PASTAS

### Variedades de Pasta

#### Sorrentinos
Sorrentinos de masa suave rellenos de jamón y mozzarella.

**Ingredientes:** Harina, huevo, jamón, mozzarella.

**Cómo sugerirlo:** Sorrentinos livianos rellenos de jamón y mozzarella.

---

#### Ñoquis Soufflé 🌿
Ñoquis de textura aireada con espinaca.

**Ingredientes:** Leche, manteca, harina, huevo, espinaca.

**Cómo sugerirlo:** Ñoquis livianos con textura aireada y espinaca fresca. Ideales para acompañar con salsa 4 quesos o bolognesa.

---

#### Cintas Caseras
Pasta casera en forma de cintas a base de huevo, similar a los fettuccine.

**Ingredientes:** Harina, huevo.

**Cómo sugerirlo:** Pasta casera preparada a base de huevo en forma de cintas.

---

#### Ravioli Nero
Raviolón de masa sepia (tinta de calamar) relleno de salmón rosado y camarones.

**Ingredientes:** Masa de tinta de calamar, salmón, camarones.

**Cómo sugerirlo:** Raviolón relleno de salmón rosado y camarones frescos, elaborado con masa de tinta de calamar, lo que le aporta el color negro característico.

---

### Salsas para Pastas

#### Salsa Blanca 🌿
Salsa a base de leche, manteca y maicena.

#### Crema 🌿
Salsa a base de crema de leche y maicena.

#### Cuatro Quesos 🌿
Salsa contundente a base de crema de leche y variedad de quesos: queso azul, queso gouda, queso pategrás y queso fontina.

#### Pomodoro 🌿 🌱
Salsa liviana a base de tomate triturado con variedad de especias. Ideal para acompañar pastas rellenas.

#### Bolognesa
Salsa clásica a base de tomate triturado y carne (Roast Beef) con condimentos.

**Ingredientes:** Tomate triturado, carne, ají molido, laurel, pimentón, orégano, sal y pimienta.

#### Salteado de Trucha
Vegetales salteados con trucha ahumada.

**Ingredientes:** Trucha, manteca, vegetales (zanahoria, cebolla, morrón, zucchini, tomates cherry), queso parmesano.

**Cómo sugerirlo:** Salteado de vegetales frescos con trucha ahumada, manteca y queso parmesano.

#### Crema de Verdeo 🌿
Salsa a base de crema de leche y verdeo con variedad de vegetales.

**Ingredientes:** Puerro, espinaca, apio, palta, crema, verdeo.

**Cómo sugerirlo:** Salsa a base de crema de leche y verdeo. Ideal para acompañar el Ravioli Nero.

#### Salteado de Mar
Salsa a base de tomate triturado con caldo de pescado, mejillones, calamares y vieyras.

**Ingredientes:** Salsa de tomate, caldo de pescado, mejillones, calamares, vieyras.

> **Caldo de Pescado:** Se hierve en cocción lenta recortes de langostinos, piel de pescado, cabeza de pescado y vegetales hasta lograr un caldo intenso y lleno de sabor.

---

## CARNES

### Cortes Vacunos

#### Bife de Chorizo
Corte emblemático de la parrilla argentina. Proviene del lomo corto y se destaca por su tamaño, jugosidad y capa de grasa externa que aporta mucho sabor durante la cocción. Es sabroso, con textura más firme que el lomo.

#### Bife de Lomo
El corte más tierno de la res. Proviene del lomo, una zona de poco trabajo muscular. Tiene sabor delicado y textura extremadamente suave.

#### Ojo de Bife
Corte tierno y jugoso proveniente del centro del bife ancho (costillar). Se caracteriza por su alto marmoleo, lo que le da sabor intenso y textura muy suave al paladar.

#### Peceto
Corte magro, de forma redonda y textura firme, proveniente de la parte trasera del animal. Es bajo en grasa y muy parejo. En Mirador Waikiki se usa principalmente para milanesas.

---

### Cortes de Cerdo

#### Bondiola
Corte del cerdo extraído de la parte superior del cuello. Es una carne muy sabrosa, ligeramente infiltrada de grasa, lo que la hace jugosa y tierna. Ideal para cocciones lentas, a la parrilla o a la plancha.

#### Solomillo
El corte más tierno del cerdo, ubicado junto al lomo. De textura suave y sabor delicado, se cocina rápidamente. Perfecto para preparaciones a la plancha, al horno o con salsas suaves.

---

### Platos de Carnes

#### Lomo al Champiñón
Lomo con salsa a base de champiñones y demi-glace.

**Ingredientes principales:** Lomo, champiñones, demi-glace, cebolla.

**Cómo sugerirlo:** Medallón de lomo de 250/300 gramos con salsa a base de demi-glace (caldo de carne reducido con huesos), salteado con champiñones y cebolla.

---

#### Pechuga Capresse
Pechuga rellena con queso, tomate cherry, albahaca y panceta. Con salsa a base de verdeo y champiñones.

**Ingredientes principales:** Pechuga, queso, tomate cherry, albahaca, panceta, olivas negras, crema, verdeo, champiñones.

**Cómo sugerirlo:** Pechuga rellena con queso, tomate cherry, albahaca, panceta y olivas negras, con salsa a base de verdeo y champiñones. Acompañada con puré de papas.

---

#### Wok de Lomo 🌾
Salteado de cortes de lomo con vegetales frescos, condimentado con sal, pimienta y salsa de soja.

---

#### Wok de Pollo 🌾
Salteado de cortes de pechuga de pollo con vegetales frescos, condimentado con sal, pimienta y salsa de soja.

---

#### Bife de Chorizo al Malbec
Bife de chorizo con salsa a base de reducción de Malbec, acompañado con papas españolas.

**Ingredientes principales:** Bife de chorizo, reducción de Malbec, salsa demi-glace, papas.

**Cómo sugerirlo:** Se destaca por su salsa a base de reducción de vino Malbec combinada con demi-glace, acompañado de papas españolas.

---

#### Bife de Chorizo a la Pimienta
Bife con salsa a base de pimienta y demi-glace.

**Ingredientes principales:** Bife de chorizo, pimienta, salsa demi-glace.

**Cómo sugerirlo:** Bife de chorizo con salsa a base de pimienta y demi-glace, acompañado de papas a la crema.

---

#### Ojo de Bife con Hongos y Panceta
Ojo de bife con salsa a base de hongos de pino y panceta. Acompañado con papas rústicas.

**Ingredientes principales:** Ojo de bife, hongos de pino, panceta, crema, nuez moscada, papas rústicas.

**Cómo sugerirlo:** Ojo de bife acompañado con salsa a base de crema, hongos de pino y panceta, servido con papas rústicas.

---

#### Solomillo de Cerdo Agridulce
Solomillo con salsa a base de frutas agridulces y demi-glace. Acompañado con batatas españolas.

**Ingredientes principales:** Solomillo de cerdo, frutas (duraznos, ananá, manzana), salsa demi-glace, batatas.

**Cómo sugerirlo:** Cuatro o cinco medalloncitos de solomillo con salsa a base de frutas agridulces (duraznos, ananá, manzana), acompañados de batatas españolas. Ideal para quienes buscan salir de lo tradicional.

---

#### Bondiola a la Mostaza y Miel
Bondiola con salsa a base de mostaza Dijon, miel y cúrcuma.

**Ingredientes principales:** Bondiola, cebolla, mostaza Dijon, miel, cúrcuma.

**Cómo sugerirlo:** Bondiola grillé acompañada de salsa a base de mostaza Dijon, miel y cúrcuma, con guarnición de batatas.

---

## PREGUNTAS FRECUENTES

**¿Cuál es el plato de la casa?**
El plato de la casa es la Paella, ya que representa a la perfección la identidad del lugar: una propuesta abundante, colorida y llena de sabor, ideal para compartir.

**¿Cuándo se construyó Mirador Waikiki?**
El Mirador Waikiki se inauguró en el año 1999, y el salón Ala Wai en el año 2004.

**¿Cuándo se remodeló el lugar?**
El lugar se comenzó a remodelar en el mes de abril del año 2024. A día de hoy aún siguen en proceso ciertas remodelaciones.

**¿Desde cuándo está el Hotel?**
El Hotel ili ili se inauguró en diciembre de 2023. Es un hotel de tipo Boutique con 17 habitaciones.

**¿Quién se encarga de los eventos?**
Todos los eventos en Mirador Waikiki son realizados por la empresa Mar Eventos. En la recepción del restaurante se pueden encontrar las tarjetas para contactarse.

**¿Cuánto tiempo se puede dejar el auto estacionado?**
El tiempo máximo de permanencia en el estacionamiento es de 2 horas habiendo consumido. Superado ese tiempo, o sin haber consumo, el estacionamiento se abonará.

**¿Se permite el ingreso de animales?**
Si bien no somos pet-friendly, se permite la estadía de animales en el sector del balcón.

**¿El lugar cambió de firma?**
El lugar cambió de firma en noviembre de 2023.

**¿Qué es Mirador 9?**
Mirador 9 es un balneario y restaurante a cargo de la misma empresa que Mirador Waikiki. El restaurante está abierto todos los sábados y domingos del año y todos los días en meses de temporada.

**¿Se puede bajar a la playa?**
Si bien no contamos con bajada directa a la playa, pueden acceder a la playa pública saliendo del predio y bajando por las escaleras blancas a pocos metros de la salida del complejo. El estacionamiento gratuito es válido únicamente durante la estadía en el restaurante, no durante el tiempo en la playa.

**¿Me puedo cambiar de mesa?**
En ese caso, permítame llamar a una de las chicas de recepción para que puedan reubicarlos.$content$,
    ARRAY['todos']
  )
  RETURNING id INTO guide2_id;

  -- Exam 2
  INSERT INTO exams (guide_id, title, passing_score)
  VALUES (guide2_id, 'Examen: Platos e Ingredientes', 70)
  RETURNING id INTO exam2_id;

  -- Questions for Exam 2 (50 preguntas)
  INSERT INTO exam_questions (exam_id, question, options, correct_option, "order") VALUES

  -- ENTRADAS
  (exam2_id, '¿Con qué salsa se acompañan las Rabas?',
   '["Salsa golf","Salsa tártara (mayonesa, pickles, pepinillos)","Alioli","Salsa pomodoro"]'::jsonb, 1, 1),

  (exam2_id, '¿Cuántos langostinos trae el plato Langostinos Empanados?',
   '["5 langostinos","8 langostinos","10 langostinos","12 langostinos"]'::jsonb, 2, 2),

  (exam2_id, '¿Con qué acompañamiento se sirven los Langostinos Empanados?',
   '["Puré duquesa","Papas rústicas","½ porción de papas fritas","Ensalada verde"]'::jsonb, 2, 3),

  (exam2_id, '¿Aproximadamente cuántos mejillones trae la entrada de Mejillones a la Provenzal?',
   '["10 mejillones","15 mejillones","20 mejillones","25 mejillones"]'::jsonb, 2, 4),

  (exam2_id, '¿Para cuántas personas está pensada la Tabla de Mar como entrada?',
   '["Solo 1 persona","1 a 2 personas","2 a 4 personas","5 a 6 personas"]'::jsonb, 2, 5),

  (exam2_id, '¿Qué ingredientes lleva la Tabla de Mar?',
   '["Solo rabas y langostinos","Rabas, calamaretes, cornalitos, pesca blanca y langostinos","Mejillones, langostinos y gambas","Calamar, langostinos y pesca del día"]'::jsonb, 1, 6),

  (exam2_id, '¿Cómo se describe la Burrata al cliente?',
   '["Queso suizo con nueces","Queso italiano de leche de vaca con interior de crema e hilos de mozzarella","Queso de cabra con tomates","Ricota italiana con frutos secos"]'::jsonb, 1, 7),

  (exam2_id, '¿Qué lleva la Tortilla de Papa además de papa y huevo?',
   '["Cebolla y morrón","Jamón y queso","Espinaca y cebolla","Solo papa y huevo"]'::jsonb, 0, 8),

  (exam2_id, '¿Con qué se acompañan las Gambas al Ajillo?',
   '["Papas fritas","Papas españolas","Puré duquesa","Arroz blanco"]'::jsonb, 1, 9),

  -- ARROCES
  (exam2_id, '¿Cuál es el plato de la casa en Mirador Waikiki?',
   '["Risotto con Frutos de Mar","Cazuela de Mariscos","La Paella","Chernia con Salsa Mar del Plata"]'::jsonb, 2, 10),

  (exam2_id, '¿Qué tipo de arroz se usa en el Risotto con Frutos de Mar?',
   '["Arroz blanco común","Arroz integral","Arroz carnaroli","Arroz jazmín"]'::jsonb, 2, 11),

  (exam2_id, '¿Qué tiene de especial la Paella en Mirador Waikiki?',
   '["Es solo de verduras","Es un arroz azafranado con pollo, langostinos y mariscos cocinado en su propio caldo","Lleva tinta de calamar","Es un arroz negro tradicional"]'::jsonb, 1, 12),

  (exam2_id, '¿Qué ingredientes distinguen a la Caya Chilena de los otros arroces?',
   '["Solo mariscos y azafrán","Pollo, lechuga, champiñones y jamón gratinado con crema y queso","Verduras y pollo sin queso","Langostinos y tinta de calamar"]'::jsonb, 1, 13),

  (exam2_id, '¿El Risotto Vegetariano con qué tipo de caldo se prepara?',
   '["Caldo de pescado","Caldo de pollo","Caldo de vegetales","Agua con sal"]'::jsonb, 2, 14),

  -- PESCADOS
  (exam2_id, '¿De dónde proviene la Trucha que se usa en el restaurante?',
   '["Del Mar Mediterráneo","Del río Paraná","De la Patagonia Argentina","Del Mar del Plata"]'::jsonb, 2, 15),

  (exam2_id, '¿Con qué se acompaña el Abadejo a la Crema de Limón?',
   '["Papas fritas","Vegetales grillé","Puré Duquesa","Ensalada Mirador"]'::jsonb, 2, 16),

  (exam2_id, '¿Qué es el Puré Duquesa?',
   '["Puré de papas con crema de leche","Puré de papas con 2 yemas de huevo y queso rallado, gratinado al horno","Puré de batatas con manteca","Puré de papas con espinaca"]'::jsonb, 1, 17),

  (exam2_id, '¿Qué ingrediente especial lleva la salsa del Abadejo a la Crema de Limón?',
   '["Azafrán","Cúrcuma","Pimentón","Comino"]'::jsonb, 1, 18),

  (exam2_id, '¿Con qué se sirve la Chernia con Salsa Mar del Plata?',
   '["Puré duquesa","Papas españolas","Papas rústicas","Arroz blanco"]'::jsonb, 2, 19),

  (exam2_id, '¿Qué es la Salsa Demi-Glace?',
   '["Salsa de tomate con especias","Reducción de caldo de carne con verduras y vino, cocida lentamente","Crema de leche con queso","Salsa de mariscos con manteca"]'::jsonb, 1, 20),

  (exam2_id, '¿Cuáles son los mariscos de la Cazuela de Mariscos?',
   '["Solo langostinos y mejillones","Langostinos, vieyras, cayo de vieyras, mejillones y calamar","Solo camarones y almejas","Gambas, calamares y pulpo"]'::jsonb, 1, 21),

  (exam2_id, '¿Por qué el abadejo es ideal para clientes que no suelen pedir pescado?',
   '["Porque es muy barato","Porque tiene pocas espinas, carne blanca y sabor suave","Porque se cocina muy rápido","Porque viene de aguas tropicales"]'::jsonb, 1, 22),

  (exam2_id, '¿Cómo se describe la textura del Salmón Rosado?',
   '["Carne seca y magra","Carne firme, grasa y muy sabrosa que se deshace en la boca","Carne blanda sin sabor","Carne muy dura y con muchas espinas"]'::jsonb, 1, 23),

  -- PASTAS
  (exam2_id, '¿Qué hace especial al Ravioli Nero?',
   '["Está relleno de ricota y espinaca","La masa es de tinta de calamar y está relleno de salmón rosado y camarones","Es el más grande de la carta","Lleva 4 tipos de quesos"]'::jsonb, 1, 24),

  (exam2_id, '¿Qué quesos lleva la salsa Cuatro Quesos?',
   '["Queso azul, gouda, pategrás y fontina","Queso azul, cheddar, provolone y brie","Parmesano, gouda, mozzarella y ricota","Queso azul, gruyere, fontina y mozzarella"]'::jsonb, 0, 25),

  (exam2_id, '¿Qué diferencia tienen los Ñoquis Soufflé de los ñoquis tradicionales?',
   '["Son de batata","Son de textura aireada y llevan espinaca","Son más grandes y rellenos","Son fritos en lugar de hervidos"]'::jsonb, 1, 26),

  (exam2_id, '¿Con qué salsa se recomienda combinar el Ravioli Nero?',
   '["Salsa bolognesa","Pomodoro","Crema de verdeo","Salsa blanca"]'::jsonb, 2, 27),

  (exam2_id, '¿Qué llevan las Cintas Caseras?',
   '["Harina, huevo y espinaca","Harina y huevo solamente","Harina, manteca y leche","Semolín y huevo"]'::jsonb, 1, 28),

  (exam2_id, '¿Qué es el caldo de pescado o fumé?',
   '["Agua con sal y hierbas","Cocción lenta de recortes de langostinos, piel y cabeza de pescado con vegetales","Caldo de pollo con algas","Concentrado de verduras con limón"]'::jsonb, 1, 29),

  (exam2_id, '¿La salsa Pomodoro es apta para veganos?',
   '["No, lleva crema de leche","No, lleva queso","Sí, es a base de tomate triturado con especias","Solo es vegetariana, no vegana"]'::jsonb, 2, 30),

  -- CARNES
  (exam2_id, '¿De qué parte del animal proviene el Bife de Chorizo?',
   '["Del lomo","Del costillar","Del lomo corto","De la paleta"]'::jsonb, 2, 31),

  (exam2_id, '¿Cuál es el corte más tierno de la res?',
   '["Ojo de bife","Bife de chorizo","Bife de lomo","Peceto"]'::jsonb, 2, 32),

  (exam2_id, '¿Para qué se usa principalmente el Peceto en Mirador Waikiki?',
   '["Para bifes a la plancha","Para wok","Para milanesas tiernas y uniformes","Para cazuelas"]'::jsonb, 2, 33),

  (exam2_id, '¿Qué frutas lleva la salsa del Solomillo Agridulce?',
   '["Mango, papaya y piña","Duraznos, ananá y manzana","Ciruela, higo y pera","Naranja, limón y pomelo"]'::jsonb, 1, 34),

  (exam2_id, '¿Con qué guarnición se sirve el Solomillo de Cerdo Agridulce?',
   '["Papas fritas","Puré duquesa","Batatas españolas","Papas rústicas"]'::jsonb, 2, 35),

  (exam2_id, '¿Qué salsa lleva la Bondiola a la Mostaza y Miel?',
   '["Mostaza común con azúcar","Mostaza Dijon, miel y cúrcuma","Mostaza, crema y champiñones","Miel, soja y jengibre"]'::jsonb, 1, 36),

  (exam2_id, '¿Cuánto pesa aproximadamente el medallón de lomo en el Lomo al Champiñón?',
   '["100/150 gramos","250/300 gramos","400/450 gramos","500 gramos"]'::jsonb, 1, 37),

  (exam2_id, '¿Qué ingredientes lleva la Pechuga Capresse además de pollo?',
   '["Jamón y queso","Queso, tomate cherry, albahaca, panceta y olivas negras","Espinaca, ricota y nuez moscada","Champiñones, morrón y cebolla"]'::jsonb, 1, 38),

  (exam2_id, '¿Con qué se condimentan el Wok de Lomo y el Wok de Pollo?',
   '["Solo sal y pimienta","Sal, pimienta y salsa de soja","Ají molido, pimentón y ajo","Chimichurri y limón"]'::jsonb, 1, 39),

  (exam2_id, '¿Cuál es la diferencia entre la Bondiola y el Solomillo de cerdo?',
   '["No hay diferencia","La bondiola viene del cuello (más grasa y sabrosa) y el solomillo es el más tierno junto al lomo","El solomillo es más grande que la bondiola","La bondiola es de vaca y el solomillo de cerdo"]'::jsonb, 1, 40),

  -- FAQ e HISTORIA
  (exam2_id, '¿En qué año se inauguró Mirador Waikiki?',
   '["1995","1999","2002","2004"]'::jsonb, 1, 41),

  (exam2_id, '¿En qué año se inauguró el salón Ala Wai?',
   '["1999","2001","2004","2006"]'::jsonb, 2, 42),

  (exam2_id, '¿Cuándo se inauguró el Hotel ili ili?',
   '["Enero 2023","Junio 2023","Diciembre 2023","Marzo 2024"]'::jsonb, 2, 43),

  (exam2_id, '¿Cuántas habitaciones tiene el Hotel ili ili?',
   '["10 habitaciones","17 habitaciones","25 habitaciones","30 habitaciones"]'::jsonb, 1, 44),

  (exam2_id, '¿Cuánto tiempo máximo se puede dejar el auto estacionado habiendo consumido?',
   '["1 hora","2 horas","3 horas","Sin límite"]'::jsonb, 1, 45),

  (exam2_id, '¿Qué empresa realiza los eventos en Mirador Waikiki?',
   '["Mirador Eventos","ili ili Events","Mar Eventos","Costa Eventos"]'::jsonb, 2, 46),

  (exam2_id, '¿Se permiten mascotas en el restaurante?',
   '["Sí, en todo el restaurante","Solo razas pequeñas","Se permite solo en el sector del balcón","No se permiten bajo ningún concepto"]'::jsonb, 2, 47),

  (exam2_id, '¿En qué mes y año cambió de firma el restaurante?',
   '["Enero 2023","Noviembre 2023","Abril 2024","Diciembre 2022"]'::jsonb, 1, 48),

  (exam2_id, '¿Cuándo está abierto Mirador 9?',
   '["Solo en temporada de verano","Todos los días del año","Todos los sábados y domingos del año y todos los días en temporada","Solo fines de semana en verano"]'::jsonb, 2, 49),

  (exam2_id, '¿Qué ícono indica que un plato es Sin TACC (apto celíaco)?',
   '["🌿","🌱","🌾","⭐"]'::jsonb, 2, 50);

END $$;
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
