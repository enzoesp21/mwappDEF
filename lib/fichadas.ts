// Fichadas del reloj (EP300 Pro), que llegan desde CrossChex por el programa de
// la caja (fichero/sincronizar-fichadas.ps1). Acá está la cuenta de quién está
// adentro; la pantalla es /admin/fichadas. La base: supabase/add_fichadas.sql.

import { formatearNombre } from '@/lib/nombres'
import { ubicarEnJornada } from '@/lib/planilla'

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

const MINUTO = 60 * 1000
const HORA = 60 * MINUTO
const ARGENTINA = -3 * HORA

/** La jornada arranca a las 4: el cierre de la noche cuenta para el día anterior y la limpieza entra desde las 4. */
const HORA_INICIO_JORNADA = 4
/** Se piden dos días: para deducir entradas y salidas hace falta ver cómo venía cada uno. */
const VENTANA = 48 * HORA
/** Con más de 13 horas desde la entrada, seguramente se olvidó de fichar la salida. */
export const TURNO_LARGO = 13 * HORA
/** Una entrada de hace más de un día ya no se muestra: se olvidó la salida seguro. */
const ENTRADA_VIEJA = 24 * HORA
/** Si la caja no se conecta en 5 minutos, algo pasa (anda cada minuto). */
const CAJA_SIN_CONEXION = 5 * MINUTO
/** De 9 a 24, si CrossChex no bajó nada en 3 horas, seguramente está desactivado. */
const CROSSCHEX_QUIETO = 3 * HORA
/** Otra fichada de la misma persona a menos de 30 minutos es la misma (apoyó el dedo de nuevo). */
const REPETIDA = 30 * MINUTO

/** A qué jornada pertenece una hora: "2026-10-30" (lo de antes de las 4 es del día anterior). */
export function jornadaDe(iso: string): string {
  return new Date(Date.parse(iso) + ARGENTINA - HORA_INICIO_JORNADA * HORA).toISOString().slice(0, 10)
}

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
  /**
   * Fichada de más: estaba adentro y volvió a apretar Entrada
   * (Laureano, 20/11: 10:09 entrada, 13:15 entrada otra vez, 16:59 salida). No
   * cambia nada: `sentido` es 'entrada' (seguía adentro) y no cuenta ni
   * para quién está adentro ni para los turnos.
   */
  sobra?: boolean
}

function sentidoDeTecla(tipo: number): Sentido | null {
  if (tipo === 0 || tipo === 3) return 'entrada'
  if (tipo === 1 || tipo === 2) return 'salida'
  return null
}

// Cuánto "cuesta" cada explicación posible. Gana la que menos suma.
// La tecla dice otra cosa (pasa en 1 de cada 6 fichadas). Un poco más que 1:
// apretar mal tres veces seguidas es más raro que olvidarse de fichar una vez
// (Brisa Di Scala, 10/11: sin entrada el 9/11, la daba adentro después de irse).
const COSTO_TECLA = 1.05
const COSTO_OLVIDO = 3 // dos entradas o dos salidas seguidas: se olvidó de fichar una (más raro que errarle a la tecla)
const COSTO_TURNO_LARGO = 1.5 // un turno de 12 a 14 horas existe, pero es raro
const COSTO_TURNO_DOBLE = 2 // de 14 a 16 horas pasa muy poco (dobles): ahí desempata la tecla
// De 16 a 18 horas: un doble con cena hasta la 1 (Bruno Molina, 9 y 10/11: 09:14 a
// 01:20). Antes era imposible y daba vuelta todas sus fichadas: figuraba adentro.
const COSTO_TURNO_EXTRA = 2.5
const COSTO_IMPOSIBLE = 10 // un turno de más de 18 horas no existe: se olvidó de fichar
const COSTO_EMPIEZA_SALIENDO = 1 // sin nada antes para comparar, lo primero suele ser una entrada
// Una fichada de más: estaba adentro y volvió a apretar Entrada. Más barato que dos teclas mal (2,1) y que un olvido (3). Laureano el
// 20/11 (10:09, 13:15 y 16:59, las dos primeras con Entrada) figuraba adentro
// desde las 16:59: la cuenta suponía dos teclas mal en vez de una de más.
const COSTO_SOBRA = 1.5
/** Como mucho dos de más seguidas: si no, es otra cosa. */
const SOBRAS_SEGUIDAS = 2
/** Ningún turno dura más que esto. */
const TURNO_MAXIMO = 18 * HORA

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
 * `inicios`: desde cuándo se pidieron las fichadas sin cortes (el principio de
 * cada tramo pedido). Si la primera fichada de alguien está a más de 18 horas
 * de ese principio, su entrada tendría que estar entre lo pedido. Si no está,
 * empezar con una salida es suponer que se olvidó de fichar la entrada, y
 * cuesta eso.
 * Caso que lo mostró: Miguel Sachett el 03/11, que no venía hacía días. Fichó
 * 07:55 con la tecla Salida y 16:34 con la de Entrada, y figuraba adentro.
 * Sin `inicios`, lo primero cuesta lo de antes.
 *
 * Las dobles (a menos de 30 minutos de la anterior) se descartan.
 */
