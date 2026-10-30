-- ============================================================
-- Dos guías nuevas: Apertura de Barra y Guía de Recepción
--
-- Enzo pasó los dos documentos (PDF) para subirlos a la app:
--   - "Manual de procedimientos - Apertura de barra" → puesto Barra.
--   - "Guía de Recepción — Mirador Waikiki"          → puesto Recepción.
--
-- El contenido es el de los PDF, pasado a formato de guía (títulos, listas y
-- pasos numerados) sin agregar ni sacar información.
--
-- Cada una se suma al final del recorrido de su puesto (hoy quedan como
-- Guía 6). Todavía no tienen examen.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente: si se vuelve a
-- correr, actualiza el contenido sin duplicar las guías ni el recorrido.
-- ============================================================

BEGIN;

-- 1) Las guías. Si ya existen, se actualiza el contenido.
WITH nuevas(title, description, puestos, content) AS (
  VALUES
  (
    'MW - Apertura de Barra',
    'La apertura de la barra paso a paso: de las 7:30 a la barra lista antes de las 8:20.',
    ARRAY['Barra']::text[],
    $guia$
*Mirador Waikiki — Manual de procedimientos · 2026*

---

## HORARIOS

- **Ingreso:** 7:30 hs.
- **Apertura lista (estimado):** 8:15 hs.
- **Horario máximo:** 8:20 hs.

## OBJETIVO DE APERTURA

El objetivo es completar la apertura **lo antes posible**, trabajando de manera ordenada y aprovechando los tiempos y los viajes.

Si se puede finalizar antes de las 8:15 hs, mejor. **Las 8:20 hs deben tomarse como horario máximo.**

Al finalizar, la barra debe quedar **abastecida, limpia, ordenada, presentada y lista para el despacho.**

---

## 1. INGRESO Y CAMBIO

- Ingresar a las 7:30 hs **por la puerta de los vestuarios**.
- Cambiarse y colocarse el uniforme correspondiente.

## 2. FICHADO

- Subir y realizar el fichaje de ingreso.

## 3. ENCENDIDO DE LUCES

Al llegar a la barra, prender:

- Luces de la barra de coctelería.
- Luces del centro de la barra ubicadas en el techo.
- Luces de la barra central donde están las botellas.

## 4. ENCENDIDO DE LA MÁQUINA DE CAFÉ

El encendido debe hacerse **respetando este orden**:

1. Prender el **botón de la izquierda**.
2. Se encenderán las luces y la máquina comenzará a hacer una serie de sonidos ("pi, pi, pi...").
3. Esperar a que termine de hacer esos sonidos.
4. La máquina comenzará automáticamente a cargar agua.
5. Esperar hasta que termine completamente la carga. Se identifica porque la máquina deja de hacer ruido.
6. Recién en ese momento, prender el **segundo botón, ubicado a la derecha**.

> **IMPORTANTE:** No prender el segundo botón hasta que la máquina haya terminado de cargar agua.

## 5. CONTROL GENERAL DE FALTANTES

Una vez encendida la máquina de café, hacer un control general de todo lo necesario para el despacho de esa mañana.

La idea es **detectar todos los faltantes antes de bajar**, para aprovechar el viaje y evitar subir y bajar varias veces.

### Jugo de naranja

- Revisar si hay jugo preparado.
- **Probarlo siempre** para comprobar cómo está.
- Si está muy agrio, descartarlo.
- Si está apenas agrio, se puede corregir agregando un poco de azúcar.
- Si falta, preparar o reponer.

### Revisar también

- Pan cortado.
- Dips de queso crema y mermelada preparados.
- Stock para reponer los dips.
- Tomates cherry.
- Palta.
- Yogur.
- Frutillas.
- Bananas.
- Kiwi.
- Granola.

Antes de bajar, tener claro todo lo que hace falta para el servicio de la mañana.

## 6. CONTROL DE MEDIALUNAS Y SCONES

Antes de cocinar, **revisar siempre lo que haya quedado del día anterior**.

### Cantidad base para un día de semana

Si no quedó nada del día anterior, preparar **2 bandejas** en total:

- **Bandeja 1:** 20 medialunas dulces.
- **Bandeja 2:** 8 medialunas dulces, 8 medialunas saladas y 4 scones de queso.

**Total a cocinar:** 28 medialunas dulces · 8 medialunas saladas · 4 scones de queso.

### Medialunas dulces

- Revisar primero cuántas quedaron del día anterior.
- Si quedaron suficientes, reducir la cantidad a cocinar.
- Si no quedó ninguna, utilizar como referencia las 28 unidades.

### Medialunas saladas

- **Deben ser del día.**
- Como referencia para un día de semana, preparar 8 unidades.

### Scones de queso

- Revisar primero los disponibles.
- Como referencia, preparar aproximadamente 4 unidades para un día de semana.

> **IMPORTANTE:** Estas cantidades son una referencia para un día de semana. Revisar siempre lo disponible antes de cocinar para evitar producir de más.

## 7. CONTROL Y PRESENTACIÓN DE BUDINES

En la presentación de la barra deben estar siempre los **5 budines diferentes**:

1. Vainilla.
2. Manzana y canela.
3. Chocolate.
4. Limón y semillas de amapola.
5. Carrot.

### Budines enteros para presentación

- Revisar que estén disponibles los 5 sabores.
- Si falta alguno, buscarlo en la **cámara de pastelería**.
- Los 5 budines deben quedar correctamente emplatados y presentados arriba de la barra.

### Budines cortados del día anterior

Es habitual que queden porciones de budines cortados del día anterior.

1. Juntar todos los budines que ya estén cortados.
2. Colocarlos en una de las bandejas que se utilizan para las medialunas.
3. Guardar la bandeja debajo de la barra, en el sector donde están presentados los budines.
4. Estos budines deben utilizarse primero para el despacho.

> **IMPORTANTE:** Siempre despachar primero los budines que ya estaban cortados antes de comenzar a cortar los budines enteros de la presentación.

## 8. COCCIÓN DE MEDIALUNAS Y SCONES

En pastelería, utilizar el **horno eléctrico chico del fondo**.

- **Temperatura:** entre 150 °C y 160 °C.
- **Tiempo:** 25 minutos.

Una vez colocadas las bandejas, cerrar el horno y **poner inmediatamente un temporizador de 25 minutos en el celular**. Esto permite continuar con la apertura sin perder de vista el tiempo de cocción.

Si ya están Martu o Nahuel, pueden detener el horno cuando termine el tiempo y eventualmente subir las bandejas.

> **MUY IMPORTANTE:** Las medialunas deben retirarse apenas terminan los 25 minutos. No dejarlas dentro del horno apagado: si permanecen aproximadamente 5 minutos más, pueden aplastarse solas y quedar inutilizables. Aunque el horno ya se haya apagado, hay que ir a buscarlas cuando termine el temporizador.

## 9. SUBIDA DE MERCADERÍA

Una vez colocadas las bandejas en el horno:

1. Juntar todo lo necesario para el despacho de esa mañana.
2. Colocarlo en el monta.
3. Subir toda la mercadería junta.
4. Subir nuevamente a la barra.

Hay que **aprovechar los 25 minutos de cocción** para continuar trabajando. No esperar a que las medialunas estén listas para seguir con la apertura.

## 10. ORDEN Y PRESENTACIÓN DE LA BARRA

Una vez arriba, acomodar y guardar toda la mercadería que se subió.

Después preparar la presentación:

- Emplatar los 5 budines correspondientes.
- Guardar debajo de la barra la bandeja con los budines ya cortados del día anterior, que deben salir primero.
- Emplatar los scones que hayan quedado del día anterior o dejar preparado el espacio para colocar los nuevos.
- Preparar un plato de medialunas dulces.
- Preparar un plato de medialunas saladas.
- Si hay croissants disponibles, preparar un plato de croissants.
- Dejar todo limpio y bien presentado.

Mientras se realiza esta tarea, **mantenerse atento al temporizador de las medialunas**.

## 11. DESAYUNO Y CAFÉ PARA EL PERSONAL

Una vez que esté todo presentado y la apertura de la barra esté resuelta, preparar el desayuno y los cafés del personal.

### Tostadas

Para las tostadas del personal, utilizar el **pan del día anterior**.

El personal puede tostar su propio pan. Si hay gente nueva o alguien que no se anime a utilizar los equipos:

1. Ofrecer hacerlo nosotros.
2. Pedirles que traigan el pan.
3. Ellos deben cortarlo.
4. Nosotros lo tostamos desde la barra.

Preparar para acompañar dos dips grandes:

- Queso crema.
- Mermelada.

### Cafés

- Preguntar al personal qué quiere tomar.
- Preparar los cafés correspondientes.

---

## ORDEN RÁPIDO DE APERTURA

**7:30 hs — Ingreso**

Cambiarse → Fichar → Prender luces → Prender máquina de café → Revisar faltantes → Revisar medialunas y scones → Revisar los 5 budines → Bajar a pastelería → Poner las 2 bandejas → Temporizador 25 min → Subir mercadería por el monta → Volver a la barra → Ordenar y emplatar → Preparar budines cortados para despachar primero → Buscar las medialunas a tiempo → Completar presentación → **Barra lista** → Desayuno y cafés del personal.

## META

La apertura debe realizarse **lo antes posible**.

Como referencia, debería estar terminada alrededor de las **8:15 hs**, siendo las **8:20 hs el límite máximo**. Si se termina antes, mejor.

**Prioridad:** dejar la barra completamente abastecida, limpia, ordenada y preparada para comenzar el servicio.
$guia$
  ),
  (
    'MW - Guía de Recepción',
    'Cómo recibimos: la filosofía de atención, el trabajo en equipo y las tareas de recepción en el salón.',
    ARRAY['Recepción']::text[],
    $guia$
*Mirador Waikiki — Guía de Recepción · 2026*

---

## NUESTRA FILOSOFÍA DE ATENCIÓN

En nuestra recepción no buscamos únicamente fidelizar al cliente, sino **generar una conexión genuina** que vaya más allá de la atención convencional. Queremos comprender sus necesidades, anticiparnos a sus expectativas y hacer que cada persona se sienta **bienvenida, acompañada y agasajada** con cordialidad.

Para lograrlo, es necesario mucho más que recibir al cliente: debemos aprender a **pensar desde su perspectiva**, comprender sus necesidades y actuar en consecuencia.

Nuestro objetivo es construir un equipo coordinado, comprometido y atento, capaz de trabajar en conjunto para brindar una experiencia cálida, organizada y satisfactoria, priorizando siempre la comodidad y el bienestar de nuestros clientes.

## ¿QUÉ BUSCAMOS COMO EQUIPO?

Buscamos que el **trabajo en equipo sea el pilar fundamental** de nuestra recepción. La coordinación, la comunicación y la correcta distribución de las tareas son esenciales para garantizar el buen funcionamiento del sector y brindar una atención de calidad.

Nos destacamos por trabajar con una **mentalidad colectiva**, priorizando las necesidades del equipo por encima de las individuales. Esto implica aprender a reconocer cuándo nuestro compañero necesita ayuda, anticiparnos a sus necesidades y comprender que el buen desempeño individual también depende del acompañamiento mutuo.

Valoramos la **actitud positiva, la predisposición, la energía y el compromiso** con el trabajo. Esperamos que cada integrante sea capaz de resolver tareas y afrontar situaciones complejas con iniciativa, criterio y serenidad, buscando siempre soluciones que favorezcan tanto al equipo como a nuestros clientes.

> El objetivo es trabajar como un equipo coordinado, donde cada integrante comprenda que su aporte es fundamental y que el éxito de uno también contribuye al éxito de todos.

---

## TAREAS

### ¿Cuáles son las principales tareas de recepción?

Todo comienza en el sector de recepción, con el **primer contacto con el cliente**. Nuestra tarea es recibirlo cordialmente, darle la bienvenida y brindarle una atención cálida desde el primer momento.

En situaciones de alta demanda, cuando no contamos con mesas disponibles de inmediato, **registraremos al cliente en la lista de espera y le entregaremos un bipper** para que pueda aguardar su turno con mayor comodidad. De esta manera, le brindamos la libertad de recorrer Mirador Waikiki, disfrutar de un trago o conocer los distintos espacios mientras espera a ser ubicado.

### Detrás de cada recibimiento, hay un equipo trabajando de manera coordinada

1. Una recepcionista se encarga de **levantar la mesa** una vez que los clientes se retiran.
2. Otra **limpia la superficie** y verifica que quede en óptimas condiciones.
3. Luego, otra integrante del equipo se ocupa de **volver a armarla**, asegurándose de que esté correctamente presentada y lista para recibir a los próximos clientes.
4. Por último, una recepcionista será responsable de **acompañar al cliente hasta su mesa**, procurando que la experiencia sea agradable desde el primer contacto hasta el momento en que toma su lugar. Durante el recorrido, podrá comentarle información de interés sobre el establecimiento, sus espacios y los servicios disponibles, siempre que resulte oportuno.

Cada una de estas tareas forma parte de **una misma cadena de trabajo**. La coordinación entre las integrantes del equipo nos permite optimizar los tiempos de espera, mantener el orden y la presentación del establecimiento y garantizar que cada cliente reciba una atención cordial y organizada.

> La recepción no consiste únicamente en ubicar clientes: consiste en **gestionar la experiencia** desde su llegada hasta que se encuentra cómodamente instalado.

---

## TAREAS EXTRAS

### Colaboración y mantenimiento del salón

Hacemos especial hincapié no solo en la coordinación interna del equipo de recepción, sino también en la **colaboración con el resto del equipo del salón**. Nuestro objetivo es contribuir al correcto funcionamiento de todo el establecimiento, entendiendo que el trabajo en equipo va más allá de las tareas específicas de cada sector.

Es fundamental mantener los **descansos** —espacios destinados a disponer la vajilla y los elementos necesarios para el armado de las mesas— **abastecidos y organizados en todo momento**. Esto permite agilizar el rearmado del salón y evitar demoras innecesarias durante el servicio.

Asimismo, debemos colaborar activamente con el mantenimiento del orden y la prolijidad visual del salón. La limpieza de las mesas, la correcta disposición de los elementos y el abastecimiento de los descansos son aspectos esenciales para garantizar una presentación adecuada del espacio.

### Puntos fundamentales a tener en cuenta

- Mantener el salón ordenado y visualmente prolijo.
- Verificar que las mesas estén limpias y en condiciones para recibir a los clientes.
- Mantener los descansos organizados, armados y abastecidos en todo momento.
- Colaborar con el equipo del salón cuando sea necesario, anticipándonos a sus necesidades.
- Detectar y resolver cualquier situación que pueda afectar el orden, la presentación o el correcto funcionamiento del servicio.

La recepción también es **responsable de cuidar la imagen general del salón**. Mantener estos espacios en condiciones no es una tarea aislada ni exclusiva de otro sector, sino una responsabilidad compartida que contribuye directamente a la experiencia de nuestros clientes y al buen funcionamiento del equipo.

---

## CIERRE — EL COMPROMISO DE RECEPCIÓN

Ser parte del equipo de recepción de Mirador Waikiki implica mucho más que cumplir con una serie de tareas. Significa asumir el compromiso de brindar una experiencia de calidad, comprender las necesidades de nuestros clientes y trabajar de manera coordinada para garantizar el correcto funcionamiento de todo el establecimiento.

Cada acción, por pequeña que parezca, tiene un impacto en la experiencia del cliente y en el trabajo de nuestras compañeras. Por eso, buscamos desarrollar una mirada **atenta, resolutiva y colaborativa**, que nos permita anticiparnos a las necesidades, actuar con iniciativa y encontrar soluciones incluso en los momentos de mayor demanda.

La **predisposición, el respeto, la comunicación y la responsabilidad** son pilares fundamentales de nuestro trabajo. No se trata únicamente de hacer bien nuestras propias tareas, sino también de estar disponibles para acompañar al equipo, colaborar con otros sectores y comprender que el resultado final depende del compromiso de cada integrante.

Recordemos que **la recepción representa el primer contacto** de muchos clientes con Mirador Waikiki y que, a través de nuestra actitud, organización y calidez, contribuimos a transmitir la identidad del lugar.

> Nuestro objetivo no es simplemente recibir clientes, sino hacer que cada persona se sienta bienvenida; no es solamente cumplir tareas, sino trabajar con un propósito común; y no es únicamente formar parte de un equipo, sino construirlo día a día con compromiso, compañerismo y vocación de servicio.

Porque la excelencia no se logra a través de una sola persona, sino mediante un equipo que comparte los mismos valores, trabaja en la misma dirección y entiende que **cada detalle hace la diferencia**.
$guia$
  )
),
actualizadas AS (
  UPDATE guides g
  SET description = n.description, content = n.content, puestos = n.puestos
  FROM nuevas n
  WHERE g.title = n.title
  RETURNING g.title
)
INSERT INTO guides (title, description, content, puestos)
SELECT n.title, n.description, n.content, n.puestos
FROM nuevas n
WHERE NOT EXISTS (SELECT 1 FROM guides g WHERE g.title = n.title);

