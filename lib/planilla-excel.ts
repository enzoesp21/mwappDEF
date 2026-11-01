// Los Excel de la planilla, con el formato de la planilla de Enzo (ExcelJS):
//   - Una sola hoja, "Hoja1".
//   - Fila 1: EMPLEADO | CARGO | <MES> (combinada sobre los días) | HORAS | DIAS | DIAS | FRANCO | NO VINO | OTROS
//   - Fila 2: el número de cada día. Fila 3: el nombre del día, con tildes. Fila 4: vacía.
//   - Desde la fila 5, un empleado por fila en el orden de la hoja (también los vacíos).
//   - HORAS = SUMA de los días y DIAS = HORAS / 8,5, como fórmulas.
//   - VAC en amarillo (FFFFFF00); incompleta en rojo claro (FFFFC7CE) con un
//     comentario que dice qué falta y la sugerencia.
// Ojo con ExcelJS: las celdas pueden compartir el objeto de estilo; cada celda
// recibe uno propio (nunca se modifica uno existente), si no se pinta toda la hoja.
// La quincena es el mismo formato con los días 1 a 15 o 16 a fin de mes.

import ExcelJS from 'exceljs'
import { HORAS_POR_DIA, textoFalta, textoHabitual, textoSegunHorario } from '@/lib/planilla'
import { MESES, NOMBRES_DIA, diaDeSemana, diasDelMes, type CeldaPlanilla, type FilaPlanilla } from '@/lib/planilla-vista'

export const AMARILLO = 'FFFFFF00'
export const ROJO_CLARO = 'FFFFC7CE'

const BORDE: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

/** Letra de columna de Excel: 1 → A, 27 → AA. */
export function columna(n: number): string {
  let s = ''
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s
  return s
}

/** Un estilo nuevo para cada celda (sin compartir objetos). */
function estilo(extra: Partial<ExcelJS.Style> = {}): Partial<ExcelJS.Style> {
  return {
    font: { name: 'Calibri', size: 10, ...(extra.font ?? {}) },
    border: { ...BORDE },
    alignment: { vertical: 'middle', ...(extra.alignment ?? {}) },
    ...(extra.fill ? { fill: { ...(extra.fill as ExcelJS.Fill) } } : {}),
    ...(extra.numFmt ? { numFmt: extra.numFmt } : {}),
  }
}

