// Lo que necesita la pantalla de la planilla: las filas en el orden de la hoja,
// HORAS y DÍAS de cada uno, y los nombres de los días. Puro, para probarlo
// (lib/planilla-vista.test.ts) y para usarlo igual en el Excel.

import { HORAS_POR_DIA, ubicarEnJornada } from '@/lib/planilla'

export type CodigoCelda = 'VAC' | 'CERT' | 'LIC' | 'FRANCO' | 'NO VINO'

export const CODIGOS: CodigoCelda[] = ['VAC', 'CERT', 'LIC', 'FRANCO', 'NO VINO']

/** Una celda tal como está en planilla_celdas. */
export interface CeldaPlanilla {
  empleado_id: string
  dia: number
  horas: number | null
  codigo: CodigoCelda | null
  origen: 'reloj' | 'papel' | 'manual' | 'codigo'
  estado: 'ok' | 'incompleto' | 'revisar'
  /** "07:28:00" */
  entrada: string | null
  salida: string | null
  /** En minutos de la jornada (una salida a la 01:20 del día siguiente es 1520). */
  tramos: { desde: number; hasta: number }[] | null
  minutos: number | null
  horario: string | null
  sugerencia: { falta: 'entrada' | 'salida'; fichada: number; habitual: number | null; segun_horario: number | null } | null
  avisos: { tipo: string; texto: string }[] | null
  nota: string | null
  bloqueada: boolean
}

/** Un renglón de la foto del mes (planilla_meses.empleados). */
export interface EmpleadoDeHoja {
  empleado_id: string
  nombre: string
  cargo: string | null
  orden: number
}

export interface FilaPlanilla {
  empleadoId: string
  nombre: string
  cargo: string | null
  /** Por día del mes. */
  celdas: Record<number, CeldaPlanilla>
  horas: number
  /** HORAS / 8,5 */
  dias: number
  incompletas: number
}

/** 28, 29, 30 o 31. */
export function diasDelMes(mes: string): number {
  const [anio, numero] = mes.split('-').map(Number)
  return new Date(Date.UTC(anio, numero, 0)).getUTCDate()
}

/** Como en la planilla de Excel, con tildes. Empieza en domingo (getUTCDay). */
export const NOMBRES_DIA = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']

export const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

/** 0 = domingo ... 6 = sábado. */
export function diaDeSemana(mes: string, dia: number): number {
  const [anio, numero] = mes.split('-').map(Number)
  return new Date(Date.UTC(anio, numero - 1, dia)).getUTCDay()
}

/** "2026-10" → "Octubre 2026". */
export function nombreDelMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number)
  const nombre = MESES[numero - 1]
  return `${nombre.charAt(0)}${nombre.slice(1).toLowerCase()} ${anio}`
}

export function moverMes(mes: string, delta: number): string {
  const [anio, numero] = mes.split('-').map(Number)
  return new Date(Date.UTC(anio, numero - 1 + delta, 1)).toISOString().slice(0, 7)
}

/** El mes de la jornada que corre (a las 3 de la mañana del 1° todavía es el mes anterior). */
export function mesDeHoy(ahora: number): string {
  return ubicarEnJornada(ahora, false).fecha.slice(0, 7)
}

/** "8,5", "8", "18,5". */
export function textoHoras(horas: number): string {
  return horas.toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

/** DÍAS con dos decimales, como en el Excel: "20,94". */
export function textoDias(dias: number): string {
  return dias.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Las filas en el orden de la hoja de ese mes: la foto que se sacó al abrirlo,
 * más quien tenga celdas y no esté (va al final). Nombre y cargo, los de hoy:
 * si se corrige un cargo, se ve corregido.
 */
export function armarFilas(
  foto: EmpleadoDeHoja[],
  actuales: Map<string, { nombre: string; cargo: string | null }>,
  celdas: CeldaPlanilla[]
): FilaPlanilla[] {
  const porEmpleado = new Map<string, CeldaPlanilla[]>()
  for (const c of celdas) porEmpleado.set(c.empleado_id, [...(porEmpleado.get(c.empleado_id) ?? []), c])

  const orden = [...foto].sort((a, b) => a.orden - b.orden).map((e) => e.empleado_id)
  const enLaFoto = new Set(orden)
  const sueltos = Array.from(porEmpleado.keys()).filter((id) => !enLaFoto.has(id))
  const deLaFoto = new Map(foto.map((e) => [e.empleado_id, e]))

  return [...orden, ...sueltos].map((id) => {
    const propias = porEmpleado.get(id) ?? []
    const horas = propias.reduce((s, c) => s + (c.horas ?? 0), 0)
    const datos = actuales.get(id) ?? deLaFoto.get(id)
    return {
      empleadoId: id,
      nombre: datos?.nombre ?? 'Empleado borrado',
      cargo: datos?.cargo ?? null,
      celdas: Object.fromEntries(propias.map((c) => [c.dia, c])),
      horas,
      dias: horas / HORAS_POR_DIA,
      incompletas: propias.filter((c) => c.estado === 'incompleto').length,
    }
  })
}

/** "2026-10" y el día → "2026-10-23". */
export function fechaDelDia(mes: string, dia: number): string {
  return `${mes}-${String(dia).padStart(2, '0')}`
}
