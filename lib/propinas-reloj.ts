/**
 * Propinas con el reloj: arma la lista del día con la planilla maestra.
 *
 * "Traer horas del reloj" hace tres cosas:
 *   1. A cada nombre que ya está en la lista le pone sus horas de ese día
 *      (por su usuario, por nombre igual o por la regla de las 2 palabras).
 *   2. Suma solos a los mozos que trabajaron y no estaban en la lista: con
 *      sus horas, sin horas si la planilla quedó incompleta, o sin horas si
 *      tenían turno en Horarios y no ficharon (para que nadie se olvide).
 *   3. A los runners y comisses, y a los que ficharon sin sector conocido,
 *      no los suma solos: los ofrece para sumarlos con un toque. No está dicho
 *      que siempre entren en el reparto, y es plata.
 *
 * Quién es mozo lo dice Horarios: el sector donde tiene turno ese día. Si esa
 * semana no figura (los recién llegados), el cargo de la planilla (MOZO; el
 * "MOZO DE MOSTRADOR" es barra) o, si no tiene cargo, el puesto de su usuario.
 * Las horas van de a cuarto (8 · 8,25 · 8,5 · 8,75): así las cuentan los mozos
 * para la propina. La planilla sigue de a media hora (ver horasParaPropina).
 *
 * Quien un encargado marcó como que no es mozo (Enzo: su cargo en la planilla
 * es MOZO, pero es el encargado de salón) no se suma ni se ofrece solo.
 *
 * Para que la cajera controle (pedido de Enzo, 03/11), de cada uno viene
 * también a qué hora entró y salió, y si le falta una fichada (ver
 * leerDetalle).
 *
 * Ante la duda no se pone nada. Todo es puro: no lee la base ni la hora.
 */

import { normalizarNombre, tipoCelda } from '@/lib/horarios'
import { duracion, hhmm, redondearCuartoHora, redondearMediaHora } from '@/lib/planilla'
import { coincidencias, palabras } from '@/lib/planilla-reloj'
import { vincularUsuario } from '@/lib/propinas'

export type TipoSalon = 'mozo' | 'runner'

export interface UbicacionHorario {
  sector: string
  /** Lo que dice su celda ese día ("11C", "X"); null si esa semana no está en Horarios. */
  celda: string | null
}

/** A qué hora entró y salió alguien ese día, según la planilla maestra. */
export interface DetalleReloj {
  /** "10:53"; null si no fichó la entrada. */
  entrada: string | null
  /** "20:55"; null si no fichó la salida. */
  salida: string | null
  /** Cada tramo trabajado (más de uno si cortó), en minutos de la jornada: una salida a la 01:20 es 1520. */
  tramos: { desde: number; hasta: number }[]
  estado: 'ok' | 'incompleto' | 'revisar'
  /** Si fichó una sola vez: la que le falta. */
  falta: 'entrada' | 'salida' | null
  /** 'reloj', 'papel' o 'manual' (las horas las puso un encargado). */
  origen: string | null
}

/** Alguien que tiene ese día en la planilla maestra. */
export interface PersonaDelReloj {
  /** Como figura en la planilla: "FUENTES NICOLAS LEANDRO". */
  nombre: string
  profileId: string | null
  nombresHorario: string[]
  /** Las de la planilla, de a media hora. null: la celda quedó incompleta (o la jornada todavía no cerró). */
  horas: number | null
  /** Los minutos reales del día, antes de redondear (null si no se sabe). */
  minutos: number | null
  cargo: string | null
  /** El puesto de su usuario de la app, si tiene. */
  puesto: string | null
  /** Dónde figura en Horarios esa semana (puede estar en dos sectores). */
  horario: UbicacionHorario[]
  /** Entrada, salida y si falta algo. null si la base todavía no lo manda (falta el SQL). */
  detalle: DetalleReloj | null
}

/** Alguien con algo escrito en Horarios ese día y nada en la planilla. */
export interface SinReloj {
  sector: string
  nombre: string
  celda: string | null
}

export interface DatosRelojPropinas {
  personas: PersonaDelReloj[]
  sinReloj: SinReloj[]
}

type Usuario = { id: string; full_name: string }

/**
 * Las horas de un día para la propina: de a cuarto, desde los minutos reales
 * (Lucas Ibarra el 31/10: 8 h 09 → 8,25; la planilla dice 8). Si las horas de
 * la celda no salen de esos minutos (un encargado las corrigió a mano), valen
 * las que puso él. null si ese día no tiene horas.
 */
export function horasParaPropina(c: { horas: number | null; minutos: number | null }): number | null {
  if (c.horas === null || !(c.horas > 0)) return null
  if (c.minutos !== null && c.minutos > 0 && redondearMediaHora(c.minutos) === c.horas) {
    const cuarto = redondearCuartoHora(c.minutos)
    if (cuarto > 0) return cuarto
  }
  return c.horas
}

