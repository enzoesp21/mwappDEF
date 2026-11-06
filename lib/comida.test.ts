// Pruebas de lo que le falta contestar a cada uno en la comida semanal
// (lib/comida.ts): los francos del horario y "No vengo" cuentan como
// contestadas.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { claveComida, comidasSinContestar, francosSegunHorario } from '@/lib/comida'
import type { DatosHorario } from '@/lib/horarios'
import type { WeekDay } from '@/lib/meals-utils'

// La semana del 9/11: almuerzo todos los días y cena viernes y sábado (9 comidas).
const SEMANA: WeekDay[] = [
  { date: '2026-11-09', dayName: 'Lunes', meals: ['almuerzo'] },
  { date: '2026-11-10', dayName: 'Martes', meals: ['almuerzo'] },
  { date: '2026-11-11', dayName: 'Miércoles', meals: ['almuerzo'] },
  { date: '2026-11-12', dayName: 'Jueves', meals: ['almuerzo'] },
  { date: '2026-11-13', dayName: 'Viernes', meals: ['almuerzo', 'cena'] },
  { date: '2026-11-14', dayName: 'Sábado', meals: ['almuerzo', 'cena'] },
  { date: '2026-11-15', dayName: 'Domingo', meals: ['almuerzo'] },
]

const persona = (nombre: string, dias: string[]) => ({ nombre, dias })

describe('los francos del horario', () => {
  test('X, VAC, LIC y M9 son franco; un turno no', () => {
    const p = persona('Bruno', ['X', '8 A 16.30', 'VAC', 'LIC', 'M9', '11C', 'x'])
    const datos: DatosHorario = { sectores: [{ nombre: 'Camareros', personas: [p] }] }
    assert.deepEqual(
      Array.from(francosSegunHorario(datos, [p], SEMANA)),
      ['2026-11-09', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-15']
    )
  })

  test('una celda vacía no se sabe qué es: se sigue preguntando', () => {
    const p = persona('Ana', ['', '', '', '', '', '', ''])
    const datos: DatosHorario = { sectores: [{ nombre: 'Caja', personas: [p] }] }
    assert.equal(francosSegunHorario(datos, [p], SEMANA).size, 0)
  })

  test('en dos sectores, es franco solo si no trabaja en ninguno', () => {
    const maestranza = persona('Gabriel', ['X', 'X', '8 A 14', 'X', 'X', 'X', 'X'])
    const ensalada = persona('Gabriel', ['X', '10 A 16', 'X', 'X', 'X', 'X', 'X'])
    const datos: DatosHorario = {
      sectores: [
        { nombre: 'Maestranza', personas: [maestranza] },
        { nombre: 'Ensalada', personas: [ensalada] },
      ],
    }
    const francos = francosSegunHorario(datos, [maestranza, ensalada], SEMANA)
    assert.equal(francos.has('2026-11-09'), true)
    assert.equal(francos.has('2026-11-10'), false)
    assert.equal(francos.has('2026-11-11'), false)
  })

  test('sin horario publicado o sin encontrarla, no hay francos', () => {
    assert.equal(francosSegunHorario(null, [], SEMANA).size, 0)
    assert.equal(francosSegunHorario({ sectores: [] }, [], SEMANA).size, 0)
  })
})

describe('cuántas le faltan', () => {
  test('sin nada contestado y sin horario, le faltan las 9', () => {
    assert.equal(comidasSinContestar(SEMANA, new Set(), new Set()), 9)
  })

  test('con francos el lunes y el viernes, le faltan 6 aunque no toque nada', () => {
    assert.equal(comidasSinContestar(SEMANA, new Set(), new Set(['2026-11-09', '2026-11-13'])), 6)
  })

  test('"No vengo" cuenta como contestada', () => {
    const contestadas = new Set([
      claveComida('2026-11-09', 'almuerzo'),
      claveComida('2026-11-13', 'almuerzo'),
      claveComida('2026-11-13', 'cena'),
    ])
    assert.equal(comidasSinContestar(SEMANA, contestadas, new Set()), 6)
  })

  test('eligió todo lo que trabaja y marcó lo demás: no le falta nada', () => {
    const contestadas = new Set(SEMANA.flatMap((d) => d.meals.map((m) => claveComida(d.date, m))))
    assert.equal(comidasSinContestar(SEMANA, contestadas, new Set()), 0)
  })
})
