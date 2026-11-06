/**
 * Capacitaciones para todo el personal (la charla de la ART; Enzo, 06/11).
 *
 * No son una guía más del recorrido de los puestos ni muestran el contenido
 * del curso: arriba de todo en Inicio, ni bien entran, se pregunta
 * "¿Participaste de la charla?". Con SÍ va derecho al examen, para ver si
 * prestó atención; con NO queda registrado que no participó y no rinde. Lo
 * hecho queda en el perfil de cada uno.
 *
 * En la base son guías con `para_todos` (el examen, la firma y la revisión
 * cuelgan de una guía), pero no van en `guide_paths` ni cuentan en "Tu
 * progreso". La respuesta va en `capacitacion_asistencias.participo`.
 *
 * Lógica pura: no lee la base ni la hora.
 */

export interface IntentoCapacitacion {
  /** El id del resultado (lleva a /dashboard/revision/<id>). */
  id: string
  score: number
  passed: boolean
  /** Cuándo lo rindió (ISO). */
  fecha: string
  /** Tiene respuestas escritas que todavía no corrigió un encargado. */
  pendiente: boolean
  /** La firma (data URL), si se pidió. */
  firma: string | null
}

export interface Capacitacion {
  /** El id de la guía que la contiene. */
  id: string
  titulo: string
  examenId: string | null
  /** Con cuánto se aprueba (90), o null si no tiene examen. */
  aprobarCon: number | null
  /** Qué contestó a "¿Participaste de la charla?", o null si todavía no contestó. */
  participo: boolean | null
  /** Cuándo lo contestó (ISO), o null. */
  respondioEn: string | null
  /** El intento aprobado que cuenta (la nota más alta), o null. */
  aprobado: IntentoCapacitacion | null
  /** El último que rindió, aprobado o no. */
  ultimo: IntentoCapacitacion | null
  /** No aprobó y tiene un intento esperando corrección. */
  esperandoCorreccion: boolean
  /**
   * No le falta nada y sale de Inicio: contestó que no participó, o que sí y
   * aprobó el examen (o no tiene examen).
   */
  completa: boolean
}

export interface FilaGuiaCapacitacion {
  id: string
  title: string
  created_at?: string | null
}

export interface FilaExamenCapacitacion {
  id: string
  guide_id: string
  passing_score?: number | null
}

export interface FilaResultadoCapacitacion {
  id: string
  exam_id: string
  score: number | null
  passed: boolean | null
  completed_at: string | null
  review_status?: string | null
  signature_data?: string | null
}

export interface FilaRespuesta {
  guide_id: string
  created_at: string
  /** Sin la columna (antes del SQL de la pregunta SÍ/NO), anotarse era decir que sí. */
  participo?: boolean | null
}

/**
 * El intento que cuenta: el aprobado gana; entre dos aprobados (o dos
 * desaprobados), la nota más alta; si empatan, el primero que rindió. Es la
 * misma regla en el perfil y en la lista de los encargados.
 */
export function mejorIntento<T extends { score: number; passed: boolean; fecha?: string | null }>(
  intentos: T[]
): T | null {
  let mejor: T | null = null
  for (const i of intentos) {
    if (!mejor) {
      mejor = i
      continue
    }
    if (i.passed !== mejor.passed) {
      if (i.passed) mejor = i
      continue
    }
    if (i.score !== mejor.score) {
      if (i.score > mejor.score) mejor = i
      continue
    }
    if (i.fecha && mejor.fecha && i.fecha < mejor.fecha) mejor = i
  }
  return mejor
}

function aIntento(r: FilaResultadoCapacitacion): IntentoCapacitacion {
  return {
    id: r.id,
    score: Number(r.score ?? 0),
    passed: r.passed === true,
    fecha: r.completed_at ?? '',
    pendiente: r.review_status === 'pending_review',
    firma: r.signature_data ?? null,
  }
}

/**
 * El estado de cada capacitación para una persona, con sus intentos y lo que
 * contestó. `guias` son las guías con `para_todos`; `resultados` y
 * `respuestas`, los de esa persona. Las más nuevas primero.
 */
export function armarCapacitaciones(datos: {
  guias: FilaGuiaCapacitacion[]
  examenes: FilaExamenCapacitacion[]
  resultados: FilaResultadoCapacitacion[]
  respuestas: FilaRespuesta[]
}): Capacitacion[] {
  const guias = [...datos.guias].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return guias.map((g) => {
    const examen = datos.examenes.find((e) => e.guide_id === g.id) ?? null
    const intentos = examen ? datos.resultados.filter((r) => r.exam_id === examen.id).map(aIntento) : []
    const mejor = mejorIntento(intentos)
    const aprobado = mejor?.passed ? mejor : null
    const ultimo = intentos.reduce<IntentoCapacitacion | null>((u, i) => (!u || i.fecha > u.fecha ? i : u), null)
    const respuesta = datos.respuestas.find((r) => r.guide_id === g.id) ?? null
    const participo = respuesta ? respuesta.participo !== false : null
    return {
      id: g.id,
      titulo: g.title,
      examenId: examen?.id ?? null,
      aprobarCon: examen ? Number(examen.passing_score ?? 70) : null,
      participo,
      respondioEn: respuesta?.created_at ?? null,
      aprobado,
      ultimo,
      esperandoCorreccion: !aprobado && intentos.some((i) => i.pendiente),
      completa: participo === false || (participo === true && (!examen || aprobado !== null)),
    }
  })
}

/** "06/11 a las 18:20", en hora de Argentina (UTC−3 todo el año). */
export function fechaHoraAR(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ''
  const d = new Date(ms - 3 * 3600 * 1000)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)} a las ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`
}