const SECTOR_MOZOS = /CAMARER|MOZO/i
const SECTOR_RUNNERS = /RUNNER|COMIS/i

export function tipoDeSector(sector: string): TipoSalon | null {
  if (SECTOR_MOZOS.test(sector)) return 'mozo'
  if (SECTOR_RUNNERS.test(sector)) return 'runner'
  return null
}

/**
 * Si esa persona es del salón ese día. Si figura en Horarios esa semana, manda
 * el sector donde tiene turno ese día (si no tiene turno, cualquiera de los
 * suyos: el reloj dice que vino). Si no figura, el cargo o el puesto.
 */
export function tipoEnElSalon(p: Pick<PersonaDelReloj, 'cargo' | 'puesto' | 'horario'>): TipoSalon | null {
  if (p.horario.length > 0) {
    const conTurno = p.horario.filter((u) => tipoCelda(u.celda ?? '') === 'turno')
    const tipos = (conTurno.length > 0 ? conTurno : p.horario).map((u) => tipoDeSector(u.sector))
    if (tipos.includes('mozo')) return 'mozo'
    if (tipos.includes('runner')) return 'runner'
    return null
  }
  const cargo = normalizarNombre(p.cargo ?? '')
  if (/^(mozo|moza|camarero|camarera)s?$/.test(cargo)) return 'mozo'
  if (!cargo && p.puesto === 'Mozos') return 'mozo'
  if (!cargo && p.puesto === 'Commis') return 'runner'
  return null
}

const limpio = (s: string) => s.replace(/\s+/g, ' ').trim()

/** "GIULIANA BARTELLONE" -> "Giuliana Bartellone". */
function comoNombre(texto: string): string {
  return limpio(texto)
    .toLowerCase()
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

/**
 * Cómo va en la lista de propinas. El de Horarios ("Lucas Ibarra", como se
 * escribía en el grupo) o, si no tiene, el de la planilla. Si tiene usuario y
 * ese nombre no lleva a su usuario, el nombre de su usuario: así ve lo suyo.
 */
export function nombreParaPropinas(
  p: Pick<PersonaDelReloj, 'nombre' | 'profileId' | 'nombresHorario'>,
  usuarios: Usuario[]
): string {
  const corto = p.nombresHorario.map(limpio).find(Boolean) ?? comoNombre(p.nombre)
  if (!p.profileId || vincularUsuario(corto, usuarios) === p.profileId) return corto
  const usuario = usuarios.find((u) => u.id === p.profileId)
  return usuario && limpio(usuario.full_name) ? limpio(usuario.full_name) : corto
}

const igual = (a: string) => palabras(a).join(' ')

/**
 * Qué persona del reloj es cada fila de la lista (clave de la fila -> índice).
 * Tres pasadas, de la más segura a la menos: por su usuario, por nombre igual
 * (el de la planilla o el de Horarios) y por la regla de las 2 palabras. Solo
 * vale si hay un único candidato libre, y cada persona se usa una vez.
 */
export function emparejar(
  lista: { clave: string; nombre: string; usuarioId: string | null }[],
  personas: Pick<PersonaDelReloj, 'nombre' | 'profileId' | 'nombresHorario'>[]
): Map<string, number> {
  const pares = new Map<string, number>()
  const usadas = new Set<number>()
  const nombres = (i: number) => [personas[i].nombre, ...personas[i].nombresHorario]
  const reglas: ((fila: (typeof lista)[number], i: number) => boolean)[] = [
    (fila, i) => fila.usuarioId !== null && personas[i].profileId === fila.usuarioId,
    (fila, i) => nombres(i).some((n) => igual(n) === igual(fila.nombre)),
    (fila, i) => nombres(i).some((n) => coincidencias(palabras(fila.nombre), palabras(n)) >= 2),
  ]
  for (const regla of reglas) {
    for (const fila of lista) {
      if (!fila.nombre.trim() || pares.has(fila.clave)) continue
      const candidatos = personas.map((_, i) => i).filter((i) => !usadas.has(i) && regla(fila, i))
      if (candidatos.length === 1) {
        pares.set(fila.clave, candidatos[0])
        usadas.add(candidatos[0])
      }
    }
  }
  return pares
}

/** Para no repetir una fila vacía: "Belen" y "Belen Gallegos" son la misma. */
function mismoNombre(a: string, b: string): boolean {
  const pa = palabras(a)
  const pb = palabras(b)
  if (pa.length === 0 || pb.length === 0) return false
  if (pa.join(' ') === pb.join(' ') || coincidencias(pa, pb) >= 2) return true
  return (pa.length === 1 || pb.length === 1) && pa[0] === pb[0]
}

export type EstadoFila =
  | { tipo: 'horas'; horas: number }
  /** Está en la planilla pero la celda quedó incompleta. */
  | { tipo: 'incompleta' }
  /** Mozo con turno en Horarios ese día y nada en el reloj. */
  | { tipo: 'sin_fichadas' }
  /** El reloj no lo tiene ese día. */
  | { tipo: 'no_esta' }

export interface ParaSumar {
  nombre: string
  horas: number | null
  motivo: 'horas' | 'incompleta' | 'sin_fichadas'
}

export interface ParaOfrecer {
  nombre: string
  horas: number
  tipo: 'runner' | 'sin_sector'
}

export interface ResultadoReloj {
  /** Qué pasó con cada fila de la lista que tiene nombre. */
  filas: Map<string, EstadoFila>
  /** Mozos que no estaban en la lista, en orden alfabético: se suman solos. */
  mozos: ParaSumar[]
  /** Runners y gente sin sector que fichó: se suman solo si alguien los toca. */
  ofrecer: ParaOfrecer[]
}

const alfabetico = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, 'es')

