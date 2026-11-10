// Pruebas de las capacitaciones para todo el personal (lib/capacitaciones.ts):
// qué intento cuenta, cuándo sale de Inicio según lo que contestó a
// "¿Participaste de la charla?" y la fecha en hora de Argentina.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  armarCapacitaciones,
  fechaHoraAR,
  mejorIntento,
  vaEnInicio,
  vaEnPerfil,
  type FilaRespuesta,
  type FilaResultadoCapacitacion,
} from '@/lib/capacitaciones'

const CHARLA = { id: 'g-art', title: 'Charla de Seguridad e Higiene (ART)', created_at: '2026-11-06T15:00:00Z' }
const EXAMEN = { id: 'e-art', guide_id: 'g-art', passing_score: 90 }

// Lo que contestó a "¿Participaste de la charla?".
const SI: FilaRespuesta = { guide_id: 'g-art', created_at: '2026-11-06T21:20:00Z', participo: true }
const NO: FilaRespuesta = { guide_id: 'g-art', created_at: '2026-11-06T21:20:00Z', participo: false }

function resultado(
  id: string,
  score: number,
  passed: boolean,
  completed_at: string,
  extra: Partial<FilaResultadoCapacitacion> = {}
): FilaResultadoCapacitacion {
  return { id, exam_id: 'e-art', score, passed, completed_at, review_status: 'graded', ...extra }
}

function una(resultados: FilaResultadoCapacitacion[], respuesta: FilaRespuesta | null = null) {
  const [c] = armarCapacitaciones({
    guias: [CHARLA],
    examenes: [EXAMEN],
    resultados,
    respuestas: respuesta ? [respuesta] : [],
  })
  return c
}

describe('el intento que cuenta', () => {
  test('el aprobado gana aunque haya uno desaprobado con más nota', () => {
    const m = mejorIntento([
      { score: 80, passed: false, fecha: '2026-11-06T18:00:00Z' },
      { score: 90, passed: true, fecha: '2026-11-06T19:00:00Z' },
    ])
    assert.equal(m?.score, 90)
  })

  test('entre dos aprobados, la nota más alta; si empatan, el primero', () => {
    assert.equal(
      mejorIntento([
        { score: 90, passed: true, fecha: '2026-11-06T18:00:00Z' },
        { score: 100, passed: true, fecha: '2026-11-07T18:00:00Z' },
      ])?.score,
      100
    )
    assert.equal(
      mejorIntento([
        { score: 100, passed: true, fecha: '2026-11-07T18:00:00Z' },
        { score: 100, passed: true, fecha: '2026-11-06T18:00:00Z' },
      ])?.fecha,
      '2026-11-06T18:00:00Z'
    )
  })

  test('sin intentos no hay ninguno', () => {
    assert.equal(mejorIntento([]), null)
  })
})

