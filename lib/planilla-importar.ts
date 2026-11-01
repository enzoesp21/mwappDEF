// Leer el Excel (o CSV) que exporta CrossChex, para cargar fichadas cuando el
// programa de la caja no anduvo. Puro: recibe la tabla ya leída (filas de
// celdas) y devuelve, por fichada, el número del reloj, el nombre y el instante.
// No conoce el formato exacto de la exportación: busca el encabezado por nombre
// (castellano o inglés) y entiende las fechas como las guarda Excel o como texto.

/** Lo que puede venir en una celda: texto, número (fecha de Excel), fecha o texto enriquecido de ExcelJS. */
export type Celda = string | number | boolean | Date | null | undefined | { text?: unknown; result?: unknown; richText?: { text: string }[] }

export interface FichadaLeida {
  /** Número de fila en el archivo (1 = la primera), para avisar. */
  fila: number
  numero: string | null
  nombre: string | null
  /** El instante en ms (la hora del archivo es hora de Argentina). */
  ms: number
}

export interface Lectura {
  fichadas: FichadaLeida[]
  /** Filas debajo del encabezado que no tenían una fecha y hora que se entienda. */
  descartadas: number
  /** Qué columna se usó para cada dato, para mostrarlo. */
  columnas: string[]
  error?: string
}

const ARGENTINA = 3 * 3600 * 1000
const DIA = 86_400_000

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function valor(c: Celda): string | number | Date | null {
  if (c === null || c === undefined || typeof c === 'boolean') return null
  if (c instanceof Date || typeof c === 'number' || typeof c === 'string') return c
  if (Array.isArray(c.richText)) return c.richText.map((r) => r.text).join('')
  if (c.result !== undefined) return valor(c.result as Celda)
  if (c.text !== undefined) return valor(c.text as Celda)
  return null
}

const CABECERAS = {
  numero: /^(no|nro|n|numero|num|user ?id|id|ac ?no|enroll ?(no|id|number)?|legajo|codigo|n de usuario|id de usuario)$/,
  nombre: /^(nombre|name|empleado|usuario|nombre y apellido|apellido y nombre)$/,
  fechaHora: /(fecha.*hora|date.*time|datetime|check ?time|hora de (registro|marcacion|fichada)|registro|marcacion|fichada)/,
  fecha: /^(fecha|date|dia)$/,
  hora: /^(hora|time)$/,
}

function cabecera(c: Celda): string {
  const v = valor(c)
  return typeof v === 'string' ? normalizar(v).replace(/[.:°º/#]/g, ' ').replace(/\s+/g, ' ').trim() : ''
}

/** Año, mes, día, hora, minuto y segundo "de reloj" (sin zona). */
type Partes = [number, number, number, number, number, number]

function aMs([a, mes, d, h, mi, s]: Partes): number | null {
  if (a < 2000 || a > 2100 || mes < 1 || mes > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null
  return Date.UTC(a, mes - 1, d, h, mi, s) + ARGENTINA
}

/** Fecha de Excel (ExcelJS la da como Date con la hora "de reloj" en UTC) o número de serie. */
function partesDeExcel(v: Date | number): Partes {
  const ms = v instanceof Date ? v.getTime() : Math.round((v - 25569) * DIA)
  const d = new Date(ms)
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
}

/** "08:03", "8:03:22", "8:03 PM". */
function horaDeTexto(t: string): [number, number, number] | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?\s?m\.?)?$/i)
  if (!m) return null
  let h = Number(m[1])
  const pm = m[4] && /p/i.test(m[4])
  if (m[4]) h = (h % 12) + (pm ? 12 : 0)
  return [h, Number(m[2]), Number(m[3] ?? 0)]
}

/** "01/11/2026", "1-11-26", "2026-11-01". Día primero, como en Argentina. */
function fechaDeTexto(t: string): [number, number, number] | null {
  let m = t.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  m = t.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/)
  if (!m) return null
  const anio = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  return [anio, Number(m[2]), Number(m[1])]
}

function fechaHora(c: Celda): number | null {
  const v = valor(c)
  if (v === null) return null
  if (v instanceof Date || typeof v === 'number') return aMs(partesDeExcel(v))
  const [f, ...resto] = v.trim().split(/\s+|T/)
  const fecha = fechaDeTexto(f)
  const hora = horaDeTexto(resto.join(' '))
  return fecha && hora ? aMs([...fecha, ...hora]) : null
}