type Identidad = Pick<PersonaDelReloj, 'nombre' | 'profileId' | 'nombresHorario'>

export function armarDesdeReloj(
  lista: { clave: string; nombre: string; usuarioId: string | null }[],
  datos: DatosRelojPropinas,
  usuarios: Usuario[],
  /** Los que un encargado marcó como que no son mozos: no se suman ni se ofrecen solos. */
  noSonMozos: Identidad[] = []
): ResultadoReloj {
  const pares = emparejar(lista, datos.personas)
  const usadas = new Set(pares.values())

  // El nombre de la planilla es único, y lo traen las dos funciones de la base.
  const afuera = new Set(noSonMozos.map((p) => igual(p.nombre)))
  const afueraUsuarios = new Set(noSonMozos.flatMap((p) => (p.profileId ? [p.profileId] : [])))
  const afueraHorario = new Set(noSonMozos.flatMap((p) => p.nombresHorario.map(igual)).filter(Boolean))
  const noEsMozo = (p: Identidad) => afuera.has(igual(p.nombre)) || (p.profileId !== null && afueraUsuarios.has(p.profileId))

  // Mozos con turno en Horarios ese día que no ficharon.
  const faltaron = datos.sinReloj.filter(
    (s) => tipoDeSector(s.sector) === 'mozo' && tipoCelda(s.celda ?? '') === 'turno' && !afueraHorario.has(igual(s.nombre))
  )

  const filas = new Map<string, EstadoFila>()
  for (const fila of lista) {
    if (!fila.nombre.trim()) continue
    const i = pares.get(fila.clave)
    if (i !== undefined) {
      const horas = horasParaPropina(datos.personas[i])
      filas.set(fila.clave, horas !== null ? { tipo: 'horas', horas } : { tipo: 'incompleta' })
    } else {
      filas.set(fila.clave, { tipo: faltaron.some((s) => mismoNombre(fila.nombre, s.nombre)) ? 'sin_fichadas' : 'no_esta' })
    }
  }

  const mozos: ParaSumar[] = []
  const ofrecer: ParaOfrecer[] = []
  datos.personas.forEach((p, i) => {
    if (usadas.has(i) || noEsMozo(p)) return
    const tipo = tipoEnElSalon(p)
    const nombre = nombreParaPropinas(p, usuarios)
    const horas = horasParaPropina(p)
    if (tipo === 'mozo') {
      mozos.push({ nombre, horas, motivo: horas !== null ? 'horas' : 'incompleta' })
    } else if (horas !== null && tipo === 'runner') {
      ofrecer.push({ nombre, horas, tipo: 'runner' })
    } else if (horas !== null && !tipo && p.horario.length === 0 && !p.cargo?.trim() && !p.puesto) {
      // Ficharon y no se sabe de qué son: recién llegados sin cargo ni Horarios.
      ofrecer.push({ nombre, horas, tipo: 'sin_sector' })
    }
  })

  const yaEstan = [...lista.map((f) => f.nombre), ...mozos.map((m) => m.nombre)].filter((n) => n.trim())
  for (const s of faltaron) {
    if (yaEstan.some((n) => mismoNombre(n, s.nombre))) continue
    const nombre = limpio(s.nombre)
    mozos.push({ nombre, horas: null, motivo: 'sin_fichadas' })
    yaEstan.push(nombre)
  }

  return {
    filas,
    mozos: mozos.sort(alfabetico),
    ofrecer: [...ofrecer.filter((o) => o.tipo === 'runner').sort(alfabetico), ...ofrecer.filter((o) => o.tipo === 'sin_sector').sort(alfabetico)],
  }
}

