// Los Excel de la planilla, con el formato de la planilla de Enzo
// (AsistenciaOctubreDEF2026.xlsx, la que usan de verdad), hechos con ExcelJS:
//   - Una sola hoja, "Hoja1", con zoom 62 % y los paneles fijos en C5.
//   - Filas 1 a 3, encabezado celeste en Arial 9 negrita itálica: EMPLEADO y CARGO
//     combinadas en dos filas, el mes combinado sobre los días y abajo el número y
//     el nombre de cada día (en horizontal), HORAS y DIAS. Las columnas DIAS,
//     FRANCO, NO VINO y OTROS van en blanco con la letra común de Excel, como en la
//     de Enzo.
//   - Fila 4: una franja azul oscuro.
//   - Desde la fila 5, un empleado por fila en el orden de la hoja. Las horas van
//     sobre celeste clarito; VAC en amarillo, CERT y LIC en verde; lo que hay que
//     revisar (incompletas, jornadas raras) en rojo, con un comentario. Quien no
//     tiene cargo (los nuevos), con el nombre en gris.
//   - HORAS = SUMA de los días y DIAS = HORAS / 8,5, como fórmulas.
// Los colores son los del tema de Office de Enzo ya calculados (acento y tono):
// ExcelJS escribe su propio tema y con colores de tema saldrían otros.
// Ojo con ExcelJS: las celdas pueden compartir el objeto de estilo; cada celda
// recibe uno propio (nunca se modifica uno existente), si no se pinta toda la hoja.
// La quincena es el mismo formato con los días 1 a 15 o 16 a fin de mes.

import ExcelJS from 'exceljs'
import { HORAS_POR_DIA, textoFalta, textoHabitual, textoSegunHorario } from '@/lib/planilla'
import { MESES, NOMBRES_DIA, diaDeSemana, diasDelMes, type CeldaPlanilla, type FilaPlanilla } from '@/lib/planilla-vista'

/** Encabezado: acento 4 del tema de Enzo (0F9ED5), 40 % más claro. */
export const CELESTE = 'FF61CBF4'
/** Las horas: el mismo acento, 80 % más claro. */
export const CELESTE_CLARO = 'FFCAEEFB'
/** La franja de la fila 4: acento 1 (156082), 25 % más oscuro. */
export const AZUL_FRANJA = 'FF104862'
/** El nombre de quien no tiene cargo. */
export const GRIS = 'FFE8E8E8'
export const AMARILLO = 'FFFFFF00'
export const VERDE = 'FF00B050'
export const ROJO = 'FFFF0000'
const BLANCO = 'FFFFFFFF'

/** Anchos de la planilla de Enzo. */
const ANCHO_EMPLEADO = 43
const ANCHO_CARGO = 35.85546875
const ANCHO_DIA = 10.7109375

const ENCABEZADO: Partial<ExcelJS.Font> = { name: 'Arial', size: 9, bold: true, italic: true }
const ENCABEZADO_DIA: Partial<ExcelJS.Font> = { name: 'Arial', size: 9 }
const CUERPO: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10 }
const LETRA_CARGO: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11 }
const TOTALES: Partial<ExcelJS.Font> = { name: 'Arial', size: 9 }
/** La letra común de Excel, la de las columnas que Enzo no formateó. */
const COMUN: Partial<ExcelJS.Font> = { name: 'Aptos Narrow', size: 11 }
/** Los conteos sin ceros: si es 0, la celda se ve vacía (como en la de Enzo). */
const SIN_CEROS = '0;-0;;@'

/** Letra de columna de Excel: 1 → A, 27 → AA. */
export function columna(n: number): string {
  let s = ''
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s
  return s
}

interface Formato {
  font: Partial<ExcelJS.Font>
  /** Color de fondo (ARGB). */
  fondo?: string
  /** Qué lados llevan borde fino: t (arriba), l (izq.), b (abajo), r (der.). */
  bordes?: string
  horizontal?: ExcelJS.Alignment['horizontal']
  vertical?: ExcelJS.Alignment['vertical']
  ajustar?: boolean
  numFmt?: string
}

