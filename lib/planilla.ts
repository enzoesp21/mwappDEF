// Planilla maestra: las horas de cada empleado por día, con las reglas que
// pidió Enzo (pedido "Fichadas y Planilla Maestra"). Todo acá es puro: no lee la
// base ni la hora actual, así el proceso automático, la pantalla y las pruebas
// (npm test → lib/planilla.test.ts, con los casos del pedido) dan lo mismo.
//
// Los tiempos van en "minutos de la jornada": minutos desde las 00:00 del día
// de la jornada, en hora de Argentina. Una salida a la 01:20 del día siguiente
// es 1520 (25:20): así las cuentas no se rompen al pasar la medianoche.

import {
  cantidadDias,
  diasConNoche,
  horarioDelTurno,
  lunesDe,
  normalizarNombre,
  sumarDias,
  tipoCelda,
  type DatosHorario,
} from '@/lib/horarios'

const MINUTO = 60_000
const HORA = 60 * MINUTO
/** Argentina no tiene horario de verano: siempre UTC-3. */
const ARGENTINA = -3 * HORA

/** La jornada va de 07:00 a 06:59 del día siguiente. */
export const INICIO_JORNADA = 7 * 60
/** Dos fichadas a menos de 30 min entre sí son la misma. */
export const DOBLE = 30
/** Entre 5 y 30 min se avisa; a menos de 5, ni se menciona. */
export const DOBLE_SIN_AVISO = 5
/** Más de 17 h trabajadas en el día se marca para revisar (no bloquea). */
export const JORNADA_LARGA = 17 * 60
/** DÍAS = HORAS / 8,5. */
export const HORAS_POR_DIA = 8.5
/** Cierre normal (21:00) y de los días con noche (01:00 del día siguiente). Supuesto del pedido. */
export const CIERRE = 21 * 60
export const CIERRE_NOCHE = 25 * 60
/** Una fichada sola sin horario: antes de las 12 es entrada; desde las 17, salida. */
export const CORTE_MANANA = 12 * 60
export const CORTE_TARDE = 17 * 60
/** Entre las 12 y las 17, sin historial, el corte es a las 15. */
export const CORTE_SIN_HISTORIAL = 15 * 60
/** "Habitual" = mediana de los últimos 30 días, si hay 3 días o más. */
export const DIAS_HABITUAL = 30
export const DIAS_HISTORIAL_MINIMO = 3
/** Una entrada de hace más de 16 h ya no es "adentro todavía": se olvidó la salida. */
const EN_CURSO_MAXIMO = 16 * 60

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Fuente = 'reloj' | 'papel' | 'manual'

/** Una fichada, del reloj o cargada a mano (papel). */
export interface Marca {
  /** El instante, en ms (UTC). */
  ms: number
  fuente: Fuente
  /** El logid del reloj, para guardar cuáles se usaron. */
  logid?: number
}

/** Lo que dice el horario publicado para alguien un día. */
export interface HorarioDia {
  /** La celda tal cual ("7.30 A 16", "11C", "X"); si figura en dos sectores, las dos. */
  texto: string
  tipo: 'turno' | 'franco' | 'vacaciones' | 'licencia' | 'otro_lugar'
  /** En minutos de la jornada; null si el texto no lo dice. */
  entrada: number | null
  salida: number | null
}

export type EstadoCelda = 'ok' | 'incompleto' | 'revisar'

export interface Tramo {
  desde: number
  hasta: number
}

export interface Sugerencia {
  falta: 'entrada' | 'salida'
  /** La fichada que sí está. */
  fichada: number
  /** Mediana de los últimos 30 días, redondeada a 5 min (solo con 3 días o más). */
  habitual: number | null
  /** Lo que dice el horario publicado ese día. */
  segunHorario: number | null
}

export type TipoAviso = 'doble' | 'franco' | 'larga' | 'impar' | 'sin-fichadas' | 'en-curso'

export interface Aviso {
  tipo: TipoAviso
  texto: string
}

