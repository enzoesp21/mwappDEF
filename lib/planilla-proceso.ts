// Proceso de la planilla maestra: arma las celdas de todos los empleados para
// un rango de jornadas y las guarda. Lo llaman Supabase cada 2 horas (pg_cron →
// /api/planilla/actualizar) y el botón "Actualizar ahora" de un admin.
//
// La base hace de freno (planilla_guardar, supabase/add_planilla_proceso.sql):
// no pisa celdas bloqueadas, manuales, de código ni de papel, y no toca meses
// cerrados. Acá además ni se mandan, para no viajar de más.

import type { SupabaseClient } from '@supabase/supabase-js'
import { sumarDias } from '@/lib/horarios'
import {
  calcularDias,
  hhmm,
  horarioDelDia,
  puedeRecalcular,
  ubicarEnJornada,
  type EstadoCelda,
  type Marca,
  type OrigenCelda,
  type ResultadoDia,
  type SemanaPublicada,
} from '@/lib/planilla'

/** Lo que devuelve la RPC planilla_datos. */
export interface DatosPlanilla {
  /** El rango a calcular (si un mes nunca se calculó, arranca el día 1). */
  desde: string
  hasta: string
  empleados: { id: string; nombre: string; calendario: boolean; nombres_horario: string[] | null }[]
  /** [número del reloj, empleado_id] */
  alias: [string, string][]
  /** [logid, número del reloj, instante en ms] */
  fichadas: [number, string, number][]
  /** [empleado_id, instante en ms, fuente] */
  manuales: [string, number, 'papel' | 'manual'][]
  semanas: SemanaPublicada[]
  /** [empleado_id, fecha, origen, bloqueada] de las celdas que ya están guardadas. */
  existentes: [string, string, OrigenCelda, boolean][]
  /** Meses cerrados ("2026-10-01"): no se tocan. */
  cerrados: string[]
}

/** Una celda tal como la guarda planilla_guardar. Las horas de la sugerencia y los tramos van en minutos de la jornada. */
export interface CeldaCalculada {
  fecha: string
  empleado_id: string
  horas: number | null
  minutos: number | null
  estado: EstadoCelda
  origen: ResultadoDia['origen']
  /** "07:28" (para mostrar; una salida de madrugada queda "01:20"). */
  entrada: string | null
  salida: string | null
  tramos: { desde: number; hasta: number }[]
  fichadas_usadas: number[]
  horario: string | null
  sugerencia: { falta: 'entrada' | 'salida'; fichada: number; habitual: number | null; segun_horario: number | null } | null
  avisos: { tipo: string; texto: string }[]
}

/** Las fechas entre dos días, inclusive. */
export function fechasEntre(desde: string, hasta: string): string[] {
  const fechas: string[] = []
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) fechas.push(f)
  return fechas
}

/**
 * Lo que recalcula cada pasada: la jornada de hoy, la anterior y los 3 días
 * de antes, por si entraron fichadas atrasadas.
 */
export function rangoPorDefecto(ahora: number): { desde: string; hasta: string } {
  const hoy = ubicarEnJornada(ahora, false).fecha
  return { desde: sumarDias(hoy, -4), hasta: hoy }
}

export function celdaDeResultado(r: ResultadoDia, empleadoId: string): CeldaCalculada {
  return {
    fecha: r.fecha,
    empleado_id: empleadoId,
    horas: r.horas,
    minutos: r.minutos,
    estado: r.estado,
    origen: r.origen,
    entrada: r.entrada === null ? null : hhmm(r.entrada),
    salida: r.salida === null ? null : hhmm(r.salida),
    tramos: r.tramos,
    fichadas_usadas: r.logids,
    horario: r.horario,
    sugerencia: r.sugerencia && {
      falta: r.sugerencia.falta,
      fichada: r.sugerencia.fichada,
      habitual: r.sugerencia.habitual,
      segun_horario: r.sugerencia.segunHorario,
    },
    avisos: r.avisos,
  }
}

/**
 * Pura: las celdas de todos los empleados para las jornadas del rango. Deja
 * afuera las que el proceso no puede tocar (las tocó un admin o son de papel)
 * y las de meses cerrados. Con forzarPapel también recalcula las de papel:
 * es lo que hace falta después de cargar o corregir una fichada de papel.
 */