/** Un estilo nuevo para cada celda (sin compartir objetos). */
function estilo(f: Formato): Partial<ExcelJS.Style> {
  const lados = f.bordes ?? 'tlbr'
  const borde: Partial<ExcelJS.Borders> = {}
  if (lados.includes('t')) borde.top = { style: 'thin' }
  if (lados.includes('l')) borde.left = { style: 'thin' }
  if (lados.includes('b')) borde.bottom = { style: 'thin' }
  if (lados.includes('r')) borde.right = { style: 'thin' }
  const alineado: Partial<ExcelJS.Alignment> = {}
  if (f.horizontal) alineado.horizontal = f.horizontal
  if (f.vertical) alineado.vertical = f.vertical
  if (f.ajustar) alineado.wrapText = true
  return {
    font: { ...f.font },
    border: borde,
    ...(Object.keys(alineado).length > 0 ? { alignment: alineado } : {}),
    ...(f.fondo ? { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: f.fondo } } } : {}),
    ...(f.numFmt ? { numFmt: f.numFmt } : {}),
  }
}

/** El fondo de cada código, como los pinta Enzo. */
function fondoDeCodigo(codigo: string): string {
  if (codigo === 'VAC') return AMARILLO
  if (codigo === 'CERT' || codigo === 'LIC') return VERDE
  return CELESTE_CLARO
}

/** El comentario de una celda para revisar: qué falta, qué se sugiere o qué tiene de raro. */
export function comentarioIncompleta(c: CeldaPlanilla): string {
  if (c.sugerencia) {
    const s = { ...c.sugerencia, segunHorario: c.sugerencia.segun_horario }
    return [textoFalta(s), textoHabitual(s), textoSegunHorario(s)].filter(Boolean).join('\n')
  }
  return (c.avisos ?? []).map((a) => a.texto).join('\n') || 'Incompleta: revisar las fichadas'
}

export interface OpcionesExcel {
  /** "2026-10" */
  mes: string
  filas: FilaPlanilla[]
  /** Para la quincena: 1 a 15 o 16 a fin de mes. Por defecto, el mes entero. */
  desde?: number
  hasta?: number
}

