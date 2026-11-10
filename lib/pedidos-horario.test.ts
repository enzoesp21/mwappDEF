// Pruebas de los pedidos de cambio de horario (lib/pedidos-horario.ts): el
// plazo del miércoles a las 22, los textos, lo que se revisa antes de mandar y
// las marcas del editor.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { DatosHorario } from '@/lib/horarios'
import {
  leerPedido,
  marcasDelEditor,
  plazoDe,
  semanaAbierta,
  semanasParaPedir,
  textoDias,
  textoPedido,
  textoPlazo,
  validarPedido,
  type PedidoConNombre,
} from '@/lib/pedidos-horario'

describe('el plazo: hasta el miércoles anterior a las 22', () => {
  test('el miércoles 4/11 a las 21:59 todavía se puede pedir para la semana del 9/11', () => {
    assert.equal(plazoDe('2026-11-09'), '2026-11-04')
    assert.equal(semanaAbierta('2026-11-09', '2026-11-04T21:59'), true)
    assert.deepEqual(semanasParaPedir('2026-11-04T21:59', 3), ['2026-11-09', '2026-11-16', '2026-11-23'])
  })

  test('a las 22:00 en punto ya cerró', () => {
    assert.equal(semanaAbierta('2026-11-09', '2026-11-04T22:00'), false)
    assert.equal(semanasParaPedir('2026-11-04T22:00', 1)[0], '2026-11-16')
  })

  test('desde el jueves, la primera abierta es la de dos semanas después', () => {
    assert.equal(semanaAbierta('2026-11-09', '2026-11-05T08:00'), false)
    assert.equal(semanasParaPedir('2026-11-05T08:00', 1)[0], '2026-11-16')
    assert.equal(semanasParaPedir('2026-11-08T12:00', 1)[0], '2026-11-16') // domingo
    assert.equal(semanasParaPedir('2026-11-09T12:00', 1)[0], '2026-11-16') // lunes
  })

  test('con solo la fecha, cuenta como el principio del día', () => {
    assert.equal(semanaAbierta('2026-11-09', '2026-11-04'), true)
    assert.equal(semanaAbierta('2026-11-09', '2026-11-05'), false)
  })

  test('la semana en curso nunca está abierta', () => {
    assert.equal(semanaAbierta('2026-11-02', '2026-10-28T21:00'), true) // hasta el miércoles anterior
    assert.equal(semanaAbierta('2026-11-02', '2026-11-03T10:00'), false)
  })
})

describe('los textos', () => {
  test('los días, en orden y como se dicen', () => {
    assert.equal(textoDias(['2026-11-09']), 'lun 9/11')
    assert.equal(textoDias(['2026-11-10', '2026-11-09']), 'lun 9/11 y mar 10/11')
    assert.equal(textoDias(['2026-11-09', '2026-11-11', '2026-11-10']), 'lun 9/11, mar 10/11 y mié 11/11')
  })

  test('el plazo de una semana', () => {
    assert.equal(textoPlazo('2026-11-09'), 'miércoles 4/11 a las 22')
    assert.equal(textoPlazo('2026-12-07'), 'miércoles 2/12 a las 22')
  })

  test('qué pide, para la persona y para el encargado', () => {
    assert.equal(textoPedido({ tipo: 'no_puedo', desde: null, hasta: null }, 'yo'), 'No puedo venir')
    assert.equal(textoPedido({ tipo: 'no_puedo', desde: null, hasta: null }), 'No puede venir')
    assert.equal(textoPedido({ tipo: 'solo_franja', desde: '14:00', hasta: '23:30' }), 'Puede solo de 14:00 a 23:30')
    assert.equal(textoPedido({ tipo: 'no_franja', desde: '08:00', hasta: '12:00' }, 'yo'), 'No puedo de 08:00 a 12:00')
    assert.equal(textoPedido({ tipo: 'otro', desde: null, hasta: null }), 'Otro cambio')
  })
})

describe('lo que se revisa antes de mandar', () => {
  const bien = { fechas: ['2026-11-10'], tipo: 'no_puedo' as const, desde: null, hasta: null, motivo: 'Turno médico' }
  const hoy = '2026-11-04T20:00'

  test('un pedido completo y en plazo pasa', () => {
    assert.equal(validarPedido(bien, hoy), null)
    assert.equal(validarPedido({ ...bien, tipo: 'solo_franja', desde: '14:00', hasta: '23:00' }, hoy), null)
  })

  test('lo que falta o está mal', () => {
    assert.equal(validarPedido({ ...bien, fechas: [] }, hoy), 'Elegí al menos un día.')
    assert.equal(validarPedido({ ...bien, fechas: ['2026-11-15', '2026-11-16'] }, hoy), 'Los días tienen que ser de la misma semana.')
    assert.equal(validarPedido({ ...bien, tipo: 'no_franja' }, hoy), 'Poné desde qué hora y hasta qué hora.')
    assert.equal(
      validarPedido({ ...bien, tipo: 'no_franja', desde: '10:00', hasta: '10:00' }, hoy),
      'La hora de inicio y la de fin no pueden ser iguales.'
    )
    assert.equal(validarPedido({ ...bien, motivo: '  ' }, hoy), 'Contá el motivo.')
    assert.equal(validarPedido({ ...bien, motivo: 'x'.repeat(501) }, hoy), 'El motivo es muy largo: hasta 500 letras.')
  })

  test('pasado el miércoles a las 22, cerrado', () => {
    assert.equal(
      validarPedido(bien, '2026-11-04T22:05'),
      'Para la semana del 9 al 15 de noviembre ya cerró el plazo: era hasta el miércoles 4/11 a las 22.'
    )
  })
})

