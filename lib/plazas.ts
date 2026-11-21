// La hoja de plazas de los mozos (Enzo, 21/11): la que se imprime todos los
// días para armar las plazas y anotar las horas. Acá se arma qué va en cada
// sección y cuánto mide cada fila para que siempre entre en una A4. Es puro
// (no lee la base); lo de la base está en lib/plazas-datos.ts.

export type ClaveSeccion = 'desayuno_8' | 'desayuno_10' | 'almuerzo' | 'merienda' | 'cena'
export type ClaveFilas = ClaveSeccion | 'horas'

export interface DefSeccion {
  clave: ClaveSeccion
  titulo: string
  /** Lleva la columna "T" (y la primera columna angosta), como en la hoja de papel. */
  conT: boolean
  columna: 'izquierda' | 'derecha'
}

/** Las secciones, en el orden y el lugar de la hoja de papel. */
export const SECCIONES: DefSeccion[] = [
  { clave: 'almuerzo', titulo: 'Almuerzo', conT: true, columna: 'izquierda' },
  { clave: 'merienda', titulo: 'Merienda', conT: true, columna: 'izquierda' },
  { clave: 'desayuno_8', titulo: 'Desayuno (08:00hs a 10:00hs)', conT: false, columna: 'derecha' },
  { clave: 'desayuno_10', titulo: 'Desayuno (10:00hs a 11:00hs)', conT: false, columna: 'derecha' },
  { clave: 'cena', titulo: 'Cena', conT: true, columna: 'derecha' },
]

/** Lo que dice cada contador en el editor. */
export const TEXTO_FILAS: Record<ClaveFilas, string> = {
  almuerzo: 'Almuerzo: filas en blanco después de los mozos',
  merienda: 'Merienda',
  desayuno_8: 'Desayuno de 8 a 10',
  desayuno_10: 'Desayuno de 10 a 11',
  cena: 'Cena',
  horas: 'Horas del día: recuadros vacíos de más',
}

export const FILAS_MAXIMO = 30

/** Como la hoja de papel de hoy. */
export const FILAS_POR_DEFECTO: Record<ClaveFilas, number> = {
  desayuno_8: 5,
  desayuno_10: 8,
  almuerzo: 1,
  merienda: 10,
  cena: 8,
  horas: 3,
}

// Medidas de la A4, en milímetros.
const ALTO_UTIL = 297 - 2 * 8 // con 8 mm de margen arriba y abajo
const RESGUARDO = 4 // por si alguna impresora redondea distinto
const ENCABEZADO = 24 // logo y "Fecha de hoy"
const SEPARACION = 4
const TITULO_SECCION = 6.5
const CABECERA_SECCION = 5.5
const ENTRE_SECCIONES = 5
const TITULO_HORAS = 7
const ALTO_RECUADRO = 15
const ENTRE_RECUADROS = 2.5
export const RECUADROS_POR_FILA = 6
/** Lo más alta y lo más baja que puede quedar una fila para que se escriba cómodo. */
export const FILA_MAXIMA = 7
export const FILA_COMODA = 5
export const FILA_MINIMA = 3.6

export interface SeccionArmada extends DefSeccion {
  /** Una por fila: el nombre del mozo o '' si va en blanco. */
  filas: string[]
}

export interface HojaArmada {
  izquierda: SeccionArmada[]
  derecha: SeccionArmada[]
  /** Los recuadros de "Horas del día": el nombre, o null si va vacío. */
  recuadros: (string | null)[]
  /** Alto de cada fila de las tablas, en mm. */
  filaMm: number
  /** Hay tantas filas que quedan chicas para escribir a mano (igual entra). */
  apretada: boolean
  /** Con tantas filas no entra en una hoja: hay que sacar alguna. */
  noEntra: boolean
}

/** Limpia el nombre de un mozo: sin espacios de más, hasta 40 letras. Null si queda vacío. */
export function limpiarNombre(nombre: string): string | null {
  const limpio = nombre.trim().replace(/\s+/g, ' ')
  if (!limpio) return null
  return limpio.slice(0, 40)
}

export function filasValidas(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= FILAS_MAXIMO
}

function altoColumna(secciones: SeccionArmada[]): { fijo: number; filas: number } {
  const conFilas = secciones.filter((s) => s.filas.length > 0)
  return {
    fijo:
      conFilas.length * (TITULO_SECCION + CABECERA_SECCION) + Math.max(0, conFilas.length - 1) * ENTRE_SECCIONES,
    filas: conFilas.reduce((t, s) => t + s.filas.length, 0),
  }
}

/** El alto que ocupan los recuadros de horas (título incluido), en mm. */
export function altoHoras(cantidad: number): number {
  if (cantidad === 0) return 0
  const filas = Math.ceil(cantidad / RECUADROS_POR_FILA)
  return TITULO_HORAS + filas * ALTO_RECUADRO + (filas - 1) * ENTRE_RECUADROS
}

/**
 * Arma la hoja: los mozos van en el Almuerzo y en los recuadros de horas;
 * el resto de las secciones, en blanco con sus filas. Todas las filas miden lo
 * mismo, lo más alto posible (hasta 7 mm) sin pasarse de la A4.
 */
export function armarHoja(mozos: string[], filas: Partial<Record<ClaveFilas, number>>): HojaArmada {
  const cuantas = (c: ClaveFilas) => {
    const n = filas[c]
    return n !== undefined && filasValidas(n) ? n : FILAS_POR_DEFECTO[c]
  }
  const armar = (d: DefSeccion): SeccionArmada => ({
    ...d,
    filas: d.clave === 'almuerzo' ? [...mozos, ...Array(cuantas('almuerzo')).fill('')] : Array(cuantas(d.clave)).fill(''),
  })
  const izquierda = SECCIONES.filter((s) => s.columna === 'izquierda').map(armar)
  const derecha = SECCIONES.filter((s) => s.columna === 'derecha').map(armar)
  const recuadros: (string | null)[] = [...mozos, ...Array(cuantas('horas')).fill(null)]

  const disponible = ALTO_UTIL - RESGUARDO - ENCABEZADO - SEPARACION - (recuadros.length ? altoHoras(recuadros.length) + SEPARACION : 0)
  const alto = (c: SeccionArmada[]) => {
    const { fijo, filas: n } = altoColumna(c)
    return n === 0 ? FILA_MAXIMA : (disponible - fijo) / n
  }
  const justa = Math.min(alto(izquierda), alto(derecha))
  const filaMm = Math.max(FILA_MINIMA, Math.min(FILA_MAXIMA, Math.floor(justa * 10) / 10))

  return {
    izquierda: izquierda.filter((s) => s.filas.length > 0),
    derecha: derecha.filter((s) => s.filas.length > 0),
    recuadros,
    filaMm,
    apretada: justa < FILA_COMODA,
    noEntra: justa < FILA_MINIMA,
  }
}

/** "sábado 21/11/2026", para "Fecha de hoy". */
export function fechaDeLaHoja(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z')
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const [a, m, dia] = fecha.split('-')
  return `${dias[d.getUTCDay()]} ${dia}/${m}/${a}`
}