/** La planilla del mes (o de la quincena) como la de Enzo. */
export function armarPlanillaExcel({ mes, filas, desde = 1, hasta }: OpcionesExcel): ExcelJS.Workbook {
  const ultimo = Math.min(hasta ?? diasDelMes(mes), diasDelMes(mes))
  const dias = Array.from({ length: ultimo - desde + 1 }, (_, i) => desde + i)
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Mirador Waikiki'
  // Que Excel recalcule las fórmulas al abrir (un resultado 0 no queda guardado).
  libro.calcProperties.fullCalcOnLoad = true
  const hoja = libro.addWorksheet('Hoja1', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 4, topLeftCell: 'C5', zoomScale: 62, zoomScaleNormal: 62 }],
  })

  const primeraDia = 3
  const ultimaDia = primeraDia + dias.length - 1
  const cHoras = ultimaDia + 1
  const cDias = cHoras + 1
  /** DIAS (con horas), FRANCO, NO VINO y OTROS: las columnas en blanco de la de Enzo. */
  const extras = [cHoras + 2, cHoras + 3, cHoras + 4, cHoras + 5]
  const ultimaColumna = cHoras + 5
  const rango = (fila: number) => `${columna(primeraDia)}${fila}:${columna(ultimaDia)}${fila}`
  const poner = (fila: number, col: number, valor: ExcelJS.CellValue | undefined, f: Formato) => {
    const celda = hoja.getCell(fila, col)
    if (valor !== undefined) celda.value = valor
    celda.style = estilo(f)
    return celda
  }

  // --- Encabezado (filas 1 a 3) ---
  const titulo = (f: Partial<Formato> = {}): Formato => ({
    font: ENCABEZADO,
    fondo: CELESTE,
    horizontal: 'center',
    vertical: 'middle',
    ajustar: true,
    ...f,
  })
  poner(1, 1, 'EMPLEADO', titulo())
  poner(2, 1, undefined, titulo())
  poner(1, 2, 'CARGO', titulo())
  poner(2, 2, undefined, titulo())
  hoja.mergeCells(1, 1, 2, 1)
  hoja.mergeCells(1, 2, 2, 2)
  for (let c = primeraDia; c <= ultimaDia; c++) {
    const lados = 'tb' + (c === primeraDia ? 'l' : '') + (c === ultimaDia ? 'r' : '')
    poner(1, c, c === primeraDia ? MESES[Number(mes.slice(5)) - 1] : undefined, titulo({ bordes: lados, ajustar: false }))
  }
  hoja.mergeCells(1, primeraDia, 1, ultimaDia)
  poner(1, cHoras, 'HORAS', titulo())
  poner(1, cDias, 'DIAS', titulo({ bordes: 'tlb' }))
  const blanco = (f: Partial<Formato> = {}): Formato => ({ font: COMUN, fondo: BLANCO, horizontal: 'center', numFmt: '0', ...f })
  ;['DIAS', 'FRANCO', 'NO VINO', 'OTROS'].forEach((texto, i) => poner(1, extras[i], texto, blanco()))

  dias.forEach((d, i) => {
    poner(2, primeraDia + i, d, { font: ENCABEZADO_DIA, fondo: CELESTE, horizontal: 'center' })
    poner(3, primeraDia + i, NOMBRES_DIA[diaDeSemana(mes, d)], { font: ENCABEZADO_DIA, fondo: CELESTE, horizontal: 'center' })
  })
  poner(2, cHoras, undefined, { font: ENCABEZADO_DIA, fondo: CELESTE, bordes: 'lbr', horizontal: 'center' })
  poner(2, cDias, undefined, titulo({ bordes: 'lb' }))
  poner(3, 1, undefined, titulo({ horizontal: 'left' }))
  poner(3, 2, undefined, titulo())
  poner(3, cHoras, undefined, { font: ENCABEZADO_DIA, fondo: CELESTE, bordes: 'tlb', horizontal: 'center' })
  poner(3, cDias, undefined, titulo({ bordes: 'tlb' }))
  extras.forEach((c, i) => {
    // OTROS no tiene fondo en la de Enzo (las otras, blanco).
    const sinFondo = i === extras.length - 1
    poner(2, c, undefined, sinFondo ? { font: COMUN } : blanco())
    poner(3, c, undefined, sinFondo ? { font: COMUN } : blanco())
  })

  // --- Fila 4: la franja azul ---
  for (let c = 1; c <= ultimaColumna; c++) {
    const esDia = c >= primeraDia && c <= ultimaDia
    poner(4, c, undefined, {
      font: esDia ? ENCABEZADO_DIA : c > cDias ? COMUN : ENCABEZADO,
      fondo: AZUL_FRANJA,
      horizontal: c === 1 ? 'left' : 'center',
      vertical: esDia || c > cDias ? undefined : 'middle',
    })
  }

  // --- Un empleado por fila, en el orden de la hoja ---
  filas.forEach((f, i) => {
    const r = 5 + i
    const cargo = (f.cargo ?? '').trim()
    poner(r, 1, f.nombre, { font: CUERPO, vertical: 'middle', ...(cargo ? {} : { fondo: GRIS }) })
    poner(
      r,
      2,
      cargo,
      cargo
        ? { font: LETRA_CARGO, bordes: 'tlb', horizontal: 'left', vertical: 'top', ajustar: true }
        : { font: CUERPO, vertical: 'middle' }
    )

    let horas = 0
    let conHoras = 0
    const conteo: Record<string, number> = {}
    dias.forEach((d, j) => {
      const c = f.celdas[d]
      const dia: Formato = { font: CUERPO, fondo: CELESTE_CLARO, horizontal: 'center', vertical: 'middle' }
      if (c?.codigo) {
        poner(r, primeraDia + j, c.codigo, { ...dia, fondo: fondoDeCodigo(c.codigo) })
        conteo[c.codigo] = (conteo[c.codigo] ?? 0) + 1
      } else if (c?.estado === 'incompleto') {
        // Falta una fichada: vacía y en rojo, con lo que falta y la sugerencia.
        poner(r, primeraDia + j, null, { ...dia, fondo: ROJO }).note = comentarioIncompleta(c)
      } else if (c?.horas != null) {
        const celda = poner(r, primeraDia + j, Number(c.horas), { ...dia, fondo: c.estado === 'revisar' ? ROJO : CELESTE_CLARO })
        // Una jornada rara (más de 17 h, por ejemplo): en rojo, con qué tiene.
        if (c.estado === 'revisar') celda.note = comentarioIncompleta(c)
        horas += Number(c.horas)
        conHoras++
      } else {
        poner(r, primeraDia + j, undefined, dia)
      }
    })

    const total = { fondo: CELESTE_CLARO, horizontal: 'center', vertical: 'middle' } as const
    poner(r, cHoras, { formula: `SUM(${rango(r)})`, result: horas }, { ...total, font: TOTALES, bordes: 'tbr' })
    poner(
      r,
      cDias,
      { formula: `${columna(cHoras)}${r}/${HORAS_POR_DIA}`, result: horas / HORAS_POR_DIA },
      { ...total, font: TOTALES, bordes: 'tlb', numFmt: '0.00' }
    )
    const cuenta = (codigo: string) => `COUNTIF(${rango(r)},"${codigo}")`
    const conteos: [string, number][] = [
      [`COUNT(${rango(r)})`, conHoras],
      [cuenta('FRANCO'), conteo.FRANCO ?? 0],
      [cuenta('NO VINO'), conteo['NO VINO'] ?? 0],
      [`${cuenta('VAC')}+${cuenta('CERT')}+${cuenta('LIC')}`, (conteo.VAC ?? 0) + (conteo.CERT ?? 0) + (conteo.LIC ?? 0)],
    ]
    conteos.forEach(([formula, resultado], k) =>
      poner(r, extras[k], { formula, result: resultado }, { font: COMUN, horizontal: 'center', numFmt: SIN_CEROS })
    )
  })

  hoja.getColumn(1).width = ANCHO_EMPLEADO
  hoja.getColumn(2).width = ANCHO_CARGO
  // Los días, HORAS y las columnas de la derecha (menos OTROS, que en la de Enzo
  // quedó con el ancho de Excel), como en su planilla.
  for (let c = primeraDia; c < ultimaColumna; c++) hoja.getColumn(c).width = ANCHO_DIA
  // Al imprimir, el encabezado y los nombres se repiten en cada hoja.
  hoja.pageSetup.printTitlesRow = '1:4'
  hoja.pageSetup.printTitlesColumn = 'A:B'
  return libro
}