function relleno(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

/** El comentario de una celda incompleta: qué falta y qué se sugiere. */
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

/** La planilla del mes (o de la quincena) como el Excel de siempre. */
export function armarPlanillaExcel({ mes, filas, desde = 1, hasta }: OpcionesExcel): ExcelJS.Workbook {
  const ultimo = Math.min(hasta ?? diasDelMes(mes), diasDelMes(mes))
  const dias = Array.from({ length: ultimo - desde + 1 }, (_, i) => desde + i)
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Mirador Waikiki'
  // Que Excel recalcule las fórmulas al abrir (un resultado 0 no queda guardado).
  libro.calcProperties.fullCalcOnLoad = true
  const hoja = libro.addWorksheet('Hoja1', { views: [{ state: 'frozen', xSplit: 2, ySplit: 4 }] })

  const primeraDia = 3
  const ultimaDia = primeraDia + dias.length - 1
  const cHoras = ultimaDia + 1
  const rango = (fila: number) => `${columna(primeraDia)}${fila}:${columna(ultimaDia)}${fila}`

  // Fila 1: encabezado, con el mes combinado sobre los días.
  const titulos: [number, string][] = [
    [1, 'EMPLEADO'],
    [2, 'CARGO'],
    [primeraDia, MESES[Number(mes.slice(5)) - 1]],
    [cHoras, 'HORAS'],
    [cHoras + 1, 'DIAS'],
    [cHoras + 2, 'DIAS'],
    [cHoras + 3, 'FRANCO'],
    [cHoras + 4, 'NO VINO'],
    [cHoras + 5, 'OTROS'],
  ]
  for (const [c, texto] of titulos) {
    const celda = hoja.getCell(1, c)
    celda.value = texto
    celda.style = estilo({ font: { bold: true }, alignment: { horizontal: 'center' } })
  }
  for (let c = primeraDia + 1; c <= ultimaDia; c++) hoja.getCell(1, c).style = estilo()
  hoja.mergeCells(1, primeraDia, 1, ultimaDia)

  // Filas 2 y 3: número y nombre de cada día. La 4 queda vacía.
  dias.forEach((d, i) => {
    const numero = hoja.getCell(2, primeraDia + i)
    numero.value = d
    numero.style = estilo({ font: { bold: true }, alignment: { horizontal: 'center' } })
    const nombre = hoja.getCell(3, primeraDia + i)
    nombre.value = NOMBRES_DIA[diaDeSemana(mes, d)]
    nombre.style = estilo({ font: { size: 7 }, alignment: { horizontal: 'center', textRotation: 90 } })
  })

  // Un empleado por fila, en el orden de la hoja.
  filas.forEach((f, i) => {
    const r = 5 + i
    const nombre = hoja.getCell(r, 1)
    nombre.value = f.nombre
    nombre.style = estilo()
    const cargo = hoja.getCell(r, 2)
    cargo.value = f.cargo ?? ''
    cargo.style = estilo()

    let horas = 0
    let conHoras = 0
    const conteo: Record<string, number> = {}
    dias.forEach((d, j) => {
      const c = f.celdas[d]
      const celda = hoja.getCell(r, primeraDia + j)
      if (c?.codigo) {
        celda.value = c.codigo
        celda.style = estilo({ alignment: { horizontal: 'center' }, ...(c.codigo === 'VAC' ? { fill: relleno(AMARILLO) } : {}) })
        conteo[c.codigo] = (conteo[c.codigo] ?? 0) + 1
      } else if (c?.estado === 'incompleto') {
        celda.value = null
        celda.style = estilo({ fill: relleno(ROJO_CLARO) })
        celda.note = comentarioIncompleta(c)
      } else if (c?.horas != null) {
        celda.value = Number(c.horas)
        celda.style = estilo({ alignment: { horizontal: 'center' } })
        horas += Number(c.horas)
        conHoras++
      } else {
        celda.style = estilo()
      }
    })

    const formula = (c: number, f: string, resultado: number, numFmt?: string) => {
      const celda = hoja.getCell(r, c)
      celda.value = { formula: f, result: resultado }
      celda.style = estilo({ alignment: { horizontal: 'center' }, ...(numFmt ? { numFmt } : {}) })
    }
    const cuenta = (codigo: string) => `COUNTIF(${rango(r)},"${codigo}")`
    formula(cHoras, `SUM(${rango(r)})`, horas)
    formula(cHoras + 1, `${columna(cHoras)}${r}/${HORAS_POR_DIA}`, horas / HORAS_POR_DIA, '0.00')
    formula(cHoras + 2, `COUNT(${rango(r)})`, conHoras)
    formula(cHoras + 3, cuenta('FRANCO'), conteo.FRANCO ?? 0)
    formula(cHoras + 4, cuenta('NO VINO'), conteo['NO VINO'] ?? 0)
    formula(
      cHoras + 5,
      `${cuenta('VAC')}+${cuenta('CERT')}+${cuenta('LIC')}`,
      (conteo.VAC ?? 0) + (conteo.CERT ?? 0) + (conteo.LIC ?? 0)
    )
  })

  hoja.getColumn(1).width = 30
  hoja.getColumn(2).width = 26
  for (let c = primeraDia; c <= ultimaDia; c++) hoja.getColumn(c).width = 4.6
  for (let c = cHoras; c <= cHoras + 5; c++) hoja.getColumn(c).width = 8.5
  hoja.getRow(3).height = 52
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
  hoja.getCell('A1').value = 'Empleado'
  hoja.getCell('B1').value = 'Horas Calculadas'
  for (const c of ['A1', 'B1']) hoja.getCell(c).style = estilo({ font: { bold: true } })
  filas.forEach((f, i) => {
    const nombre = hoja.getCell(i + 2, 1)
    nombre.value = f.nombre
    nombre.style = estilo()
    const horas = hoja.getCell(i + 2, 2)
    horas.value = f.horas
    horas.style = estilo({ alignment: { horizontal: 'center' } })
  })
  const total = filas.length + 2
  hoja.getCell(total, 1).value = 'TOTAL'
  hoja.getCell(total, 1).style = estilo({ font: { bold: true } })
  hoja.getCell(total, 2).value = { formula: `SUM(B2:B${total - 1})`, result: filas.reduce((s, f) => s + f.horas, 0) }
  hoja.getCell(total, 2).style = estilo({ font: { bold: true }, alignment: { horizontal: 'center' } })
  hoja.getCell(total + 2, 1).value = titulo
  hoja.getColumn(1).width = 32
  hoja.getColumn(2).width = 17
  return libro
}
