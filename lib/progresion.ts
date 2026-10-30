/**
 * Progresión de los mozos: de cobrar el 50 % de la hora de propina al 100 %.
 *
 * Tres niveles, los mismos grupos que ya usa la calculadora de propinas:
 *   1 · Mozo inicial  → 50 %  (grupo "prueba")
 *   2 · Mozo          → 75 %  (grupo "reducido")
 *   3 · Mozo completo → 100 % (grupo "camarero")
 *
 * Cada nivel tiene requisitos de tres tipos:
 *   - manual: lo tilda un encargado (conocer la carta, cobro sin errores...).
 *   - examen: se cumple solo cuando la persona aprueba esa guía en la app.
 *   - tiempo: semanas mínimas en el nivel anterior, contadas desde que llegó.
 *
 * La decisión de subir la toma un encargado; la app muestra qué falta.
 * Las claves de los requisitos empiezan con el nivel ("n2_cobro"): la base
 * las usa para borrar las tildes de los niveles que alguien pierde al bajar.
 */

import type { Grupo } from '@/lib/propinas'

export type TipoRequisito = 'manual' | 'examen' | 'tiempo'

/** Guías que piden los niveles. Se reconocen por el título, sin tildes ni mayúsculas. */
export type GuiaClave = 'fundamentales' | 'mozos' | 'platos' | 'tortas' | 'caja' | 'ensaladas' | 'merienda'

export interface Requisito {
  clave: string
  texto: string
  tipo: TipoRequisito
  guia?: GuiaClave
  semanas?: number
}

export interface Nivel {
  nivel: 1 | 2 | 3
  nombre: string
  porcentaje: number
  grupo: Grupo
  requisitos: Requisito[]
}

export const NIVELES: Nivel[] = [
  {
    nivel: 1,
    nombre: 'Mozo inicial',
    porcentaje: 50,
    grupo: 'prueba',
    requisitos: [
      { clave: 'n1_carta', texto: 'Conocimiento de la carta', tipo: 'manual' },
      { clave: 'n1_mesas', texto: 'Conocimiento de las mesas', tipo: 'manual' },
      { clave: 'n1_plazas', texto: 'Atender cualquier plaza sin problema', tipo: 'manual' },
      {
        clave: 'n1_apertura_cierre',
        texto: 'Cumplimiento y conocimiento de todas las tareas de apertura y de cierre',
        tipo: 'manual',
      },
      { clave: 'n1_ex_fundamentales', texto: 'Examen de Conocimientos Fundamentales', tipo: 'examen', guia: 'fundamentales' },
      { clave: 'n1_ex_mozos', texto: 'Examen de la Guía para Mozos, Runners y Comisses', tipo: 'examen', guia: 'mozos' },
    ],
  },
  {
    nivel: 2,
    nombre: 'Mozo',
    porcentaje: 75,
    grupo: 'reducido',
    requisitos: [
      { clave: 'n2_tiempo', texto: '4 semanas como mínimo en el nivel 1', tipo: 'tiempo', semanas: 4 },
      { clave: 'n2_ex_platos', texto: 'Examen de Platos e Ingredientes', tipo: 'examen', guia: 'platos' },
      { clave: 'n2_ex_tortas', texto: 'Examen de Tortas y Tartas', tipo: 'examen', guia: 'tortas' },
      { clave: 'n2_ex_caja', texto: 'Examen de Procedimiento de Caja', tipo: 'examen', guia: 'caja' },
      { clave: 'n2_cobro', texto: 'Cobro sin errores en el período (ninguna mesa mal cobrada)', tipo: 'manual' },
      { clave: 'n2_plaza_pico', texto: 'Lleva una plaza completa en hora pico, sin ayuda y sin demoras', tipo: 'manual' },
      {
        clave: 'n2_vender',
        texto: 'Recomienda platos y explica ingredientes y alérgenos sin consultar',
        tipo: 'manual',
      },
      { clave: 'n2_evaluacion', texto: 'Todos los criterios de evaluación en "Bien" o mejor', tipo: 'manual' },
      { clave: 'n2_puntualidad', texto: 'Ninguna llegada tarde sin aviso', tipo: 'manual' },
    ],
  },
  {
    nivel: 3,
    nombre: 'Mozo completo',
    porcentaje: 100,
    grupo: 'camarero',
    requisitos: [
      { clave: 'n3_tiempo', texto: '8 semanas como mínimo en el nivel 2', tipo: 'tiempo', semanas: 8 },
      { clave: 'n3_ex_ensaladas', texto: 'Examen de Ensaladas & Postres', tipo: 'examen', guia: 'ensaladas' },
      { clave: 'n3_ex_merienda', texto: 'Examen de Procedimiento de Merienda', tipo: 'examen', guia: 'merienda' },
      { clave: 'n3_apertura_cierre', texto: 'Hace apertura y cierre solo, de punta a punta', tipo: 'manual' },
      { clave: 'n3_reclamos', texto: 'Resuelve reclamos de clientes sin derivarlos', tipo: 'manual' },
      {
        clave: 'n3_cubre',
        texto: 'Cubre a un compañero o una plaza extra sin que se lo pidan y ayuda a otros sectores',
        tipo: 'manual',
      },
      { clave: 'n3_acompana', texto: 'Acompaña a un nuevo en sus primeros turnos', tipo: 'manual' },
      {
        clave: 'n3_evaluacion',
        texto: 'La mayoría de los criterios en "Muy bien" y ninguno en "Mal"',
        tipo: 'manual',
      },
    ],
  },
]

