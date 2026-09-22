-- ============================================================
-- Correcciones a la Guia de Tortas y Tartas
--
-- Vienen de pasteleria. La guia tenia productos que ya no existen y datos
-- que no coincidian con las recetas reales:
--
--   1. La Torta Moka ya no esta: se saca.
--   2. El almibar de cafe NO lleva cascara de naranja.
--   3. Años Locos no es una torta: es un brownie con dulce de leche y crema.
--   4. El Blondie no lleva nueces ni dulce de leche.
--   5. El Cheesecake de Dulce de Leche no existe: se saca.
--   6. La Tarta de Manzana lleva crumble, no enrejado.
--   7. La Tarta de Ricota no existe: se saca.
--   8. La Crema Pastelera NO lleva harina (sale de la receta de pasteleria).
--
-- Se agregan ademas el Cheesecake de Arandanos y la Crema de Limon, que si
-- estan y no figuraban, y los ingredientes de cada producto (sin cantidades:
-- el mozo necesita saber que lleva para venderlo y para avisar de los frutos
-- secos, no cuantos gramos). Se suma la seccion de ALFAJORES con los tres que
-- tenemos receta: pistacho, cacao y nuez.
--
-- El examen tenia CUATRO preguntas que con esto quedaban mal, y se corrigen
-- en el mismo archivo. Se conservan los ids de las preguntas, asi que no se
-- pierde ninguna respuesta de los examenes ya rendidos.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

-- 1) El contenido corregido.
UPDATE guides
SET content = '# Guía de Tortas y Tartas
**Mirador Waikiki — 2026**

## Conceptos Fundamentales

### ¿Cuál es la diferencia entre una torta y una tarta?

| Característica | Torta | Tarta |
|---|---|---|
| Base | Bizcochuelo en capas | Masa sablée (masa firme) |
| Estructura | Capas de relleno entre bizcochuelos | Relleno directo sobre la masa |
| Textura base | Esponjosa y húmeda | Crocante y firme |
| Ejemplos | Red Velvet, Bruce, Chocotorta | Tarta de Manzana, Lemon Pie |

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
Ingredientes: **azúcar, agua y café soluble**.
Se usa para embeber bizcochuelos y aportarles humedad y sabor.

### Crema Pastelera
Ingredientes: **leche, azúcar, huevos, maicena y esencia de vainilla**.
Base de múltiples rellenos y tartas. Se cocina a fuego medio hasta espesar.

### Crema de Limón
Ingredientes: **yemas, huevos, azúcar, jugo de limón, agua, fécula de maíz, harina, manteca y una pizca de sal**.
Se cocina a fuego directo. La manteca final se agrega en frío. Es el relleno del Lemon Pie.

### Ganache de Chocolate
Mezcla de chocolate cobertura y crema de leche caliente. Se usa como cobertura, relleno o glaseado según la consistencia.

### Ganache de Pistacho
Ingredientes: **chocolate, crema de leche y pasta de pistacho**.

### Bizcochuelo
Ingredientes: **huevos, azúcar, aceite, leche, harina y polvo para hornear**.
Es la base de las tortas de capas.

---

## TORTAS

### Red Velvet
**Descripción:** Torta de bizcochuelo rojo aterciopelado con frosting de queso crema.
- **Color:** aportado por **colorante rojo y cacao** (no frutos rojos naturales ni remolacha).
- **Capas:** bizcochuelo rojo + frosting de queso crema entre cada capa y en la cobertura.
- **Presentación:** exterior cubierto de frosting blanco cremoso, decorado con migajas de bizcochuelo rojo.
- **Lleva:** leche, huevos, aceite, azúcar, vainilla, sal, harina, cacao, colorante y vinagre.
- Sugerencia al cliente: sabor suave, no muy dulce, ideal para quienes no son fans del chocolate intenso.

### Torta Bruce
**Descripción:** Torta de chocolate intenso embebida con almíbar de café y cubierta con ganache de chocolate.
- **Bizcochuelo:** de chocolate negro.
- **Almíbar:** de café (aporta humedad y contraste aromático).
- **Cobertura:** ganache de chocolate cobertura.
- **Lleva:** harina, cacao, azúcar, bicarbonato, polvo para hornear, huevos, aceite, leche con limón y café.
- Sugerencia: para amantes del chocolate. Intensa y húmeda.

### Blondie
**Descripción:** Torta basada en **brownie de chocolate blanco** (blondie).
- Base y capas de brownie de chocolate blanco (sin cacao, con manteca y azúcar rubia).
- **No lleva nueces ni dulce de leche.**
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
- **Diferencia clave:** es el único que va al horno. Los demás cheesecakes del menú son fríos.

### Cheesecake de Arándanos
- Versión fría, sin horno. Toma cuerpo con **agar agar**.
- Relleno: queso crema y crema, con **chocolate blanco**.
- Terminación: **compota de arándanos**.

### Cheesecake de Oreo
- Base de galletitas Oreo molidas.
- Relleno de queso crema con chips de Oreo.
- Cobertura de chocolate y galletas Oreo enteras.

---

## TARTAS

### Tarta de Manzana
- Base: masa sablée.
- Relleno: manzanas caramelizadas con canela, azúcar y manteca.
- **Cubierta: crumble.** No lleva enrejado.
- Se sirve tibia con crema chantilly o helado de americana.

### Lemon Pie
- Base: masa sablée.
- Relleno: crema de limón — limón, huevos, azúcar, manteca.
- Cobertura: merengue italiano flameado al momento del despacho.
- Sugerencia: fresca y ácida. Ideal para el verano.

