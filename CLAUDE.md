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
  #dbd2b5), `brand-card` (blanco), `brand-accent` (verde #6e8f7a), `brand-text`,
  `brand-muted`, `brand-border`, `brand-success`, `brand-error`.
- Despliega en Vercel desde la rama `main` de este repo.

## Cómo se entregan los cambios de base de datos

**No hay migraciones automáticas.** Cada cambio de base es un archivo en `supabase/`
que Enzo corre a mano en Supabase → SQL Editor. Reglas para esos archivos:

- Idempotentes: se tienen que poder correr dos veces sin romper nada ni duplicar.
- Encabezado en comentario que explique qué hace y por qué, en castellano.
- Con un freno (`DO $$ ... RAISE EXCEPTION`) cuando algo pueda salir mal a medias.
- Terminar con una consulta de verificación cuyo resultado Enzo pueda leer.
- Si el cambio de código depende del SQL, avisar que hay que correrlo.

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
- Lógica de totales y búsqueda en `lib/horarios.ts`; el PDF en `lib/horario-pdf.ts`.

## Seguridad

- RLS en todas las tablas. Función `is_admin()` en la base.
- Un trigger (`protect_profile_fields`) impide que alguien se cambie a sí mismo el rol,
  el estado o el puesto desde el navegador. Deja pasar al admin y al editor SQL.
- Los votos del empleado del mes NO son anónimos: el admin ve quién votó a quién
  (decisión de Enzo, y la pantalla de votación lo avisa).
- Next 14.2.35. Quedan avisos que solo arregla Next 15 (migración grande, pendiente).

## Antes de dar algo por terminado

- `npx tsc --noEmit` y `npx next build` sin errores.
- Si es visual, mirarlo a 390 px.
- Si toca la base, decir qué SQL hay que correr.
