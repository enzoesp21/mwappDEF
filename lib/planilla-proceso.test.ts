// Pruebas del armado de celdas del proceso automático (lib/planilla-proceso.ts).

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { armarCeldas, fechasEntre, rangoPorDefecto, type DatosPlanilla } from '@/lib/planilla-proceso'

const ms = (cuando: string) => Date.parse(cuando.replace(' ', 'T') + ':00-03:00')

function datos(cambios: Partial<DatosPlanilla> = {}): DatosPlanilla {
  return {
    desde: '2026-10-27',
    hasta: '2026-10-31',
    empleados: [
      { id: 'bruno', nombre: 'MOLINA BRUNO EZEQUIEL', calendario: false, nombres_horario: ['Bruno Molina'] },
      { id: 'raquel', nombre: 'AGUIRRE RAQUEL NOEMI', calendario: false, nombres_horario: ['Raquel Aguirre'] },
      { id: 'sin-nada', nombre: 'SACHETT ANGEL', calendario: false, nombres_horario: null },
    ],
    // Bruno tiene dos números en el reloj.
    alias: [
      ['240', 'bruno'],
      ['275', 'bruno'],
      ['104', 'raquel'],
    ],
    fichadas: [
      [1, '275', ms('2026-10-28 07:28')],
      [2, '240', ms('2026-10-28 16:34')],
      [3, '104', ms('2026-10-29 07:37')],
      [4, '104', ms('2026-10-29 16:11')],
      [5, '104', ms('2026-10-30 07:38')],
    ],
    manuales: [],
    semanas: [
      {
        week_start: '2026-10-26',
        data: {
          noches: [4, 5],
          sectores: [{ nombre: 'CAMAREROS', personas: [{ nombre: 'Raquel Aguirre', dias: ['X', '7.30 A 16', 'X', '7.30 A 16', '7.30 A 16', '7.30 A 16', 'X'] }] }],
        },
      },
    ],
    existentes: [],
    cerrados: [],
    ...cambios,
  }
}

const AHORA = ms('2026-11-01 10:00')

describe('armado de celdas', () => {
  test('junta las fichadas de los dos números del reloj de la misma persona', () => {
    const celda = armarCeldas(datos(), AHORA).find((c) => c.empleado_id === 'bruno' && c.fecha === '2026-10-28')
    assert.ok(celda)
    assert.equal(celda.entrada, '07:28')
    assert.equal(celda.salida, '16:34')
    assert.equal(celda.horas, 9)
    assert.deepEqual(celda.fichadas_usadas, [1, 2])
  })

  test('la sugerencia sale del horario publicado y va en minutos de la jornada', () => {
    const celda = armarCeldas(datos(), AHORA).find((c) => c.empleado_id === 'raquel' && c.fecha === '2026-10-30')
    assert.ok(celda)
    assert.equal(celda.estado, 'incompleto')
    assert.equal(celda.horario, '7.30 A 16')
    assert.deepEqual(celda.sugerencia, { falta: 'salida', fichada: 7 * 60 + 38, habitual: null, segun_horario: 16 * 60 })
  })

  test('tenía turno y no fichó: va la celda gris', () => {
    const celda = armarCeldas(datos(), AHORA).find((c) => c.empleado_id === 'raquel' && c.fecha === '2026-10-27')
    assert.ok(celda)
    assert.equal(celda.horas, null)
    assert.equal(celda.avisos[0]?.tipo, 'sin-fichadas')
  })

  test('sin fichadas ni horario no se arma nada', () => {
    assert.equal(armarCeldas(datos(), AHORA).filter((c) => c.empleado_id === 'sin-nada').length, 0)
  })

  test('no manda lo que tocó un admin ni lo que vino de papel', () => {
    const d = datos({
      existentes: [
        ['raquel', '2026-10-29', 'codigo', true],
        ['raquel', '2026-10-30', 'papel', false],
        ['bruno', '2026-10-28', 'reloj', false],
      ],
    })
    const fechas = armarCeldas(d, AHORA).map((c) => `${c.empleado_id} ${c.fecha}`)
    assert.ok(!fechas.includes('raquel 2026-10-29'))
    assert.ok(!fechas.includes('raquel 2026-10-30'))
    assert.ok(fechas.includes('bruno 2026-10-28'))
    // Después de cargar papel se rehace lo de papel, pero nunca lo bloqueado.
    const conPapel = armarCeldas(d, AHORA, true).map((c) => `${c.empleado_id} ${c.fecha}`)
    assert.ok(conPapel.includes('raquel 2026-10-30'))
    assert.ok(!conPapel.includes('raquel 2026-10-29'))
  })

  test('un mes cerrado no se toca', () => {
    assert.deepEqual(armarCeldas(datos({ cerrados: ['2026-10-01'] }), AHORA), [])
  })
})

describe('rango de cada pasada', () => {
  test('la jornada de hoy, la anterior y los 3 días de antes', () => {
    assert.deepEqual(rangoPorDefecto(ms('2026-11-02 07:20')), { desde: '2026-10-29', hasta: '2026-11-02' })
  })

  test('antes de las 07:00 todavía corre la jornada de ayer', () => {
    assert.deepEqual(rangoPorDefecto(ms('2026-11-02 05:20')), { desde: '2026-10-28', hasta: '2026-11-01' })
  })

  test('fechas entre dos días, pasando de mes', () => {
    assert.deepEqual(fechasEntre('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })
})
