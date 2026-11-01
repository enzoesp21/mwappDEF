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

describe('cierre del mes', () => {
  test('totales: horas, incompletas y DÍAS por empleado (solo los que tienen horas)', async () => {
    const { totalesDelMes } = await import('@/lib/planilla-vista')
    const t = totalesDelMes([
      { empleadoId: 'a', nombre: 'ESPIÑO', cargo: null, celdas: {}, horas: 111, dias: 111 / 8.5, incompletas: 13 },
      { empleadoId: 'b', nombre: 'SACHETT ANGEL', cargo: null, celdas: {}, horas: 0, dias: 0, incompletas: 0 },
      { empleadoId: 'c', nombre: 'ZULMA', cargo: null, celdas: {}, horas: 189, dias: 189 / 8.5, incompletas: 1 },
    ])
    assert.equal(t.horas_total, 300)
    assert.equal(t.incompletos, 14)
    assert.equal(t.empleados_con_horas, 2)
    assert.deepEqual(t.por_empleado.a, { nombre: 'ESPIÑO', horas: 111, dias: 13.06 })
    assert.equal(t.por_empleado.b, undefined)
  })

  test('octubre se puede cerrar desde las 07:00 del 1° de noviembre, no antes', async () => {
    const { mesTerminado } = await import('@/lib/planilla-vista')
    assert.equal(mesTerminado('2026-10', Date.parse('2026-11-01T06:30:00-03:00')), false)
    assert.equal(mesTerminado('2026-10', Date.parse('2026-11-01T07:30:00-03:00')), true)
    assert.equal(mesTerminado('2026-11', Date.parse('2026-11-15T12:00:00-03:00')), false)
  })
})
