// Pruebas de quién está adentro en Fichadas (lib/fichadas.ts): entrada o
// salida se deduce por el orden de las fichadas y la tecla solo desempata.
// Los casos son de verdad (los que se miraron en octubre y Miguel Sachett el
// 03/11).

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cerradaAMano, leerFichadas, presentes, type CierreAMano, type Fichada } from '@/lib/fichadas'

const ENTRADA = 0
const SALIDA = 1

let logid = 0
/** Una fichada a una hora de Argentina ("2026-11-03 07:55"). */
function fichada(userid: string, hora: string, tipo: number): Fichada {
  return { logid: ++logid, userid, fecha_hora: new Date(hora.replace(' ', 'T') + ':00-03:00').toISOString(), tipo, dispositivo: 5 }
}
const sentidos = (fichadas: Fichada[], inicios?: string[]) => leerFichadas(fichadas, inicios).map((f) => f.sentido)
/** Desde dónde se piden las fichadas en noviembre: el 01/11 a las 04:00, menos 48 h. */
const DESDE_NOVIEMBRE = ['2026-10-30T07:00:00.000Z']

describe('Miguel Sachett, 03/11', () => {
  // Hacía días que no venía. Fichó al llegar con la tecla Salida y al irse con
  // la de Entrada. En Del día figuraba bien y en Ahora, adentro.
  const miguel = [fichada('606', '2026-11-03 07:55', SALIDA), fichada('606', '2026-11-03 16:34', ENTRADA)]

  test('entró a las 07:55 y salió a las 16:34', () => {
    assert.deepEqual(sentidos(miguel, DESDE_NOVIEMBRE), ['entrada', 'salida'])
  })

  test('a las 17:40 ya no figura adentro', () => {
    const leidas = leerFichadas(miguel, DESDE_NOVIEMBRE)
    assert.deepEqual(presentes(leidas, new Map(), Date.parse('2026-11-03T20:40:00Z')), [])
  })

  test('sin saber desde cuándo se pidió, se lee como antes', () => {
    assert.deepEqual(sentidos(miguel), ['salida', 'entrada'])
  })
})

describe('los casos de octubre siguen igual', () => {
  test('los que entran y salen con la tecla Entrada', () => {
    const f = [fichada('1', '2026-11-02 08:01', ENTRADA), fichada('1', '2026-11-02 16:30', ENTRADA)]
    assert.deepEqual(sentidos(f, DESDE_NOVIEMBRE), ['entrada', 'salida'])
  })

  test('turno doble, de 8:44 a 23:07', () => {
    const f = [fichada('2', '2026-11-02 08:44', ENTRADA), fichada('2', '2026-11-02 23:07', SALIDA)]
    assert.deepEqual(sentidos(f, DESDE_NOVIEMBRE), ['entrada', 'salida'])
  })

  test('cierre pasada la medianoche', () => {
    const f = [fichada('3', '2026-11-01 16:02', ENTRADA), fichada('3', '2026-11-02 00:41', ENTRADA)]
    assert.deepEqual(sentidos(f, DESDE_NOVIEMBRE), ['entrada', 'salida'])
  })

  test('la limpieza, que entra a las 4', () => {
    const f = [
      fichada('4', '2026-11-01 04:46', ENTRADA),
      fichada('4', '2026-11-01 14:56', SALIDA),
      fichada('4', '2026-11-02 04:20', SALIDA),
      fichada('4', '2026-11-02 13:10', SALIDA),
    ]
    assert.deepEqual(sentidos(f, DESDE_NOVIEMBRE), ['entrada', 'salida', 'entrada', 'salida'])
  })

  test('con días antes, el orden corrige las teclas al revés', () => {
    const f = [
      fichada('5', '2026-11-02 08:00', ENTRADA),
      fichada('5', '2026-11-02 16:30', SALIDA),
      fichada('5', '2026-11-03 07:55', SALIDA),
      fichada('5', '2026-11-03 16:34', ENTRADA),
    ]
    assert.deepEqual(sentidos(f, DESDE_NOVIEMBRE), ['entrada', 'salida', 'entrada', 'salida'])
  })

  test('el que fichó una sola vez al llegar, con la tecla Salida, está adentro', () => {
    const f = [fichada('6', '2026-11-03 10:02', SALIDA)]
    assert.deepEqual(sentidos(f, DESDE_NOVIEMBRE), ['entrada'])
  })
})

