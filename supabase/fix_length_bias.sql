-- ============================================================
-- Arreglo del sesgo por LARGO en las opciones
--
-- Problema detectado: en la mayoria de las preguntas la respuesta
-- correcta era, de lejos, la opcion mas larga. Promedio de la correcta:
-- 40 caracteres. Promedio de las incorrectas: 22. Asi se podia aprobar
-- sin leer la guia, eligiendo siempre la opcion mas larga.
--
-- Esto NO se arregla barajando las opciones: hay que reescribirlas.
-- En las 62 preguntas de abajo se emparejaron los largos: los
-- distractores se completaron con detalle plausible (lo que ademas los
-- hace mas creibles) y, donde hacia falta, se recorto la correcta sin
-- perder precision. La respuesta correcta sigue diciendo lo mismo.
--
-- Resultado: en ninguna de estas preguntas la correcta es la opcion
-- mas larga, y los promedios quedan parejos.
--
-- NOTA: solo se tocaron las preguntas que sobreviven al recorte a 30 de
-- fix_exam_length_sin_freno.sql. Da igual en que orden se corran los dos
-- archivos: este no cambia el orden ni los ids, asi que no altera cuales
-- quedan. Si el recorte NO se corre, van a quedar preguntas con sesgo
-- entre las que sobran.
--
-- Correr entero en Supabase -> SQL Editor. Es idempotente.
-- ============================================================

BEGIN;

-- ---------- Calienta Platos, Ensaladas & Postres, Tortas y Tartas ----------

UPDATE exam_questions SET options = '["Mantener la temperatura de los platos hasta que el mozo los retira", "Preparar y emplatar junto con el equipo de cocina", "Ser la última barrera de calidad antes de que llegue al cliente", "Verificar la presentación visual antes del despacho"]'::jsonb,
       correct_option = 2
 WHERE id = '05615101-ce02-42d4-9020-9c6d3b14751d';

UPDATE exam_questions SET options = '["Un puesto temporal que se cubre según la demanda del turno", "Un puesto activo que exige atención, velocidad y criterio estético", "Un puesto auxiliar, sin responsabilidad sobre la calidad de lo que despacha", "Un puesto pasivo, de espera hasta que bajen los platos"]'::jsonb,
       correct_option = 1
 WHERE id = '45be147c-3cfa-48f2-a9a9-29fdbb3595b6';

UPDATE exam_questions SET options = '["Solo en temporada baja, cuando hay poco movimiento de salón", "Al terminar el turno, si no se vuelven a usar ese día", "Únicamente cuando el encargado de turno lo indica", "Nunca: quedan encendidos para el turno siguiente"]'::jsonb,
       correct_option = 1
 WHERE id = '6830e45d-0a66-4e07-a26f-a3daaca16d4c';

UPDATE exam_questions SET options = '["Consultar con cocina si se puede resolver sin bajar el plato", "Despacharlo igual, para no demorar todavía más la mesa", "Devolverlo a cocina de inmediato, sin consultar nada", "Llamar al encargado de salón antes de tomar cualquier decisión"]'::jsonb,
       correct_option = 0
 WHERE id = '7d9c0dbc-7f01-4b36-bbdc-5859fc45179f';

UPDATE exam_questions SET options = '["Se derivan al sector que corresponda", "Se devuelven a cocina por el montacargas", "Se descartan si nadie los reclama", "Se guardan en el propio sector"]'::jsonb,
       correct_option = 0
 WHERE id = '853f4f16-ee94-4037-8c04-16d3b752ddda';

UPDATE exam_questions SET options = '["Platos, tazas, vasos, bandejas y repasadores limpios de repuesto", "Solo limones, servilletas y cubiertos de uso general", "Limones, cubiertos de trinchar, servilletas, trapo y brotes", "Salsas, queso rallado, cubiertos y film para cubrir"]'::jsonb,
       correct_option = 2
 WHERE id = 'e89c896f-971e-45b8-b745-ea6770b78e63';

UPDATE exam_questions SET options = '["Funciona más rápido y las seca mejor", "No pasa nada, está preparada justamente para eso", "Las hojas quedan mejor escurridas", "Puede romperse o dejar de funcionar bien"]'::jsonb,
       correct_option = 3
 WHERE id = '42598cde-04cf-4bca-b9fe-5b4c8419507b';