export interface ResultadoDia {
  /** La jornada, "2026-10-23". */
  fecha: string
  /** Redondeadas a media hora; null si falta algo. */
  horas: number | null
  /** Minutos reales, antes de redondear. */
  minutos: number | null
  estado: EstadoCelda
  /** 'papel' si ese día hay alguna fichada cargada a mano. */
  origen: 'reloj' | 'papel'
  entrada: number | null
  salida: number | null
  tramos: Tramo[]
  /** Los logids del reloj de ese día. */
  logids: number[]
  /** Lo que decía el horario ese día, para mostrar. */
  horario: string | null
  sugerencia: Sugerencia | null
  avisos: Aviso[]
}

export interface Historial {
  /** Entradas y salidas de los días completos (minutos de la jornada). */
  entradas: number[]
  salidas: number[]
}

const SIN_HISTORIAL: Historial = { entradas: [], salidas: [] }

// ---------------------------------------------------------------------------
// Horas y redondeo
// ---------------------------------------------------------------------------

/**
 * A media hora, sobre el total del día y una sola vez. En empate, para abajo:
 * 8 h 12 → 8 · 8 h 15 → 8 · 8 h 16 → 8,5 · 8 h 45 → 8,5 · 2 h 48 → 3.
 */
export function redondearMediaHora(minutos: number): number {
  return Math.max(0, Math.ceil((minutos - 15) / 30)) / 2
}

/** DÍAS = HORAS / 8,5. */
export function diasDeHoras(horas: number): number {
  return horas / HORAS_POR_DIA
}

