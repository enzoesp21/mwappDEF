// Pruebas de buscarPersona (lib/horarios.ts): primero el vínculo de la
// planilla (los "nombres en Horarios" de cada usuario), después por nombre.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buscarPersona, type DatosHorario } from '@/lib/horarios'

const fila = (nombre: string) => ({ nombre, dias: ['X', '', '', '', '', '', ''] })
const DATOS: DatosHorario = {
  sectores: [
    { nombre: 'BARRA', personas: [fila('Lucho Pelizardi'), fila('Federico Caruso')] },
    { nombre: 'COCINA', personas: [fila('Luciano Pelizardi'), fila('Giuseppe Rivas')] },
    { nombre: 'MAESTRANZA', personas: [fila('Ailen Shroeder'), fila('Jorgelina Pelizardi')] },
    { nombre: 'ENSALADA', personas: [fila('Ailen Shroeder ')] },
  ],
}
const sectores = (r: { sector: string }[]) => r.map((x) => x.sector)

describe('con el vínculo de la planilla manda la planilla', () => {
  test('Luciano Pelizardi de Barra es "Lucho": no se lo confunde con el de Cocina', () => {
    assert.deepEqual(sectores(buscarPersona(DATOS, 'Luciano Pelizardi', [], ['Lucho Pelizardi'])), ['BARRA'])
    // Sin el vínculo, por nombre, caía en el de Cocina.
    assert.deepEqual(sectores(buscarPersona(DATOS, 'Luciano Pelizardi')), ['COCINA'])
  })

  test('los nombres escritos distinto en el horario se encuentran', () => {
    assert.deepEqual(sectores(buscarPersona(DATOS, 'Federico Carusso', [], ['Federico Caruso'])), ['BARRA'])
    assert.deepEqual(sectores(buscarPersona(DATOS, 'Giuseppe Riva', [], ['Giuseppe Rivas'])), ['COCINA'])
    assert.deepEqual(sectores(buscarPersona(DATOS, 'Jorgelina', [], ['Jorgelina Pelizardi'])), ['MAESTRANZA'])
    // En dos sectores, y con un espacio de más en uno.
    assert.deepEqual(sectores(buscarPersona(DATOS, 'Ailen Schroeder', [], ['Ailen Shroeder'])), ['MAESTRANZA', 'ENSALADA'])
  })

  test('si esa semana no figura, no se busca por nombre (no muestra el de otro)', () => {
    assert.deepEqual(buscarPersona(DATOS, 'Valentina Muzio', [], ['Valentina Muzio']), [])
  })
})

describe('sin vínculo, por nombre como siempre', () => {
  test('un nombre que coincide se encuentra', () => {
    assert.deepEqual(sectores(buscarPersona(DATOS, 'Federico Caruso')), ['BARRA'])
  })

  test('uno escrito distinto no', () => {
    assert.deepEqual(buscarPersona(DATOS, 'Federico Carusso'), [])
  })
})
