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

/** La jornada arranca a las 4: el cierre de la noche cuenta para el día anterior y la limpieza entra desde las 4. */
const HORA_INICIO_JORNADA = 4
/** Se piden dos días: para deducir entradas y salidas hace falta ver cómo venía cada uno. */
const VENTANA = 48 * HORA
/** Con más de 13 horas desde la entrada, seguramente se olvidó de fichar la salida. */
const TURNO_LARGO = 13 * HORA
/** Una entrada de hace más de un día ya no se muestra: se olvidó la salida seguro. */
const ENTRADA_VIEJA = 24 * HORA
/** Si la caja no se conecta en 5 minutos, algo pasa (anda cada minuto). */
const CAJA_SIN_CONEXION = 5 * MINUTO
/** De 9 a 24, si CrossChex no bajó nada en 3 horas, seguramente está desactivado. */
const CROSSCHEX_QUIETO = 3 * HORA
/** Otra fichada de la misma persona a menos de 30 minutos es la misma (apoyó el dedo de nuevo). */
const REPETIDA = 30 * MINUTO

/** Cuándo empezó la jornada que está corriendo, en ISO. */
export function inicioJornada(ahora: number): string {
  const local = new Date(ahora + ARGENTINA)
  const inicio = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), HORA_INICIO_JORNADA)
  const corregido = inicio > ahora + ARGENTINA ? inicio - 24 * HORA : inicio
  return new Date(corregido - ARGENTINA).toISOString()
}

/** Desde cuándo hay que pedir fichadas para armar la pantalla. */
export function desdeParaPedir(ahora: number): string {
  return new Date(ahora - VENTANA).toISOString()
}

export type Sentido = 'entrada' | 'salida'

export interface FichadaLeida extends Fichada {
  sentido: Sentido
  /** La tecla que apretó dice lo contrario de lo que se dedujo. */
  teclaDistinta: boolean
}

function sentidoDeTecla(tipo: number): Sentido | null {
  if (tipo === 0 || tipo === 3) return 'entrada'
  if (tipo === 1 || tipo === 2) return 'salida'
  return null
}

// Cuánto "cuesta" cada explicación posible. Gana la que menos suma.
const COSTO_TECLA = 1 // la tecla dice otra cosa (pasa en 1 de cada 6 fichadas)
const COSTO_OLVIDO = 3 // dos entradas o dos salidas seguidas: se olvidó de fichar una (más raro que errarle a la tecla)
const COSTO_TURNO_LARGO = 1.5 // un turno de 12 a 14 horas existe, pero es raro
const COSTO_TURNO_DOBLE = 2 // de 14 a 16 horas pasa muy poco (dobles): ahí desempata la tecla
const COSTO_IMPOSIBLE = 10 // un turno de más de 16 horas no existe: se olvidó de fichar
const COSTO_EMPIEZA_SALIENDO = 1 // sin nada antes para comparar, lo primero suele ser una entrada

/**
 * Deduce si cada fichada es entrada o salida.
 *
 * NO se puede confiar en la tecla: mucha gente aprieta "Entrada" al irse o
 * "Salida" al llegar (en septiembre y octubre, 1 de cada 6). Lo que manda es
 * el orden: entrada, salida, entrada... La tecla solo desempata, por ejemplo
 * cuando alguien se olvidó de fichar y quedan dos seguidas del mismo lado.
 * Se elige, para cada persona, la secuencia completa que menos cosas raras
 * necesita suponer (algoritmo de Viterbi, con los costos de arriba).
 *
 * Las dobles (a menos de 30 minutos de la anterior) se descartan.
 */
