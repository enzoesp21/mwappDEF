/**
 * Horarios semanales del personal.
 *
 * Cada semana se guarda entera como un documento: sectores, personas y los
 * siete días, con el mismo texto libre que se usa en la planilla ("9 A 17.30",
 * "11C", "X", "VAC", "M9"). No se atan a los usuarios de la app porque la
 * mayoría del personal —cocina, maestranza— no tiene usuario.
 */

export interface PersonaHorario {
  nombre: string
  /** Siete celdas, de lunes a domingo. */
  dias: string[]
}

export interface SectorHorario {
  nombre: string
  personas: PersonaHorario[]
}

export interface DatosHorario {
  sectores: SectorHorario[]
  /** Días de la semana que son feriado (0 = lunes ... 6 = domingo). */
  feriados?: number[]
  /**
   * Días con servicio de noche (0 = lunes ... 6 = domingo). Si no está, son
   * viernes y sábado; en temporada puede ser toda la semana.
   */
  noches?: number[]
  /**
   * Días de la semana siguiente que se suman al final (0, 1 o 2), por ejemplo
   * si el lunes que viene es feriado y se pasa el horario completo hasta ahí.
   * Si no está, la semana tiene sus 7 días de siempre.
   */
  diasExtra?: number
}

export type EstadoSemana = 'draft' | 'published'

export interface SemanaHorario {
  id: string
  week_start: string
  status: EstadoSemana
  data: DatosHorario
  published_at: string | null
  updated_at: string
}

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Como mucho se suman dos días de la semana siguiente. */
export const MAX_DIAS_EXTRA = 2

/** Cuántos días tiene la planilla: 7, u 8 o 9 si se sumaron días extra. */
export function cantidadDias(datos: DatosHorario): number {
  const extra = datos.diasExtra ?? 0
  return 7 + (Number.isInteger(extra) ? Math.min(Math.max(extra, 0), MAX_DIAS_EXTRA) : 0)
}

/** Nombre del día por su posición: el 7 vuelve a ser lunes. */
export function nombreDia(indice: number): string {
  return DIAS[indice % 7]
}

export function nombreDiaCorto(indice: number): string {
  return DIAS_CORTOS[indice % 7]
}

/** Fuera de temporada hay servicio de noche viernes y sábado. */
export const NOCHES_POR_DEFECTO = [4, 5]

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function aFecha(iso: string): Date {
  return new Date(iso + 'T00:00:00Z')
}

function aISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** El lunes de la semana a la que pertenece esa fecha. */
export function lunesDe(fechaISO: string): string {
  const d = aFecha(fechaISO)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return aISO(d)
}

