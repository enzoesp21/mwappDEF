// Pruebas de la propina del resto del personal (lib/propina-general.ts):
// quién va en Salón y en Cocina, el 60/40 y que no se pierda ni sobre un peso.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  fechasDeQuincena,
  grupoDeCargo,
  grupoDeSector,
  quincenaPorDefecto,
  repartirPozo,
  repartirPropinaGeneral,
  sectorDeLaQuincena,
  ubicar,
} from '@/lib/propina-general'

describe('quién va en cada parte', () => {
  test('por sector de Horarios, como lo dijo Enzo', () => {
    assert.equal(grupoDeSector('COCINA'), 'cocina')
    assert.equal(grupoDeSector('ENSALADA'), 'cocina')
    assert.equal(grupoDeSector('CALIENTA PLATOS'), 'cocina')
    assert.equal(grupoDeSector('PASTELERÍA'), 'cocina') // no la nombró: queda en Cocina
    assert.equal(grupoDeSector('CAJA'), 'salon')
    assert.equal(grupoDeSector('RECEPCIÓN'), 'salon')
    assert.equal(grupoDeSector('BARRA'), 'salon')
    assert.equal(grupoDeSector('MAESTRANZA'), 'salon') // la bacha
    assert.equal(grupoDeSector('COMISS / RUNNERS'), 'salon')
    assert.equal(grupoDeSector('CAMAREROS '), 'camarero')
    assert.equal(grupoDeSector('OTRO LUGAR'), null)
  })

  test('por cargo, para quien no está en Horarios', () => {
    assert.equal(grupoDeCargo('LIMPIEZA'), 'salon') // Zulma
    assert.equal(grupoDeCargo('ENCARGADO'), 'afuera') // Facundo Núñez
    assert.equal(grupoDeCargo('ADMINISTRATIVA'), 'afuera') // Romina
    assert.equal(grupoDeCargo('ADMINISTRATIVO'), 'afuera') // Germán
    assert.equal(grupoDeCargo('MOZO'), 'camarero') // Enzo
    assert.equal(grupoDeCargo('MOZO DE MOSTRADOR'), 'salon') // barra, no camarero
    assert.equal(grupoDeCargo('COMIS DE COCINA'), 'cocina')
    assert.equal(grupoDeCargo('JEFE DE PARTIDA O COCINER'), 'cocina')
    assert.equal(grupoDeCargo('AYUDANTE DE PASTELERIA'), 'cocina')
    assert.equal(grupoDeCargo('CAJERA'), 'salon')
    assert.equal(grupoDeCargo('PEON GENERAL'), 'salon')
    assert.equal(grupoDeCargo(null), null)
  })

  test('lo fijado a mano manda; después Horarios; después el cargo; si no, sin sector', () => {
    assert.deepEqual(ubicar({ manual: 'cocina', sector: 'BARRA', cargo: 'CAJERA' }), { ubicacion: 'cocina', por: 'a mano' })
    assert.deepEqual(ubicar({ manual: null, sector: 'CAMAREROS', cargo: 'PEON GENERAL' }), { ubicacion: 'camarero', por: 'Horarios' })
    assert.deepEqual(ubicar({ manual: null, sector: null, cargo: 'LIMPIEZA' }), { ubicacion: 'salon', por: 'cargo' })
    assert.deepEqual(ubicar({ manual: null, sector: null, cargo: null }), { ubicacion: 'sin_sector', por: null })
    // Recién llegados sin sector ni cargo: el puesto de su usuario (Giuliana es de Mozos).
    assert.deepEqual(ubicar({ manual: null, sector: null, cargo: null, puesto: 'Mozos' }), { ubicacion: 'camarero', por: 'puesto' })
    assert.deepEqual(ubicar({ manual: null, sector: null, cargo: null, puesto: 'Caja' }), { ubicacion: 'salon', por: 'puesto' })
  })

  test('el sector de la quincena: donde más turnos tuvo esos días', () => {
    const semanas = [
      {
        week_start: '2026-10-12',
        sectores: [
          // Lunes 12 a domingo 18: en Ensalada 4 turnos dentro de la 1.ª quincena (12 al 15).
          { nombre: 'ENSALADA', personas: [{ nombre: 'Gabriel Gimenez', dias: ['8 A 16', '8 A 16', '8 A 16', '8 A 16', 'X', 'X', 'X'] }] },
          { nombre: 'MAESTRANZA', personas: [{ nombre: 'Gabriel  Giménez ', dias: ['', '', '', '', '8 A 16', '8 A 16', '8 A 16'] }] },
        ],
      },
    ]
    assert.equal(sectorDeLaQuincena(['Gabriel Gimenez'], semanas, '2026-10-01', '2026-10-15'), 'ENSALADA')
    assert.equal(sectorDeLaQuincena(['Gabriel Gimenez'], semanas, '2026-10-16', '2026-10-31'), 'MAESTRANZA')
    // Figura pero sin turnos esos días: el primer sector donde figura.
    assert.equal(sectorDeLaQuincena(['Gabriel Gimenez'], semanas, '2026-10-01', '2026-10-11'), 'ENSALADA')
    assert.equal(sectorDeLaQuincena([], semanas, '2026-10-01', '2026-10-15'), null)
    assert.equal(sectorDeLaQuincena(['Nadie'], semanas, '2026-10-01', '2026-10-15'), null)
  })
})