UPDATE exam_questions SET options = '["Mayonesa, jugo de limón y pimienta negra", "Yogur natural, ajo y hierbas frescas", "Crema de leche, queso parmesano, ajo y anchoas", "Mayonesa, mostaza, alcaparras, atún y aceto"]'::jsonb,
       correct_option = 3
 WHERE id = '515fc24f-c7b8-4b6a-aa36-f373d8b0cf85';

UPDATE exam_questions SET options = '["Lavarlas una por una bajo agua corriente", "Llenar la bacha con agua fría y vinagre", "Remojarlas en agua tibia unos minutos", "Centrifugarlas directamente, sin remojo"]'::jsonb,
       correct_option = 1
 WHERE id = '7130eb36-517f-4dbe-acbb-f792f406cf75';

UPDATE exam_questions SET options = '["Rúcula y salmón ahumado, cherry alrededor, zanahoria y alcaparras", "Lechuga y rúcula, cherry, queso crema al centro, langostinos y crutons", "Lechuga, tomate en gajos, mariscos salteados, morrón y cebolla morada", "Crutons de base, langostinos, lechuga, cherry y queso crema por encima de todo"]'::jsonb,
       correct_option = 1
 WHERE id = '721701d5-bbc2-49fe-9de4-8c9048c5b274';

UPDATE exam_questions SET options = '["Rúcula, burrata, cherry, nueces, tomates confitados y aceto", "Lechuga, rúcula, salmón ahumado, queso crema, zanahoria, alcaparras y cherry", "Lechuga, atún al natural, tomate, huevo duro, aceitunas, cebolla y alcaparras", "Lechuga, langostinos, cherry, crutons, queso crema y alcaparras"]'::jsonb,
       correct_option = 1
 WHERE id = 'bfdaca13-5256-4b52-a491-59431d84f708';

UPDATE exam_questions SET options = '["En la bacha, sumergidos con el resto de la vajilla", "En cualquier lugar libre de la mesada de trabajo", "En el cajón general, junto con los demás utensilios", "En su lugar asignado: frapera o soporte magnético"]'::jsonb,
       correct_option = 3
 WHERE id = 'ce82d701-259f-4774-b520-b20726159ea8';

UPDATE exam_questions SET options = '["Harina, huevos, manteca, azúcar, ralladura de limón y vainilla", "Harina, agua bien fría, sal gruesa y manteca fría cortada en cubos", "Harina, leche tibia, huevos, azúcar y polvo para hornear", "Galletas molidas, manteca derretida y azúcar impalpable"]'::jsonb,
       correct_option = 0
 WHERE id = '21888c2f-fab5-4dcd-a9b5-6df7edc6363a';

UPDATE exam_questions SET options = '["Azúcar, agua y café soluble bien cargado", "Solo café bien cargado y agua caliente", "Azúcar, agua, café y cáscara de naranja", "Café, leche condensada y caramelo líquido"]'::jsonb,
       correct_option = 2
 WHERE id = '22be52c9-d982-42f1-832a-100c7618eacb';

UPDATE exam_questions SET options = '["Frutos rojos en el relleno", "Dulce de leche repostero", "Maracuyá en la cobertura", "Café soluble en la crema"]'::jsonb,
       correct_option = 3
 WHERE id = '2de8c01a-9579-466b-98cb-b87558a78861';

UPDATE exam_questions SET options = '["Queso crema, azúcar impalpable y esencia de vainilla", "Ricota tamizada, azúcar impalpable y esencia de vainilla", "Manteca, azúcar impalpable y queso crema", "Crema de leche batida con queso crema y azúcar"]'::jsonb,
       correct_option = 2
 WHERE id = '7c2900b4-94e2-44e9-b0c4-1c8a61e7f8eb';

UPDATE exam_questions SET options = '["El cobertura lleva manteca de cacao; el baño, grasas vegetales", "No hay diferencia técnica entre uno y otro, solo de marca", "El cobertura es más dulce y de color bastante más oscuro que el baño", "Solo cambia el precio: el resultado final es el mismo"]'::jsonb,
       correct_option = 0
 WHERE id = '925e90ad-9700-4ee6-bc0c-bfb00c4ee9bc';