export function armarCeldas(d: DatosPlanilla, ahora: number, forzarPapel = false): CeldaCalculada[] {
  const numerosDe = new Map<string, string[]>()
  for (const [userid, empleado] of d.alias) numerosDe.set(empleado, [...(numerosDe.get(empleado) ?? []), userid])

  const delReloj = new Map<string, Marca[]>()
  for (const [logid, userid, ms] of d.fichadas) {
    delReloj.set(userid, [...(delReloj.get(userid) ?? []), { ms, fuente: 'reloj', logid }])
  }
  const deMano = new Map<string, Marca[]>()
  for (const [empleado, ms, fuente] of d.manuales) deMano.set(empleado, [...(deMano.get(empleado) ?? []), { ms, fuente }])

  const existentes = new Map<string, { origen: OrigenCelda; bloqueada: boolean }>()
  for (const [empleado, fecha, origen, bloqueada] of d.existentes) existentes.set(`${empleado}|${fecha}`, { origen, bloqueada })

  const cerrados = new Set(d.cerrados.map((c) => c.slice(0, 7)))
  const fechas = fechasEntre(d.desde, d.hasta).filter((f) => !cerrados.has(f.slice(0, 7)))
  if (fechas.length === 0) return []

  const celdas: CeldaCalculada[] = []
  for (const e of d.empleados) {
    // Todas sus fichadas: las de cada número del reloj que es suyo (Bruno tiene dos) y las de papel.
    const marcas = [...(numerosDe.get(e.id) ?? []).flatMap((u) => delReloj.get(u) ?? []), ...(deMano.get(e.id) ?? [])]
    const nombres = e.nombres_horario ?? []
    const resultados = calcularDias({
      marcas,
      calendario: e.calendario,
      horarioDe: (fecha) => horarioDelDia(d.semanas, nombres, fecha),
      fechas,
      ahora,
    })
    resultados.forEach((r, fecha) => {
      const previa = existentes.get(`${e.id}|${fecha}`)
      const papelQueSePuedeRehacer = forzarPapel && previa !== undefined && !previa.bloqueada && previa.origen === 'papel'
      if (puedeRecalcular(previa) || papelQueSePuedeRehacer) celdas.push(celdaDeResultado(r, e.id))
    })
  }
  return celdas
}

export type ResultadoProceso =
  | { ok: true; desde: string; hasta: string; guardadas: number; borradas: number; mesesCerrados: string[] }
  | { ok: false; error: string; sinPermiso?: boolean }

/** Traduce el error de la base; si falta el SQL, dice cuál correr. */
function fallo(error: { message: string; code?: string }): ResultadoProceso {
  if (/planilla_(datos|guardar)|schema cache/i.test(error.message)) {
    return { ok: false, error: 'Falta correr el SQL del proceso (supabase/add_planilla_proceso.sql) en Supabase.' }
  }
  return { ok: false, error: error.message, sinPermiso: error.code === '42501' }
}

/**
 * Lee lo necesario, arma las celdas y las guarda. Con clave entra el pedido
 * de Supabase (sin usuario); con clave null, un admin con su sesión.
 */
export async function recalcularPlanilla(
  supabase: SupabaseClient,
  o: { clave: string | null; desde: string; hasta: string; ahora: number; forzarPapel?: boolean }
): Promise<ResultadoProceso> {
  const lectura = await supabase.rpc('planilla_datos', { p_clave: o.clave, p_desde: o.desde, p_hasta: o.hasta })
  if (lectura.error) return fallo(lectura.error)
  const datos = lectura.data as DatosPlanilla

  const celdas = armarCeldas(datos, o.ahora, o.forzarPapel)
  const guardado = await supabase.rpc('planilla_guardar', {
    p_clave: o.clave,
    p_desde: datos.desde,
    p_hasta: datos.hasta,
    p_celdas: celdas,
    p_forzar_papel: Boolean(o.forzarPapel),
  })
  if (guardado.error) return fallo(guardado.error)
  const r = guardado.data as { guardadas: number; borradas: number; meses_cerrados: string[] | null }
  return {
    ok: true,
    desde: datos.desde,
    hasta: datos.hasta,
    guardadas: r.guardadas,
    borradas: r.borradas,
    mesesCerrados: r.meses_cerrados ?? [],
  }
}
