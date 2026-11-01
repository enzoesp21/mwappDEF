// Pruebas de lo que arma la pantalla de la planilla (lib/planilla-vista.ts).

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { armarFilas, diaDeSemana, diasDelMes, mesDeHoy, nombreDelMes, textoDias, textoHoras, type CeldaPlanilla } from '@/lib/planilla-vista'

function celda(empleado_id: string, dia: number, horas: number | null, estado: CeldaPlanilla['estado'] = 'ok'): CeldaPlanilla {
  return {
    empleado_id, dia, horas, estado, codigo: null, origen: 'reloj', entrada: null, salida: null, tramos: null,
    minutos: null, horario: null, sugerencia: null, avisos: [], nota: null, bloqueada: false,
  }
}

describe('planilla en pantalla', () => {
  test('el orden es el de la hoja; quien tiene horas y no estaba, al final', () => {
    const foto = [
      { empleado_id: 'b', nombre: 'BALDIVIEZO', cargo: 'PASTELERO', orden: 2 },
      { empleado_id: 'a', nombre: 'ESPIÑO', cargo: 'MOZO', orden: 1 },
      { empleado_id: 'v', nombre: 'SACHETT ANGEL', cargo: null, orden: 3 },
    ]
    const actuales = new Map([['a', { nombre: 'ESPIÑO ENZO LUCIANO', cargo: 'MOZO' }]])
    const filas = armarFilas(foto, actuales, [
      celda('a', 1, 8.5),
      celda('a', 2, 9),
      celda('a', 3, null, 'incompleto'),
      celda('nuevo', 5, 8),
    ])
    assert.deepEqual(filas.map((f) => f.empleadoId), ['a', 'b', 'v', 'nuevo'])
    assert.equal(filas[0].nombre, 'ESPIÑO ENZO LUCIANO')
    assert.equal(filas[0].horas, 17.5)
    assert.equal(filas[0].dias, 17.5 / 8.5)
    assert.equal(filas[0].incompletas, 1)
    // Sin horas en el mes, la fila queda igual, vacía.
    assert.equal(filas[2].horas, 0)
    assert.deepEqual(filas[2].celdas, {})
  })

  test('días del mes y del calendario', () => {
    assert.equal(diasDelMes('2026-10'), 31)
    assert.equal(diasDelMes('2026-02'), 28)
    assert.equal(diasDelMes('2028-02'), 29)
    assert.equal(diaDeSemana('2026-10', 1), 4) // jueves
    assert.equal(nombreDelMes('2026-10'), 'Octubre 2026')
  })

  test('a las 05:00 del 1° todavía es el mes anterior (la jornada empieza a las 07:00)', () => {
    assert.equal(mesDeHoy(Date.parse('2026-11-01T05:00:00-03:00')), '2026-10')
    assert.equal(mesDeHoy(Date.parse('2026-11-01T07:30:00-03:00')), '2026-11')
  })

  test('números como en la planilla: coma y DÍAS con dos decimales', () => {
    assert.equal(textoHoras(8.5), '8,5')
    assert.equal(textoHoras(8), '8')
    assert.equal(textoDias(178 / 8.5), '20,94')
  })
})