export function leerFichadas(fichadas: Fichada[]): FichadaLeida[] {
  const porPersona = new Map<string, Fichada[]>()
  for (const f of [...fichadas].sort((a, b) => Date.parse(a.fecha_hora) - Date.parse(b.fecha_hora))) {
    const lista = porPersona.get(f.userid) ?? []
    const previa = lista[lista.length - 1]
    if (previa && Date.parse(f.fecha_hora) - Date.parse(previa.fecha_hora) < REPETIDA) {
      // La misma fichada repetida: vale la hora de la primera y la tecla de la
      // última (si la corrigió, la segunda es la buena).
      lista[lista.length - 1] = { ...previa, tipo: f.tipo }
      continue
    }
    lista.push(f)
    porPersona.set(f.userid, lista)
  }

  const resultado: FichadaLeida[] = []
  porPersona.forEach((lista) => resultado.push(...deducirSentidos(lista)))
  return resultado.sort((a, b) => Date.parse(a.fecha_hora) - Date.parse(b.fecha_hora))
}

function deducirSentidos(lista: Fichada[]): FichadaLeida[] {
  const SENTIDOS: Sentido[] = ['entrada', 'salida']
  const costoTecla = (f: Fichada, s: Sentido) => {
    const tecla = sentidoDeTecla(f.tipo)
    return tecla && tecla !== s ? COSTO_TECLA : 0
  }
  const costoPaso = (de: Sentido, a: Sentido, horas: number) => {
    if (de === a) return COSTO_OLVIDO
    if (de === 'entrada') {
      if (horas > 16) return COSTO_IMPOSIBLE
      if (horas > 14) return COSTO_TURNO_DOBLE
      if (horas > 12) return COSTO_TURNO_LARGO
    }
    return 0
  }

  // costos[i][s]: lo mínimo que cuesta explicar hasta la fichada i terminando en s.
  const costos: number[][] = []
  const desde: number[][] = []
  lista.forEach((f, i) => {
    costos.push([])
    desde.push([])
    SENTIDOS.forEach((s, j) => {
      if (i === 0) {
        costos[i][j] = costoTecla(f, s) + (s === 'salida' ? COSTO_EMPIEZA_SALIENDO : 0)
        return
      }
      const horas = (Date.parse(f.fecha_hora) - Date.parse(lista[i - 1].fecha_hora)) / HORA
      let mejor = Infinity
      SENTIDOS.forEach((previo, k) => {
        const costo = costos[i - 1][k] + costoPaso(previo, s, horas)
        // A igual costo, se prefiere alternar.
        if (costo < mejor || (costo === mejor && previo !== s)) {
          mejor = costo
          desde[i][j] = k
        }
      })
      costos[i][j] = mejor + costoTecla(f, s)
    })
  })

  const sentidos: Sentido[] = []
  let j = costos[lista.length - 1][0] <= costos[lista.length - 1][1] ? 0 : 1
  for (let i = lista.length - 1; i >= 0; i--) {
    sentidos[i] = SENTIDOS[j]
    j = desde[i][j]
  }
  return lista.map((f, i) => {
    const tecla = sentidoDeTecla(f.tipo)
    return { ...f, sentido: sentidos[i], teclaDistinta: tecla !== null && tecla !== sentidos[i] }
  })
}

export type Situacion = 'adentro' | 'sin-salida'

export interface Presente {
  userid: string
  nombre: string
  sector: string
  situacion: Situacion
  /** La hora en que entró. */
  entrada: string
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
 * Quién está adentro ahora: aquellos cuya última fichada (ya deducida) es una
 * entrada. Si entró hace más de 13 horas va aparte (seguramente no fichó la
 * salida); si fue hace más de un día, ya no se muestra.
 */
export function presentes(leidas: FichadaLeida[], personas: Map<string, PersonaFichero>, ahora: number): Presente[] {
  const ultima = new Map<string, FichadaLeida>()
  for (const f of leidas) {
    if (Date.parse(f.fecha_hora) <= ahora + 5 * MINUTO) ultima.set(f.userid, f)
  }

  const resultado: Presente[] = []
  ultima.forEach((f, userid) => {
    const hace = ahora - Date.parse(f.fecha_hora)
    if (f.sentido !== 'entrada' || hace > ENTRADA_VIEJA) return
    const persona = personas.get(userid)
    resultado.push({
      userid,
      nombre: nombreDe(persona, userid),
      sector: sectorDe(persona),
      situacion: hace > TURNO_LARGO ? 'sin-salida' : 'adentro',
      entrada: f.fecha_hora,
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