UPDATE exam_questions SET options = '["Leche, fécula de maíz y esencia de vainilla", "Crema de leche, azúcar y yemas de huevo", "Solo leche, maicena y un poco de azúcar", "Leche, huevos, azúcar, maicena y harina"]'::jsonb,
       correct_option = 3
 WHERE id = '9acb8883-999e-4e09-ae90-8c90040b7bc0';

UPDATE exam_questions SET options = '["Brownie húmedo con dulce de leche repostero", "Masa sablée con cacao amargo y manteca", "Bizcochuelo de chocolate embebido en café", "Chocolinas, dulce de leche y queso crema"]'::jsonb,
       correct_option = 3
 WHERE id = 'c8f952cb-fcfb-4275-906f-a23213e50380';

UPDATE exam_questions SET options = '["La torta siempre lleva frutas frescas y la tarta nunca las lleva", "No hay diferencia real, son dos nombres para lo mismo", "La torta usa bizcochuelo en capas; la tarta, masa sablée firme", "La torta es siempre dulce y la tarta puede ser salada"]'::jsonb,
       correct_option = 2
 WHERE id = 'cf070c2c-debd-4e44-8ed1-eb14a887bc91';

UPDATE exam_questions SET options = '["Es el único que va cocido al horno", "Se sirve bien frío y con frutos secos", "Tiene un corazón de dulce de leche", "Lleva base de galletitas Oreo molidas"]'::jsonb,
       correct_option = 0
 WHERE id = 'f9e87c19-4b88-4284-b94b-428f83cacb79';

-- ---------- Platos e Ingredientes ----------

UPDATE exam_questions SET options = '["Langostinos, gambas, calamar y pesca blanca rebozada con limón", "Rabas, mejillones, vieiras y langostinos salteados al ajillo", "Rabas, langostinos y cornalitos con salsa tártara aparte", "Rabas, calamarettes, cornalitos, pesca blanca y langostinos"]'::jsonb,
       correct_option = 3
 WHERE id = 'f21f2b4d-7c56-4836-ab44-77724f81f637';

UPDATE exam_questions SET options = '["Arroz azafranado con pollo, lechuga, champiñones y jamón, gratinado con crema y queso", "Arroz blanco con pollo, verduras salteadas y salsa blanca gratinada al horno", "Arroz con mariscos, azafrán y morrones asados, gratinado al horno con crema y queso rallado", "Risotto cremoso de vegetales de estación, gratinado con parmesano, crema y manteca"]'::jsonb,
       correct_option = 0
 WHERE id = '7effb670-5d61-438a-bb12-2f640d78b4b9';

UPDATE exam_questions SET options = '["En aceite de oliva con ajo y perejil picado", "En fumet de pescado, vino blanco y manteca", "En crema de leche reducida con echalotes", "En salsa pomodoro con un toque de ají"]'::jsonb,
       correct_option = 1
 WHERE id = '2da3e487-aa18-4d69-9e78-c7916a336fdc';

UPDATE exam_questions SET options = '["Crema de leche, jugo de limón y cúrcuma", "Crema de leche, ralladura de limón y albahaca", "Manteca, jugo de limón, alcaparras y perejil", "Crema de leche, azafrán y un toque de vino"]'::jsonb,
       correct_option = 0
 WHERE id = '89b24a02-c0da-4c27-86d4-d0dadf33271a';

UPDATE exam_questions SET options = '["En ríos y lagos del sur de la Patagonia", "En aguas cálidas y poco profundas del Caribe", "En la costa del Pacífico, frente a Chile y Perú", "En aguas profundas y frías del Atlántico Sur"]'::jsonb,
       correct_option = 3
 WHERE id = '6c2f93ce-fe08-4602-9d76-443b2560e128';

UPDATE exam_questions SET options = '["Hirviendo el pescado entero con sal gruesa, laurel y cebolla hasta que se deshaga por completo", "Reduciendo vino blanco con mariscos y manteca hasta que espese bien", "Hirviendo lentamente recortes de langostinos, piel y cabeza de pescado con vegetales", "Disolviendo un concentrado comercial de pescado en agua bien caliente"]'::jsonb,
       correct_option = 2
 WHERE id = 'be12a2d0-9ff5-4b4b-a490-293d0deb04d4';

