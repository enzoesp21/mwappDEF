// Pruebas del lector del Excel de CrossChex (lib/planilla-importar.ts).

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { leerCsv, leerTabla } from '@/lib/planilla-importar'

const ms = (cuando: string) => Date.parse(cuando.replace(' ', 'T') + '-03:00')
/** Fecha de Excel como la entrega ExcelJS: la hora "de reloj" en UTC. */
const excel = (a: number, mes: number, d: number, h = 0, mi = 0, s = 0) => new Date(Date.UTC(a, mes - 1, d, h, mi, s))

describe('Excel de CrossChex', () => {
  test('encabezado en castellano con fecha y hora juntas en texto', () => {
    const r = leerTabla([
      ['Registros de asistencia'],
      [],
      ['No.', 'Nombre', 'Fecha/Hora', 'Estado'],
      ['104', 'AGUIRRE RAQUEL', '01/11/2026 07:38:12', 'C/In'],
      ['104', 'AGUIRRE RAQUEL', '01/11/2026 16:05', 'C/Out'],
      ['', '', '', ''],
      ['Total: 2'],
    ])
    assert.equal(r.error, undefined)
    assert.deepEqual(
      r.fichadas.map((f) => [f.numero, f.ms]),
      [
        ['104', ms('2026-11-01 07:38:12')],
        ['104', ms('2026-11-01 16:05:00')],
      ]
    )
    assert.equal(r.descartadas, 1)
  })

  test('fecha y hora en columnas separadas, como fechas de Excel', () => {
    const r = leerTabla([
      ['User ID', 'Name', 'Date', 'Time'],
      [611, 'LAUREANO', excel(2026, 10, 31), excel(1899, 12, 30, 8, 53)],
    ])
    assert.equal(r.fichadas[0].numero, '611')
    assert.equal(r.fichadas[0].nombre, 'LAUREANO')
    assert.equal(r.fichadas[0].ms, ms('2026-10-31 08:53:00'))
  })

  test('número de serie de Excel y fecha al revés (año primero)', () => {
    const serie = (Date.UTC(2026, 10, 1, 12, 30) / 86_400_000) + 25569
    const r = leerTabla([
      ['Nro', 'Fecha y hora'],
      ['8.0', serie],
      ['8', '2026-11-01 18:02'],
    ])
    assert.deepEqual(
      r.fichadas.map((f) => [f.numero, f.ms]),
      [
        ['8', ms('2026-11-01 12:30:00')],
        ['8', ms('2026-11-01 18:02:00')],
      ]
    )
  })

  test('horas con AM y PM', () => {
    const r = leerTabla([
      ['Nombre', 'Fecha', 'Hora'],
      ['ALMA', '28/10/2026', '1:05 PM'],
      ['ALMA', '28/10/2026', '12:10 AM'],
    ])
    assert.deepEqual(
      r.fichadas.map((f) => f.ms),
      [ms('2026-10-28 13:05:00'), ms('2026-10-28 00:10:00')]
    )
  })

  test('sin encabezado reconocible avisa y no inventa', () => {
    const r = leerTabla([
      ['a', 'b'],
      ['1', '2'],
    ])
    assert.equal(r.fichadas.length, 0)
    assert.ok(r.error)
  })

  test('CSV con punto y coma y comillas', () => {
    const tabla = leerCsv('﻿No.;Nombre;Fecha/Hora\r\n"610";"FERNANDEZ; FEDERICO";06/10/2026 16:04\r\n')
    const r = leerTabla(tabla)
    assert.equal(r.fichadas[0].nombre, 'FERNANDEZ; FEDERICO')
    assert.equal(r.fichadas[0].ms, ms('2026-10-06 16:04:00'))
  })
})
