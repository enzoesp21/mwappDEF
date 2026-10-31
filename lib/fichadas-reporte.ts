// Lo que arma el reporte del mes en /admin/fichadas: los turnos de cada uno con
// sus horas, y en qué sector de Horarios va cada persona del reloj.

import { horarioDelTurno, lunesDe, normalizarNombre, tipoCelda, type DatosHorario } from '@/lib/horarios'
import { jornadaDe, nombreDe, type FichadaLeida, type PersonaFichero } from '@/lib/fichadas'

export const SIN_SECTOR_HORARIOS = 'Sin sector en Horarios'

// ---------------------------------------------------------------------------
// Nombres del reloj -> sectores de Horarios
// ---------------------------------------------------------------------------

export interface SemanaConDatos {
  week_start: string
  data: DatosHorario
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y'])
// En CrossChex a algunos les pusieron el sector como apellido ("LURDES COCINA").
const PALABRAS_DE_SECTOR = ['cocina', 'barra', 'caja', 'salon', 'mozo', 'mozos', 'recepcion', 'limpieza', 'bacha']

function palabras(nombre: string): string[] {
  return normalizarNombre(nombre)
    .replace(/[^a-z ]/g, ' ')
    .split(' ')
    .filter((p) => p.length >= 2 && !PARTICULAS.has(p))
}

function distancia(a: string, b: string): number {
  const previa = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previa[0]
    previa[0] = i
    for (let j = 1; j <= b.length; j++) {
      const arriba = previa[j]
      previa[j] = Math.min(previa[j] + 1, previa[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = arriba
    }
  }
  return previa[b.length]
}

/** Iguales, o con una letra de diferencia si son largas ("Caruso" / "Carusso", "Gisel" / "Gisela"). */
function parecidas(a: string, b: string): boolean {
  return a === b || (Math.min(a.length, b.length) >= 4 && distancia(a, b) <= 1)
}

/**
 * Cuántas palabras del nombre de Horarios están en el del reloj, si están todas
 * las del más corto ("Lazarte Lautaro Daniel" / "LAUTARO LAZARTE" = 2). Si no, 0.
 */
function coincidencia(deHorario: string[], delReloj: string[]): number {
  // Con una sola palabra en juego no se perdona ninguna letra: "Moreno" no es "MORENA".
  const unaSola = Math.min(deHorario.length, delReloj.length) === 1
  const libres = [...delReloj]
  let iguales = 0
  for (const p of deHorario) {
    const i = libres.findIndex((q) => (unaSola ? p === q : parecidas(p, q)))
    if (i >= 0) {
      iguales++
      libres.splice(i, 1)
    }
  }
  return iguales > 0 && iguales === Math.min(deHorario.length, delReloj.length) ? iguales : 0
}

interface Ubicacion {
  sector: string
  dias: string[]
}

export interface SectoresDelHorario {
  /** El sector de esa persona ese día (fecha "2026-10-30"), o null si no está en Horarios. */
  sectorDe: (userid: string, fecha: string) => string | null
  /** Lo que dice la planilla de esa semana para esa persona ese día ("8 A 16.30", "X"), o null. */
  celdaDe: (userid: string, fecha: string) => string | null
  /** Los sectores en el orden de la planilla. */
  orden: string[]
}

/**
 * Relaciona cada nombre de la planilla de Horarios con una persona del reloj.
 *
 * Solo entre quienes ficharon (los activos) y sin adivinar: si un nombre de la
 * planilla coincide igual de bien con dos personas ("Martina" con Martina Soler
 * y Martina Barcia), no se vincula y esa gente va a "Sin sector en Horarios".
 * Quien está en dos sectores la misma semana va al que tiene turno ese día.
 */
export function vincularHorarios(
  semanas: SemanaConDatos[],
  personas: PersonaFichero[],
  activos: Set<string>
): SectoresDelHorario {
  const deSector = new Set(PALABRAS_DE_SECTOR)
  semanas.forEach((s) => s.data.sectores.forEach((sec) => palabras(sec.nombre).forEach((p) => deSector.add(p))))

  const delReloj = personas
    .filter((p) => activos.has(p.userid))
    .map((p) => {
      const todas = palabras(p.nombre)
      const sinSector = todas.filter((x) => !deSector.has(x))
      return { userid: p.userid, palabras: sinSector.length > 0 ? sinSector : todas }
    })

  const vinculos = new Map<string, string[]>()
  function vincular(nombre: string): string[] {
    const clave = normalizarNombre(nombre)
    if (vinculos.has(clave)) return vinculos.get(clave)!
    const buscadas = palabras(nombre)
    let mejor = 0
    let elegidos: { userid: string; palabras: string[] }[] = []
    if (buscadas.length > 0) {
      for (const r of delReloj) {
        const c = coincidencia(buscadas, r.palabras)
        if (c > mejor) {
          mejor = c
          elegidos = [r]
        } else if (c === mejor && c > 0) {
          elegidos.push(r)
        }
      }
    }
    // Varios con el mismo nombre exacto es la misma persona cargada dos veces
    // en el reloj (pasa: Bruno Molina). Si los nombres difieren, es la duda.
    const mismoNombre = new Set(elegidos.map((r) => [...r.palabras].sort().join(' '))).size === 1
    const userids = elegidos.length === 1 || mismoNombre ? elegidos.map((r) => r.userid) : []
    vinculos.set(clave, userids)
    return userids
  }

  // semana (lunes) -> userid -> dónde figura esa semana
  const porSemana = new Map<string, Map<string, Ubicacion[]>>()
  const orden: string[] = []
  for (const semana of [...semanas].sort((a, b) => a.week_start.localeCompare(b.week_start))) {
    const enLaSemana = new Map<string, Ubicacion[]>()
    for (const sector of semana.data.sectores) {
      const nombreSector = sector.nombre.trim()
      if (!nombreSector) continue
      if (!orden.includes(nombreSector)) orden.push(nombreSector)
      for (const persona of sector.personas) {
        if (!persona.nombre?.trim()) continue
        for (const userid of vincular(persona.nombre)) {
          enLaSemana.set(userid, [...(enLaSemana.get(userid) ?? []), { sector: nombreSector, dias: persona.dias }])
        }
      }
    }
    porSemana.set(semana.week_start, enLaSemana)
  }
  const lunesOrdenados = Array.from(porSemana.keys()).sort()

  /** Dónde figura ese día: si está en dos sectores, el que tiene turno. */
  function ubicacionDelDia(ubicaciones: Ubicacion[], fecha: string, lunes: string): { ubicacion: Ubicacion; indice: number } {
    const indice = Math.round((Date.parse(fecha) - Date.parse(lunes)) / 86400000)
    const conTurno = ubicaciones.find((u) => tipoCelda(u.dias?.[indice] ?? '') === 'turno')
    return { ubicacion: conTurno ?? ubicaciones[0], indice }
  }

  function sectorDe(userid: string, fecha: string): string | null {
    const lunes = lunesDe(fecha)
    let ubicaciones = porSemana.get(lunes)?.get(userid)
    if (!ubicaciones) {
      // Esa semana no tiene planilla o no figura: la semana más cercana en que sí.
      const cercanas = [...lunesOrdenados].sort(
        (a, b) => Math.abs(Date.parse(a) - Date.parse(lunes)) - Math.abs(Date.parse(b) - Date.parse(lunes))
      )
      for (const l of cercanas) {
        ubicaciones = porSemana.get(l)?.get(userid)
        if (ubicaciones) break
      }
    }
    if (!ubicaciones) return null
    return ubicacionDelDia(ubicaciones, fecha, lunes).ubicacion.sector
  }

  // Acá no vale otra semana: la celda tiene que ser la de ese día.
  function celdaDe(userid: string, fecha: string): string | null {
    const lunes = lunesDe(fecha)
    const ubicaciones = porSemana.get(lunes)?.get(userid)
    if (!ubicaciones) return null
    const { ubicacion, indice } = ubicacionDelDia(ubicaciones, fecha, lunes)
    return ubicacion.dias?.[indice] ?? null
  }

  return { sectorDe, celdaDe, orden }
}

/** Agrupa por sector en el orden de la planilla; los que no están, al final. */
export function agruparPorSector<T>(
  items: T[],
  sectorDe: (item: T) => string | null,
  orden: string[]
): { nombre: string; items: T[] }[] {
  const grupos = new Map<string, T[]>()
  for (const item of items) {
    const sector = sectorDe(item) ?? SIN_SECTOR_HORARIOS
    grupos.set(sector, [...(grupos.get(sector) ?? []), item])
  }
  const posicion = (s: string) => (s === SIN_SECTOR_HORARIOS ? Infinity : orden.indexOf(s) === -1 ? 999 : orden.indexOf(s))
  return Array.from(grupos, ([nombre, items]) => ({ nombre, items })).sort((a, b) => posicion(a.nombre) - posicion(b.nombre))
}

/** "08:00 (8 A 16.30)", "franco", "no figura en Horarios ese día"... para mostrar al tocar un nombre. */
export function entradaSegunHorario(celda: string | null): string {
  if (celda === null) return 'no figura en Horarios ese día'
  const texto = celda.trim()
  switch (tipoCelda(texto)) {
    case 'vacio':
      return 'no tiene horario cargado ese día'
    case 'libre':
      return 'tenía franco (X)'
    case 'vacaciones':
      return 'estaba de vacaciones'
    case 'licencia':
      return 'estaba de licencia'
    case 'otro_lugar':
      return `en otro lado (${texto})`
  }
  const turno = horarioDelTurno(texto)
  if (!turno) return texto
  const h = Math.floor(turno.inicio)
  const m = Math.round((turno.inicio - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} (${texto})`
}

// ---------------------------------------------------------------------------
// Turnos y horas
// ---------------------------------------------------------------------------

export type Incompleto = 'en-curso' | 'sin-salida' | 'sin-entrada'

export interface Turno {
  userid: string
  /** La jornada a la que pertenece (la de la entrada), "2026-10-30". */
  dia: string
  entrada: string | null
  salida: string | null
  /** Duración en ms; 0 si está incompleto. */
  ms: number
  incompleto: Incompleto | null
}

/** Arma los turnos (entrada -> salida) de cada uno a partir de las fichadas ya deducidas. */
export function armarTurnos(leidas: FichadaLeida[], ahora: number, turnoLargo: number): Turno[] {
  const turnos: Turno[] = []
  const abierta = new Map<string, FichadaLeida>()
  const cerrarSinSalida = (f: FichadaLeida, enCurso: boolean) =>
    turnos.push({
      userid: f.userid,
      dia: jornadaDe(f.fecha_hora),
      entrada: f.fecha_hora,
      salida: null,
      ms: 0,
      incompleto: enCurso ? 'en-curso' : 'sin-salida',
    })

  for (const f of leidas) {
    const previa = abierta.get(f.userid)
    if (f.sentido === 'entrada') {
      if (previa) cerrarSinSalida(previa, false)
      abierta.set(f.userid, f)
    } else if (previa) {
      turnos.push({
        userid: f.userid,
        dia: jornadaDe(previa.fecha_hora),
        entrada: previa.fecha_hora,
        salida: f.fecha_hora,
        ms: Date.parse(f.fecha_hora) - Date.parse(previa.fecha_hora),
        incompleto: null,
      })
      abierta.delete(f.userid)
    } else {
      turnos.push({ userid: f.userid, dia: jornadaDe(f.fecha_hora), entrada: null, salida: f.fecha_hora, ms: 0, incompleto: 'sin-entrada' })
    }
  }
  abierta.forEach((f) => cerrarSinSalida(f, ahora - Date.parse(f.fecha_hora) <= turnoLargo))
  return turnos
}

export interface FilaPersona {
  userid: string
  nombre: string
  /** A qué hora le tocaba entrar ese día según Horarios (texto para mostrar). */
  entradaHorario: string
  turnos: Turno[]
  ms: number
}

export interface SectorDelDia {
  nombre: string
  filas: FilaPersona[]
  ms: number
}

export interface Dia {
  fecha: string
  personas: number
  ms: number
  sectores: SectorDelDia[]
}

/** Cada día del mes, del más nuevo al más viejo: quiénes trabajaron, por sector, y cuántas horas. */
export function reporteDelMes(
  turnos: Turno[],
  fechas: string[],
  personas: Map<string, PersonaFichero>,
  horario: SectoresDelHorario
): Dia[] {
  const porDia = new Map<string, Turno[]>()
  for (const t of turnos) porDia.set(t.dia, [...(porDia.get(t.dia) ?? []), t])

  return [...fechas].reverse().map((fecha) => {
    const delDia = porDia.get(fecha) ?? []
    const porPersona = new Map<string, Turno[]>()
    for (const t of delDia) porPersona.set(t.userid, [...(porPersona.get(t.userid) ?? []), t])

    const filas: FilaPersona[] = Array.from(porPersona, ([userid, ts]) => ({
      userid,
      nombre: nombreDe(personas.get(userid), userid),
      entradaHorario: entradaSegunHorario(horario.celdaDe(userid, fecha)),
      turnos: ts.sort((a, b) => Date.parse(a.entrada ?? a.salida!) - Date.parse(b.entrada ?? b.salida!)),
      ms: ts.reduce((s, t) => s + t.ms, 0),
    }))

    const sectores = agruparPorSector(filas, (f) => horario.sectorDe(f.userid, fecha), horario.orden).map(
      ({ nombre, items }) => ({
        nombre,
        filas: items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        ms: items.reduce((s, f) => s + f.ms, 0),
      })
    )
    return { fecha, personas: filas.length, ms: filas.reduce((s, f) => s + f.ms, 0), sectores }
  })
}

/** "8 h 05", "7 h", "45 min". */
export function duracion(ms: number): string {
  const minutos = Math.round(ms / 60000)
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

/** Total de horas redondeado: "392 h". */
export function horasTotales(ms: number): string {
  return `${Math.round(ms / 3600000).toLocaleString('es-AR')} h`
}