UPDATE exam_questions SET options = '["De la parte superior del cuello", "De la pata trasera, sobre el cuadril", "Del lomo, a la altura del costillar", "Del costillar, entre las costillas"]'::jsonb,
       correct_option = 0
 WHERE id = '1112d7ed-91e8-44b8-bb66-60f6965d0423';

UPDATE exam_questions SET options = '["Una reducción de crema, manteca y hongos secos hidratados en vino blanco", "Una reducción de caldo de carne con verduras y vino, espesa y oscura", "Una salsa de tomate concentrada con vino tinto y hierbas", "Un fondo de pescado reducido con echalotes y manteca fría"]'::jsonb,
       correct_option = 1
 WHERE id = '7241fadc-c2d1-4a23-b2fe-2d6d758a5e16';

UPDATE exam_questions SET options = '["Sal, pimienta y jugo de limón", "Ajo, perejil y aceite de oliva", "Chimichurri y sal gruesa", "Sal, pimienta y salsa de soja"]'::jsonb,
       correct_option = 3
 WHERE id = '3f39eb55-6f60-406e-a73c-eef7b73b0237';

UPDATE exam_questions SET options = '["Solo en temporada de verano, de diciembre a marzo inclusive", "Solo para eventos privados reservados con anticipación", "Todos los sábados y domingos del año, y todos los días en temporada", "De jueves a domingo durante todo el año, y también los feriados largos"]'::jsonb,
       correct_option = 2
 WHERE id = '9c5eb77d-de83-41e4-9ca1-b573259c0f6b';

UPDATE exam_questions SET options = '["Que una vez sentado ya no se puede cambiar de lugar", "Que espere a que se libere otra mesa del mismo sector", "Que llamás a recepción para que puedan reubicarlos", "Que lo consulte directamente con el encargado de salón"]'::jsonb,
       correct_option = 2
 WHERE id = 'e95c78bb-f420-40d3-a4b8-264741f2e003';

UPDATE exam_questions SET options = '["Sí, hay una bajada propia, pero es solo para huéspedes del hotel", "Sí, se baja por el balcón directamente hasta el sector de sombrillas del complejo", "No, hay que ir en auto hasta el balneario más cercano", "No, pero se accede a la playa pública por las escaleras blancas de la salida"]'::jsonb,
       correct_option = 3
 WHERE id = 'a1eb9eb3-c141-4140-b380-ecb4d5b00a5c';

-- ---------- Guia para Nuevos y No Tan Nuevos ----------

UPDATE exam_questions SET options = '["Por la administrativa que está en recepción", "Por cualquier mozo que esté en el salón", "Por un encargado de salón (Facundo o Enzo)", "Por el jefe de cocina, que organiza el ingreso"]'::jsonb,
       correct_option = 2
 WHERE id = '5cda2412-8d17-411f-b1ff-f6d698e65d74';

UPDATE exam_questions SET options = '["Porque las propinas se reparten entre todos los sectores del local por partes iguales", "Porque todos cobran lo mismo, sin importar el puesto que ocupen", "Porque los turnos se arman en conjunto entre encargados y personal", "Porque podés ser excelente en tu tarea, pero si no colaborás el equipo no funciona"]'::jsonb,
       correct_option = 3
 WHERE id = '1a44661b-bc9c-4b9d-8a62-7b845e35ed85';

UPDATE exam_questions SET options = '["Media hora de anticipación", "5 minutos antes", "Al menos 10 minutos", "20 minutos antes"]'::jsonb,
       correct_option = 2
 WHERE id = '3a89943a-badc-40aa-ad0f-0e4211512a66';

UPDATE exam_questions SET options = '["Solo durante el descanso y fuera del edificio", "No, está prohibido igual que el cigarrillo", "Sí, porque no genera humo ni olor", "Solo fuera del salón, en la zona de servicio"]'::jsonb,
       correct_option = 1
 WHERE id = 'ce922ee2-a066-46b2-b59c-b399ddec53bb';