describe('cuándo sale de Inicio', () => {
  test('recién entra: no contestó nada y queda en Inicio', () => {
    const c = una([])
    assert.equal(c.participo, null)
    assert.equal(c.respondioEn, null)
    assert.equal(c.aprobado, null)
    assert.equal(c.aprobarCon, 90)
    assert.equal(c.completa, false)
  })

  test('dijo que SÍ pero todavía no rindió: sigue en Inicio', () => {
    const c = una([], SI)
    assert.equal(c.participo, true)
    assert.equal(c.respondioEn, '2026-11-06T21:20:00Z')
    assert.equal(c.completa, false)
  })

  test('dijo que NO: no rinde y sale de Inicio', () => {
    const c = una([], NO)
    assert.equal(c.participo, false)
    assert.equal(c.completa, true)
  })

  test('dijo que SÍ y desaprobó: muestra el último intento y sigue en Inicio', () => {
    const c = una(
      [resultado('r1', 70, false, '2026-11-06T21:25:00Z'), resultado('r2', 80, false, '2026-11-06T21:40:00Z')],
      SI
    )
    assert.equal(c.aprobado, null)
    assert.equal(c.ultimo?.id, 'r2')
    assert.equal(c.ultimo?.score, 80)
    assert.equal(c.completa, false)
  })

  test('dijo que SÍ y aprobó: sale de Inicio y queda el aprobado, con la firma', () => {
    const c = una(
      [
        resultado('r1', 80, false, '2026-11-06T21:25:00Z'),
        resultado('r2', 100, true, '2026-11-06T21:40:00Z', { signature_data: 'data:image/png;base64,xx' }),
      ],
      SI
    )
    assert.equal(c.aprobado?.id, 'r2')
    assert.equal(c.aprobado?.firma, 'data:image/png;base64,xx')
    assert.equal(c.completa, true)
  })

  test('aprobó sin contestar (por el camino viejo): todavía le falta contestar', () => {
    const c = una([resultado('r1', 100, true, '2026-11-06T21:25:00Z')])
    assert.equal(c.aprobado?.id, 'r1')
    assert.equal(c.completa, false)
  })

  test('los que se anotaron antes de la pregunta cuentan como que SÍ participaron', () => {
    const c = una([], { guide_id: 'g-art', created_at: '2026-11-06T21:20:00Z' })
    assert.equal(c.participo, true)
  })

  test('con respuestas escritas sin corregir: esperando corrección', () => {
    const c = una([resultado('r1', 0, false, '2026-11-06T21:25:00Z', { review_status: 'pending_review' })], SI)
    assert.equal(c.esperandoCorreccion, true)
    assert.equal(c.completa, false)
  })

  test('los resultados de otros exámenes no cuentan', () => {
    const c = una([{ ...resultado('r1', 100, true, '2026-11-06T21:25:00Z'), exam_id: 'otro' }], SI)
    assert.equal(c.aprobado, null)
    assert.equal(c.ultimo, null)
  })

  test('una charla sin examen se completa con decir que SÍ', () => {
    const [c] = armarCapacitaciones({ guias: [CHARLA], examenes: [], resultados: [], respuestas: [SI] })
    assert.equal(c.examenId, null)
    assert.equal(c.aprobarCon, null)
    assert.equal(c.completa, true)
  })

  test('las más nuevas primero', () => {
    const lista = armarCapacitaciones({
      guias: [CHARLA, { id: 'g-nueva', title: 'Otra charla', created_at: '2026-12-01T15:00:00Z' }],
      examenes: [EXAMEN],
      resultados: [],
      respuestas: [],
    })
    assert.deepEqual(
      lista.map((c) => c.id),
      ['g-nueva', 'g-art']
    )
  })
})

describe('la fecha, en hora de Argentina', () => {
  test('21:20 UTC son las 18:20 en Mar del Plata', () => {
    assert.equal(fechaHoraAR('2026-11-06T21:20:00Z'), '06/11 a las 18:20')
  })

  test('pasada la medianoche UTC sigue siendo el día anterior acá', () => {
    assert.equal(fechaHoraAR('2026-11-07T01:05:00+00:00'), '06/11 a las 22:05')
  })

  test('una fecha rota no rompe la pantalla', () => {
    assert.equal(fechaHoraAR('cualquier cosa'), '')
  })
})

describe('cuando la charla ya pasó (cerrada)', () => {
  const cerrada = (resultados: FilaResultadoCapacitacion[], respuesta: FilaRespuesta | null = null) => {
    const [c] = armarCapacitaciones({
      guias: [{ ...CHARLA, capacitacion_cerrada: true }],
      examenes: [EXAMEN],
      resultados,
      respuestas: respuesta ? [respuesta] : [],
    })
    return c
  }

  test('no va más en Inicio, aunque le falte', () => {
    const c = cerrada([])
    assert.equal(c.cerrada, true)
    assert.equal(vaEnInicio(c), false)
  })

  test('en el perfil queda solo si la aprobó', () => {
    assert.equal(vaEnPerfil(cerrada([resultado('r1', 100, true, '2026-11-06T21:25:00Z')], SI)), true)
    assert.equal(vaEnPerfil(cerrada([resultado('r1', 80, false, '2026-11-06T21:25:00Z')], SI)), false)
    assert.equal(vaEnPerfil(cerrada([], NO)), false)
    assert.equal(vaEnPerfil(cerrada([])), false)
  })

  test('una abierta sigue como siempre', () => {
    assert.equal(vaEnInicio(una([])), true)
    assert.equal(vaEnPerfil(una([])), true)
  })
})
