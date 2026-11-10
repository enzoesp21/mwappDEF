// Pruebas de la cuenta de la propina de los mozos (lib/propinas.ts), sobre
// todo el grupo al 25 % que pidió Enzo el 03/11.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { vincularSueltas, GRUPOS, calcularReparto, textoReporte, validarCarga, type PersonaPropina } from '@/lib/propinas'

const persona = (nombre: string, grupo: PersonaPropina['grupo'], horas: number): PersonaPropina => ({
  nombre,
  grupo,
  horas,
  pago: null,
  efectivo: null,
})

describe('el grupo al 25 %', () => {
  test('está entre los grupos, después del 50 %', () => {
    assert.deepEqual(
      GRUPOS.map((g) => [g.valor, g.corta, g.factor]),
      [
        ['camarero', '100 %', 1],
        ['reducido', '75 %', 0.75],
        ['prueba', '50 %', 0.5],
        ['cuarto', '25 %', 0.25],
      ]
    )
  })

  test('cobra la cuarta parte de la hora', () => {
    // Salón 90.000. Horas: 8 + 8 × 0,5 + 8 × 0,25 = 14, a $ 6.428,57 la hora.
    const r = calcularReparto(100_000, 10_000, [
      persona('Lucas Ibarra', 'camarero', 8),
      persona('Abril Castro', 'prueba', 8),
      persona('Alguien Nuevo', 'cuarto', 8),
    ])
    assert.equal(r.salon, 90_000)
    assert.equal(r.horasEquivalentes, 14)
    assert.deepEqual(r.montos, [51_429, 25_714, 12_857])
  })

  test('el reporte de WhatsApp lo pone en su bloque, al final', () => {
    const texto = textoReporte('2026-11-02', 100_000, 10_000, [
      persona('Alguien Nuevo', 'cuarto', 8),
      persona('Lucas Ibarra', 'camarero', 8),
    ])
    const camareros = texto.indexOf('*Camareros*')
    const alCuarto = texto.indexOf('*Al 25%*')
    assert.ok(camareros > 0 && alCuarto > camareros)
    assert.match(texto, /\*Alguien Nuevo\* › \$\s?18\.000 _\(8h\)_/)
  })

  test('se puede guardar', () => {
    assert.equal(validarCarga('2026-11-02', 100_000, 10_000, [persona('Alguien Nuevo', 'cuarto', 8)]), null)
  })
})

describe('propinas sueltas de quien se registró después', () => {
  const usuarios = [
    { id: 'u-brisa', full_name: 'Brisa Di Scala' },
    { id: 'u-lucia', full_name: 'Lucia Leiva ' },
    { id: 'u-belen', full_name: 'Belen Gallegos' },
  ]

  test('se vinculan los nombres completos, como al guardar', () => {
    const r = vincularSueltas(
      [
        { id: 't1', day_id: 'd31', nombre: 'Brisa Di Scala' },
        { id: 't2', day_id: 'd01', nombre: 'Brisa Di Scala' },
        { id: 't3', day_id: 'd31', nombre: 'Lucia Leiva' },
      ],
      [],
      usuarios
    )
    assert.deepEqual(r.get('u-brisa'), ['t1', 't2'])
    assert.deepEqual(r.get('u-lucia'), ['t3'])
  })

  test('un nombre solo o que no es de nadie no se vincula', () => {
    const r = vincularSueltas(
      [
        { id: 't1', day_id: 'd31', nombre: 'Belen' },
        { id: 't2', day_id: 'd31', nombre: 'Gabriel Cansino' },
      ],
      [],
      usuarios
    )
    assert.equal(r.size, 0)
  })

  test('nunca le deja a alguien dos filas el mismo día', () => {
    const r = vincularSueltas(
      [
        { id: 't1', day_id: 'd31', nombre: 'Brisa Di Scala' },
        { id: 't2', day_id: 'd01', nombre: 'Brisa Di Scala' },
      ],
      [{ day_id: 'd31', user_id: 'u-brisa' }],
      usuarios
    )
    assert.deepEqual(r.get('u-brisa'), ['t2'])
  })
})