UPDATE exam_questions SET options = '["Controlar el stock de cocina y pedir la reposición diaria", "Ser el nexo entre cocina y salón, gestionando comandas y runners", "Preparar las guarniciones y emplatar junto con la cocina caliente", "Mantener los platos calientes en el salón hasta que los sirva el mozo"]'::jsonb,
       correct_option = 1
 WHERE id = 'd158744b-62b6-4dc0-b5f9-8a6eacd56b5b';

UPDATE exam_questions SET options = '["Lavar vajilla, utensilios y ollas, y mantener el área ordenada", "Controlar el stock de bebidas y reponer las heladeras del salón", "Recibir a los clientes y acompañarlos hasta la mesa asignada", "Atender el balcón y ocuparse del armado de las sombrillas"]'::jsonb,
       correct_option = 0
 WHERE id = '9418f5a1-5620-4217-b484-0b6410fb9114';

UPDATE exam_questions SET options = '["Un desempeño que requiere corrección por parte del encargado de turno", "Una falta leve, que se registra pero no tiene consecuencias", "Un desempeño sobresaliente, por encima de lo que se espera", "Lo mínimo esperable: se valora, pero no se premia una obligación"]'::jsonb,
       correct_option = 3
 WHERE id = '490030e7-9118-43a7-be81-aa372e557297';

UPDATE exam_questions SET options = '["Consultar si pueden ayudar en algo más antes de sentarse", "Anticiparse a las necesidades y resolver sin esperar órdenes", "Cumplir en tiempo y forma todas las tareas asignadas del turno", "Esperar instrucciones claras para no equivocarse en la tarea"]'::jsonb,
       correct_option = 1
 WHERE id = 'd8ffc42b-4be5-484d-855a-72d6b17b8074';

UPDATE exam_questions SET options = '["Una falta de respeto al grupo y al trabajo", "Algo aceptable, siempre que se avise después", "Un descuido menor, que no se registra", "Un problema solo si se repite seguido"]'::jsonb,
       correct_option = 0
 WHERE id = '00ae0f4b-824c-484d-a387-2b5df700f2a6';

UPDATE exam_questions SET options = '["60% al salón y 40% al resto del personal", "50% al salón y 50% al resto del personal", "70% al salón y 30% al resto del personal", "40% al salón y 60% al resto del personal"]'::jsonb,
       correct_option = 0
 WHERE id = '190b6b21-38d5-43bc-817a-e44b0aee791f';

UPDATE exam_questions SET options = '["Pasarle el teléfono directo de los directores", "Decirle que no hacemos eventos en el complejo", "Derivarlo a Mar Eventos; hay tarjetas en recepción", "Explicarle vos mismo las opciones y los precios vigentes"]'::jsonb,
       correct_option = 2
 WHERE id = '02b1ccec-8f17-40b4-9298-68eb147bcae5';

UPDATE exam_questions SET options = '["30% en comidas, sin incluir bebidas", "50% en todo, sin ninguna excepción", "25% en todo el consumo del local", "50%, excepto bebidas alcohólicas"]'::jsonb,
       correct_option = 3
 WHERE id = '7128e8b1-7500-4227-a6bd-c14a7bb7b40a';

UPDATE exam_questions SET options = '["Todo el personal, en cualquier horario de ingreso", "Nadie: el desayuno no está incluido para el personal", "Solo quienes ingresan a las 7:30, 8:00 o 9:00 hs", "Solo los encargados de salón y los jefes de sector"]'::jsonb,
       correct_option = 2
 WHERE id = '00621198-3f4f-476a-922a-8a4dc2ebe471';

UPDATE exam_questions SET options = '["Delantal propio y guantes de servicio", "Destapador, lapicera y anotador", "Zapatos y medias negras de repuesto", "Ninguno: el local provee todo"]'::jsonb,
       correct_option = 1
 WHERE id = 'bbcee7ea-6da3-4e3f-8666-fe490df1ad11';

UPDATE exam_questions SET options = '["Le decís al cliente que no sabés y seguís", "Consultás la Guía de Platos e Ingredientes", "Preguntás al aire a ver si alguien contesta", "Improvisás algo parecido y después confirmás"]'::jsonb,
       correct_option = 1
 WHERE id = 'af589243-6336-4135-9f59-e498f59cfae5';