-- 2) Sumarlas al final del recorrido de su puesto.
INSERT INTO guide_paths (puesto, guide_id, orden, etiqueta)
SELECT p.puesto,
       g.id,
       coalesce((SELECT max(orden) FROM guide_paths x WHERE x.puesto = p.puesto), 0) + 1,
       'Guía ' || (coalesce((SELECT count(*) FROM guide_paths x
                             WHERE x.puesto = p.puesto AND x.etiqueta NOT LIKE '%bis%'), 0) + 1)::text
FROM (VALUES ('Barra', 'MW - Apertura de Barra'),
             ('Recepción', 'MW - Guía de Recepción')) AS p(puesto, titulo)
JOIN guides g ON g.title = p.titulo
ON CONFLICT (puesto, guide_id) DO NOTHING;

-- Freno: cada guía tiene que existir una sola vez y estar en su recorrido.
DO $$
BEGIN
  IF (SELECT count(*) FROM guides WHERE title = 'MW - Apertura de Barra') <> 1
     OR (SELECT count(*) FROM guides WHERE title = 'MW - Guía de Recepción') <> 1 THEN
    RAISE EXCEPTION 'Las guías no quedaron cargadas una sola vez cada una: se cancela.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
                 WHERE gp.puesto = 'Barra' AND g.title = 'MW - Apertura de Barra')
     OR NOT EXISTS (SELECT 1 FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
                    WHERE gp.puesto = 'Recepción' AND g.title = 'MW - Guía de Recepción') THEN
    RAISE EXCEPTION 'Las guías no quedaron en el recorrido de su puesto: se cancela.';
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion: el recorrido completo de Barra y Recepción.
-- ------------------------------------------------------------
SELECT gp.puesto, gp.orden, gp.etiqueta, g.title AS guia, length(g.content) AS caracteres
FROM guide_paths gp JOIN guides g ON g.id = gp.guide_id
WHERE gp.puesto IN ('Barra', 'Recepción')
ORDER BY gp.puesto, gp.orden;
