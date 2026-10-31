// Fichadas del reloj (EP300 Pro), que llegan desde CrossChex por el programa de
// la caja (fichero/sincronizar-fichadas.ps1). Acá está la cuenta de quién está
// adentro; la pantalla es /admin/fichadas. La base: supabase/add_fichadas.sql.

import { formatearNombre } from '@/lib/nombres'

export interface Fichada {
  logid: number
  userid: string
  fecha_hora: string
  tipo: number
  dispositivo: number | null
}

export interface PersonaFichero {
  userid: string
  nombre: string
  sector: string | null
}

export interface EstadoFichero {
  ultima_conexion: string | null
  ultima_fichada_crosschex: string | null
  error: string | null
}

/** Los tipos de la tabla Status de CrossChex. */
export const TIPOS: Record<number, string> = {
  0: 'Entrada',
  1: 'Salida',
  2: 'Break',
  3: 'Fin de break',
}

export const nombreTipo = (tipo: number) => TIPOS[tipo] ?? `Tipo ${tipo}`

const MINUTO = 60 * 1000
const HORA = 60 * MINUTO
const ARGENTINA = -3 * HORA

/** La jornada arranca a las 5 de la mañana: el cierre de la noche cuenta para el día anterior. */
const HORA_INICIO_JORNADA = 5
/** Para saber quién está adentro se miran las fichadas de las últimas 16 horas. */
export const VENTANA_PRESENTES = 16 * HORA
/** Con más de 13 horas desde la entrada, seguramente se olvidó de fichar la salida. */
const TURNO_LARGO = 13 * HORA
/** Si la caja no se conecta en 5 minutos, algo pasa (anda cada minuto). */
const CAJA_SIN_CONEXION = 5 * MINUTO
/** De 9 a 24, si CrossChex no bajó nada en 3 horas, seguramente está desactivado. */
const CROSSCHEX_QUIETO = 3 * HORA
/** Dos fichadas iguales de la misma persona en menos de 2 minutos: apoyó el dedo dos veces. */
const REPETIDA = 2 * MINUTO

/** Cuándo empezó la jornada que está corriendo, en ISO. */
export function inicioJornada(ahora: number): string {
  const local = new Date(ahora + ARGENTINA)
  const inicio = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), HORA_INICIO_JORNADA)
  const corregido = inicio > ahora + ARGENTINA ? inicio - 24 * HORA : inicio
  return new Date(corregido - ARGENTINA).toISOString()
}

/** Desde cuándo hay que pedir fichadas para armar la pantalla. */
export function desdeParaPedir(ahora: number): string {
  return new Date(Math.min(Date.parse(inicioJornada(ahora)), ahora - VENTANA_PRESENTES)).toISOString()
}

/** Saca las dobles: misma persona, mismo tipo, a menos de 2 minutos de la anterior. */
export function sinRepetidas(fichadas: Fichada[]): Fichada[] {
  const ordenadas = [...fichadas].sort((a, b) => Date.parse(a.fecha_hora) - Date.parse(b.fecha_hora))
  const ultima = new Map<string, Fichada>()
  return ordenadas.filter((f) => {
    const previa = ultima.get(f.userid)
    if (previa && previa.tipo === f.tipo && Date.parse(f.fecha_hora) - Date.parse(previa.fecha_hora) < REPETIDA) {
      return false
    }
    ultima.set(f.userid, f)
    return true
  })
}

export type Situacion = 'adentro' | 'break' | 'sin-salida'

export interface Presente {
  userid: string
  nombre: string
  sector: string
  situacion: Situacion
  /** La hora en que entró (la última Entrada de la ventana), si hay. */
  entrada: string | null
  /** La última fichada, para el break. */
  ultima: Fichada
}

export interface Sector {
  nombre: string
  personas: Presente[]
}

export const SIN_SECTOR = 'Sin sector'

/** El departamento raíz de CrossChex es la empresa, no un sector: hoy están todos ahí. */
const SECTORES_GENERALES = new Set(['mirador waikiki'])

/** El nombre como se muestra: CrossChex los tiene en mayúscula ("ANA PEREZ" -> "Ana Perez"). */
export function nombreDe(persona: PersonaFichero | undefined, userid: string): string {
  return persona?.nombre ? formatearNombre(persona.nombre) : `Nro. ${userid}`
}

export function sectorDe(persona: PersonaFichero | undefined): string {
  const sector = persona?.sector?.trim()
  return sector && !SECTORES_GENERALES.has(sector.toLowerCase()) ? sector : SIN_SECTOR
}