UPDATE exam_questions SET options = '["En la barra, siempre que no molestes al servicio", "En el vestuario, hasta la hora exacta de fichada", "En cocina, ayudando en lo que haga falta", "Fuera del área de servicio, donde no interfieras"]'::jsonb,
       correct_option = 3
 WHERE id = '9f5baa2f-7cb4-46d2-b2fa-9ac489cdfc8a';

UPDATE exam_questions SET options = '["Nada especial: podés quedarte como estás", "Sacarte el uniforme y estar fuera de las zonas de trabajo", "Pedir permiso en recepción antes de quedarte", "Quedarte en la barra, sin ocupar ninguna mesa del salón principal"]'::jsonb,
       correct_option = 1
 WHERE id = '062fd7fc-ba42-4fe4-a8a0-5af756799584';

-- ---------- Mozos, Runners y Comisses ----------

UPDATE exam_questions SET options = '["Un servicio formal y protocolar en todo momento, sin ninguna excepción", "Un servicio lo más rápido posible, aunque se pierda el trato", "Que los clientes vivan una experiencia relajada pero bien atendida", "Un servicio económico y eficiente, con el menor costo posible"]'::jsonb,
       correct_option = 2
 WHERE id = 'bdebf790-d756-41e0-9366-45627a339331';

UPDATE exam_questions SET options = '["Puede tener una reducción temporal de propina al 75% o 50%", "Solo se le da una advertencia verbal, sin ninguna otra consecuencia", "Nada: el porcentaje es fijo una vez que se asigna", "Se le descuenta el equivalente directamente del sueldo"]'::jsonb,
       correct_option = 0
 WHERE id = 'e28c6f93-b4c0-4250-9be1-a05e938b4ebe';

UPDATE exam_questions SET options = '["Solo la tablet, con el sistema de comandas cargado y actualizado del día", "La carta impresa y la pizarra con los menús del día", "Computadora encendida, rejilla, destapador, lapiceras y herramientas", "Solo la carta, porque el resto lo provee el encargado de turno"]'::jsonb,
       correct_option = 2
 WHERE id = '875c63d1-ae25-4685-aaff-d19b6a7766c8';

UPDATE exam_questions SET options = '["¿Van a pedir postre después?", "¿Necesitan más bebida?", "¿Les está gustando el lugar?", "¿Falta algo? (sal, pimienta)"]'::jsonb,
       correct_option = 3
 WHERE id = '0c0378e9-aff0-4770-a606-89ea7255fb2f';

UPDATE exam_questions SET options = '["Una actitud que no suma, pero que tampoco llega a ser grave para el resto del equipo", "Lo mínimo esperable del puesto, ni más ni menos", "Algo que se puede mejorar con tiempo y acompañamiento", "Algo que afecta gravemente al equipo o al cliente y puede derivar en sanción"]'::jsonb,
       correct_option = 3
 WHERE id = 'a850b0c5-5a34-45fb-a999-5d2fe1e3d0d2';

UPDATE exam_questions SET options = '["Llamar de inmediato al encargado para que intervenga", "Ignorar al cliente un rato hasta que se calme solo", "Ofrecer una bebida de cortesía sin consultarlo con nadie", "Intentar resolverlo solos, a cualquier costo y sin avisar"]'::jsonb,
       correct_option = 0
 WHERE id = '64e37519-2efb-4da7-bc60-3b77732af0e6';

UPDATE exam_questions SET options = '["Gorras personales, auriculares y piercings excesivos", "Llevar el pelo atado si lo tenés largo", "Usar calzado cerrado, cómodo y antideslizante", "Presentarse con el uniforme completo, limpio y planchado"]'::jsonb,
       correct_option = 0
 WHERE id = '55616de6-7722-4d12-857c-1bf0a9777447';

UPDATE exam_questions SET options = '["Conocer los platos del día y las sugerencias del chef", "Conocer solo los platos más vendidos de cada sección de la carta", "Saber cada ítem, recomendar con fundamento y dar confianza", "Saber los precios de memoria para agilizar la comanda"]'::jsonb,
       correct_option = 2
 WHERE id = '91bfdbb1-6c9f-41c7-8050-80e28885859c';

