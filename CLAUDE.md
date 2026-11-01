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

## Propinas

- Reemplaza la calculadora vieja (prueba77enzo.vercel.app) con la misma cuenta: salón =
  total − general; por hora = salón ÷ (horas completas + 75 % de reducidos + 50 % de
  prueba). Lógica y mensaje de WhatsApp en `lib/propinas.ts`.
- Carga el cajero, a mano, al día siguiente. Pueden cargar los admin y quien tenga
  `profiles.carga_propinas` (se tilda en Usuarios). Freno en la base: `puede_cargar_propinas()`.
- Quién ve qué (RLS, `ve_propinas_de_todos()`): quien carga y el puesto Mozos ("Mozos y
  Runners") ven el reparto de todos, de solo lectura (decisión de Enzo). El resto ve SOLO
  sus filas (`tip_entries.user_id`). El vínculo nombre → usuario es estricto
  (`vincularUsuario`): ante la duda no se vincula.
- Se guarda con la RPC `guardar_propinas` (todo el día en una operación, con versión).
- Pantallas compartidas en `components/propinas/`, montadas en `/admin/propinas` y
  `/dashboard/propinas` (los admin no pueden entrar a `/dashboard`).

## Progresión de mozos

- Tres niveles = los tres grupos de propinas: 1 · 50 % ("prueba"), 2 · 75 % ("reducido"),
  3 · 100 % ("camarero"). Requisitos escritos en `lib/progresion.ts` (decisión de Enzo, el
  nivel 1 son sus cuatro criterios): manuales (los tilda un encargado), exámenes (se toman
  solos; la guía se reconoce por partes del título en `claveDeGuia`) y tiempo mínimo.
- Tablas `mozo_niveles` (nivel, desde, tildes en JSONB con claves "n2_...") e historial.
  Se cambian solo con las RPC `cambiar_nivel_mozo` y `marcar_requisito_mozo` (admin). Al
  bajar se borran las tildes de los niveles perdidos y el tiempo vuelve a contar.
- Sin fila = sin nivel: propinas sigue como antes. Con nivel, la calculadora pone el grupo
  sola en un día nuevo y al escribir el nombre; el cajero lo puede cambiar (se avisa).
- Pantallas: `/admin/progresion` (lista y ficha) y `/dashboard/progresion` (solo puesto Mozos).

## Fichadas (reloj EP300 Pro)

- El reloj está conectado por red a la PC de la caja, donde CrossChex Standard (v4.3.18)
  guarda todo en `C:\Program Files (x86)\Anviz\CrossChex Standard\DB\CrossChex.mdb` (Access).
  CrossChex queda abierto con "Control en tiempo real" en Activar (se apaga si se reinicia
  la PC) y una descarga programada a las 12:30 de red de seguridad.
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
  que entra a las 4. Si se tocan los costos, volver a probar esos casos.
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
- Excel (`lib/planilla-excel.ts`, con ExcelJS), probado contra el formato del pedido en
  `lib/planilla-excel.test.ts`:
  - Planilla del mes o quincena: `GET /api/planilla/excel?mes=2026-10&parte=mes|q1|q2`.
  - Horas para propinas (Empleado | Horas Calculadas): `GET /api/planilla/horas?desde&hasta`.
  - Las dos son solo para admin. Se bajan desde "Excel y propinas" en la planilla.
  - Las fórmulas se recalculan al abrir (`fullCalcOnLoad`): ExcelJS no guarda un resultado 0.
  - El segundo DIAS es la cantidad de días con horas. OTROS = VAC + CERT + LIC.
- "Pasar a Propinas": la planilla abre `/admin/propinas/<fecha>?traer=reloj`. Si ese día no se
  cargó, se abre como día nuevo con esa fecha. En el editor, "Traer horas del reloj" llama a
  la RPC `horas_para_propinas` (`add_planilla_propinas.sql`), que la puede usar quien carga
  propinas aunque no sea admin, y empareja con `emparejarHoras` en `lib/planilla-reloj.ts`:
  primero por usuario, después por nombre (planilla o Horarios) y después por la regla de las
  2 palabras. Ante la duda no pone nada.
- Nuevos de octubre, al final de la hoja (orden 69 a 75, sin cargo, ver
  `add_planilla_nuevos_octubre.sql`): Federico Fernandez (610), Laureano (611),
  Lurdes Moreno (399, en el reloj "LURDES COCINA"), Alma (614), Giuliana Bartellone
  (615, Enzo confirmó que es la del usuario de la app) y Abril Castro (646) y Moises (647).
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
