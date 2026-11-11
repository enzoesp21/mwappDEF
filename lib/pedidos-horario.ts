/**
 * Pedidos de cambio de horario (pedido de Facundo, 05/11).
 *
 * Cada uno puede pedir un cambio para una semana: que no puede venir algún
 * día, que solo puede o no puede en una franja, u otro cambio, siempre con el
 * motivo. Los encargados lo aprueban o no. Lo que decidió Enzo:
 *   - aprobar no cambia el horario: queda marcado en el editor, al lado de esa
 *     persona y ese día, y Facu arma la semana con eso;
 *   - el plazo es hasta el miércoles anterior a las 22 (Enzo, 10/11; antes era
 *     el jueves a las 23:59) y después se cierra;
 *   - se puede pedir para la semana que viene y cualquiera más adelante.
 * La base frena lo mismo (pedir_cambio_horario, add_pedidos_horario.sql).
 * Todo es puro: no lee la base, y la fecha de hoy se la pasan. Para el plazo
 * importa la hora: se pasa "ahora" ("2026-11-04T21:59", ahoraEnArgentina); con
 * solo la fecha cuenta como el principio de ese día.
 */

import {
  buscarPersona,
  cantidadDias,
  etiquetaSemana,
  lunesDe,
  normalizarNombre,
  sumarDias,
  type DatosHorario,
} from '@/lib/horarios'

export type TipoPedido = 'no_puedo' | 'solo_franja' | 'no_franja' | 'otro'
export type EstadoPedido = 'pendiente' | 'aprobado' | 'rechazado'

export const TIPOS_PEDIDO: { valor: TipoPedido; texto: string; ayuda: string }[] = [
  { valor: 'no_puedo', texto: 'No puedo venir', ayuda: 'Ese día no podés trabajar.' },
  { valor: 'solo_franja', texto: 'Puedo solo en un horario', ayuda: 'Por ejemplo, solo de 14 a 23.' },
  { valor: 'no_franja', texto: 'No puedo en un horario', ayuda: 'Por ejemplo, no antes de las 12.' },
  { valor: 'otro', texto: 'Otro cambio', ayuda: 'Contalo en el motivo.' },
]

export const ESTADOS_PEDIDO: Record<EstadoPedido, string> = {
  pendiente: 'Sin responder',
  aprobado: 'Aprobado',
  rechazado: 'No aprobado',
}

export interface PedidoHorario {
  id: string
  userId: string
  /** El lunes de la semana del pedido. */
  semana: string
  /** Los días que pide, todos de esa semana, en orden. */
  fechas: string[]
  tipo: TipoPedido
  /** "14:00"; solo con las franjas. */
  desde: string | null
  hasta: string | null
  motivo: string
  estado: EstadoPedido
  respuesta: string | null
  respondidoEn: string | null
  creado: string
}

export const esFranja = (tipo: TipoPedido) => tipo === 'solo_franja' || tipo === 'no_franja'

/** A qué hora del miércoles se cierra (hora de Argentina). */
export const HORA_CIERRE = '22:00'

/** El miércoles hasta el que se puede pedir para la semana de ese lunes (a las 22). */
export function plazoDe(semana: string): string {
  return sumarDias(semana, -5)
}

/**
 * Si todavía se puede pedir para la semana de ese lunes: hasta el miércoles
 * anterior a las 22 (a las 22:00 en punto ya cerró). `ahora` es
 * "AAAA-MM-DDTHH:MM" en hora de Argentina, o solo la fecha.
 */
export function semanaAbierta(semana: string, ahora: string): boolean {
  return ahora < plazoDe(semana) + 'T' + HORA_CIERRE
}