UPDATE exam_questions SET options = '["Cortar y servir piezas de carne en la mesa", "Preparar y presentar una bandeja de desayuno", "Servir el vino con la técnica correcta", "Flambear un postre delante del cliente"]'::jsonb,
       correct_option = 0
 WHERE id = '0707d150-8bb5-4057-8b5d-e8405245135c';

UPDATE exam_questions SET options = '["La variedad del menú y la cantidad de opciones", "La rapidez con la que sale cada uno de los platos de cocina", "Un mozo que no solo atiende bien: genera una experiencia", "Los precios bajos en comparación con la zona"]'::jsonb,
       correct_option = 2
 WHERE id = 'c6e8487b-632f-4950-88df-69c86a8638ad';

UPDATE exam_questions SET options = '["Esperar a que le enseñen, sin preguntar ni molestar a nadie", "Copiar lo que hacen los compañeros que tienen más experiencia en el puesto", "Hacer solo lo que le piden, cumpliendo con lo justo y nada más", "Interés genuino por aprender, escuchar devoluciones y aportar al equipo"]'::jsonb,
       correct_option = 3
 WHERE id = '3ddc6206-1a2f-45cf-b500-81ed9ac276d7';

UPDATE exam_questions SET options = '["Se pueden comentar con los compañeros durante el turno", "Se le cuentan al encargado para que entienda la situación", "Se dejan en la puerta: no pueden afectar el servicio", "Se resuelven durante el servicio, si es que queda tiempo"]'::jsonb,
       correct_option = 2
 WHERE id = '00a943cb-0cc5-4ca1-b8ff-0426d06172a6';