export const REVISAR_CADA_DIAS = 15

export function datosNivel(nivel: number): Nivel | undefined {
  return NIVELES.find((n) => n.nivel === nivel)
}

export function esRequisitoManual(clave: string): boolean {
  return NIVELES.some((n) => n.requisitos.some((r) => r.clave === clave && r.tipo === 'manual'))
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * A qué guía de los requisitos corresponde un título. Por partes del título y
 * no exacto, para que un cambio menor de nombre ("2025" → "2026") no la pierda.
 */
export function claveDeGuia(titulo: string, esPrincipal: boolean): GuiaClave | null {
  if (esPrincipal) return 'fundamentales'
  const t = normalizar(titulo)
  if (t.includes('mozos') && t.includes('runners')) return 'mozos'
  if (t.includes('platos') && t.includes('ingredientes')) return 'platos'
  if (t.includes('tortas')) return 'tortas'
  if (t.includes('procedimiento de caja')) return 'caja'
  if (t.includes('ensaladas')) return 'ensaladas'
  if (t.includes('merienda')) return 'merienda'
  return null
}

export interface FilaNivel {
  nivel: number
  desde: string
  requisitos: Record<string, { fecha?: string; por?: string }>
  revisado_at: string | null
}

export interface EstadoRequisito extends Requisito {
  cumplido: boolean
  /** Por qué no se puede saber o qué falta, para mostrar al lado. */
  nota?: string
  /** Cuándo se tildó (manual). */
  fecha?: string
}

export interface EstadoNivel extends Nivel {
  requisitos: EstadoRequisito[]
  estado: 'logrado' | 'actual' | 'siguiente' | 'futuro'
  cumplidos: number
}

export interface EstadoProgresion {
  /** null: todavía no tiene un nivel asignado. */
  nivel: number | null
  desde: string | null
  semanasEnNivel: number
  niveles: EstadoNivel[]
  /** Lo que le falta para subir al siguiente; vacío si ya está en el 3. */
  faltan: EstadoRequisito[]
  puedeSubir: boolean
  /** Días desde la última revisión de un encargado; null si nunca. */
  diasSinRevisar: number | null
}

function diasEntre(desde: string, hasta: string): number {
  return Math.floor((Date.parse(hasta) - Date.parse(desde)) / 86_400_000)
}

/**
 * Arma el estado completo de una persona.
 *
 * @param guiasAprobadas claves de las guías cuyo examen aprobó
 * @param guiasExistentes claves de las guías que existen en la app, para
 *        avisar si un requisito pide una guía que no está cargada
 * @param hoy fecha "AAAA-MM-DD" (Argentina)
 */
export function calcularProgresion(
  fila: FilaNivel | null,
  guiasAprobadas: Set<GuiaClave>,
  guiasExistentes: Set<GuiaClave>,
  hoy: string
): EstadoProgresion {
  const nivel = fila?.nivel ?? null
  const semanasEnNivel = fila ? Math.max(0, Math.floor(diasEntre(fila.desde, hoy) / 7)) : 0

  const niveles: EstadoNivel[] = NIVELES.map((n) => {
    const requisitos = n.requisitos.map((r): EstadoRequisito => {
      if (r.tipo === 'examen') {
        if (r.guia && !guiasExistentes.has(r.guia)) {
          return { ...r, cumplido: false, nota: 'La guía no está cargada en la app' }
        }
        return { ...r, cumplido: r.guia ? guiasAprobadas.has(r.guia) : false }
      }
      if (r.tipo === 'tiempo') {
        // Ya pasó ese nivel: el tiempo se cumplió en su momento.
        if (nivel !== null && nivel >= n.nivel) return { ...r, cumplido: true }
        // Solo corre el tiempo del nivel en el que está ahora.
        if (nivel === n.nivel - 1) {
          const faltan = (r.semanas ?? 0) - semanasEnNivel
          return faltan <= 0
            ? { ...r, cumplido: true }
            : { ...r, cumplido: false, nota: faltan === 1 ? 'Falta 1 semana' : `Faltan ${faltan} semanas` }
        }
        return { ...r, cumplido: false }
      }
      const tilde = fila?.requisitos?.[r.clave]
      return { ...r, cumplido: Boolean(tilde), fecha: tilde?.fecha }
    })
    const estado: EstadoNivel['estado'] =
      nivel === null
        ? n.nivel === 1
          ? 'siguiente'
          : 'futuro'
        : n.nivel < nivel
          ? 'logrado'
          : n.nivel === nivel
            ? 'actual'
            : n.nivel === nivel + 1
              ? 'siguiente'
              : 'futuro'
    return { ...n, requisitos, estado, cumplidos: requisitos.filter((r) => r.cumplido).length }
  })

  const siguiente = niveles.find((n) => n.estado === 'siguiente')
  const faltan = siguiente ? siguiente.requisitos.filter((r) => !r.cumplido) : []

  return {
    nivel,
    desde: fila?.desde ?? null,
    semanasEnNivel,
    niveles,
    faltan,
    puedeSubir: Boolean(siguiente) && faltan.length === 0,
    diasSinRevisar: fila?.revisado_at ? diasEntre(fila.revisado_at.slice(0, 10), hoy) : null,
  }
}

/** El grupo de propina que le corresponde a un nivel. */
export function grupoDeNivel(nivel: number | null | undefined): Grupo | null {
  return datosNivel(nivel ?? 0)?.grupo ?? null
}