/** Las próximas semanas en las que se puede pedir (sus lunes), desde la primera abierta. */
export function semanasParaPedir(ahora: string, cuantas = 8): string[] {
  let lunes = sumarDias(lunesDe(ahora.slice(0, 10)), 7)
  if (!semanaAbierta(lunes, ahora)) lunes = sumarDias(lunes, 7)
  return Array.from({ length: cuantas }, (_, i) => sumarDias(lunes, 7 * i))
}

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/** "2026-11-10" -> "mar 10/11". */
export function diaCorto(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z')
  return `${DIAS_SEMANA[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}

/** "lun 9/11", "lun 9/11 y mar 10/11", "lun 9/11, mar 10/11 y mié 11/11". */
export function textoDias(fechas: string[]): string {
  const dias = [...fechas].sort().map(diaCorto)
  if (dias.length <= 1) return dias.join('')
  return dias.slice(0, -1).join(', ') + ' y ' + dias[dias.length - 1]
}

/** "miércoles 4/11 a las 22": hasta cuándo se puede pedir para esa semana. */
export function textoPlazo(semana: string): string {
  return 'miércoles ' + diaCorto(plazoDe(semana)).split(' ')[1] + ' a las 22'
}

/** "9 al 15 de noviembre". */
export const textoSemana = (semana: string) => etiquetaSemana(semana)

/** Lo que pide, en pocas palabras. `quien`: si lo lee la misma persona ("No puedo...") o un encargado ("No puede..."). */
export function textoPedido(p: Pick<PedidoHorario, 'tipo' | 'desde' | 'hasta'>, quien: 'yo' | 'otro' = 'otro'): string {
  const yo = quien === 'yo'
  const franja = `de ${p.desde ?? '?'} a ${p.hasta ?? '?'}`
  switch (p.tipo) {
    case 'no_puedo':
      return yo ? 'No puedo venir' : 'No puede venir'
    case 'solo_franja':
      return (yo ? 'Puedo solo ' : 'Puede solo ') + franja
    case 'no_franja':
      return (yo ? 'No puedo ' : 'No puede ') + franja
    default:
      return 'Otro cambio'
  }
}

export interface DatosPedido {
  fechas: string[]
  tipo: TipoPedido
  desde: string | null
  hasta: string | null
  motivo: string
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/

/** Revisa un pedido antes de mandarlo. Devuelve el error o null. */
export function validarPedido(d: DatosPedido, ahora: string): string | null {
  if (d.fechas.length === 0) return 'Elegí al menos un día.'
  if (d.fechas.length > 7 || !d.fechas.every((f) => FECHA.test(f) && !Number.isNaN(Date.parse(f)))) {
    return 'Revisá los días.'
  }
  const semana = lunesDe(d.fechas[0])
  if (d.fechas.some((f) => lunesDe(f) !== semana)) return 'Los días tienen que ser de la misma semana.'
  if (!semanaAbierta(semana, ahora)) {
    return `Para la semana del ${textoSemana(semana)} ya cerró el plazo: era hasta el ${textoPlazo(semana)}.`
  }
  if (!TIPOS_PEDIDO.some((t) => t.valor === d.tipo)) return 'Elegí qué necesitás.'
  if (esFranja(d.tipo)) {
    if (!d.desde || !d.hasta || !HORA.test(d.desde) || !HORA.test(d.hasta)) return 'Poné desde qué hora y hasta qué hora.'
    if (d.desde === d.hasta) return 'La hora de inicio y la de fin no pueden ser iguales.'
  }
  const motivo = d.motivo.trim()
  if (motivo.length < 3) return 'Contá el motivo.'
  if (motivo.length > 500) return 'El motivo es muy largo: hasta 500 letras.'
  return null
}

/** Una fila de pedidos_horario, con cuidado por si algo viene raro. Null si no sirve. */
export function leerPedido(fila: Record<string, unknown>): PedidoHorario | null {
  const texto = (v: unknown) => (typeof v === 'string' ? v : null)
  const hora = (v: unknown) => (typeof v === 'string' && /^\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : null)
  const tipo = fila.tipo as TipoPedido
  const estado = fila.estado as EstadoPedido
  const fechas = Array.isArray(fila.fechas) ? (fila.fechas as unknown[]).filter((f): f is string => typeof f === 'string') : []
  if (
    typeof fila.id !== 'string' ||
    typeof fila.user_id !== 'string' ||
    typeof fila.semana !== 'string' ||
    fechas.length === 0 ||
    !TIPOS_PEDIDO.some((t) => t.valor === tipo) ||
    !(estado in ESTADOS_PEDIDO)
  ) {
    return null
  }
  return {
    id: fila.id,
    userId: fila.user_id,
    semana: fila.semana,
    fechas: [...fechas].sort(),
    tipo,
    desde: hora(fila.desde),
    hasta: hora(fila.hasta),
    motivo: texto(fila.motivo) ?? '',
    estado,
    respuesta: texto(fila.respuesta),
    respondidoEn: texto(fila.respondido_en),
    creado: texto(fila.created_at) ?? '',
  }
}

/** Un pedido con el nombre de quien lo hizo, para los encargados. */
export interface PedidoConNombre extends PedidoHorario {
  nombre: string
  puesto: string | null
}

/** Lo que se marca en una celda del editor. */
export interface MarcaPedido {
  estado: 'pendiente' | 'aprobado'
  /** "Lucía Leiva: no puede venir (aprobado) · Turno médico". */
  aviso: string
}

/**
 * Las marcas del editor de una semana: para cada fila (por su nombre, sin
 * tildes ni mayúsculas) y cada día, el pedido aprobado o sin responder. Los
 * no aprobados no se marcan. Cada usuario se busca en el horario como en su
 * pantalla (buscarPersona: primero el vínculo de la planilla); `sinFila` son los pedidos de gente que no se
 * encuentra en esta semana.
 */
export function marcasDelEditor(
  datos: DatosHorario,
  lunes: string,
  pedidos: PedidoConNombre[],
  usuarios: string[],
  /** Los "nombres en Horarios" de la planilla de cada usuario vinculado (por id). */
  nombresPorUsuario: Record<string, string[]> = {}
): { marcas: Record<string, Record<number, MarcaPedido>>; sinFila: string[] } {
  const marcas: Record<string, Record<number, MarcaPedido>> = {}
  const sinFila: string[] = []
  const totalDias = cantidadDias(datos)
  for (const p of pedidos) {
    const filas = buscarPersona(datos, p.nombre, usuarios, nombresPorUsuario[p.userId] ?? [])
    if (filas.length === 0) sinFila.push(p.id)
    if (p.estado === 'rechazado') continue
    const claves = Array.from(new Set(filas.map((f) => normalizarNombre(f.persona.nombre))))
    for (const fecha of p.fechas) {
      const dia = Math.round((Date.parse(fecha) - Date.parse(lunes)) / 86_400_000)
      if (dia < 0 || dia >= totalDias) continue
      const marca: MarcaPedido = {
        estado: p.estado,
        aviso: `${p.nombre}: ${textoPedido(p).toLowerCase()} (${p.estado === 'aprobado' ? 'aprobado' : 'sin responder'}) · ${p.motivo}`,
      }
      for (const clave of claves) {
        const delaFila = (marcas[clave] ??= {})
        // Si hay dos pedidos para el mismo día, gana el aprobado.
        if (!delaFila[dia] || (delaFila[dia].estado === 'pendiente' && marca.estado === 'aprobado')) delaFila[dia] = marca
      }
    }
  }
  return { marcas, sinFila }
}