/**
 * Quién está adentro ahora, según la última fichada de cada uno en las últimas
 * 16 horas: Entrada o Fin de break, adentro; Break, en break; Salida, se fue.
 */
export function presentes(fichadas: Fichada[], personas: Map<string, PersonaFichero>, ahora: number): Presente[] {
  const desde = ahora - VENTANA_PRESENTES
  const recientes = sinRepetidas(fichadas).filter((f) => {
    const t = Date.parse(f.fecha_hora)
    return t >= desde && t <= ahora + 5 * MINUTO
  })

  const porPersona = new Map<string, Fichada[]>()
  for (const f of recientes) {
    const lista = porPersona.get(f.userid) ?? []
    lista.push(f)
    porPersona.set(f.userid, lista)
  }

  const resultado: Presente[] = []
  porPersona.forEach((lista, userid) => {
    const ultima = lista[lista.length - 1]
    if (ultima.tipo === 1) return
    const entrada = [...lista].reverse().find((f) => f.tipo === 0)?.fecha_hora ?? null
    const desdeCuando = Date.parse(entrada ?? lista[0].fecha_hora)
    const persona = personas.get(userid)
    resultado.push({
      userid,
      nombre: nombreDe(persona, userid),
      sector: sectorDe(persona),
      situacion: ahora - desdeCuando > TURNO_LARGO ? 'sin-salida' : ultima.tipo === 2 ? 'break' : 'adentro',
      entrada,
      ultima,
    })
  })
  return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/** Los presentes agrupados por sector, los sectores con más gente primero. */
export function porSector(lista: Presente[]): Sector[] {
  const grupos = new Map<string, Presente[]>()
  for (const p of lista) grupos.set(p.sector, [...(grupos.get(p.sector) ?? []), p])
  return Array.from(grupos, ([nombre, personas]) => ({ nombre, personas })).sort(
    (a, b) =>
      Number(a.nombre === SIN_SECTOR) - Number(b.nombre === SIN_SECTOR) ||
      b.personas.length - a.personas.length ||
      a.nombre.localeCompare(b.nombre, 'es')
  )
}

export interface Aviso {
  nivel: 'ok' | 'atencion' | 'problema'
  titulo: string
  detalle?: string
}

/** Si la caja y CrossChex están mandando. Va arriba de todo en la pantalla. */
export function avisoConexion(estado: EstadoFichero | null, ahora: number): Aviso {
  if (!estado?.ultima_conexion) {
    return {
      nivel: 'atencion',
      titulo: 'La PC de la caja todavía no se conectó',
      detalle: 'Falta instalar el programa del fichero en la caja (carpeta fichero/ del proyecto).',
    }
  }
  const sinConexion = ahora - Date.parse(estado.ultima_conexion)
  if (sinConexion > CAJA_SIN_CONEXION) {
    return {
      nivel: 'problema',
      titulo: `La caja no manda datos hace ${hace(sinConexion)}`,
      detalle: '¿Está apagada la PC de la caja o sin internet? Las fichadas no se pierden: entran cuando vuelva.',
    }
  }
  if (estado.error) {
    return { nivel: 'problema', titulo: 'El programa de la caja avisa un problema', detalle: estado.error }
  }
  if (estado.ultima_fichada_crosschex) {
    const quieto = ahora - Date.parse(estado.ultima_fichada_crosschex)
    const hora = new Date(ahora + ARGENTINA).getUTCHours()
    if (quieto > CROSSCHEX_QUIETO && hora >= 9) {
      return {
        nivel: 'atencion',
        titulo: `CrossChex no bajó fichadas hace ${hace(quieto)}`,
        detalle:
          'Fijate que CrossChex esté abierto en la caja y con "Control en tiempo real" en Activar (pestaña Dispositivos).',
      }
    }
  }
  return { nivel: 'ok', titulo: `Conectado · hace ${hace(sinConexion)}` }
}

/** "3 min", "2 h 10 min", "4 días". */
export function hace(ms: number): string {
  const minutos = Math.max(0, Math.round(ms / MINUTO))
  if (minutos < 1) return 'menos de 1 min'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 48) return minutos % 60 ? `${horas} h ${minutos % 60} min` : `${horas} h`
  return `${Math.floor(horas / 24)} días`
}

/** La hora en Argentina, "08:05". */
export function horaArgentina(iso: string): string {
  return new Date(Date.parse(iso) + ARGENTINA).toISOString().slice(11, 16)
}