/** "08:05" (después de la medianoche vuelve a empezar: 1520 → "01:20"). */
export function hhmm(minutos: number): string {
  const m = ((Math.round(minutos) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** "8 h 33", "45 min". */
export function duracion(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = Math.round(minutos % 60)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

function mediana(lista: number[]): number | null {
  if (lista.length === 0) return null
  const orden = [...lista].sort((a, b) => a - b)
  const medio = Math.floor(orden.length / 2)
  return orden.length % 2 === 1 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2
}

function redondear5(minutos: number): number {
  return Math.round(minutos / 5) * 5
}

// ---------------------------------------------------------------------------
// Jornada
// ---------------------------------------------------------------------------

/**
 * A qué jornada pertenece una fichada y a qué minuto de esa jornada. Lo de
 * antes de las 07:00 es del día anterior (salir a la 01:30 del sábado cuenta
 * para el viernes), salvo con jornada calendario (Zulma): su día va de 00:00
 * a 23:59. Los segundos no cuentan: vale la hora que se ve, "08:00".
 */
export function ubicarEnJornada(ms: number, calendario: boolean): { fecha: string; min: number } {
  const local = new Date(Math.floor((ms + ARGENTINA) / MINUTO) * MINUTO)
  const fecha = local.toISOString().slice(0, 10)
  const min = local.getUTCHours() * 60 + local.getUTCMinutes()
  if (calendario || min >= INICIO_JORNADA) return { fecha, min }
  return { fecha: sumarDias(fecha, -1), min: min + 24 * 60 }
}

/** Cuándo termina la jornada de ese día, en ms (las 07:00 del día siguiente, o las 00:00). */
export function finDeJornada(fecha: string, calendario: boolean): number {
  const siguiente = Date.parse(sumarDias(fecha, 1) + 'T00:00:00Z') - ARGENTINA
  return calendario ? siguiente : siguiente + INICIO_JORNADA * MINUTO
}

// ---------------------------------------------------------------------------
// Horario publicado
// ---------------------------------------------------------------------------

export interface SemanaPublicada {
  week_start: string
  data: DatosHorario
}

/**
 * Entrada y salida de una celda de turno, en minutos de la jornada.
 * "11C" se queda hasta el cierre: 21:00, o 01:00 si ese día hay noche.
 * "+ NOCHE" también termina al cierre de la noche ("12 a 16.30 + NOCHE").
 */
export function turnoDelTexto(texto: string, hayNoche: boolean): { entrada: number | null; salida: number | null } | null {
  const noche = /NOCHE/i.test(texto)
  const h = horarioDelTurno(texto)
  if (!h) return noche ? { entrada: null, salida: CIERRE_NOCHE } : null
  const entrada = Math.round(h.inicio * 60)
  if (h.fin === 24) return { entrada, salida: hayNoche || noche ? CIERRE_NOCHE : CIERRE }
  if (noche) return { entrada, salida: CIERRE_NOCHE }
  return { entrada, salida: h.fin === null ? null : Math.round(h.fin * 60) }
}

/**
 * Lo que dice el horario publicado para alguien un día, buscándolo por sus
 * nombres en Horarios (puede tener más de uno) en todos los sectores. Si
 * figura con turno en dos lados el mismo día, va de la entrada más temprana a
 * la salida más tarde. Un lunes feriado puede venir como día extra de la
 * semana anterior. Solo semanas publicadas: sin semana, no hay "según horario".
 */
export function horarioDelDia(semanas: SemanaPublicada[], nombres: string[], fecha: string): HorarioDia | null {
  const claves = new Set(nombres.map(normalizarNombre).filter(Boolean))
  if (claves.size === 0) return null
  const lunes = lunesDe(fecha)
  const candidatas = [lunes, sumarDias(lunes, -7)]
    .map((l) => semanas.find((s) => s.week_start === l))
    .filter((s): s is SemanaPublicada => Boolean(s))

  for (const semana of candidatas) {
    const indice = Math.round((Date.parse(fecha) - Date.parse(semana.week_start)) / 86_400_000)
    if (indice < 0 || indice >= cantidadDias(semana.data)) continue
    const celdas = semana.data.sectores
      .flatMap((s) => s.personas)
      .filter((p) => claves.has(normalizarNombre(p.nombre ?? '')))
      .map((p) => (p.dias?.[indice] ?? '').trim())
      .filter(Boolean)
    if (celdas.length === 0) continue
    return interpretarCeldas(celdas, diasConNoche(semana.data)[indice] ?? false)
  }
  return null
}

function interpretarCeldas(celdas: string[], hayNoche: boolean): HorarioDia {
  const turnos = celdas.filter((c) => tipoCelda(c) === 'turno')
  if (turnos.length === 0) {
    const tipo = tipoCelda(celdas[0])
    return {
      texto: celdas[0],
      tipo: tipo === 'libre' ? 'franco' : tipo === 'vacaciones' || tipo === 'licencia' ? tipo : 'otro_lugar',
      entrada: null,
      salida: null,
    }
  }
  let entrada: number | null = null
  let salida: number | null = null
  for (const t of turnos) {
    const turno = turnoDelTexto(t, hayNoche)
    if (turno?.entrada != null) entrada = entrada === null ? turno.entrada : Math.min(entrada, turno.entrada)
    if (turno?.salida != null) salida = salida === null ? turno.salida : Math.max(salida, turno.salida)
  }
  return { texto: Array.from(new Set(turnos)).join(' + '), tipo: 'turno', entrada, salida }
}

// ---------------------------------------------------------------------------
// Un día
// ---------------------------------------------------------------------------

interface MarcaUbicada extends Marca {
  min: number
}

/** Fichadas a menos de 30 min entre sí, que cuentan como una sola. */
interface Toque {
  primera: MarcaUbicada
  ultima: MarcaUbicada
}

/** Junta las dobles: cada grupo empieza en una fichada y suma las que caen a menos de 30 min de ella. */
function agruparDobles(marcas: MarcaUbicada[]): Toque[] {
  const toques: Toque[] = []
  for (const m of marcas) {
    const actual = toques[toques.length - 1]
    if (actual && m.min - actual.primera.min < DOBLE) actual.ultima = m
    else toques.push({ primera: m, ultima: m })
  }
  return toques
}

export interface DatosDia {
  fecha: string
  /** Las fichadas del empleado (reloj y papel); las de otras jornadas se ignoran. */
  marcas: Marca[]
  /** Jornada calendario (Zulma): su día va de 00:00 a 23:59. */
  calendario: boolean
  horario: HorarioDia | null
  historial?: Historial
  /** Si se pasa y la jornada todavía corre, el que entró y no salió figura "adentro", no incompleto. */
  ahora?: number
}

/**
 * Las horas de un empleado en una jornada, con todas las reglas:
 * dobles, papel + reloj, horario cortado, una sola fichada, más de 17 h y el
 * redondeo. Devuelve null si no hay nada que mostrar (ni fichadas ni turno).
 */
export function calcularDia(d: DatosDia): ResultadoDia | null {
  const marcas: MarcaUbicada[] = []
  for (const m of d.marcas) {
    const { fecha, min } = ubicarEnJornada(m.ms, d.calendario)
    if (fecha === d.fecha) marcas.push({ ...m, min })
  }
  marcas.sort((a, b) => a.min - b.min || a.ms - b.ms)

  const base: ResultadoDia = {
    fecha: d.fecha,
    horas: null,
    minutos: null,
    estado: 'ok',
    origen: marcas.some((m) => m.fuente !== 'reloj') ? 'papel' : 'reloj',
    entrada: null,
    salida: null,
    tramos: [],
    logids: marcas.flatMap((m) => (m.logid === undefined ? [] : [m.logid])),
    horario: d.horario?.texto ?? null,
    sugerencia: null,
    avisos: [],
  }

  if (marcas.length === 0) {
    // Tenía turno y no fichó: va en gris. Puede ser falta, vacaciones o
    // certificado; lo decide el admin.
    if (d.horario?.tipo !== 'turno') return null
    return { ...base, avisos: [{ tipo: 'sin-fichadas', texto: `Sin fichadas · horario ${d.horario.texto}` }] }
  }

  const avisos: Aviso[] = []
  if (d.horario && d.horario.tipo !== 'turno') {
    const textos = {
      franco: 'Fichó en día de franco según horario',
      vacaciones: 'Fichó, pero según horario estaba de vacaciones',
      licencia: 'Fichó, pero según horario estaba de licencia',
      otro_lugar: `Fichó, pero según horario estaba en otro lado (${d.horario.texto})`,
    }
    avisos.push({ tipo: 'franco', texto: textos[d.horario.tipo] })
  }

  const toques = agruparDobles(marcas)
  for (const t of toques) {
    if (t.ultima.min - t.primera.min >= DOBLE_SIN_AVISO) {
      avisos.push({ tipo: 'doble', texto: `Fichó dos veces seguidas: ${hhmm(t.primera.min)} y ${hhmm(t.ultima.min)}` })
    }
  }

  // Todavía trabajando: la jornada no terminó y lo último es una entrada reciente.
  const ultimo = toques[toques.length - 1]
  const enCurso =
    d.ahora !== undefined &&
    d.ahora < finDeJornada(d.fecha, d.calendario) &&
    toques.length % 2 === 1 &&
    d.ahora - ultimo.ultima.ms < EN_CURSO_MAXIMO * MINUTO
  if (enCurso && (toques.length > 1 || sentidoDeUnaSola(ultimo.primera.min, d) === 'entrada')) {
    return {
      ...base,
      entrada: toques[0].primera.min,
      avisos: [...avisos, { tipo: 'en-curso', texto: `Adentro desde las ${hhmm(ultimo.primera.min)}` }],
    }
  }

  let tramos: Tramo[]
  if (base.origen === 'papel' && toques.length >= 2) {
    // Papel + reloj: de la más temprana a la más tardía. Las del medio son las
    // típicas del día de enrolamiento o del dedo que no lee.
    tramos = [{ desde: marcas[0].min, hasta: marcas[marcas.length - 1].min }]
  } else if (toques.length === 1) {
    return unaSola(base, toques[0], d, avisos)
  } else if (toques.length % 2 === 1) {
    return {
      ...base,
      estado: 'incompleto',
      entrada: toques[0].primera.min,
      salida: ultimo.ultima.min,
      avisos: [
        ...avisos,
        {
          tipo: 'impar',
          texto: `${toques.length} fichadas: falta o sobra una. De la primera a la última: ${hhmm(
            toques[0].primera.min
          )} a ${hhmm(ultimo.ultima.min)}`,
        },
      ],
    }
  } else {
    // Entrada, salida, entrada, salida...: cada salida y vuelta es un corte
    // (horario cortado), dure lo que dure. Decisión de Enzo (01/11): Facundo
    // Viera a veces corta menos de 2 h y se tiene que detectar siempre.
    tramos = []
    for (let i = 0; i < toques.length; i += 2) {
      tramos.push({ desde: toques[i].primera.min, hasta: toques[i + 1].ultima.min })
    }
  }

  // Se suman los minutos reales y se redondea una sola vez.
  const minutos = tramos.reduce((s, t) => s + (t.hasta - t.desde), 0)
  const larga = minutos > JORNADA_LARGA
  if (larga) avisos.push({ tipo: 'larga', texto: `Más de 17 h en el día (${duracion(minutos)}): revisar` })
  return {
    ...base,
    horas: redondearMediaHora(minutos),
    minutos,
    estado: larga ? 'revisar' : 'ok',
    entrada: tramos[0].desde,
    salida: tramos[tramos.length - 1].hasta,
    tramos,
    avisos,
  }
}

/**
 * Una fichada sola: ¿es la entrada o la salida? En este orden:
 *   1. Con horario ese día: la más cercana entre la entrada y la salida del horario.
 *   2. Sin horario: antes de las 12 es entrada; desde las 17 (o de madrugada), salida.
 *   3. Entre las 12 y las 17: la más cercana a su entrada o salida de siempre;
 *      sin historial, el corte es a las 15.
 * Con jornada calendario (Zulma entra de madrugada), si hay historial manda el historial.
 */
function sentidoDeUnaSola(min: number, d: DatosDia): 'entrada' | 'salida' {
  const h = d.horario?.tipo === 'turno' ? d.horario : null
  const historial = d.historial ?? SIN_HISTORIAL
  const masCercana = (a: number, b: number) => (Math.abs(min - a) <= Math.abs(min - b) ? 'entrada' : 'salida')

  if (h?.entrada != null && h.salida != null) return masCercana(h.entrada, h.salida)
  // El horario dice solo una de las dos ("11", "+ NOCHE"): vale si está cerca.
  if (h?.entrada != null && Math.abs(min - h.entrada) <= 3 * 60) return 'entrada'
  if (h?.salida != null && Math.abs(min - h.salida) <= 3 * 60) return 'salida'

  const entradaHabitual = mediana(historial.entradas)
  const salidaHabitual = mediana(historial.salidas)
  const conHistorial = entradaHabitual !== null && salidaHabitual !== null
  if (d.calendario && conHistorial) return masCercana(entradaHabitual, salidaHabitual)

  if (min < CORTE_MANANA) return 'entrada'
  if (min >= CORTE_TARDE) return 'salida'
  if (conHistorial) return masCercana(entradaHabitual, salidaHabitual)
  return min < CORTE_SIN_HISTORIAL ? 'entrada' : 'salida'
}

function unaSola(base: ResultadoDia, toque: Toque, d: DatosDia, avisos: Aviso[]): ResultadoDia {
  const sentido = sentidoDeUnaSola(toque.primera.min, d)
  // De una doble: si es entrada vale la primera; si es salida, la última.
  const fichada = sentido === 'entrada' ? toque.primera.min : toque.ultima.min
  const falta = sentido === 'entrada' ? 'salida' : 'entrada'
  const historial = d.historial ?? SIN_HISTORIAL
  const deSiempre = falta === 'entrada' ? historial.entradas : historial.salidas
  const habitual = deSiempre.length >= DIAS_HISTORIAL_MINIMO ? redondear5(mediana(deSiempre)!) : null
  const h = d.horario?.tipo === 'turno' ? d.horario : null
  return {
    ...base,
    estado: 'incompleto',
    entrada: sentido === 'entrada' ? fichada : null,
    salida: sentido === 'salida' ? fichada : null,
    sugerencia: { falta, fichada, habitual, segunHorario: h ? (falta === 'entrada' ? h.entrada : h.salida) : null },
    avisos,
  }
}

// ---------------------------------------------------------------------------
// Varios días de un empleado (con su historial)
// ---------------------------------------------------------------------------

export interface DatosEmpleado {
  /** Todas sus fichadas, incluidas las de los 30 días anteriores (para el "habitual"). */
  marcas: Marca[]
  calendario: boolean
  horarioDe: (fecha: string) => HorarioDia | null
  /** Las jornadas a calcular. */
  fechas: string[]
  ahora?: number
}

/**
 * Calcula varias jornadas de un empleado. Primero arma su historial (entradas
 * y salidas de los días completos) y después cada día con lo de los 30 días
 * anteriores a ese día: así el resultado de un día no cambia cuando llegan
 * días nuevos, y correrlo dos veces da lo mismo.
 */
export function calcularDias(e: DatosEmpleado): Map<string, ResultadoDia> {
  const porJornada = new Map<string, Marca[]>()
  for (const m of e.marcas) {
    const { fecha } = ubicarEnJornada(m.ms, e.calendario)
    porJornada.set(fecha, [...(porJornada.get(fecha) ?? []), m])
  }

  const completos: { fecha: string; entrada: number; salida: number }[] = []
  porJornada.forEach((marcas, fecha) => {
    const r = calcularDia({ fecha, marcas, calendario: e.calendario, horario: null })
    if (r && r.horas !== null && r.entrada !== null && r.salida !== null) {
      completos.push({ fecha, entrada: r.entrada, salida: r.salida })
    }
  })

  const resultado = new Map<string, ResultadoDia>()
  for (const fecha of e.fechas) {
    const desde = sumarDias(fecha, -DIAS_HABITUAL)
    const previos = completos.filter((c) => c.fecha >= desde && c.fecha < fecha)
    const r = calcularDia({
      fecha,
      marcas: porJornada.get(fecha) ?? [],
      calendario: e.calendario,
      horario: e.horarioDe(fecha),
      historial: { entradas: previos.map((c) => c.entrada), salidas: previos.map((c) => c.salida) },
      ahora: e.ahora,
    })
    if (r) resultado.set(fecha, r)
  }
  return resultado
}

// ---------------------------------------------------------------------------
// Sugerencias: textos y completar con un toque
// ---------------------------------------------------------------------------

const MAYUSCULA = { entrada: 'Entrada', salida: 'Salida' }

/** "Falta entrada · fichó salida 16:05". */
export function textoFalta(s: Sugerencia): string {
  return `Falta ${s.falta} · fichó ${s.falta === 'entrada' ? 'salida' : 'entrada'} ${hhmm(s.fichada)}`
}

/** "Posible entrada: 08:00hs", o null si no hay 3 días de historial. */
export function textoHabitual(s: Sugerencia): string | null {
  return s.habitual === null ? null : `Posible ${s.falta}: ${hhmm(s.habitual)}hs`
}

/** "Salida según horario: 18:30hs", o null si no hay horario publicado. */
export function textoSegunHorario(s: Sugerencia): string | null {
  return s.segunHorario === null ? null : `${MAYUSCULA[s.falta]} según horario: ${hhmm(s.segunHorario)}hs`
}

/**
 * Completa la hora que falta con la sugerencia elegida y recalcula las horas.
 * La celda queda manual y bloqueada (eso lo hace quien guarda) con esta nota.
 */
export function completarConSugerencia(
  s: Sugerencia,
  cual: 'habitual' | 'segunHorario'
): { entrada: number; salida: number; minutos: number; horas: number; nota: string } | null {
  const hora = cual === 'habitual' ? s.habitual : s.segunHorario
  if (hora === null) return null
  const entrada = s.falta === 'entrada' ? hora : s.fichada
  const salida = s.falta === 'salida' ? hora : s.fichada
  if (salida <= entrada) return null
  const minutos = salida - entrada
  return {
    entrada,
    salida,
    minutos,
    horas: redondearMediaHora(minutos),
    nota: `${s.falta} ${cual === 'habitual' ? 'habitual' : 'según horario'}`,
  }
}

// ---------------------------------------------------------------------------
// Celdas que el proceso automático no toca
// ---------------------------------------------------------------------------

export type OrigenCelda = 'reloj' | 'papel' | 'manual' | 'codigo'

/**
 * El proceso automático solo recalcula celdas que vienen del reloj y que nadie
 * tocó: si un admin cargó un código (VAC), la editó o vino de papel, se respeta.
 */
export function puedeRecalcular(celda: { bloqueada: boolean; origen: OrigenCelda } | null | undefined): boolean {
  if (!celda) return true
  return !celda.bloqueada && celda.origen === 'reloj'
}
