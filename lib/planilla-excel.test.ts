// Pruebas del Excel de la planilla (lib/planilla-excel.ts): se arma, se lee de
// vuelta con ExcelJS y se revisa celda por celda contra la planilla de Enzo
// (AsistenciaOctubreDEF2026.xlsx): letras, colores, bordes, anchos y fórmulas.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import {
  AMARILLO,
  AZUL_FRANJA,
  CELESTE,
  CELESTE_CLARO,
  GRIS,
  ROJO,
  VERDE,
  armarHorasExcel,
  armarPlanillaExcel,
  columna,
  nombreArchivo,
} from '@/lib/planilla-excel'
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
      4: celda(4, { codigo: 'CERT', origen: 'codigo' }),
      5: celda(5, { codigo: 'LIC', origen: 'codigo' }),
      // Una jornada rara: tiene horas pero hay que revisarla (como los 22 de Pelizardi el 3/10).
      6: celda(6, { horas: 22, estado: 'revisar', avisos: [{ tipo: 'larga', texto: 'Más de 17 h en el día (22 h 05): revisar' }] }),
      16: celda(16, { horas: 9 }),
      20: celda(20, { codigo: 'FRANCO', origen: 'codigo' }),
    },
    horas: 39.5,
    dias: 39.5 / 8.5,
    incompletas: 1,
  },
  // Un empleado sin horas en el mes: igual va, con su fila vacía.
  { empleadoId: 'b', nombre: 'SACHETT ANGEL', cargo: 'JEFE DE PARTIDA O COCINER', celdas: {}, horas: 0, dias: 0, incompletas: 0 },
  // Sin cargo (los nuevos): el nombre va en gris, como en la de Enzo.
  { empleadoId: 'c', nombre: 'LAUREANO', cargo: null, celdas: { 11: celda(11, { horas: 7 }) }, horas: 7, dias: 7 / 8.5, incompletas: 0 },
]

async function idaYVuelta(libro: ExcelJS.Workbook): Promise<ExcelJS.Worksheet> {
  const leido = new ExcelJS.Workbook()
  await leido.xlsx.load(await libro.xlsx.writeBuffer())
  return leido.worksheets[0]
}