describe('lo que llega de la base', () => {
  test('una fila buena y las que no sirven', () => {
    const fila = {
      id: 'p1',
      user_id: 'u1',
      semana: '2026-11-09',
      fechas: ['2026-11-11', '2026-11-10'],
      tipo: 'solo_franja',
      desde: '14:00:00',
      hasta: '23:30:00',
      motivo: 'Cursada a la mañana',
      estado: 'pendiente',
      respuesta: null,
      respondido_en: null,
      created_at: '2026-11-05T22:10:00+00:00',
    }
    assert.deepEqual(leerPedido(fila), {
      id: 'p1',
      userId: 'u1',
      semana: '2026-11-09',
      fechas: ['2026-11-10', '2026-11-11'],
      tipo: 'solo_franja',
      desde: '14:00',
      hasta: '23:30',
      motivo: 'Cursada a la mañana',
      estado: 'pendiente',
      respuesta: null,
      respondidoEn: null,
      creado: '2026-11-05T22:10:00+00:00',
    })
    assert.equal(leerPedido({ ...fila, tipo: 'cualquiera' }), null)
    assert.equal(leerPedido({ ...fila, fechas: [] }), null)
    assert.equal(leerPedido({ ...fila, estado: 'raro' }), null)
  })
})

describe('las marcas del editor', () => {
  const datos: DatosHorario = {
    sectores: [
      {
        nombre: 'CAMAREROS',
        personas: [
          { nombre: 'Lucia Leiva', dias: ['', '', '', '', '', '', '', ''] },
          { nombre: 'Lucas Lopez', dias: ['', '', '', '', '', '', '', ''] },
        ],
      },
      { nombre: 'CAJA', personas: [{ nombre: 'Lucia Leiva ', dias: ['', '', '', '', '', '', '', ''] }] },
    ],
    diasExtra: 1,
  }
  const pedido = (p: Partial<PedidoConNombre> & { id: string; nombre: string; fechas: string[] }): PedidoConNombre => ({
    userId: 'u-' + p.id,
    semana: '2026-11-09',
    tipo: 'no_puedo',
    desde: null,
    hasta: null,
    motivo: 'Turno médico',
    estado: 'pendiente',
    respuesta: null,
    respondidoEn: null,
    creado: '',
    puesto: 'Mozos',
    ...p,
  })
  const usuarios = ['Lucia Leiva', 'Lucas Uriel López Saaied', 'Nadie En Horarios']
  const { marcas, sinFila } = marcasDelEditor(
    datos,
    '2026-11-09',
    [
      pedido({ id: 'a', nombre: 'Lucia Leiva', fechas: ['2026-11-10'], estado: 'aprobado' }),
      pedido({ id: 'b', nombre: 'Lucia Leiva', fechas: ['2026-11-10', '2026-11-12'] }),
      pedido({ id: 'c', nombre: 'Lucas Uriel López Saaied', fechas: ['2026-11-11'], estado: 'rechazado' }),
      pedido({ id: 'd', nombre: 'Nadie En Horarios', fechas: ['2026-11-11'] }),
      // El lunes siguiente, que esta semana se sumó como día extra.
      pedido({ id: 'e', nombre: 'Lucas Uriel López Saaied', semana: '2026-11-16', fechas: ['2026-11-16'], tipo: 'solo_franja', desde: '14:00', hasta: '23:00' }),
    ],
    usuarios
  )

  test('en cada fila de esa persona (está en dos sectores) y cada día; gana el aprobado', () => {
    assert.deepEqual(Object.keys(marcas).sort(), ['lucas lopez', 'lucia leiva'])
    assert.equal(marcas['lucia leiva'][1].estado, 'aprobado')
    assert.equal(marcas['lucia leiva'][3].estado, 'pendiente')
    assert.equal(marcas['lucia leiva'][1].aviso, 'Lucia Leiva: no puede venir (aprobado) · Turno médico')
  })

  test('el no aprobado no se marca; el día extra sí', () => {
    assert.equal(marcas['lucas lopez'][2], undefined)
    assert.equal(marcas['lucas lopez'][7].aviso, 'Lucas Uriel López Saaied: puede solo de 14:00 a 23:00 (sin responder) · Turno médico')
  })

  test('quien no está en el horario queda avisado', () => {
    assert.deepEqual(sinFila, ['d'])
  })
})