describe('el reparto', () => {
  test('60 % Salón y 40 % Cocina, cada parte según las horas', () => {
    const r = repartirPropinaGeneral(1_000_000, [
      { id: 'caja', horas: 80, ubicacion: 'salon' },
      { id: 'barra', horas: 120, ubicacion: 'salon' },
      { id: 'cocina', horas: 100, ubicacion: 'cocina' },
      { id: 'ensalada', horas: 60, ubicacion: 'cocina' },
      { id: 'mozo', horas: 150, ubicacion: 'camarero' },
      { id: 'encargado', horas: 150, ubicacion: 'afuera' },
      { id: 'nuevo', horas: 40, ubicacion: 'sin_sector' },
    ])
    assert.equal(r.salon.pozo, 600_000)
    assert.equal(r.cocina.pozo, 400_000)
    assert.equal(r.salon.horas, 200)
    assert.equal(r.salon.porHora, 3000)
    assert.deepEqual(Object.fromEntries(r.salon.montos), { caja: 240_000, barra: 360_000 })
    assert.deepEqual(Object.fromEntries(r.cocina.montos), { cocina: 250_000, ensalada: 150_000 })
  })

  test('no se pierde ni sobra un peso por el redondeo', () => {
    const montos = repartirPozo(100_001, [
      { id: 'a', horas: 33.5 },
      { id: 'b', horas: 33.5 },
      { id: 'c', horas: 33 },
      { id: 'd', horas: 0 },
    ])
    const suma = Array.from(montos.values()).reduce((s, m) => s + m, 0)
    assert.equal(suma, 100_001)
    assert.equal(montos.has('d'), false)
    // Un monto impar entre 60 y 40: la suma de las dos partes da el total.
    const r = repartirPropinaGeneral(333_333, [{ id: 'x', horas: 10, ubicacion: 'salon' }, { id: 'y', horas: 10, ubicacion: 'cocina' }])
    assert.equal(r.salon.pozo + r.cocina.pozo, 333_333)
  })

  test('una parte sin nadie con horas no reparte', () => {
    const r = repartirPropinaGeneral(500_000, [{ id: 'x', horas: 10, ubicacion: 'salon' }])
    assert.equal(r.cocina.horas, 0)
    assert.equal(r.cocina.montos.size, 0)
    assert.equal(r.cocina.porHora, 0)
  })
})

describe('las quincenas', () => {
  test('fechas de cada quincena', () => {
    assert.deepEqual(fechasDeQuincena('2026-10', 1, 31), { desde: '2026-10-01', hasta: '2026-10-15' })
    assert.deepEqual(fechasDeQuincena('2026-11', 2, 30), { desde: '2026-11-16', hasta: '2026-11-30' })
  })

  test('se abre en la última quincena que terminó', () => {
    assert.deepEqual(quincenaPorDefecto('2026-11-02'), { mes: '2026-10', q: 2 })
    assert.deepEqual(quincenaPorDefecto('2026-11-16'), { mes: '2026-11', q: 1 })
    assert.deepEqual(quincenaPorDefecto('2027-01-05'), { mes: '2026-12', q: 2 })
  })
})
