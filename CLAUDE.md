# Mirador Waikiki — app de capacitación del personal

App interna del restaurante Mirador Waikiki (Mar del Plata): guías de estudio con examen,
recorridos por puesto, horarios semanales, comida del personal, empleado del mes,
sugerencias y ranking. La usa el personal desde el celular y los encargados desde el
panel de admin.

**Todo en español rioplatense**: textos de la app, comentarios del código y mensajes de
commit. Voseo ("tocá", "elegí"). El dueño del proyecto es Enzo, encargado de salón.

## Stack

- Next.js 14 (App Router), server components y server actions (`'use server'`).
- Supabase: auth, Postgres con RLS, storage (bucket `guias`, público).
- Tailwind con colores de marca en `tailwind.config.ts`: `brand-dark` (fondo crema
  #dbd2b5), `brand-card` (blanco), `brand-accent` (verde #516d5c), `brand-text`,
  `brand-muted`, `brand-border`, `brand-success`, `brand-error`.
- La estética sigue a miradorwaikiki.com (decisión de Enzo): Poppins para todo, Bodoni Moda
  itálica (`font-serif`) para frases, títulos en verde semibold y apretados, etiquetas
  chiquitas en mayúscula espaciada, tarjetas blancas con marco crema y botones principales
  en píldora mayúscula (estos dos últimos salen de reglas globales en `app/globals.css`).
  Fotos del lugar en `public/fotos/` (sacadas de la web).
- Despliega en Vercel desde la rama `main` de este repo.

## Navegación (que se sienta rápida)

- Cada sección tiene `loading.tsx` con esqueleto (`components/navegacion/Esqueleto.tsx`):
  al tocar, aparece al instante su forma. Si se agrega una sección pesada, darle el suyo.
- `template.tsx` en dashboard y admin anima la entrada: entre pestañas del menú entra del
  costado según la dirección (`lib/navegacion.ts`), a lo de adentro sube apenas. Termina en
  `transform: none` (no romper elementos `fixed`).
- `BottomNav` y `AdminNav` marcan la sección al tocar, sin esperar a que cargue.
- **Secciones en fase beta** (`lib/beta.ts`, Enzo, 03/11: "se van a empezar a registrar el
  personal"): Resultados y Progresión.
  - El personal las ve en el menú (Resultados con la marca "Beta") y en la tarjeta de Inicio
    de los mozos. Adentro solo dice "Fase beta · Se habilitará próximamente" (`EnBeta`).
  - No se pide ningún dato: ni el ranking ni el nivel.
  - La cajera no ve que el porcentaje sale de Progresión.
  - Los encargados las siguen usando desde el panel de admin.
  - Para habilitar una, ponerla en `false` en `EN_BETA`.
- El logo de arriba (`LogoInicio`) lleva al inicio; si ya estás ahí, sube arriba de todo.
- Tirar para actualizar, como Instagram (`TirarParaActualizar`, en los layouts de dashboard y
  admin; instalada como app, el teléfono no lo trae): arriba de todo, arrastrar hacia abajo y
  soltar hace `router.refresh()`, sin perder lo escrito. No arranca sobre campos, la firma,
  ventanas (`role="dialog"`), lo que se arrastra ni lo marcado con `data-sin-tirar`. Las
  escuchas se ponen una sola vez (el router va en una ref): si se vuelven a poner al dibujar,
  el gesto se corta a la mitad. `globals.css` le saca al navegador su propio "tirar para
  recargar" (`overscroll-behavior-y: none`).
- `BarraProgreso` (en el layout raíz) arranca al tocar un link interno.
- `experimental.staleTimes` (30 s): volver a una sección reciente es instantáneo.
- Las páginas piden sus datos con `Promise.all`, no de a uno: Inicio hacía ~10 en fila.
- Letras con `next/font` (Poppins y Bodoni Moda), sin `@import` de Google.

## Cómo se entregan los cambios de base de datos

**No hay migraciones automáticas.** Cada cambio de base es un archivo en `supabase/`
que Enzo corre a mano en Supabase → SQL Editor. Reglas para esos archivos:

- Idempotentes: se tienen que poder correr dos veces sin romper nada ni duplicar.
- Encabezado en comentario que explique qué hace y por qué, en castellano.
- Con un freno (`DO $$ ... RAISE EXCEPTION`) cuando algo pueda salir mal a medias.
- Terminar con una consulta de verificación cuyo resultado Enzo pueda leer.
- Si el cambio de código depende del SQL, avisar que hay que correrlo.
- **A Enzo el SQL se le pega entero en el chat**, listo para copiar. Nada de links ni `irm`.

## Trampas que ya nos mordieron (no repetir)

1. **Joins anidados de PostgREST anulan la consulta entera en silencio.**
   `select('*, profiles(full_name)')` devolvía vacío sin error por RLS o por FK faltante.
   Siempre consultas sueltas y armar mapas en código. Hay ayudantes en `lib/lookups.ts`
   (`fetchProfiles`, `fetchExams`, `uniqueIds`).

2. **`exam_answers` cuelga de `exam_questions` con ON DELETE CASCADE.**
   Borrar y recrear preguntas borra las respuestas de todos los exámenes ya rendidos.
   El editor de guías hace upsert conservando ids y borra solo lo que el admin sacó.
   Nunca `delete().eq('exam_id', ...)` seguido de insert.

3. **`exam_answers.selected_option` guarda el ÍNDICE, no el texto.**
   Reordenar las opciones de una pregunta desalinea las respuestas viejas. Si alguna vez
   hace falta, mover `exam_answers` en la misma sentencia.

4. **El editor SQL de Supabase no mantiene tablas temporales entre sentencias.**
   Usar una sola sentencia con CTE en lugar de `CREATE TEMP TABLE` + varias sentencias.

5. **Fallar en silencio es el peor bug de esta app.** Toda acción que guarda devuelve
   `{ ok, error }` y la pantalla lo muestra. Nada de ignorar errores de Supabase.

6. **Tailwind pone `height: auto` a todas las imágenes.** Con el optimizador de imágenes
   apagado (ver `next.config.mjs`), un `<Image>` sin tamaño fijo en el estilo se dibuja al
   tamaño real del archivo.

7. **Verificar en pantalla de celular (390 px)** todo cambio visual. Casi todo el personal
   usa la app desde el teléfono.

## Exámenes

- Máximo 30 de opción múltiple + 5 escritas (las escritas las corrige un admin a mano).
- Se aprueba con 90.
- **La respuesta correcta no puede ser la opción más larga**, y las posiciones correctas
  van repartidas parejo entre A, B, C y D. Verificarlo antes de cargar preguntas.
- En la revisión se le muestra a la persona en qué se equivocó, **nunca cuál era la
  correcta** (decisión de Enzo).

## Cómo está armado lo que ve cada puesto

- `guide_paths` decide qué guías ve cada puesto y en qué orden. No se filtra además por
  `guides.puestos`. El admin lo edita en Guías → tarjeta del puesto.
- Quien está en período de prueba (`profiles.experience = 'nuevo'`) solo ve y rinde la
  guía principal, nada más, hasta que el admin lo pasa al equipo desde Usuarios. El freno
  de verdad está en la base (`puede_usar_examen`, dentro de `get_exam_questions` y
  `submit_exam`); las pantallas además esconden el resto y redirigen a `/dashboard/guides`.
  Ojo con los redirects: la lista de guías NO puede mandar a la pantalla del puesto,
  porque esa lo devuelve a la lista y queda un bucle.
- La guía principal (`guides.is_primary`) va primera en todos los recorridos.
- **Charlas para todo el personal** (`guides.para_todos`; la primera es la "Charla de
  Seguridad e Higiene (ART)", Enzo, 06/11, `add_charla_art.sql` y
  `fix_charla_art_examen_en_inicio.sql`):
  - **No son guías** (Enzo: "no una nueva guía para todos los puestos"). El examen cuelga de
    una guía, pero no van en `guide_paths`, no cuentan en "Tu progreso" y la app no muestra
    su contenido ("no pongas la información del curso"). `/dashboard/guides/[id]` las manda
    a Inicio; el editor del recorrido de cada puesto no las ofrece.
  - En Inicio, arriba de todo, ni bien entran (`TarjetaCharla`): "¿Participaste de la
    charla?" SÍ / NO.
    - SÍ: va derecho al examen de siempre (que termina con la firma), "para ver si prestaron
      atención". Si desaprueba, la tarjeta muestra la nota y "Volver a rendir".
    - NO: pide confirmar, queda registrado y no rinde (Enzo eligió que no rinda).
    - La tarjeta se va cuando dijo NO, o SÍ y aprobó.
  - La respuesta va en `capacitacion_asistencias.participo`. Cada uno contesta solo por sí
    mismo y una sola vez (no hay UPDATE). Para cambiarla, un encargado la borra ("Volver a
    preguntarle") y le vuelve a aparecer. Las filas de antes de la pregunta cuentan como SÍ.
  - El examen se rinde en `/dashboard/guides/[id]/exam`: con una charla vuelve a Inicio y los
    textos no nombran ninguna guía. La revisión ofrece "Volver a rendir" en vez de "Repasar
    la guía".
  - Lo hecho queda en Perfil, en "Capacitaciones" (`MisCapacitaciones`): qué contestó, la
    nota, la fecha y la firma.
  - **Cerrada** (`guides.capacitacion_cerrada`, `fix_charla_art_cerrar.sql`; Enzo, 10/11: "ya
    pasó"): sale de Inicio para todos, no se puede rendir más (el examen manda a Inicio y la
    revisión no ofrece volver a rendir) y en el perfil queda solo para los que aprobaron
    (`vaEnInicio`, `vaEnPerfil`). Los encargados la ven en Guías con la marca "Cerrada". La
    de la ART está cerrada.
  - Son la excepción al período de prueba: también las rinden quienes están a prueba
    (`puede_usar_guia` las deja pasar).
  - Lógica pura y pruebas en `lib/capacitaciones.ts` (el intento que cuenta: aprobado
    primero, después la nota más alta). Lo que se lee de la base, en
    `lib/capacitaciones-datos.ts`.
  - Encargados: en Guías hay una tarjeta por charla (fuera de la tabla de guías), con
    cuántos participaron, cuántos no y cuántos aprobaron. Lleva a
    `/admin/guides/[id]/asistencia` (`ListaAsistencia`):
    - arriba, a quién le falta algo;
    - después, los que dijeron que no, con "Volver a preguntarle";
    - abajo, los completos;
    - y el link para editar las preguntas.
  - El examen de la de la ART tiene 10 preguntas de opción múltiple:
    - las clases de fuego A, B y C, y una zapatilla prendida es clase C;
    - el matafuego K es de la cocina, para aceites y grasas animales y vegetales (no
      minerales), y es gris;
    - la sartén con aceite se apaga con el K;
    - el fuego necesita combustible, calor y oxígeno;
    - un charco de agua en el salón se seca en el momento y se le avisa al encargado en el
      momento, no al final del turno;
    - un alargue no puede quedar instalado, porque es una instalación temporal.
  - Las correctas van 3/3/2/2 en A/B/C/D y nunca son la más larga.
  - El SQL no borra preguntas ya cargadas. Las correcciones de Enzo del 10/11 (estas tres)
    van en `fix_charla_art_preguntas.sql`: solo cambian el texto, con la correcta en la
    misma letra.

## Horarios

- `schedule_weeks`: una fila por semana (lunes), con los sectores, personas y los 7 días en
  JSONB. Borrador hasta que se publica; el personal solo ve lo publicado (lo impide RLS).
- Tiene su propia lista de personal, separada de los usuarios de la app: la mayoría de
  cocina y maestranza no tiene usuario.
- El guardado usa control de versión con `updated_at`: **no pasar esa versión por
  `new Date()`**, perdería los microsegundos y la comparación nunca daría igual.
- Noche: quien cierra ("11C") un día con servicio de noche, hace noche. Los días con noche
  se eligen por semana (`datos.noches`; si no está, viernes y sábado) y se copian a la
  semana siguiente. Los feriados (`datos.feriados`) no se copian.
- Días extra (`datos.diasExtra`, 0 a 2): se suman al final días de la semana siguiente (el
  lunes feriado) y cada persona pasa a tener 8 o 9 celdas. Sin el campo, 7 días como siempre.
  Nunca dar por hecho 7 días: usar `cantidadDias(datos)` y `nombreDiaCorto(i)` (i % 7).
  Al copiar la semana se vuelve a lunes a domingo.
- Almuerzo (12 a 15.30): cuenta quien trabaja en algún momento de esa franja, leyendo la hora
  de entrada y salida del texto (`horarioDelTurno`, `estaAlAlmuerzo`). "8 A 16.30", "11C", "14C"
  sí; "16C", "7.30 A 12" y "M9+NOCHE..." no. Fila "Almuerzo" en cada sector del editor y
  resumen general arriba (`totalesGenerales`: quien está en dos sectores cuenta una vez).
- Clima: arriba del editor, el pronóstico de Mar del Plata por día (`lib/clima.ts`, Open-Meteo:
  gratis y sin clave, 16 días adelante y 7 atrás, caché de 30 min). Si no contesta, el editor
  sigue andando y lo avisa en una línea: nunca puede frenar el armado del horario.
- Lógica de totales y búsqueda en `lib/horarios.ts`; el PDF en `lib/horario-pdf.ts`.
- **Pedidos de horario** (pedido de Facundo, 05/11): cada uno pide un cambio para una semana.
  Puede ser que no puede venir algún día, que solo puede o no puede en una franja, u otro
  cambio, siempre con el motivo. Los encargados lo aprueban o no. Lo que decidió Enzo:
  - Aprobar NO cambia el horario: queda marcado en el editor, al lado de esa persona y ese
    día. Punto verde si está aprobado, ámbar si está sin responder. Facu arma la semana con
    eso.
  - El plazo es hasta el **miércoles anterior a las 22:00** de Argentina y después se cierra
    (Enzo, 10/11; antes era el jueves a las 23:59). Importa la hora: las pantallas le pasan
    `ahoraEnArgentina()` ("2026-11-04T21:59") a `semanaAbierta`; en la base,
    `pedidos_horario_abierta` (`fix_pedidos_horario_miercoles.sql`).
  - Se puede pedir para la semana que viene y para cualquiera más adelante.
  - Tabla `pedidos_horario` (`add_pedidos_horario.sql`): un pedido con uno o más días de la
    misma semana. Cada uno ve los suyos y los admin, todos.
  - Nadie escribe directo: se usan las RPC `pedir_cambio_horario` (con el freno del plazo),
    `cancelar_pedido_horario` (solo si sigue sin respuesta y en plazo) y
    `responder_pedido_horario` (admin).
  - Al responder, a la persona le llega a la campanita (`notifications`). Un encargado puede
    cambiar la respuesta o dejarlo sin responder.
  - Personal: tarjeta arriba de todo en `/dashboard/horario` (`components/horario/PedidosHorario.tsx`),
    con el plazo, el formulario y "Tus pedidos". Si no se corrió el SQL, no aparece.
  - Encargados: `/admin/horarios/pedidos` por semana, con Aprobar / No aprobar y un
    comentario (`components/admin/PedidosAdmin.tsx`). Tarjeta en Horarios y número en el menú
    con los que faltan responder de esta semana en adelante.
  - En el editor de la semana, el panel "Pedidos de esta semana" y las marcas. Las arma
    `marcasDelEditor`, que busca a cada uno con `buscarEnHorario`, como en su pantalla. Si no
    lo encuentra, lo avisa en el pedido.
  - Lógica pura y pruebas en `lib/pedidos-horario.ts`. Lo que se lee de la base, en
    `lib/pedidos-horario-datos.ts`.

## Comida del personal

- Cada uno elige, para la semana que viene, el menú de cada comida: almuerzo todos los días y
  cena viernes y sábado (`getNextWeekDates`, `lib/meals-utils.ts`). Cierra el domingo a las 21.
- **"No vengo"** (`preference = 'no'`, `add_comida_no_vengo.sql`; Enzo, 06/11: "no todos
  están en todos los horarios") cuenta como contestada y no le suma a la cocina. En
  `/admin/comida` va aparte, en "No vienen".
- Los días de franco del horario publicado de esa semana se muestran solos como "No vengo",
  sin guardar nada, y se pueden cambiar (`francosDeLaSemana`, `lib/comida-datos.ts`).
  - Franco es "X", "VAC", "LIC" o "M9" en todas sus filas. Una celda vacía se sigue
    preguntando.
  - Si el horario no está publicado o no se lo encuentra, se pregunta todo: nunca se le saca
    un plato a nadie.
- "Te faltan elegir N comidas" en Inicio cuenta solo las que no contestó ni son franco
  (`comidasSinContestar`, `lib/comida.ts`, con pruebas). Guardar revalida Inicio.

## Propinas

- Reemplaza la calculadora vieja (prueba77enzo.vercel.app) con la misma cuenta: salón =
  total − general; por hora = salón ÷ (horas completas + 75 % de reducidos + 50 % de
  prueba). Lógica y mensaje de WhatsApp en `lib/propinas.ts`.
- **Las horas de la propina van de a cuarto** (8 · 8,25 · 8,5 · 8,75). Los mozos las cuentan
  así para la propina (Enzo, 01/11). La planilla de fichadas sigue de a media hora: no
  mezclar. Con el reloj, `horasParaPropina` (`lib/propinas-reloj.ts`) redondea los minutos
  reales del día al cuarto más cercano con `redondearCuartoHora` (`lib/planilla.ts`):
  8 h 07 → 8, 8 h 08 → 8,25. Si las horas de la celda no salen de sus minutos (un encargado
  las corrigió a mano), valen las del encargado. Se usa en "Traer horas del reloj".
  `validarCarga` no deja guardar horas que no sean de a cuarto. Esto es solo para la de los
  mozos: la propina del resto del personal va con las horas de la planilla.
- **Propina del resto del personal** (todos menos los camareros; Enzo, 02/11). Es otra
  propina, por quincena, aparte de la diaria de los mozos:
  - Enzo pone el monto en `/admin/fichadas/planilla/propina?mes=2026-10&q=1|2` (desde
    Planilla → Excel y propinas).
  - Se reparte 60 % Salón y 40 % Cocina. Dentro de cada parte, por las horas de la planilla
    en la quincena (de a media hora). No se pierde un peso: `repartirPozo` usa el mayor resto.
  - Salón: Caja, Recepción, Barra, Bacha (sector Maestranza) y Comiss/Runners, más Zulma.
  - Cocina: Cocina, Ensalada y Calienta platos. Pastelería no la nombró: va en Cocina por
    ahora.
  - No entran: los camareros, los encargados (Facundo Núñez, Enzo) ni los administrativos
    (Romina, Germán).
  - En qué parte va cada uno sale de `ubicar` (`lib/propina-general.ts`), en este orden: lo
    fijado a mano, el sector de Horarios donde más turnos tuvo en la quincena, el cargo y el
    puesto de su usuario. Si nada lo dice, queda "sin sector" y no cobra hasta que lo ubiquen.
  - Lo fijado a mano va en `planilla_empleados.grupo_propina_general`
    (`add_propina_general.sql`).
  - Lo que lee de la base está en `lib/propina-general-datos.ts`. El Excel del reparto sale de
    `GET /api/planilla/propina-general?mes&q&monto`.
  - Ofrece usar como monto la suma de la General de los días cargados en Propinas.
  - Gisel Vallejos (lavacopas) figura en Cocina en Horarios: va en Cocina salvo que Enzo la
    pase.
- **Porcentaje de cada mozo** (quién cobra la hora al 100, 75, 50 o 25 %; Enzo, 01/11 y
  03/11). Antes la cajera elegía el grupo de cada uno a mano. Ahora:
  - Enzo o Facu (los dos son admin) lo ponen una vez en `/admin/propinas/grupos` ("Porcentaje
    de cada mozo", tarjeta verde arriba de todo en Propinas), por empleado de la planilla. Así
    entran también los que no tienen usuario de la app, que son casi todos los mozos.
  - La pantalla es la más simple posible (Enzo pidió "una manera más simple" el 03/11):
    - los mozos separados como en la carga del día (Al 100, 75, 50 y 25 %), con su nombre en
      una píldora;
    - se toca el nombre y una ventana con botones grandes deja elegir 100 / 75 / 50 / 25 % o
      "No es mozo". Se guarda solo;
    - arriba, "Sin definir": los mozos sin porcentaje, con "Poner a los N al 100 %";
    - abajo, "No son mozos" y, plegados, los runners y el resto del personal.
    - Qué va en cada parte lo dice `seccionDe` (`lib/propinas-grupos.ts`).
  - Grupo 25 %: valor `'cuarto'` (factor 0,25). Lo agregó `add_propina_25.sql`, que amplía el
    CHECK de `tip_entries.grupo` y el de `propina_grupos.grupo`.
  - "No es mozo": valor `'afuera'`, solo en `propina_grupos` (nunca en `tip_entries`).
    - Enzo figura en la planilla con cargo MOZO, pero es el encargado de salón: el SQL lo deja
      así.
    - "Traer horas del reloj" no suma ni ofrece a quien está así, y un día nuevo no lo trae de
      la lista anterior.
    - Si la cajera lo escribe a mano, entra igual, con un aviso.
  - Se guardan en `propina_grupos` (`add_propina_grupos.sql`), que es solo de admin. La cajera
    los lee con la RPC `grupos_para_propinas()`. Se guarda con
    `guardarGrupoPropinaAction(ids, grupo)`.
  - Si alguien tiene nivel en Progresión, manda el nivel (la píldora dice N1, N2 o N3) y se
    cambia desde su ficha. El 25 % no es ningún nivel.
  - Sin grupo, va al 100 %.
  - En el editor la lista va en cuatro secciones (Al 100 %, Al 75 %, Al 50 %, Al 25 %), y cada
    uno cae solo en la suya (`grupoConfigurado`, `lib/propinas-grupos.ts`). Pasa en un día
    nuevo, al traer del reloj y al terminar de escribir un nombre.
  - Lo del nombre se resuelve al salir del campo, no mientras se escribe, para que la fila no
    salte de sección.
  - Si la cajera lo cambia, queda lo suyo. Se avisa y hay un "Pasarlo al X %".
- **La cajera controla las fichadas** (Enzo, 03/11: "que vean si algún mozo no fichó la
  salida, y a qué hora entraron y salieron").
  - Al abrir el editor (y al cambiar la fecha) se piden las entradas y salidas de ese día con
    `reloj_para_propinas`. Esto no toca las horas de la lista.
  - Desde `add_propina_25.sql`, esa RPC trae además entrada, salida, tramos, qué fichada falta
    (`sugerencia->>'falta'`) y el origen de la celda.
  - A quien le falta una fichada se le marca en su fila, y arriba de las secciones hay un
    "Revisá las fichadas de N personas".
  - "Ver entradas y salidas" muestra debajo de cada uno "Entró 10:23 · salió 18:32 (8 h 09)",
    cada tramo si cortó, o "No figura en el reloj ese día".
  - Si un encargado ya le puso las horas a mano, no hay aviso, pero se dice. Los textos salen de
    `leerDetalle` (`lib/propinas-reloj.ts`).
- El 01/11 y el 02/11 se hicieron con la calculadora vieja y se subieron desde los reportes de
  WhatsApp, tal cual (`fix_propinas_1_y_2_noviembre.sql`). La cuenta de la app da los mismos
  montos. El 02/11 reemplazó a la prueba de Enzo ("Prueba11").
  - Nicolás Fuentes tiene dos usuarios: el segundo se creó el 03/11. Con los dos, "Nicolás
    Fuentes" no se vincula a ninguno (`vincularUsuario` no elige): hay que borrar el que sobra.
- Carga el cajero, a mano, al día siguiente. Pueden cargar los admin y quien tenga
  `profiles.carga_propinas` (se tilda en Usuarios). Freno en la base: `puede_cargar_propinas()`.
- Quién ve qué (RLS, `ve_propinas_de_todos()`): quien carga y el puesto Mozos ("Mozos y
  Runners") ven el reparto de todos, de solo lectura (decisión de Enzo). El resto ve SOLO
  sus filas (`tip_entries.user_id`). El vínculo nombre → usuario es estricto
  (`vincularUsuario`): ante la duda no se vincula.
- **Quien se registra después de que se cargaron sus propinas** (Enzo, 10/11: muchos mozos se
  sumaron y no veían las suyas): cada vez que se guarda un día, `guardarPropinasAction`
  vincula también las filas sin usuario de días anteriores (`vincularSueltas`, misma regla
  estricta, nunca dos filas de la misma persona el mismo día). Los nombres sueltos ("Belen",
  "Lucia") no entran solos. Lo cargado hasta el 10/11, nombres sueltos incluidos, lo vinculó
  `fix_vincular_mozos_nuevos.sql`, que también les puso el `profile_id` en la planilla.
- Se guarda con la RPC `guardar_propinas` (todo el día en una operación, con versión).
- Pantallas compartidas en `components/propinas/`, montadas en `/admin/propinas` y
  `/dashboard/propinas` (los admin no pueden entrar a `/dashboard`).

## Progresión de mozos

- Tres niveles = tres de los grupos de propinas: 1 · 50 % ("prueba"), 2 · 75 % ("reducido"),
  3 · 100 % ("camarero"). El 25 % no es un nivel. Requisitos escritos en `lib/progresion.ts` (decisión de Enzo, el
  nivel 1 son sus cuatro criterios): manuales (los tilda un encargado), exámenes (se toman
  solos; la guía se reconoce por partes del título en `claveDeGuia`) y tiempo mínimo.
- Tablas `mozo_niveles` (nivel, desde, tildes en JSONB con claves "n2_...") e historial.
  Se cambian solo con las RPC `cambiar_nivel_mozo` y `marcar_requisito_mozo` (admin). Al
  bajar se borran las tildes de los niveles perdidos y el tiempo vuelve a contar.
- Sin fila = sin nivel: vale Propinas → Porcentaje de cada mozo (o 100 %). Con nivel, manda el
  nivel (también por encima de lo que se puso ahí): la calculadora lo pone en su sección sola;
  el cajero lo puede cambiar (se avisa).
- Pantallas: `/admin/progresion` (lista y ficha) y `/dashboard/progresion` (solo puesto Mozos).

## Fichadas (reloj EP300 Pro)

- El reloj está conectado por red a la PC de la caja, donde CrossChex Standard (v4.3.18)
  guarda todo en `C:\Program Files (x86)\Anviz\CrossChex Standard\DB\CrossChex.mdb` (Access).
  CrossChex queda abierto con "Control en tiempo real" en Activar y una descarga programada
  a las 12:30 de red de seguridad. La PC se apaga a la noche y CrossChex no recuerda el
  Activar: `fichero/activar-crosschex.ps1` (tarea "Activar CrossChex" al entrar a Windows,
  como administrador) lo abre, aprieta OK en el login, lo maximiza (achicado, la barra esconde
  "Activar"), hace clic en Dispositivos y en Activar. La barra (TdxRibbon) no expone pestañas
  ni botones a UI Automation, solo los grupos con nombre: la pestaña se clickea en la posición
  calibrada y Activar dentro del grupo "Control en tiempo real" (`-Calibrar`).
- `fichero/sincronizar-fichadas.ps1` corre cada minuto en esa PC (tarea de Windows como
  SYSTEM, la deja `fichero/instalar.ps1`), lee la base con Jet (PowerShell de 32 bits) y
  manda las nuevas con la RPC `registrar_fichadas`. Entra con la clave del fichero
  (`fichero_config.token`), no con un usuario: solo puede agregar. `config.json` tiene la
  clave y NO se sube (está en `.gitignore`).
- Tablas (`supabase/add_fichadas.sql`): `fichadas` (logid de CrossChex, hora, tipo 0
  entrada / 1 salida / 2 break / 3 fin de break), `fichero_personas` (nro., nombre y sector
  de CrossChex, lista aparte de los usuarios de la app) y `fichero_estado` (cuándo habló
  la caja por última vez, hasta qué logid llegó y errores). Solo las leen los admin.
- Los sectores salen de **Horarios**, no de CrossChex (ahí están todos en "Mirador Waikiki").
  `vincularHorarios` (`lib/fichadas-reporte.ts`) relaciona cada nombre de la planilla con una
  persona del reloj: palabras en cualquier orden, una letra de diferencia en palabras largas
  ("Caruso"/"CARUSSO", "Gisel"/"GISELA"), sin perdón si es una sola palabra ("Moreno" no es
  "MORENA"), ignorando el sector usado como apellido ("LURDES COCINA"). Ante dos candidatos
  distintos no se vincula; con el mismo nombre exacto (Bruno Molina está dos veces) se
  vinculan los dos. Quien está en dos sectores va al que tiene turno ese día. Los que no se
  encuentran van a "Sin sector en Horarios".
- Tocando un nombre (adentro, se fueron, vinieron, reporte del día) aparece "Entrada según
  horario": la celda de la planilla de esa semana para ese día, leída con `horarioDelTurno`
  ("8 A 16.30" -> 08:00). Solo la semana de ese día (`celdaDe`), nunca otra.
- Reporte del mes (decisión de Enzo: nada de listas de fichadas sueltas): una fila por día
  con personas y horas; al abrirla, cada sector con su gente, horas y horario real. Las horas
  son de turnos completos (entrada -> salida deducidas); lo incompleto se marca y no suma.
  `?mes=2026-10` para otros meses. Supabase devuelve como mucho 1000 filas por consulta: las
  fichadas se piden de a 1000 (`traerFichadas` en la página).
- **No se le puede creer a la tecla** (Entrada/Salida): mucha gente aprieta "Entrada" al irse
  o "Salida" al llegar (1 de cada 6 en sept./oct.; Enzo lo vio en la pantalla). `leerFichadas`
  en `lib/fichadas.ts` deduce el sentido por el orden de las fichadas de cada uno (Viterbi
  con costos: errarle a la tecla 1, olvidarse de fichar 3, turno de 12-14 h 1.5, de 14-16 h 2,
  de más de 16 h imposible, empezar saliendo 1). Probado con casos reales: los que entran y
  salen con "Entrada", turnos dobles (8:44 a 23:07), cierres pasada la medianoche, limpieza
  que entra a las 4. Si se tocan los costos, volver a probar esos casos (`lib/fichadas.test.ts`,
  con `npm test`).
- Empezar saliendo cuesta 1 solo si la primera fichada de alguien está a menos de 16 h del
  principio de lo pedido. Ese principio son los `inicios` que la página le pasa a
  `leerFichadas`; ahí la entrada pudo quedar antes. Si está más lejos, cuesta como un olvido
  (3), porque la entrada tendría que estar entre lo pedido.
  - Lo mostró Miguel Sachett el 03/11: no venía hacía días y fichó 07:55 con Salida y 16:34
    con Entrada. Del día lo daba bien y Ahora lo daba adentro.
  - Con las 431 fichadas reales de noviembre, el arreglo cambió solo esas dos.
  - Si un mes viejo y las de ahora no se tocan, el corte entre los dos vuelve a empezar.
- Lo resuelto a mano en la planilla también cuenta en Ahora.
  - Vale si un encargado, después de la última entrada de esa persona, le puso a ese día
    horas, la salida que faltaba o un código. Es decir, una celda con origen manual, papel o
    código.
  - Entonces ya no figura adentro ni en "no fichó la salida", y en "Se fueron" dice "salida a
    mano" (`cerradaAMano`, `lib/fichadas.ts`).
  - La página trae esas celdas de las últimas 48 h y los números del reloj de
    `planilla_reloj_alias`.
  - Caso: Fernández Ornella el 03/11. Entró 11:18, no fichó la salida, Enzo le puso 3,5 h y
    seguía adentro.
  - Si vuelve a fichar después de la corrección, cuenta lo nuevo.
- Dobles: otra fichada de la misma persona a menos de 30 min es la misma. Se piden 48 h para
  ver cómo venía cada uno. Presente = su última fichada deducida es entrada; con más de 13 h
  va al recuadro de "no fichó la salida"; con más de 24 h no se muestra. La jornada arranca a
  las 4. Pantalla en `/admin/fichadas`, que se refresca sola cada 30 s. Nadie usa las teclas
  de break.

### Planilla maestra (se arma por partes, según el pedido de Enzo)

- Tablas en `supabase/add_fichadas_planilla.sql`, todas solo para admin:
  - `planilla_empleados`: el orden de la hoja. Los nuevos van al final, la baja es
    `activo = false` y nunca se borran.
  - `planilla_reloj_alias`: número del reloj → empleado, o `ignorar`.
  - `planilla_meses` y `planilla_celdas`: una celda por empleado y día. Si está `bloqueada`
    o su origen es manual, papel o código, el proceso automático no la pisa.
  - `fichadas_manuales`: lo cargado desde papel.
  - `planilla_eventos`: quién cerró o reabrió cada mes.
  - Un trigger no deja tocar las celdas de un mes cerrado.
- La jornada de la planilla va de 07:00 a 06:59 (regla de Enzo para la planilla), no de 4 a 4
  como la pantalla de quién está adentro. Zulma (`jornada_calendario`) usa el día calendario.
- `nombres_horario` es una lista, porque algunos figuran con dos nombres. Lo verificado
  contra las fichadas:
  - Ignacio López es "Ignacio Gaston" en Barra e "Ignacio Lopez" en Caja.
  - Lucho Pelizardi (Barra, reloj 307) es Luciano Pellizardi. El "Luciano Pelizardi" de
    Cocina es otra persona.
  - El "Santiago" de Cocina no coincide con las fichadas de Velardez.
  - Bruno Molina tiene dos números en el reloj (240 y 275): los dos son él.
- La cuenta de horas está en `lib/planilla.ts` y es pura (no lee la base ni la hora).
  `npm test` corre `lib/planilla.test.ts` con Node, sin instalar nada (`scripts/pruebas/`
  resuelve los `@/`). Ahí están los casos del pedido: si se toca una regla, correrlas.
- Lo que el pedido no decía y se decidió así:
  - El "habitual" y el desempate de 12 a 17 miran los 30 días anteriores a ese día, no el
    mes. Así un día ya calculado no cambia cuando llegan días nuevos.
  - Con 3 fichadas o más en número impar, la celda queda incompleta y muestra "de la
    primera a la última".
  - Mientras corre la jornada, el que entró figura "adentro", no incompleto.
  - Un día con fichadas de papel queda con origen 'papel', y el proceso ya no lo toca.
  - Horario cortado: después de juntar las dobles (menos de 30 min), cualquier salida y
    vuelta es un corte, dure lo que dure. Lo decidió Enzo el 01/11, porque Facundo Viera a
    veces corta 1 h 40 (el 11/10 daba 12 h de corrido en vez de 10,5). El pedido decía 2 h.
  - Zulma es la única que entra de madrugada (04:00 a 05:00) y sale al mediodía o a la
    tarde: con `jornada_calendario` todo queda en su día.
- Probado con las fichadas reales de octubre (9.349 h, 51 celdas incompletas). Con la
  jornada desde las 07:00 se rompen 4 días: gente que entró entre las 05:57 y las 06:56.
  Desde las 05:00 quedaban bien, pero Enzo eligió dejar las 07:00 (`INICIO_JORNADA`).
  También confirmó el cierre: 21:00, o 01:00 los días con noche.
- Proceso automático (`supabase/add_planilla_proceso.sql` y `lib/planilla-proceso.ts`):
  - pg_cron, con `20 */2 * * *` en UTC (07:20, 09:20... en Argentina), manda con pg_net un
    `POST /api/planilla/actualizar` con la clave de `planilla_config` en `x-clave`.
  - No hay usuario ni variables nuevas en Vercel: la clave la valida la base.
  - Las RPC `planilla_datos` y `planilla_guardar` las puede usar un admin con su sesión o
    quien traiga la clave.
  - El freno está en `planilla_guardar`:
    - no pisa celdas bloqueadas, manuales, de código ni de papel;
    - no toca meses cerrados;
    - borra lo del reloj que ya no corresponde;
    - suma al final de la hoja del mes a quien tenga horas o sea nuevo;
    - rehace los totales.
  - Cada pasada recalcula hoy, la jornada anterior y 3 días más. Un mes que nunca se
    calculó se calcula entero (así se arma octubre).
  - "Actualizar ahora" es `actualizarPlanillaAction`; con un mes, lo recalcula entero.
  - Para ver si anda: `select status_code, content from net._http_response order by created desc`.
  - Recién corrido el SQL, la primera llamada puede contestar "Falta correr el SQL": Supabase
    tarda unos segundos en ver las funciones nuevas. Pasó al instalarlo el 01/11; la tarea de
    las 17:20 ya anduvo y armó octubre (9.346,5 h, 51 celdas incompletas).
  - Si cambia el dominio de la app, cambiar `planilla_config.url`.
- Pantallas en `/admin/fichadas/*`, con pestañas (`components/fichadas/PestanasFichadas.tsx`):
  - **Planilla del mes**, con `GrillaPlanilla` y `PanelCelda`: la grilla como el Excel. El
    panel de la celda trae las fichadas crudas (`fichadasDelDiaAction`) y corrige con
    `aplicarSugerenciaAction` y `editarCeldaAction`, en `app/actions/planilla.ts`.
  - **Del día**: muestra la jornada anterior por defecto, con lo que hay que resolver arriba.
  - **Empleados** (orden arrastrando, alta al final, cargo, baja, día calendario, usuario,
    nombres en Horarios) y **Reloj** (equivalencias con `sugerirEmpleados`, en
    `lib/planilla-reloj.ts`). Sus acciones están en `app/actions/planilla-empleados.ts`. Lo
    que cambia la cuenta recalcula los meses abiertos.
  - **Papel**: carga a mano (fuente 'papel') e importación del Excel de CrossChex (fuente
    'manual'). El lector está en `lib/planilla-importar.ts`: .xlsx con ExcelJS, que se baja
    solo al usarlo, o CSV. El .xls viejo no se lee. Las fichadas que el reloj ya tiene
    (misma persona, menos de 1 minuto de diferencia) se saltean. Acciones en
    `app/actions/planilla-papel.ts`.
- El Excel de la planilla copia la de Enzo, `AsistenciaOctubreDEF2026.xlsx` (02/11: la de la
  app le parecía horrible). Probado en `lib/planilla-excel.test.ts`. Cómo es:
  - Encabezado celeste en Arial 9 negrita itálica. EMPLEADO y CARGO van combinadas en dos
    filas; los días van con número y nombre, en horizontal.
  - Una franja azul oscuro en la fila 4.
  - Las horas en Calibri 10 sobre celeste clarito; HORAS y DIAS en Arial 9.
  - VAC en amarillo, CERT y LIC en verde. Lo incompleto o para revisar (más de 17 h, etc.) va
    en rojo, con un comentario.
  - El nombre de quien no tiene cargo va en gris.
  - Anchos 43, 35,86 y 10,71; zoom 62 %; paneles fijos en C5.
  - Los colores son los del tema de Office de Enzo, ya calculados con su tono (`CELESTE`,
    `CELESTE_CLARO`, `AZUL_FRANJA`). ExcelJS escribe su propio tema, y con colores de tema
    saldrían otros.
  - En la de Enzo, DIAS (el segundo), FRANCO, NO VINO y OTROS están vacías. Acá se calculan,
    sin mostrar los ceros.
- Quien se dio de baja y no tiene nada en el mes no sale ni en la grilla ni en el Excel
  (`armarFilas`). Un día vacío (tenía turno y no fichó) no cuenta como algo.
- En el Excel de octubre de Enzo, de Martina Barcia a Luciano Alfaro los cargos quedaron
  corridos, al parecer al sacar a Matias Millan. Los de la app están bien (coinciden con
  Horarios).
- Excel (`lib/planilla-excel.ts`, con ExcelJS):
  - Planilla del mes o quincena: `GET /api/planilla/excel?mes=2026-10&parte=mes|q1|q2`.
  - Horas para propinas (Empleado | Horas Calculadas, las de la planilla):
    `GET /api/planilla/horas?desde&hasta`.
  - Las dos son solo para admin. Se bajan desde "Excel y propinas" en la planilla.
  - Las fórmulas se recalculan al abrir (`fullCalcOnLoad`): ExcelJS no guarda un resultado 0.
  - El segundo DIAS es la cantidad de días con horas. OTROS = VAC + CERT + LIC.
- "Excel y propinas" de la planilla ya no lleva a la propina de los mozos: Enzo dijo que ahí no
  tiene sentido. Ahora abre la propina del resto del personal de cada quincena (ver Propinas).
  `/admin/propinas/<fecha>?traer=reloj` sigue andando: un día sin cargar se abre como día nuevo
  y trae las horas solo.
- "Traer horas del reloj" (en el editor de propinas) arma la lista con la planilla de ese día.
  Antes solo completaba a los que ya estaban en la lista: el 31/10 arrancó con 2 nombres y trajo
  1, y Enzo pidió que ponga a todos los mozos.
  - Usa la RPC `reloj_para_propinas` (`add_propinas_mozos_reloj.sql`, devuelve jsonb). La
    puede usar quien carga propinas aunque no sea admin. Trae a todos los que tienen ese día en
    la planilla (con horas o incompletos), con sus minutos reales (para las horas de a cuarto),
    su sector de Horarios y su celda ese día, y a los que tenían turno en Horarios y no
    ficharon. Reemplaza a `horas_para_propinas`, que quedó sin uso.
  - La lógica es pura, en `lib/propinas-reloj.ts`, con pruebas del 31/10 real.
  - Empareja cada fila de la lista: por usuario, por nombre (planilla o Horarios) y por la
    regla de las 2 palabras. Ante la duda no pone nada.
  - Suma solos a los mozos que faltan, con horas, incompletos (sin horas) o con turno y sin
    fichadas (sin horas). Mozo = sector Camareros de Horarios donde tiene turno ese día; si esa
    semana no figura, cargo MOZO de la planilla ("MOZO DE MOSTRADOR" es barra) o, sin cargo, el
    puesto Mozos de su usuario. El encargado no entra, ni quien está como "No es mozo" en
    Porcentaje de cada mozo (Enzo).
  - A los runners y comisses, y a los que ficharon sin sector conocido, no los suma: los ofrece
    con un toque. No está confirmado que siempre entren en el reparto.
  - Si se vuelve a traer con otra fecha, saca lo que había puesto el reloj y no toca lo escrito
    a mano.
- Cierre de mes (`app/actions/planilla-cierre.ts` y `components/planilla/CierreMes.tsx`):
  - Solo para un mes que ya terminó (`mesTerminado`: desde las 07:00 del 1° siguiente).
  - Antes de cerrar se recalcula el mes una última vez. Si quedan incompletas, pide
    confirmar (`incompletas` en la respuesta).
  - El Excel se guarda en el bucket privado `planillas` como
    `<mes>/planilla-<mes>-cierre-<fecha>.xlsx`: uno por cierre, así un mes que se reabre y se
    vuelve a cerrar conserva el anterior.
  - Se guardan `totales` (`totalesDelMes`), `xlsx_path`, `cerrado_por` y `cerrado_en`.
  - La base anota cada cierre y reapertura en `planilla_eventos` (trigger), y la app le
    agrega el detalle: el resumen al cerrar, el motivo al reabrir (que es obligatorio).
  - Con el mes cerrado, la base no deja tocar sus celdas, el proceso lo saltea y Papel no
    carga, borra ni importa nada de ese mes.
  - El Excel del cierre se baja con un link firmado de 1 minuto (`excelDelCierreAction`).
- Nuevos de octubre, al final de la hoja (orden 69 a 75, sin cargo, ver
  `add_planilla_nuevos_octubre.sql`): Federico Fernandez (610), Laureano (611),
  Lurdes Moreno (399, en el reloj "LURDES COCINA"), Alma (614), Giuliana Bartellone
  (615, Enzo confirmó que es la del usuario de la app) y Abril Castro (646) y Moises (647).
- Papel de octubre, según Enzo (02/11):
  - Honorio Sachett es el hermano de Angel Sachett, no la misma persona. No tiene huella:
    fichó en papel. Se agrega con sus fichadas de octubre con
    `fix_octubre_honorio_sachett.sql`, con octubre reabierto, y después "Actualizar ahora".
  - Corvino Morena (9 y 10/10 en papel) estuvo a prueba y no siguió. No va en la planilla.
  - Lo que Enzo cargó del papel en octubre está como celdas a mano (origen manual), no
    como fichadas de papel.
  - No quiere que la app lea fotos de las planillas de papel con IA.
- El 612 del reloj ("MORENA") es Morena Ruiz (lo dijo Enzo). Sus dos fichadas del 11/10
  parecen de enrolamiento y dejan ese día como horario cortado de 6 h en vez de 8,5:
  se corrige a mano.

## Seguridad

- RLS en todas las tablas. Función `is_admin()` en la base.
- Un trigger (`protect_profile_fields`) impide que alguien se cambie a sí mismo el rol,
  el estado o el puesto desde el navegador. Deja pasar al admin y al editor SQL.
- Contraseñas: no hay "me olvidé la contraseña" por mail (decisión de Enzo). Un admin pone
  una provisoria desde Usuarios → Clave (RPC `admin_cambiar_clave`, bcrypt con pgcrypto) y
  la persona la cambia en Perfil (`auth.updateUser`).
- Los votos del empleado del mes NO son anónimos: el admin ve quién votó a quién
  (decisión de Enzo, y la pantalla de votación lo avisa).
- Next 14.2.35. Quedan avisos que solo arregla Next 15 (migración grande, pendiente).

## Antes de dar algo por terminado

- `npx tsc --noEmit` y `npx next build` sin errores.
- Si es visual, mirarlo a 390 px.
- Si toca la base, decir qué SQL hay que correr.
