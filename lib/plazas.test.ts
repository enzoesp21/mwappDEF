// Pruebas de la hoja de plazas de los mozos (lib/plazas.ts).

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { FILA_MAXIMA, altoHoras, armarHoja, fechaDeLaHoja, filasValidas, limpiarNombre } from '@/lib/plazas'

// La hoja de hoy (el PDF de Enzo): 16 mozos.
const MOZOS = [
  'Brisa D.', 'Nicolás F.', 'Rocio C.', 'Pamela A.', 'Raquel A.', 'Lucas I.', 'Lucas L.', 'Agustin A.',
  'Gabriel C.', 'Morena C.', 'Azul P.', 'Micaela D.', 'Cinthia I.', 'Martina B.', 'Lucia L.', 'Belén S.',
]

describe('qué va en cada lugar', () => {
  test('los mozos van en el Almuerzo, con sus filas en blanco de más, y en los recuadros de horas', () => {
    const h = armarHoja(MOZOS, {})
    const almuerzo = h.izquierda.find((s) => s.clave === 'almuerzo')!
    assert.deepEqual(almuerzo.filas, [...MOZOS, ''])
    assert.equal(h.recuadros.length, 19)
    assert.deepEqual(h.recuadros.slice(-3), [null, null, null])
    assert.deepEqual(h.derecha.map((s) => [s.clave, s.filas.length]), [['desayuno_8', 5], ['desayuno_10', 8], ['cena', 8]])
  })

  test('una sección en 0 no se imprime', () => {
    const h = armarHoja(MOZOS, { desayuno_10: 0 })
    assert.deepEqual(h.derecha.map((s) => s.clave), ['desayuno_8', 'cena'])
  })

  test('un número de filas raro vuelve al de siempre', () => {
    const h = armarHoja(MOZOS, { cena: 99, merienda: -2 })
    assert.equal(h.derecha.find((s) => s.clave === 'cena')!.filas.length, 8)
    assert.equal(h.izquierda.find((s) => s.clave === 'merienda')!.filas.length, 10)
  })
})

describe('que entre en una A4', () => {
  test('la hoja de hoy entra cómoda (filas de más de 5 mm)', () => {
    const h = armarHoja(MOZOS, {})
    assert.ok(h.filaMm >= 5 && h.filaMm <= FILA_MAXIMA, String(h.filaMm))
    assert.equal(h.apretada, false)
    assert.equal(h.noEntra, false)
  })

  test('con más filas en la cena y la merienda, las filas se achican pero entra', () => {
    const normal = armarHoja(MOZOS, {})
    const mas = armarHoja(MOZOS, { cena: 16, merienda: 14 })
    assert.ok(mas.filaMm < normal.filaMm)
    assert.equal(mas.noEntra, false)
  })

  test('con todo al máximo, avisa que no entra', () => {
    const h = armarHoja(MOZOS, { merienda: 30, cena: 30, desayuno_8: 30, desayuno_10: 30 })
    assert.equal(h.noEntra, true)
  })

  test('pocas filas: no pasan de 7 mm', () => {
    const h = armarHoja(['Uno'], { merienda: 2, cena: 2, desayuno_8: 1, desayuno_10: 1, horas: 0 })
    assert.equal(h.filaMm, FILA_MAXIMA)
    assert.equal(altoHoras(0), 0)
  })
})

describe('nombres y fecha', () => {
  test('el nombre se limpia y tiene tope', () => {
    assert.equal(limpiarNombre('  Juan   P. '), 'Juan P.')
    assert.equal(limpiarNombre('   '), null)
    assert.equal(limpiarNombre('x'.repeat(60))!.length, 40)
    assert.equal(filasValidas(30), true)
    assert.equal(filasValidas(31), false)
    assert.equal(filasValidas(2.5), false)
  })

  test('la fecha como en la hoja', () => {
    assert.equal(fechaDeLaHoja('2026-11-21'), 'sábado 21/11/2026')
  })
})