/**
 * Lo que ve la cajera de un día del reloj, para controlar: la línea con la
 * entrada y la salida (cada tramo, si cortó) y, si le falta una fichada o algo
 * no cierra, la alerta corta ("no fichó la salida"). Si un encargado ya le
 * puso las horas a mano, no hay alerta (está resuelto), pero se dice qué
 * faltaba.
 */
export function leerDetalle(d: DetalleReloj, minutos: number | null): { linea: string; alerta: string | null } {
  const real = minutos !== null && minutos > 0 ? ` (${duracion(minutos)})` : ''
  const aMano = d.origen === 'manual' ? 'un encargado le puso las horas a mano' : null
  const incompleta = d.estado === 'incompleto'

  if (d.falta === 'salida' || (d.entrada && !d.salida && d.falta !== 'entrada')) {
    const linea = `Entró ${d.entrada ?? '?'} · no fichó la salida`
    return incompleta || !aMano ? { linea, alerta: 'no fichó la salida' } : { linea: `${linea}: ${aMano}`, alerta: null }
  }
  if (d.falta === 'entrada' || (!d.entrada && d.salida)) {
    const linea = `No fichó la entrada · salió ${d.salida ?? '?'}`
    return incompleta || !aMano ? { linea, alerta: 'no fichó la entrada' } : { linea: `${linea}: ${aMano}`, alerta: null }
  }
  if (!d.entrada && !d.salida) {
    return { linea: aMano ? `Sin fichadas: ${aMano}` : 'Sin fichadas ese día', alerta: null }
  }
  if (incompleta) {
    // Tres fichadas o más, en número impar: falta o sobra una.
    return {
      linea: `Fichó de ${d.entrada} a ${d.salida}, con una fichada de más o de menos`,
      alerta: 'una fichada de más o de menos',
    }
  }
  const horario =
    d.tramos.length > 1
      ? `${d.tramos.map((t) => `${hhmm(t.desde)} a ${hhmm(t.hasta)}`).join(' y ')}${real}`
      : `Entró ${d.entrada} · salió ${d.salida}${real}`
  const linea = horario + (aMano ? ` · ${aMano}` : d.origen === 'papel' ? ' · fichó en papel' : '')
  return d.estado === 'revisar' ? { linea: `${linea} · más de 17 h, revisar`, alerta: 'más de 17 h' } : { linea, alerta: null }
}

/** Lo que devuelve la función de la base (jsonb), con cuidado por si algo viene raro. */
export function leerDatosReloj(crudo: unknown): DatosRelojPropinas {
  const objeto = (crudo ?? {}) as Record<string, unknown>
  const lista = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])
  const textos = (v: unknown) => (Array.isArray(v) ? v.filter((n): n is string => typeof n === 'string') : [])
  const texto = (v: unknown) => (typeof v === 'string' ? v : null)
  const numero = (v: unknown) => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  const horaHHMM = (v: unknown) => (typeof v === 'string' && /^\d{2}:\d{2}/.test(v) ? v.slice(0, 5) : null)
  const detalle = (p: Record<string, unknown>): DetalleReloj | null => {
    // Antes de correr el SQL nuevo, la base no manda la entrada ni la salida.
    if (!('entrada' in p) && !('salida' in p)) return null
    const estado = p.estado === 'incompleto' || p.estado === 'revisar' ? p.estado : 'ok'
    return {
      entrada: horaHHMM(p.entrada),
      salida: horaHHMM(p.salida),
      tramos: lista(p.tramos)
        .map((t) => ({ desde: Number(t?.desde), hasta: Number(t?.hasta) }))
        .filter((t) => Number.isFinite(t.desde) && Number.isFinite(t.hasta) && t.hasta > t.desde),
      estado,
      falta: p.falta === 'entrada' || p.falta === 'salida' ? p.falta : null,
      origen: texto(p.origen),
    }
  }
  return {
    personas: lista(objeto.personas)
      .filter((p) => typeof p?.nombre === 'string')
      .map((p) => ({
        nombre: p.nombre as string,
        profileId: texto(p.profile_id),
        nombresHorario: textos(p.nombres_horario),
        horas: numero(p.horas),
        minutos: numero(p.minutos),
        cargo: texto(p.cargo),
        puesto: texto(p.puesto),
        horario: lista(p.horario)
          .filter((u) => typeof u?.sector === 'string')
          .map((u) => ({ sector: u.sector as string, celda: texto(u.celda) })),
        detalle: detalle(p),
      })),
    sinReloj: lista(objeto.sin_reloj)
      .filter((s) => typeof s?.nombre === 'string' && typeof s?.sector === 'string')
      .map((s) => ({ sector: s.sector as string, nombre: s.nombre as string, celda: texto(s.celda) })),
  }
}