/** "Planilla octubre 2026.xlsx", o "... 1ra quincena" / "2da quincena". */
export function nombreArchivo(mes: string, parte: 'mes' | 'q1' | 'q2'): string {
  const nombre = MESES[Number(mes.slice(5)) - 1].toLowerCase()
  const sufijo = parte === 'q1' ? ' - 1ra quincena' : parte === 'q2' ? ' - 2da quincena' : ''
  return `Planilla ${nombre} ${mes.slice(0, 4)}${sufijo}.xlsx`
}

/** Las horas para propinas: Empleado | Horas Calculadas, del rango pedido. */
export function armarHorasExcel(filas: { nombre: string; horas: number }[], titulo: string): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Mirador Waikiki'
  const hoja = libro.addWorksheet('Hoja1')
  const encabezado: Formato = { font: ENCABEZADO, fondo: CELESTE, horizontal: 'center', vertical: 'middle' }
  hoja.getCell('A1').value = 'Empleado'
  hoja.getCell('B1').value = 'Horas Calculadas'
  for (const c of ['A1', 'B1']) hoja.getCell(c).style = estilo(encabezado)
  filas.forEach((f, i) => {
    const nombre = hoja.getCell(i + 2, 1)
    nombre.value = f.nombre
    nombre.style = estilo({ font: CUERPO, vertical: 'middle' })
    const horas = hoja.getCell(i + 2, 2)
    horas.value = f.horas
    horas.style = estilo({ font: CUERPO, fondo: CELESTE_CLARO, horizontal: 'center', vertical: 'middle' })
  })
  const total = filas.length + 2
  hoja.getCell(total, 1).value = 'TOTAL'
  hoja.getCell(total, 1).style = estilo({ ...encabezado, horizontal: 'left' })
  hoja.getCell(total, 2).value = { formula: `SUM(B2:B${total - 1})`, result: filas.reduce((s, f) => s + f.horas, 0) }
  hoja.getCell(total, 2).style = estilo(encabezado)
  hoja.getCell(total + 2, 1).value = titulo
  hoja.getCell(total + 2, 1).style = { font: { name: 'Calibri', size: 10, italic: true } }
  hoja.getColumn(1).width = ANCHO_EMPLEADO
  hoja.getColumn(2).width = 17
  return libro
}

// ---------------------------------------------------------------------------
// Propina del resto del personal (quincena): Salón 60 % y Cocina 40 %
// ---------------------------------------------------------------------------

export interface ParteExcel {
  /** "SALÓN · 60 %" */
  titulo: string
  pozo: number
  horas: number
  porHora: number
  filas: { nombre: string; detalle: string; horas: number; monto: number }[]
}