const argb = (c: ExcelJS.Cell) => (c.fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb
const textoNota = (c: ExcelJS.Cell) => {
  const nota = c.note
  return typeof nota === 'string' ? nota : nota?.texts?.map((t) => t.text).join('') ?? ''
}

describe('Excel de la planilla', () => {
  test('encabezado, días y orden como la planilla de Enzo', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas }))
    assert.equal(hoja.name, 'Hoja1')
    assert.equal(hoja.getCell('A1').value, 'EMPLEADO')
    assert.equal(hoja.getCell('B1').value, 'CARGO')
    assert.equal(hoja.getCell('C1').value, 'OCTUBRE')
    // EMPLEADO y CARGO combinadas en dos filas; el mes, de C1 hasta el día 31 (AG).
    assert.equal(hoja.getCell('A2').master.address, 'A1')
    assert.equal(hoja.getCell('B2').master.address, 'B1')
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
    // Los nombres de los días van derechos (en la de la app iban girados).
    assert.equal(hoja.getCell('C3').alignment?.textRotation, undefined)
    assert.equal(hoja.getCell('A4').value, null)
    assert.equal(hoja.getCell('A5').value, 'ESPIÑO ENZO LUCIANO')
    assert.equal(hoja.getCell('A6').value, 'SACHETT ANGEL')
    assert.equal(hoja.getCell('A7').value, 'LAUREANO')
  })

  test('letras, colores, anchos, zoom y paneles fijos como la de Enzo', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas }))
    // Encabezado: Arial 9 negrita itálica sobre celeste.
    for (const c of ['A1', 'B1', 'C1', 'AH1', 'AI1']) {
      const f = hoja.getCell(c).font
      assert.deepEqual([f?.name, f?.size, f?.bold, f?.italic], ['Arial', 9, true, true], c)
      assert.equal(argb(hoja.getCell(c)), CELESTE, c)
    }
    assert.deepEqual([hoja.getCell('C2').font?.name, hoja.getCell('C2').font?.bold], ['Arial', undefined])
    assert.equal(argb(hoja.getCell('C3')), CELESTE)
    // DIAS, FRANCO, NO VINO y OTROS, en blanco con la letra común.
    assert.equal(hoja.getCell('AK1').font?.name, 'Aptos Narrow')
    assert.equal(argb(hoja.getCell('AK1')), 'FFFFFFFF')
    // Fila 4: la franja azul, de punta a punta.
    for (const c of ['A4', 'C4', 'AG4', 'AH4', 'AM4']) assert.equal(argb(hoja.getCell(c)), AZUL_FRANJA, c)
    // Las horas en Calibri 10 sobre celeste clarito; HORAS y DIAS en Arial 9.
    assert.deepEqual([hoja.getCell('C5').font?.name, hoja.getCell('C5').font?.size], ['Calibri', 10])
    assert.equal(argb(hoja.getCell('C5')), CELESTE_CLARO)
    assert.equal(argb(hoja.getCell('Z6')), CELESTE_CLARO) // vacía, pero celeste igual
    assert.equal(hoja.getCell('AH5').font?.name, 'Arial')
    assert.equal(argb(hoja.getCell('AH5')), CELESTE_CLARO)
    assert.equal(hoja.getCell('AI5').numFmt, '0.00')
    // El cargo en Calibri 11, arriba a la izquierda.
    assert.deepEqual([hoja.getCell('B5').font?.size, hoja.getCell('B5').alignment?.vertical], [11, 'top'])
    // Anchos: 43, 35,86 y 10,71.
    assert.equal(hoja.getColumn(1).width, 43)
    assert.ok(Math.abs((hoja.getColumn(2).width ?? 0) - 35.86) < 0.01)
    assert.ok(Math.abs((hoja.getColumn(3).width ?? 0) - 10.71) < 0.01)
    assert.ok(Math.abs((hoja.getColumn(34).width ?? 0) - 10.71) < 0.01)
    // Paneles fijos en C5 y zoom 62 %.
    const vista = hoja.views[0] as unknown as Record<string, unknown>
    assert.deepEqual([vista.state, vista.xSplit, vista.ySplit, vista.topLeftCell, vista.zoomScale], ['frozen', 2, 4, 'C5', 62])
  })

  test('códigos, lo que hay que revisar y los nuevos sin cargo', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas }))
    assert.equal(hoja.getCell('C5').value, 8.5)
    assert.deepEqual([hoja.getCell('D5').value, argb(hoja.getCell('D5'))], ['VAC', AMARILLO])
    assert.deepEqual([hoja.getCell('F5').value, argb(hoja.getCell('F5'))], ['CERT', VERDE])
    assert.deepEqual([hoja.getCell('G5').value, argb(hoja.getCell('G5'))], ['LIC', VERDE])
    assert.deepEqual([hoja.getCell('V5').value, argb(hoja.getCell('V5'))], ['FRANCO', CELESTE_CLARO])
    // Incompleta: vacía, en rojo y con el comentario de qué falta.
    assert.deepEqual([hoja.getCell('E5').value, argb(hoja.getCell('E5'))], [null, ROJO])
    assert.match(textoNota(hoja.getCell('E5')), /Falta salida · fichó entrada 07:38/)
    assert.match(textoNota(hoja.getCell('E5')), /Salida según horario: 16:00hs/)
    // Jornada rara: con sus horas, en rojo y con el aviso.
    assert.deepEqual([hoja.getCell('H5').value, argb(hoja.getCell('H5'))], [22, ROJO])
    assert.match(textoNota(hoja.getCell('H5')), /Más de 17 h/)
    // Sin cargo: el nombre en gris; con cargo, sin fondo.
    assert.equal(argb(hoja.getCell('A7')), GRIS)
    assert.equal(argb(hoja.getCell('A5')), undefined)
    // Solo se pintaron esas celdas de amarillo, verde y rojo (el error típico de ExcelJS pinta toda la hoja).
    const pintadas: string[] = []
    hoja.eachRow({ includeEmpty: true }, (fila) =>
      fila.eachCell({ includeEmpty: true }, (c) => {
        const color = argb(c)
        if (color === AMARILLO || color === VERDE || color === ROJO || color === GRIS) pintadas.push(c.address)
      })
    )
    assert.deepEqual(pintadas.sort(), ['A7', 'D5', 'E5', 'F5', 'G5', 'H5'])
  })

  test('HORAS y DIAS como fórmulas, con el resultado ya calculado; los conteos sin ceros', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas }))
    const horas = hoja.getCell('AH5').value as ExcelJS.CellFormulaValue
    assert.equal(horas.formula, 'SUM(C5:AG5)')
    assert.equal(horas.result, 39.5)
    const dias = hoja.getCell('AI5').value as ExcelJS.CellFormulaValue
    assert.equal(dias.formula, 'AH5/8.5')
    assert.equal(dias.result, 39.5 / 8.5)
    assert.equal((hoja.getCell('AJ5').value as ExcelJS.CellFormulaValue).result, 3)
    assert.equal((hoja.getCell('AK5').value as ExcelJS.CellFormulaValue).result, 1)
    assert.equal((hoja.getCell('AM5').value as ExcelJS.CellFormulaValue).result, 3) // VAC + CERT + LIC
    assert.equal(hoja.getCell('AL5').numFmt, '0;-0;;@')
    assert.equal((hoja.getCell('AH6').value as ExcelJS.CellFormulaValue).formula, 'SUM(C6:AG6)')
  })

  test('segunda quincena: los días 16 a 31 con el mismo formato', async () => {
    const hoja = await idaYVuelta(armarPlanillaExcel({ mes: '2026-10', filas, desde: 16 }))
    assert.equal(hoja.getCell('C2').value, 16)
    assert.equal(hoja.getCell('R2').value, 31)
    assert.equal(hoja.getCell('C5').value, 9)
    assert.equal(hoja.getCell('R1').master.address, 'C1')
    assert.equal(hoja.getCell('S1').value, 'HORAS')
    assert.equal(argb(hoja.getCell('S4')), AZUL_FRANJA)
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
    assert.equal(argb(hoja.getCell('A1')), CELESTE)
    assert.deepEqual([hoja.getCell('A2').value, hoja.getCell('B2').value], ['AGUIRRE RAQUEL NOEMI', 82.5])
    assert.equal((hoja.getCell('B4').value as ExcelJS.CellFormulaValue).result, 106.5)
  })
})