export function leerFichadas(fichadas: Fichada[], inicios: string[] = []): FichadaLeida[] {
  const cortes = inicios
    .map((i) => Date.parse(i))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b)
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
  porPersona.forEach((lista) => resultado.push(...deducirSentidos(lista, cortes)))
  return resultado.sort((a, b) => Date.parse(a.fecha_hora) - Date.parse(b.fecha_hora))
}

function deducirSentidos(lista: Fichada[], cortes: number[]): FichadaLeida[] {
  const SENTIDOS: Sentido[] = ['entrada', 'salida']
  const costoTecla = (f: Fichada, s: Sentido) => {
    const tecla = sentidoDeTecla(f.tipo)
    return tecla && tecla !== s ? COSTO_TECLA : 0
  }
  const costoPaso = (de: Sentido, a: Sentido, horas: number) => {
    if (de === a) return COSTO_OLVIDO
    if (de === 'entrada') {
      if (horas > TURNO_MAXIMO / HORA) return COSTO_IMPOSIBLE
      if (horas > 16) return COSTO_TURNO_EXTRA
      if (horas > 14) return COSTO_TURNO_DOBLE
      if (horas > 12) return COSTO_TURNO_LARGO
    }
    return 0
  }
  // El principio de lo pedido justo antes de una hora (o null si no se sabe).
  const corteAntes = (ms: number) => {
    let corte: number | null = null
    for (const c of cortes) if (c <= ms) corte = c
    return corte
  }
  // Empezar (o volver a empezar después de un corte de lo pedido) con una
  // salida: si la entrada pudo quedar antes de lo pedido, es la duda de
  // siempre; si no, es que no fichó la entrada.
  const costoEmpezar = (s: Sentido, ms: number) => {
    if (s === 'entrada') return 0
    const corte = corteAntes(ms)
    return corte === null || ms - corte <= TURNO_MAXIMO ? COSTO_EMPIEZA_SALIENDO : COSTO_OLVIDO
  }

  // Lo que cuesta un turno abierto de tantas horas (para las de más mientras
  // está adentro: no puede quedar adentro más de 18 horas).
  const costoAbierto = (horas: number) => costoPaso('entrada', 'salida', horas)
  // Lo que cuestan las fichadas de `desde` a `hasta` (sin incluir) como de más,
  // estando en `estado` desde la fichada `base`. Infinity si alguna no puede serlo.
  // Solo estando adentro: volver a apretar Entrada (al volver del almuerzo, por
  // las dudas). Una Salida de más estando afuera, no: así se leía mal a Miguel
  // Sachett el 03/11, que llegó apretando Salida y se fue apretando Entrada.
  const costoSobras = (base: number, estado: Sentido, desde: number, hasta: number) => {
    if (hasta - desde > SOBRAS_SEGUIDAS || estado !== 'entrada') return Infinity
    let total = 0
    const msBase = Date.parse(lista[base].fecha_hora)
    for (let x = desde; x < hasta; x++) {
      const ms = Date.parse(lista[x].fecha_hora)
      const tecla = sentidoDeTecla(lista[x].tipo)
      const corte = corteAntes(ms)
      // Solo la misma tecla de cómo estaba, y sin un corte de lo pedido en el medio.
      if ((tecla && tecla !== estado) || (corte !== null && corte > msBase)) return Infinity
      total += COSTO_SOBRA + (estado === 'entrada' ? costoAbierto((ms - msBase) / HORA) : 0)
    }
    return total
  }

  // costos[i][s]: lo mínimo que cuesta explicar hasta la fichada i, si i es de
  // verdad y termina en s (las del medio desde la anterior de verdad, de más).
  const costos: number[][] = []
  const desde: [number, number][][] = []
  lista.forEach((f, i) => {
    costos.push([])
    desde.push([])
    const ms = Date.parse(f.fecha_hora)
    SENTIDOS.forEach((s, j) => {
      if (i === 0) {
        costos[i][j] = costoTecla(f, s) + costoEmpezar(s, ms)
        desde[i][j] = [-1, -1]
        return
      }
      let mejor = Infinity
      for (let k = i - 1; k >= Math.max(0, i - 1 - SOBRAS_SEGUIDAS); k--) {
        const antes = Date.parse(lista[k].fecha_hora)
        const horas = (ms - antes) / HORA
        // Entre las dos hay un corte de lo pedido (otro mes y las de ahora): no se
        // sabe qué pasó en el medio, así que se vuelve a empezar.
        const corte = corteAntes(ms)
        const reinicio = corte !== null && corte > antes
        SENTIDOS.forEach((previo, p) => {
          const sobras = k === i - 1 ? 0 : costoSobras(k, previo, k + 1, i)
          if (sobras === Infinity) return
          const costo = costos[k][p] + sobras + (reinicio ? costoEmpezar(s, ms) : costoPaso(previo, s, horas))
          // A igual costo, se prefiere alternar y sin fichadas de más.
          const actual = desde[i][j]
          const mejora =
            costo < mejor - 1e-9 ||
            (Math.abs(costo - mejor) < 1e-9 && actual && (k > actual[0] || (k === actual[0] && previo !== s)))
          if (mejora) {
            mejor = costo
            desde[i][j] = [k, p]
          }
        })
      }
      costos[i][j] = mejor + costoTecla(f, s)
    })
  })

  // El final: la última de verdad, y las que siguen (si las hay) de más.
  const n = lista.length
  let fin: [number, number] = [n - 1, costos[n - 1][0] <= costos[n - 1][1] ? 0 : 1]
  let mejorFin = costos[n - 1][fin[1]]
  for (let k = n - 2; k >= Math.max(0, n - 1 - SOBRAS_SEGUIDAS); k--) {
    SENTIDOS.forEach((s, j) => {
      const costo = costos[k][j] + costoSobras(k, s, k + 1, n)
      if (costo < mejorFin - 1e-9) {
        mejorFin = costo
        fin = [k, j]
      }
    })
  }

  const leidas: FichadaLeida[] = lista.map((f) => ({ ...f, sentido: 'entrada' as Sentido }))
  let [i, j] = fin
  // Las de más del final siguen como quedó la última de verdad.
  for (let x = i + 1; x < n; x++) leidas[x] = { ...lista[x], sentido: SENTIDOS[j], sobra: true }
  while (i >= 0) {
    leidas[i] = { ...lista[i], sentido: SENTIDOS[j] }
    const [k, p] = desde[i][j]
    for (let x = k + 1; x < i; x++) leidas[x] = { ...lista[x], sentido: SENTIDOS[p], sobra: true }
    i = k
    j = p
  }
  return leidas
}