describe('Fernández Ornella, 03/11: la salida puesta a mano', () => {
  // Entró 11:18 y se olvidó de fichar la salida. Enzo le puso las horas en la
  // planilla a las 16:21 y en Ahora seguía figurando adentro.
  const ornella = [
    fichada('230', '2026-11-01 07:40', ENTRADA),
    fichada('230', '2026-11-01 14:12', SALIDA),
    fichada('230', '2026-11-03 11:18', ENTRADA),
  ]
  const leidas = leerFichadas(ornella, DESDE_NOVIEMBRE)
  const a1740 = Date.parse('2026-11-03T20:40:00Z')
  const cierre: CierreAMano = { userid: '230', fecha: '2026-11-03', cuando: '2026-11-03T19:21:08.003Z' }
  const quienes = (cierres: CierreAMano[], ahora = a1740) => presentes(leidas, new Map(), ahora, cierres).map((p) => p.userid)

  test('sin lo de la planilla, figura adentro', () => {
    assert.deepEqual(quienes([]), ['230'])
  })

  test('con el día resuelto a mano después de que entró, ya no', () => {
    assert.deepEqual(quienes([cierre]), [])
    assert.equal(cerradaAMano(leidas[2], [cierre]), true)
  })

  test('si entró después de que se tocó la planilla, cuenta la entrada', () => {
    // Se corrigió a las 09:00 y ella entró a las 11:18: está adentro.
    assert.deepEqual(quienes([{ ...cierre, cuando: '2026-11-03T12:00:00Z' }]), ['230'])
  })

  test('lo que se corrigió de otro día o de otra persona no la saca', () => {
    assert.deepEqual(quienes([{ ...cierre, fecha: '2026-11-01' }]), ['230'])
    assert.deepEqual(quienes([{ ...cierre, userid: '231' }]), ['230'])
  })

  test('el que cierra pasada la medianoche: vale el día de la planilla', () => {
    // Entró el 03/11 a las 16:00 y no fichó la salida; la planilla lo pone el 03/11.
    const noche = leerFichadas([fichada('9', '2026-11-03 16:00', ENTRADA)], DESDE_NOVIEMBRE)
    const resuelto: CierreAMano = { userid: '9', fecha: '2026-11-03', cuando: '2026-11-04T13:00:00Z' }
    assert.deepEqual(presentes(noche, new Map(), Date.parse('2026-11-04T13:30:00Z'), [resuelto]), [])
  })
})

describe('lo primero de lo pedido', () => {
  test('una salida poco después del principio puede cerrar un turno que empezó antes', () => {
    // Se pidió desde el 30/10 a las 04:00: la entrada de las 22:00 del 29/10 no está.
    const f = [
      fichada('7', '2026-10-30 06:30', SALIDA),
      fichada('7', '2026-10-30 15:00', ENTRADA),
      fichada('7', '2026-10-30 23:00', SALIDA),
    ]
    assert.deepEqual(sentidos(f, DESDE_NOVIEMBRE), ['salida', 'entrada', 'salida'])
  })

  test('con un corte en lo pedido (otro mes y las de ahora), se vuelve a empezar', () => {
    // Lo de octubre termina el 01/11 y lo de ahora arranca el 04/11 a las 04:00:
    // la salida de las 07:00 cierra un turno que entró en el corte.
    const inicios = ['2026-09-29T07:00:00.000Z', '2026-11-04T07:00:00.000Z']
    const f = [
      fichada('8', '2026-10-31 11:00', ENTRADA),
      fichada('8', '2026-10-31 20:00', SALIDA),
      fichada('8', '2026-11-04 07:00', SALIDA),
      fichada('8', '2026-11-04 15:00', ENTRADA),
    ]
    assert.deepEqual(sentidos(f, inicios), ['entrada', 'salida', 'salida', 'entrada'])
  })
})

describe('Bruno Molina y Brisa Di Scala, 11/11 a la 01:15 (en Ahora figuraban adentro)', () => {
  // Lo que pide Ahora: las últimas 48 h.
  const AHORA = Date.parse('2026-11-11T04:15:00Z') // 01:15 en Argentina
  const DESDE = [new Date(AHORA - 48 * 3600 * 1000).toISOString()]

  // El martes hubo cena: entra a las 9 y pico y se va a la 1. El 9/11 fueron 16 h 06.
  const bruno = [
    fichada('240', '2026-11-09 09:14', ENTRADA),
    fichada('240', '2026-11-10 01:20', SALIDA),
    fichada('240', '2026-11-10 09:30', ENTRADA),
    fichada('240', '2026-11-11 01:12', SALIDA),
  ]
  // El 9/11 no fichó la entrada (solo la salida de las 23:34).
  const brisa = [
    fichada('335', '2026-11-09 23:34', SALIDA),
    fichada('335', '2026-11-10 09:05', ENTRADA),
    fichada('335', '2026-11-10 16:59', SALIDA),
  ]

  test('un turno de 16 h 06 es largo pero existe: las teclas de Bruno valen', () => {
    assert.deepEqual(sentidos(bruno, DESDE), ['entrada', 'salida', 'entrada', 'salida'])
  })

  test('olvidarse una entrada es más probable que errarle tres veces a la tecla', () => {
    assert.deepEqual(sentidos(brisa, DESDE), ['salida', 'entrada', 'salida'])
  })

  test('a la 01:15 no queda nadie adentro', () => {
    assert.deepEqual(presentes(leerFichadas([...bruno, ...brisa], DESDE), new Map(), AHORA), [])
  })
})