---

## OTROS POSTRES

### Años Locos
**No es una torta:** es un **brownie con dulce de leche y crema**.
- **El brownie lleva:** nueces, chocolate semiamargo, manteca, huevos, azúcar, sal, vainilla y harina.
- Sugerencia: contundente y bien dulce. Para compartir o para quien quiere algo chocolatoso sin ser una porción de torta.

### Brownie
**Descripción:** Brownie clásico, húmedo y con nueces.
- **Lleva:** nueces, chocolate semiamargo, manteca, huevos, azúcar, sal, vainilla y harina.
- Es la base de Años Locos.

---

## ALFAJORES

> Ojo: **los alfajores llevan frutos secos**. El de pistacho y el de nuez no son aptos para alérgicos, y el de cacao lleva ralladura de naranja.

### Alfajor de Pistacho
- **Lleva:** manteca pomada, azúcar, huevo, harina 0000, vainilla y pistacho triturado.
- Sugerencia: el más distinto de los tres. Sabor a pistacho marcado, textura arenosa.

### Alfajor de Cacao
- **Lleva:** manteca, azúcar, miel, ralladura de naranja, huevo, harina, almidón, cacao, polvo de hornear y bicarbonato.
- La **ralladura de naranja** es lo que lo diferencia: aporta un fondo cítrico al chocolate.

### Alfajor de Nuez
- **Lleva:** manteca, azúcar, miel, ralladura de naranja, huevo, harina, polvo de hornear y nueces procesadas.
- Sugerencia: parecido al de cacao pero sin chocolate, con la nuez como protagonista.

---

## ¿Qué esperamos de vos?

- Conocer cada torta y tarta del menú para poder describirla al cliente con seguridad.
- Identificar correctamente los ingredientes clave (los que diferencian un producto de otro).
- Saber sugerir según el perfil del cliente (amante del chocolate, prefiere algo liviano, etc.).
- Manipular y presentar cada porción de forma prolija y a la temperatura correcta.

> Si un cliente pregunta por algo que no está en esta guía, consultá con pastelería antes de ofrecerlo. No inventes.
'
WHERE title ILIKE '%Tortas y Tartas%';

-- 2) Las preguntas que quedaron desactualizadas.
UPDATE exam_questions SET correct_option = 2
 WHERE id = '22be52c9-d982-42f1-832a-100c7618eacb';

UPDATE exam_questions SET options = '["Leche, azúcar, huevos, maicena y vainilla", "Leche, huevos, azúcar, maicena y harina 0000", "Crema de leche, azúcar y yemas de huevo batidas", "Solo leche, maicena y un poco de azúcar"]'::jsonb,
       correct_option = 0
 WHERE id = '9acb8883-999e-4e09-ae90-8c90040b7bc0';

UPDATE exam_questions SET question = '¿Qué lleva por encima la Tarta de Manzana?',
       options = '["Crumble, que se hornea por encima", "Masa sablée enrejada, como celosía", "Merengue italiano flameado al salir", "Una capa de crema pastelera y canela"]'::jsonb,
       correct_option = 0
 WHERE id = '2de8c01a-9579-466b-98cb-b87558a78861';

UPDATE exam_questions SET options = '["Red Velvet", "Años Locos", "Chocotorta", "Torta Bruce"]'::jsonb,
       correct_option = 3
 WHERE id = '298699b3-fe40-4027-a4e6-93da8445a24e';

-- Freno: si alguna pregunta no existe, algo cambio y conviene mirarlo.
DO $$
DECLARE faltan int;
BEGIN
  SELECT count(*) INTO faltan
  FROM (VALUES
    ('22be52c9-d982-42f1-832a-100c7618eacb'),
    ('9acb8883-999e-4e09-ae90-8c90040b7bc0'),
    ('2de8c01a-9579-466b-98cb-b87558a78861'),
    ('298699b3-fe40-4027-a4e6-93da8445a24e')
  ) AS v(id)
  WHERE NOT EXISTS (SELECT 1 FROM exam_questions q WHERE q.id = v.id::uuid);
  IF faltan > 0 THEN
    RAISE EXCEPTION 'Faltan % preguntas del examen: se cancela todo.', faltan;
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion 1: las cuatro columnas tienen que dar false.
-- ------------------------------------------------------------
SELECT content LIKE '%Torta Moka%'                   AS quedo_la_moka,
       content LIKE '%cáscara de naranja%'           AS quedo_la_cascara,
       content LIKE '%Cheesecake de Dulce de Leche%' AS quedo_ese_cheesecake,
       content LIKE '%Tarta de Ricota%'              AS quedo_la_ricota,
       length(content)                               AS caracteres
FROM guides WHERE title ILIKE '%Tortas y Tartas%';

-- ------------------------------------------------------------
-- Verificacion 2: las respuestas corregidas, para leerlas.
-- ------------------------------------------------------------
SELECT q.question AS pregunta, q.options ->> q.correct_option AS respuesta_correcta
FROM exam_questions q JOIN exams e ON e.id = q.exam_id
WHERE e.title = 'Examen: Tortas y Tartas'
  AND q.id::text IN ('22be52c9-d982-42f1-832a-100c7618eacb', '9acb8883-999e-4e09-ae90-8c90040b7bc0', '2de8c01a-9579-466b-98cb-b87558a78861', '298699b3-fe40-4027-a4e6-93da8445a24e');