function soloFecha(c: Celda): [number, number, number] | null {
  const v = valor(c)
  if (v === null) return null
  if (v instanceof Date || typeof v === 'number') return partesDeExcel(v).slice(0, 3) as [number, number, number]
  return fechaDeTexto(v.trim().split(/\s+/)[0])
}

function soloHora(c: Celda): [number, number, number] | null {
  const v = valor(c)
  if (v === null) return null
  if (v instanceof Date) return partesDeExcel(v).slice(3) as [number, number, number]
  if (typeof v === 'number') return partesDeExcel(v % 1).slice(3) as [number, number, number]
  return horaDeTexto(v)
}

function textoOVacio(c: Celda): string | null {
  const v = valor(c)
  if (v === null) return null
  const t = (v instanceof Date ? v.toISOString() : String(v)).trim()
  return t === '' ? null : t
}

/**
 * Lee la tabla: busca el encabezado en las primeras filas (necesita la fecha y
 * el número o el nombre) y devuelve cada fichada con su instante.
 */
export function leerTabla(filas: Celda[][]): Lectura {
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const encabezado = filas[i].map(cabecera)
    const buscar = (re: RegExp) => encabezado.findIndex((t) => t !== '' && re.test(t))
    const numero = buscar(CABECERAS.numero)
    const nombre = buscar(CABECERAS.nombre)
    const juntas = buscar(CABECERAS.fechaHora)
    const fecha = buscar(CABECERAS.fecha)
    const hora = buscar(CABECERAS.hora)
    if ((numero < 0 && nombre < 0) || (juntas < 0 && (fecha < 0 || hora < 0))) continue

    const fichadas: FichadaLeida[] = []
    let descartadas = 0
    for (let j = i + 1; j < filas.length; j++) {
      const fila = filas[j]
      if (!fila || fila.every((c) => textoOVacio(c) === null)) continue
      let ms: number | null = null
      if (fecha >= 0 && hora >= 0) {
        const f = soloFecha(fila[fecha])
        const h = soloHora(fila[hora])
        ms = f && h ? aMs([...f, ...h]) : null
      }
      if (ms === null && juntas >= 0) ms = fechaHora(fila[juntas])
      if (ms === null) {
        descartadas++
        continue
      }
      fichadas.push({
        fila: j + 1,
        numero: numero >= 0 ? textoOVacio(fila[numero])?.replace(/\.0+$/, '') ?? null : null,
        nombre: nombre >= 0 ? textoOVacio(fila[nombre]) : null,
        ms,
      })
    }
    const original = (k: number) => String(valor(filas[i][k]) ?? '').trim()
    const columnas = [
      numero >= 0 && `número: "${original(numero)}"`,
      nombre >= 0 && `nombre: "${original(nombre)}"`,
      fecha >= 0 && hora >= 0 ? `fecha: "${original(fecha)}", hora: "${original(hora)}"` : `fecha y hora: "${original(juntas)}"`,
    ].filter(Boolean) as string[]
    return { fichadas, descartadas, columnas }
  }
  return {
    fichadas: [],
    descartadas: 0,
    columnas: [],
    error:
      'No encontré el encabezado: tiene que haber una columna con el número (o el nombre) y otra con la fecha y la hora.',
  }
}

/** Lee un CSV simple (separado por ; , o tabulación, con comillas opcionales). */
export function leerCsv(texto: string): Celda[][] {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '')
  const primera = lineas[0] ?? ''
  const separador = [';', '\t', ','].reduce((mejor, s) => (primera.split(s).length > primera.split(mejor).length ? s : mejor), ';')
  return lineas.map((l) => {
    const celdas: string[] = []
    let actual = ''
    let entreComillas = false
    for (let i = 0; i < l.length; i++) {
      const ch = l[i]
      if (ch === '"') {
        if (entreComillas && l[i + 1] === '"') {
          actual += '"'
          i++
        } else entreComillas = !entreComillas
      } else if (ch === separador && !entreComillas) {
        celdas.push(actual)
        actual = ''
      } else actual += ch
    }
    celdas.push(actual)
    return celdas
  })
}