/** Fecha de hoy en Argentina, que no tiene horario de verano. */
export function hoyEnArgentina(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export function sumarDias(fechaISO: string, dias: number): string {
  const d = aFecha(fechaISO)
  d.setUTCDate(d.getUTCDate() + dias)
  return aISO(d)
}

/** Las fechas de la planilla, de lunes a domingo (más los días extra). */
export function fechasDeLaSemana(lunes: string, dias = 7): string[] {
  return Array.from({ length: dias }, (_, i) => sumarDias(lunes, i))
}

/**
 * "21 al 27 de septiembre", o "28 de septiembre al 4 de octubre". Con días
 * extra llega hasta el último: "5 al 12 de octubre".
 */
export function etiquetaSemana(lunes: string, dias = 7): string {
  const a = aFecha(lunes)
  const b = aFecha(sumarDias(lunes, dias - 1))
  const mesA = MESES[a.getUTCMonth()]
  const mesB = MESES[b.getUTCMonth()]
  return mesA === mesB
    ? a.getUTCDate() + ' al ' + b.getUTCDate() + ' de ' + mesB
    : a.getUTCDate() + ' de ' + mesA + ' al ' + b.getUTCDate() + ' de ' + mesB
}

/** Número de día del mes, para los encabezados: "Lun 21". */
export function numeroDeDia(lunes: string, indice: number): number {
  return aFecha(sumarDias(lunes, indice)).getUTCDate()
}

export type TipoCelda = 'vacio' | 'libre' | 'vacaciones' | 'licencia' | 'otro_lugar' | 'turno'

/** Qué significa lo que está escrito en una celda. */
export function tipoCelda(valor: string): TipoCelda {
  const v = valor.trim().toUpperCase()
  if (!v) return 'vacio'
  if (v === 'X') return 'libre'
  if (v === 'VAC') return 'vacaciones'
  if (v === 'LIC') return 'licencia'
  // Trabaja ese día en Mirador 9, no acá.
  if (v === 'M9') return 'otro_lugar'
  return 'turno'
}

/** "11C", "11 a C", "16C": entra a esa hora y se queda hasta el cierre. */
export function esCierre(valor: string): boolean {
  return /^\d{1,2}([.:]\d{2})?\s*(A\s*)?C$/i.test(valor.trim())
}

/** Cada día de la planilla: true si ese día hay servicio de noche. */
export function diasConNoche(datos: DatosHorario): boolean[] {
  const noches = datos.noches ?? NOCHES_POR_DEFECTO
  return Array.from({ length: cantidadDias(datos) }, (_, i) => noches.includes(i))
}

/**
 * Hace noche si lo dice explícitamente ("11+ NOCHE") o si cierra un día con
 * servicio de noche. Es la misma cuenta que se hace a mano en la planilla.
 */
export function esNoche(valor: string, hayNocheEseDia: boolean): boolean {
  if (tipoCelda(valor) !== 'turno') return false
  if (/NOCHE/i.test(valor)) return true
  return esCierre(valor) && hayNocheEseDia
}

export interface TotalDia {
  /** Cuántos trabajan ese día en el complejo. */
  total: number
  /** De esos, cuántos hacen noche. */
  noche: number
}

/** Cuántos trabajan por día en un sector. `noches`: sale de diasConNoche(). */
export function totalesDelSector(sector: SectorHorario, noches: boolean[]): TotalDia[] {
  return Array.from({ length: noches.length }, (_, dia) => {
    let total = 0
    let noche = 0
    for (const p of sector.personas) {
      const celda = p.dias[dia] ?? ''
      if (tipoCelda(celda) !== 'turno') continue
      total++
      if (esNoche(celda, noches[dia])) noche++
    }
    return { total, noche }
  })
}

export function normalizarNombre(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Busca a la persona logueada en el horario, para mostrarle su semana.
 *
 * En la planilla se usan nombres cortos ("Bruno", "Lucas Lopez") y en la app
 * el completo ("Bruno Molina", "Lucas Uriel López Saaied"). Una fila coincide
 * si todas sus palabras están en el nombre de la app, y se queda con la más
 * específica: "Lucas Lopez" le gana a "Lucas".
 *
 * Mostrarle a alguien el horario de otro es peor que no mostrarle nada, así
 * que ante la duda no devuelve nada:
 * - si las mejores coincidencias son personas distintas;
 * - si solo coincide el nombre de pila y hay otro usuario con ese mismo nombre.
 *
 * Varias filas con el mismo nombre se toman como la misma persona trabajando
 * en dos sectores (pasa: "Gabriel" en Maestranza y en Ensalada).
 */
export function buscarEnHorario(
  datos: DatosHorario,
  nombreCompleto: string,
  otrosUsuarios: string[] = []
): { sector: string; persona: PersonaHorario }[] {
  const completo = normalizarNombre(nombreCompleto)
  if (!completo) return []
  const palabrasUsuario = new Set(completo.split(' '))
  const pila = completo.split(' ')[0]

  const todas = datos.sectores.flatMap((s) =>
    s.personas.map((p) => ({ sector: s.nombre, persona: p, clave: normalizarNombre(p.nombre) }))
  )

  const exactas = todas.filter((x) => x.clave === completo)
  if (exactas.length > 0) return exactas.map(({ sector, persona }) => ({ sector, persona }))

  const candidatas = todas.filter(
    (x) => x.clave && x.clave.split(' ').every((palabra) => palabrasUsuario.has(palabra))
  )
  if (candidatas.length === 0) return []

  const masPalabras = Math.max(...candidatas.map((x) => x.clave.split(' ').length))
  const mejores = candidatas.filter((x) => x.clave.split(' ').length === masPalabras)

  if (new Set(mejores.map((x) => x.clave)).size > 1) return []

  // Solo el nombre de pila: vale si no hay otro usuario que se llame igual.
  if (masPalabras === 1) {
    const tocayos = otrosUsuarios
      .map(normalizarNombre)
      .filter((n) => n && n !== completo && n.split(' ')[0] === pila)
    if (tocayos.length > 0) return []
  }

  return mejores.map(({ sector, persona }) => ({ sector, persona }))
}

export function semanaVacia(): DatosHorario {
  return { sectores: [] }
}

export function esFeriado(datos: DatosHorario, indiceDia: number): boolean {
  return (datos.feriados ?? []).includes(indiceDia)
}

/** Se pinta como fin de semana: sábado, domingo o feriado. */
export function pintaComoFinde(datos: DatosHorario, indiceDia: number): boolean {
  return indiceDia % 7 >= 5 || esFeriado(datos, indiceDia)
}

/** Suma al final el día siguiente de la semana que viene, vacío para todos. */
export function agregarDiaExtra(datos: DatosHorario): DatosHorario {
  const extra = cantidadDias(datos) - 7
  if (extra >= MAX_DIAS_EXTRA) return datos
  return {
    ...datos,
    diasExtra: extra + 1,
    sectores: datos.sectores.map((s) => ({
      ...s,
      personas: s.personas.map((p) => ({ ...p, dias: [...p.dias, ''] })),
    })),
  }
}

/** Saca el último día extra, con lo que tuviera escrito, y sus marcas. */
export function quitarDiaExtra(datos: DatosHorario): DatosHorario {
  const total = cantidadDias(datos)
  if (total <= 7) return datos
  const ultimo = total - 1
  const sinUltimo = (l?: number[]) => (l ? l.filter((d) => d !== ultimo) : l)
  const extra = total - 8
  const { diasExtra: _, ...resto } = datos
  return {
    ...resto,
    ...(extra > 0 ? { diasExtra: extra } : {}),
    ...(datos.feriados ? { feriados: sinUltimo(datos.feriados) } : {}),
    ...(datos.noches ? { noches: sinUltimo(datos.noches) } : {}),
    sectores: datos.sectores.map((s) => ({
      ...s,
      personas: s.personas.map((p) => ({ ...p, dias: p.dias.slice(0, ultimo) })),
    })),
  }
}

/** Si el último día extra tiene algo escrito (para avisar antes de sacarlo). */
export function ultimoDiaExtraTieneDatos(datos: DatosHorario): boolean {
  const total = cantidadDias(datos)
  if (total <= 7) return false
  return datos.sectores.some((s) => s.personas.some((p) => (p.dias[total - 1] ?? '').trim() !== ''))
}

/**
 * Copia una semana dejando la estructura y los horarios, para editar encima.
 * Los feriados no se copian: son de una fecha puntual. Los días con noche sí:
 * la temporada dura varias semanas. Los días extra tampoco: la copia es
 * siempre de lunes a domingo.
 */
export function copiarDatos(datos: DatosHorario): DatosHorario {
  return {
    ...(datos.noches ? { noches: datos.noches.filter((d) => d < 7) } : {}),
    sectores: datos.sectores.map((s) => ({
      nombre: s.nombre,
      personas: s.personas.map((p) => ({
        nombre: p.nombre,
        dias: Array.from({ length: 7 }, (_, i) => p.dias[i] ?? ''),
      })),
    })),
  }
}

/** Valida la forma de los datos antes de guardarlos. */
export function validarDatos(datos: unknown): datos is DatosHorario {
  if (!datos || typeof datos !== 'object') return false
  const d = datos as DatosHorario
  if (!Array.isArray(d.sectores)) return false
  if (
    d.diasExtra !== undefined &&
    !(Number.isInteger(d.diasExtra) && d.diasExtra >= 0 && d.diasExtra <= MAX_DIAS_EXTRA)
  ) {
    return false
  }
  const total = 7 + (d.diasExtra ?? 0)
  const listaDeDias = (l: unknown) =>
    l === undefined || (Array.isArray(l) && l.every((n) => Number.isInteger(n) && n >= 0 && n < total))
  if (!listaDeDias(d.feriados) || !listaDeDias(d.noches)) return false
  return d.sectores.every(
    (s) =>
      typeof s?.nombre === 'string' &&
      Array.isArray(s.personas) &&
      s.personas.every(
        (p) =>
          typeof p?.nombre === 'string' &&
          Array.isArray(p.dias) &&
          p.dias.length === total &&
          p.dias.every((c) => typeof c === 'string' && c.length <= 40)
      )
  )
}
