// Pruebas del Excel de la planilla (lib/planilla-excel.ts): se arma, se lee de
// vuelta con ExcelJS y se revisa celda por celda contra el formato de Enzo.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { AMARILLO, ROJO_CLARO, armarHorasExcel, armarPlanillaExcel, columna, nombreArchivo } from '@/lib/planilla-excel'
import type { CeldaPlanilla, FilaPlanilla } from '@/lib/planilla-vista'

function celda(dia: number, cambios: Partial<CeldaPlanilla>): CeldaPlanilla {
  return {
    empleado_id: 'x', dia, horas: null, codigo: null, origen: 'reloj', estado: 'ok', entrada: null, salida: null,
    tramos: null, minutos: null, horario: null, sugerencia: null, avisos: [], nota: null, bloqueada: false, ...cambios,
  }
}

const filas: FilaPlanilla[] = [
  {
    empleadoId: 'a',
    nombre: 'ESPIÑO ENZO LUCIANO',
    cargo: 'MOZO',
    celdas: {
      1: celda(1, { horas: 8.5 }),
      2: celda(2, { codigo: 'VAC', origen: 'codigo' }),
      3: celda(3, { estado: 'incompleto', sugerencia: { falta: 'salida', fichada: 7 * 60 + 38, habitual: 16 * 60 + 5, segun_horario: 16 * 60 } }),
      16: celda(16, { horas: 9 }),
      20: celda(20, { codigo: 'FRANCO', origen: 'codigo' }),
    },
    horas: 17.5,
    dias: 17.5 / 8.5,
    incompletas: 1,
  },
  // Un empleado sin horas en el mes: igual va, con su fila vacía.
  { empleadoId: 'b', nombre: 'SACHETT ANGEL', cargo: 'JEFE DE PARTIDA O COCINER', celdas: {}, horas: 0, dias: 0, incompletas: 0 },
]

async function idaYVuelta(libro: ExcelJS.Workbook): Promise<ExcelJS.Worksheet> {
  const leido = new ExcelJS.Workbook()
  await leido.xlsx.load(await libro.xlsx.writeBuffer())
  return leido.worksheets[0]
}

const argb = (c: ExcelJS.Cell) => (c.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb

describe('Excel de la planilla', () => {
  test('encabezado, días y orden como la planilla de siempre', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas }))
    assert.equal(hoja.name, 'Hoja1')
    assert.equal(hoja.getCell('A1').value, 'EMPLEADO')
    assert.equal(hoja.getCell('B1').value, 'CARGO')
    assert.equal(hoja.getCell('C1').value, 'OCTUBRE')
    // El mes va combinado de C1 hasta el día 31 (columna AG).
    assert.equal(hoja.getCell('AG1').isMerged, true)
    assert.equal(hoja.getCell('AG1').master.address, 'C1')
    assert.deepEqual(
      ['AH1', 'AI1', 'AJ1', 'AK1', 'AL1', 'AM1'].map((c) => hoja.getCell(c).value),
      ['HORAS', 'DIAS', 'DIAS', 'FRANCO', 'NO VINO', 'OTROS']
    )
    assert.equal(hoja.getCell('C2').value, 1)
    assert.equal(hoja.getCell('AG2').value, 31)
    assert.equal(hoja.getCell('C3').value, 'JUEVES') // el 1/10/2026
    assert.equal(hoja.getCell('H3').value, 'MARTES')
    assert.equal(hoja.getCell('I3').value, 'MIÉRCOLES')
    assert.equal(hoja.getCell('E3').value, 'SÁBADO')
    assert.equal(hoja.getCell('A4').value, null)
    assert.equal(hoja.getCell('A5').value, 'ESPIÑO ENZO LUCIANO')
    assert.equal(hoja.getCell('A6').value, 'SACHETT ANGEL')
  })

  test('horas, códigos, colores y comentario en la incompleta', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas }))
    assert.equal(hoja.getCell('C5').value, 8.5)
    assert.equal(hoja.getCell('D5').value, 'VAC')
    assert.equal(argb(hoja.getCell('D5')), AMARILLO)
    assert.equal(argb(hoja.getCell('E5')), ROJO_CLARO)
    const nota = hoja.getCell('E5').note
    const textoNota = typeof nota === 'string' ? nota : nota?.texts?.map((t) => t.text).join('') ?? ''
    assert.match(textoNota, /Falta salida · fichó entrada 07:38/)
    assert.match(textoNota, /Salida según horario: 16:00hs/)
    // Ninguna otra celda quedó pintada (el error típico de ExcelJS pinta toda la hoja).
    const pintadas: string[] = []
    hoja.eachRow({ includeEmpty: true }, (fila) => fila.eachCell({ includeEmpty: true }, (c) => argb(c) && pintadas.push(c.address)))
    assert.deepEqual(pintadas.sort(), ['D5', 'E5'])
  })

  test('HORAS y DIAS como fórmulas, con el resultado ya calculado', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas }))
    const horas = hoja.getCell('AH5').value as ExcelJS.CellFormulaValue
    assert.equal(horas.formula, 'SUM(C5:AG5)')
    assert.equal(horas.result, 17.5)
    const dias = hoja.getCell('AI5').value as ExcelJS.CellFormulaValue
    assert.equal(dias.formula, 'AH5/8.5')
    assert.equal(dias.result, 17.5 / 8.5)
    assert.equal((hoja.getCell('AJ5').value as ExcelJS.CellFormulaValue).result, 2)
    assert.equal((hoja.getCell('AK5').value as ExcelJS.CellFormulaValue).result, 1)
    assert.equal((hoja.getCell('AM5').value as ExcelJS.CellFormulaValue).result, 1)
    assert.equal((hoja.getCell('AH6').value as ExcelJS.CellFormulaValue).formula, 'SUM(C6:AG6)')
  })

  test('segunda quincena: los días 16 a 31 con el mismo formato', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas, desde: 16 }))
    assert.equal(hoja.getCell('C2').value, 16)
    assert.equal(hoja.getCell('R2').value, 31)
    assert.equal(hoja.getCell('C5').value, 9)
    assert.equal(hoja.getCell('S1').value, 'HORAS')
    assert.equal((hoja.getCell('S5').value as ExcelJS.CellFormulaValue).result, 9)
    assert.equal(nombreArchivo('2026-10', 'q2'), 'Planilla octubre 2026 - 2da quincena.xlsx')
  })

  test('febrero tiene 28 días', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2027-02', filas: [] }))
    assert.equal(hoja.getCell(`${columna(30)}2`).value, 28)
    assert.equal(hoja.getCell(`${columna(31)}1`).value, 'HORAS')
  })

  test('horas para propinas: Empleado | Horas Calculadas, con total', async () => {
    const hoja = await idaYVuelta(armarHorasExcel([{ nombre: 'AGUIRRE RAQUEL NOEMI', horas: 82.5 }, { nombre: 'ALMA', horas: 24 }], 'Del 01/10 al 15/10'))
    assert.deepEqual([hoja.getCell('A1').value, hoja.getCell('B1').value], ['Empleado', 'Horas Calculadas'])
    assert.deepEqual([hoja.getCell('A2').value, hoja.getCell('B2').value], ['AGUIRRE RAQUEL NOEMI', 82.5])
    assert.equal((hoja.getCell('B4').value as ExcelJS.CellFormulaValue).result, 106.5)
  })
})