const PLATA = '"$" #,##0'

/** El reparto de la quincena, con el mismo estilo de la planilla. */
export function armarPropinaGeneralExcel(o: { titulo: string; monto: number; partes: ParteExcel[]; notas: string[] }): ExcelJS.Workbook {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Mirador Waikiki'
  const hoja = libro.addWorksheet('Hoja1')
  const poner = (fila: number, col: number, valor: ExcelJS.CellValue | undefined, f: Formato) => {
    const celda = hoja.getCell(fila, col)
    if (valor !== undefined) celda.value = valor
    celda.style = estilo(f)
    return celda
  }
  const encabezado = (extra: Partial<Formato> = {}): Formato => ({
    font: ENCABEZADO,
    fondo: CELESTE,
    horizontal: 'center',
    vertical: 'middle',
    ...extra,
  })

  poner(1, 1, o.titulo, encabezado({ horizontal: 'left' }))
  for (let c = 2; c <= 4; c++) poner(1, c, undefined, encabezado())
  hoja.mergeCells(1, 1, 1, 4)
  poner(2, 1, 'Monto de la quincena', { font: ENCABEZADO, vertical: 'middle' })
  for (let c = 2; c <= 3; c++) poner(2, c, undefined, { font: CUERPO })
  hoja.mergeCells(2, 1, 2, 3)
  poner(2, 4, o.monto, { font: ENCABEZADO, horizontal: 'center', vertical: 'middle', numFmt: PLATA })

  let r = 4
  for (const parte of o.partes) {
    poner(r, 1, parte.titulo, { font: ENCABEZADO, fondo: AZUL_FRANJA, vertical: 'middle' })
    poner(r, 2, `${Math.round(parte.porHora).toLocaleString('es-AR')} por hora`, { font: { ...ENCABEZADO_DIA, color: { argb: BLANCO } }, fondo: AZUL_FRANJA, horizontal: 'center' })
    poner(r, 3, parte.horas, { font: { ...ENCABEZADO_DIA, color: { argb: BLANCO } }, fondo: AZUL_FRANJA, horizontal: 'center' })
    poner(r, 4, parte.pozo, { font: { ...ENCABEZADO, color: { argb: BLANCO } }, fondo: AZUL_FRANJA, horizontal: 'center', numFmt: PLATA })
    hoja.getCell(r, 1).font = { ...ENCABEZADO, color: { argb: BLANCO } }
    r++
    ;['EMPLEADO', 'SECTOR', 'HORAS', 'MONTO'].forEach((t, i) => poner(r, i + 1, t, encabezado()))
    r++
    const primera = r
    for (const f of parte.filas) {
      poner(r, 1, f.nombre, { font: CUERPO, vertical: 'middle' })
      poner(r, 2, f.detalle, { font: CUERPO, vertical: 'middle' })
      poner(r, 3, f.horas, { font: CUERPO, fondo: CELESTE_CLARO, horizontal: 'center', vertical: 'middle' })
      poner(r, 4, f.monto, { font: CUERPO, fondo: CELESTE_CLARO, horizontal: 'center', vertical: 'middle', numFmt: PLATA })
      r++
    }
    poner(r, 1, 'TOTAL', { font: ENCABEZADO, vertical: 'middle' })
    poner(r, 2, undefined, { font: CUERPO })
    const ultima = Math.max(primera, r - 1)
    poner(r, 3, { formula: `SUM(C${primera}:C${ultima})`, result: parte.filas.reduce((s, f) => s + f.horas, 0) }, { font: TOTALES, fondo: CELESTE_CLARO, horizontal: 'center' })
    poner(r, 4, { formula: `SUM(D${primera}:D${ultima})`, result: parte.filas.reduce((s, f) => s + f.monto, 0) }, { font: TOTALES, fondo: CELESTE_CLARO, horizontal: 'center', numFmt: PLATA })
    r += 2
  }
  for (const nota of o.notas) {
    hoja.getCell(r, 1).value = nota
    hoja.getCell(r, 1).style = { font: { name: 'Calibri', size: 10, italic: true } }
    r++
  }
  hoja.getColumn(1).width = ANCHO_EMPLEADO
  hoja.getColumn(2).width = 26
  hoja.getColumn(3).width = ANCHO_DIA
  hoja.getColumn(4).width = 16
  libro.calcProperties.fullCalcOnLoad = true
  return libro
}