-- Freno: si algun id no existe, no se aplica nada.
DO $$
DECLARE faltan int;
BEGIN
  SELECT count(*) INTO faltan
  FROM (VALUES
    ('05615101-ce02-42d4-9020-9c6d3b14751d'),
    ('45be147c-3cfa-48f2-a9a9-29fdbb3595b6'),
    ('6830e45d-0a66-4e07-a26f-a3daaca16d4c'),
    ('7d9c0dbc-7f01-4b36-bbdc-5859fc45179f'),
    ('853f4f16-ee94-4037-8c04-16d3b752ddda'),
    ('e89c896f-971e-45b8-b745-ea6770b78e63'),
    ('42598cde-04cf-4bca-b9fe-5b4c8419507b'),
    ('515fc24f-c7b8-4b6a-aa36-f373d8b0cf85'),
    ('7130eb36-517f-4dbe-acbb-f792f406cf75'),
    ('721701d5-bbc2-49fe-9de4-8c9048c5b274'),
    ('bfdaca13-5256-4b52-a491-59431d84f708'),
    ('ce82d701-259f-4774-b520-b20726159ea8'),
    ('21888c2f-fab5-4dcd-a9b5-6df7edc6363a'),
    ('22be52c9-d982-42f1-832a-100c7618eacb'),
    ('2de8c01a-9579-466b-98cb-b87558a78861'),
    ('7c2900b4-94e2-44e9-b0c4-1c8a61e7f8eb'),
    ('925e90ad-9700-4ee6-bc0c-bfb00c4ee9bc'),
    ('9acb8883-999e-4e09-ae90-8c90040b7bc0'),
    ('c8f952cb-fcfb-4275-906f-a23213e50380'),
    ('cf070c2c-debd-4e44-8ed1-eb14a887bc91'),
    ('f9e87c19-4b88-4284-b94b-428f83cacb79'),
    ('f21f2b4d-7c56-4836-ab44-77724f81f637'),
    ('7effb670-5d61-438a-bb12-2f640d78b4b9'),
    ('2da3e487-aa18-4d69-9e78-c7916a336fdc'),
    ('89b24a02-c0da-4c27-86d4-d0dadf33271a'),
    ('6c2f93ce-fe08-4602-9d76-443b2560e128'),
    ('be12a2d0-9ff5-4b4b-a490-293d0deb04d4'),
    ('1112d7ed-91e8-44b8-bb66-60f6965d0423'),
    ('7241fadc-c2d1-4a23-b2fe-2d6d758a5e16'),
    ('3f39eb55-6f60-406e-a73c-eef7b73b0237'),
    ('9c5eb77d-de83-41e4-9ca1-b573259c0f6b'),
    ('e95c78bb-f420-40d3-a4b8-264741f2e003'),
    ('a1eb9eb3-c141-4140-b380-ecb4d5b00a5c'),
    ('5cda2412-8d17-411f-b1ff-f6d698e65d74'),
    ('1a44661b-bc9c-4b9d-8a62-7b845e35ed85'),
    ('3a89943a-badc-40aa-ad0f-0e4211512a66'),
    ('ce922ee2-a066-46b2-b59c-b399ddec53bb'),
    ('d158744b-62b6-4dc0-b5f9-8a6eacd56b5b'),
    ('9418f5a1-5620-4217-b484-0b6410fb9114'),
    ('490030e7-9118-43a7-be81-aa372e557297'),
    ('d8ffc42b-4be5-484d-855a-72d6b17b8074'),
    ('00ae0f4b-824c-484d-a387-2b5df700f2a6'),
    ('190b6b21-38d5-43bc-817a-e44b0aee791f'),
    ('02b1ccec-8f17-40b4-9298-68eb147bcae5'),
    ('7128e8b1-7500-4227-a6bd-c14a7bb7b40a'),
    ('00621198-3f4f-476a-922a-8a4dc2ebe471'),
    ('bbcee7ea-6da3-4e3f-8666-fe490df1ad11'),
    ('af589243-6336-4135-9f59-e498f59cfae5'),
    ('9f5baa2f-7cb4-46d2-b2fa-9ac489cdfc8a'),
    ('062fd7fc-ba42-4fe4-a8a0-5af756799584'),
    ('bdebf790-d756-41e0-9366-45627a339331'),
    ('e28c6f93-b4c0-4250-9be1-a05e938b4ebe'),
    ('875c63d1-ae25-4685-aaff-d19b6a7766c8'),
    ('0c0378e9-aff0-4770-a606-89ea7255fb2f'),
    ('a850b0c5-5a34-45fb-a999-5d2fe1e3d0d2'),
    ('64e37519-2efb-4da7-bc60-3b77732af0e6'),
    ('55616de6-7722-4d12-857c-1bf0a9777447'),
    ('91bfdbb1-6c9f-41c7-8050-80e28885859c'),
    ('0707d150-8bb5-4057-8b5d-e8405245135c'),
    ('c6e8487b-632f-4950-88df-69c86a8638ad'),
    ('3ddc6206-1a2f-45cf-b500-81ed9ac276d7'),
    ('00a943cb-0cc5-4ca1-b8ff-0426d06172a6')
  ) AS v(id)
  WHERE NOT EXISTS (SELECT 1 FROM exam_questions q WHERE q.id = v.id::uuid);
  IF faltan > 0 THEN
    RAISE EXCEPTION 'Faltan % preguntas: se cancela todo el cambio.', faltan;
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verificacion. "correcta_mas_larga" deberia rondar el 25% (el azar).
-- Antes de este arreglo daba entre 50% y 70% en cada examen.
-- ------------------------------------------------------------
SELECT e.title AS examen,
       COUNT(*) FILTER (WHERE lc > l2) AS correcta_mas_larga,
       COUNT(*) AS preguntas,
       ROUND(AVG(lc)) AS largo_prom_correcta,
       ROUND(AVG(l2_prom)) AS largo_prom_incorrectas
FROM (
  SELECT q.exam_id,
         length(q.options ->> q.correct_option) AS lc,
         (SELECT MAX(length(o)) FROM jsonb_array_elements_text(q.options) o
          WHERE o <> (q.options ->> q.correct_option)) AS l2,
         (SELECT AVG(length(o)) FROM jsonb_array_elements_text(q.options) o
          WHERE o <> (q.options ->> q.correct_option)) AS l2_prom
  FROM exam_questions q
  WHERE q.question_type = 'multiple_choice'
) s
JOIN exams e ON e.id = s.exam_id
GROUP BY e.title
ORDER BY correcta_mas_larga DESC;