export type Situacion = 'adentro' | 'sin-salida'

export interface Presente {
  userid: string
  nombre: string
  situacion: Situacion
  /** La hora en que entró. */
  entrada: string
}

/** El nombre como se muestra: CrossChex los tiene en mayúscula ("ANA PEREZ" -> "Ana Perez"). */
export function nombreDe(persona: PersonaFichero | undefined, userid: string): string {
  return persona?.nombre ? formatearNombre(persona.nombre) : `Nro. ${userid}`
}

/**
 * Un día que un encargado resolvió a mano en la planilla: le puso las horas,
 * la salida que faltaba (sugerencia o papel) o un código. Si lo hizo después
 * de la última entrada de esa persona, ya no está adentro.
 * Caso que lo mostró: Fernández Ornella el 03/11. Entró 11:18 y se olvidó de
 * fichar la salida; Enzo le puso las horas y seguía figurando adentro.
 */
export interface CierreAMano {
  userid: string
  /** El día de la planilla, "2026-11-03". */
  fecha: string
  /** Cuándo lo resolvió (ISO). */
  cuando: string
}

/**
 * Si un encargado ya resolvió a mano el día de esa entrada, después de que
 * entró. Se mira el día de la planilla (de 07:00 a 06:59) y el calendario
 * (Zulma). Si volvió a fichar después, cuenta lo nuevo.
 */
export function cerradaAMano(entrada: Pick<Fichada, 'userid' | 'fecha_hora'>, cierres: CierreAMano[]): boolean {
  const ms = Date.parse(entrada.fecha_hora)
  const dias = [ubicarEnJornada(ms, false).fecha, ubicarEnJornada(ms, true).fecha]
  return cierres.some((c) => c.userid === entrada.userid && dias.includes(c.fecha) && Date.parse(c.cuando) > ms)
}

/**
 * Quién está adentro ahora: aquellos cuya última fichada (ya deducida) es una
 * entrada. Si entró hace más de 13 horas va aparte (seguramente no fichó la
 * salida); si fue hace más de un día, ya no se muestra. Si un encargado ya le
 * resolvió ese día a mano en la planilla (`cierres`), tampoco.
 */
export function presentes(
  leidas: FichadaLeida[],
  personas: Map<string, PersonaFichero>,
  ahora: number,
  cierres: CierreAMano[] = []
): Presente[] {
  const ultima = new Map<string, FichadaLeida>()
  for (const f of leidas) {
    // Las de más no cambian nada: vale la última de verdad (su hora de entrada).
    if (!f.sobra && Date.parse(f.fecha_hora) <= ahora + 5 * MINUTO) ultima.set(f.userid, f)
  }

  const resultado: Presente[] = []
  ultima.forEach((f, userid) => {
    const hace = ahora - Date.parse(f.fecha_hora)
    if (f.sentido !== 'entrada' || hace > ENTRADA_VIEJA || cerradaAMano(f, cierres)) return
    const persona = personas.get(userid)
    resultado.push({
      userid,
      nombre: nombreDe(persona, userid),
      situacion: hace > TURNO_LARGO ? 'sin-salida' : 'adentro',
      entrada: f.fecha_hora,
    })
  })
  return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
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
