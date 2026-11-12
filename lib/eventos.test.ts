// Pruebas del calendario de eventos y mesas personalizadas (lib/eventos.ts).

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  fechaLarga,
  grillaDelMes,
  leerEvento,
  marcaDelDia,
  limitesDelMes,
  nombreDelMes,
  ocupanElSalon,
  ordenarEventos,
  salonesOcupados,
  salonesParaElegir,
  sumarMeses,
  textoHorario,
  validarEvento,
  type DatosEvento,
  type Evento,
} from '@/lib/eventos'

const mesa: DatosEvento = {
  fecha: '2026-11-20',
  tipo: 'mesa',
  comida: 'almuerzo',
  hora: '13:00',
  horaFin: null,
  nombre: '  Cumple   de Marta ',
  pax: 20,
  salon: ' Salón principal ',
  notas: '  Menú de 3 pasos, sin TACC para 2  ',
}

const ev = (p: Partial<Evento> & { id: string }): Evento => ({
  fecha: '2026-11-21', tipo: 'evento', comida: 'cena', hora: '21:00', horaFin: null,
  nombre: 'Boda', pax: 100, salon: 'Ala Wai', notas: null, ...p,
})

describe('lo que se revisa antes de guardar', () => {
  test('una mesa completa pasa y queda limpia', () => {
    const r = validarEvento(mesa)
    assert.equal(r.ok, true)
    if (!r.ok) return
    assert.equal(r.datos.nombre, 'Cumple de Marta')
    assert.equal(r.datos.salon, 'Salón principal')
    assert.equal(r.datos.notas, 'Menú de 3 pasos, sin TACC para 2')
  })

  test('una mesa sin personas no pasa; sin hora ni salón, sí (Carlos, 19/11: "Cena - 30 PAX")', () => {
    assert.deepEqual(validarEvento({ ...mesa, pax: null }), { ok: false, error: 'Poné cuántas personas son.' })
    const r = validarEvento({ ...mesa, comida: 'cena', hora: null, salon: '' })
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.datos.salon, '')
  })

  test('un evento privado sin salón no pasa: lo ocupa', () => {
    assert.deepEqual(validarEvento({ ...mesa, tipo: 'evento', salon: ' ' }), { ok: false, error: 'Elegí el salón: el evento privado lo ocupa.' })
  })

  test('un evento privado puede ir sin hora ni personas', () => {
    assert.equal(validarEvento({ ...mesa, tipo: 'evento', hora: null, pax: null }).ok, true)
  })

  test('sin nombre o con personas raras no pasa', () => {
    assert.equal(validarEvento({ ...mesa, nombre: '   ' }).ok, false)
    assert.equal(validarEvento({ ...mesa, pax: 0 }).ok, false)
    assert.equal(validarEvento({ ...mesa, pax: 2.5 }).ok, false)
    assert.equal(validarEvento({ ...mesa, pax: NaN }).ok, false)
  })

  test('hasta cuándo necesita desde cuándo, y no puede ser igual', () => {
    assert.equal(validarEvento({ ...mesa, tipo: 'evento', hora: null, horaFin: '23:00' }).ok, false)
    assert.equal(validarEvento({ ...mesa, horaFin: '13:00' }).ok, false)
    // Una boda que termina pasada la medianoche está bien.
    assert.equal(validarEvento({ ...mesa, tipo: 'evento', hora: '21:00', horaFin: '04:00' }).ok, true)
  })

  test('fecha y comida tienen que ser válidas', () => {
    assert.equal(validarEvento({ ...mesa, fecha: '2026-13-01' }).ok, false)
    assert.equal(validarEvento({ ...mesa, fecha: '' }).ok, false)
    assert.equal(validarEvento({ ...mesa, comida: 'brunch' as never }).ok, false)
  })
})

describe('el mes', () => {
  test('noviembre de 2026 arranca un domingo: la primera semana tiene solo el 1', () => {
    const g = grillaDelMes('2026-11')
    assert.equal(g.length, 6)
    assert.deepEqual(g[0], [null, null, null, null, null, null, '2026-11-01'])
    assert.deepEqual(g[5], ['2026-11-30', null, null, null, null, null, null])
  })

  test('febrero, saltos de año y nombres', () => {
    assert.deepEqual(limitesDelMes('2028-02'), { desde: '2028-02-01', hasta: '2028-02-29' })
    assert.equal(sumarMeses('2026-12', 1), '2027-01')
    assert.equal(sumarMeses('2026-01', -1), '2025-12')
    assert.equal(nombreDelMes('2026-11'), 'Noviembre 2026')
    assert.equal(fechaLarga('2026-11-21'), 'Sábado 21 de noviembre')
  })
})

describe('el salón ocupado', () => {
  const lista = [
    ev({ id: 'boda', salon: 'Ala Wai' }),
    ev({ id: 'mesa', tipo: 'mesa', salon: 'Ala Wai', comida: 'almuerzo', hora: '13:00' }),
    ev({ id: 'empresa', salon: 'Salon Principal', comida: 'almuerzo' }),
    ev({ id: 'otro-dia', fecha: '2026-11-22' }),
  ]

  test('solo los eventos privados ocupan el salón, sin importar tildes ni mayúsculas', () => {
    assert.deepEqual(ocupanElSalon(lista, '2026-11-21', 'ala wai').map((e) => e.id), ['boda'])
    assert.deepEqual(ocupanElSalon(lista, '2026-11-21', 'Salón principal').map((e) => e.id), ['empresa'])
    assert.deepEqual(ocupanElSalon(lista, '2026-11-21', 'Ala Wai', 'boda'), [])
    assert.deepEqual(salonesOcupados(lista, '2026-11-21'), ['Salon Principal', 'Ala Wai'])
  })

  test('para elegir: los conocidos y los que ya se usaron, sin repetir', () => {
    assert.deepEqual(
      salonesParaElegir([...lista, ev({ id: 'x', salon: 'Terraza' }), ev({ id: 'y', tipo: 'mesa', salon: '' })]),
      ['Salón principal', 'Ala Wai', 'Hula Kai', 'Terraza']
    )
    assert.deepEqual(ocupanElSalon(lista, '2026-11-21', ''), [])
  })
})

describe('orden y textos', () => {
  test('por fecha, comida y hora', () => {
    const orden = ordenarEventos([
      ev({ id: 'c', comida: 'cena' }),
      ev({ id: 'b', comida: 'almuerzo', hora: '14:00' }),
      ev({ id: 'a', comida: 'almuerzo', hora: '12:30' }),
      ev({ id: 'z', fecha: '2026-11-01', comida: 'cena' }),
    ])
    assert.deepEqual(orden.map((e) => e.id), ['z', 'a', 'b', 'c'])
  })

  test('el horario y la fila de la base', () => {
    assert.equal(textoHorario({ hora: '21:00', horaFin: '04:00' }), '21:00 a 04:00')
    assert.equal(textoHorario({ hora: null, horaFin: null }), '')
    const e = leerEvento({ id: 1, fecha: '2026-11-21', tipo: 'evento', comida: 'cena', hora: '21:00:00', hora_fin: null, nombre: 'Boda', pax: null, salon: 'Ala Wai', notas: '' })
    assert.equal(e.hora, '21:00')
    assert.equal(e.pax, null)
    assert.equal(e.notas, null)
  })
})

describe('la marquita del día en el editor de horarios', () => {
  test('sin nada no hay marca', () => {
    assert.equal(marcaDelDia([]), null)
  })

  test('un evento privado ocupa el salón; en orden de comida y hora, y suma las personas', () => {
    const m = marcaDelDia([
      ev({ id: 'm', tipo: 'mesa', comida: 'almuerzo', hora: '13:00', nombre: 'Sebastián', pax: 20, salon: '' }),
      ev({ id: 'b', nombre: 'Boda', pax: 120 }),
      ev({ id: 'c', tipo: 'mesa', comida: 'cena', hora: null, nombre: 'Carlos', pax: 30, salon: '' }),
    ])
    assert.deepEqual(m && { texto: m.texto, ocupa: m.ocupa }, { texto: 'Evento', ocupa: true })
    assert.equal(
      m?.detalle,
      '1 evento + 2 mesas: Sebastián (almuerzo, 13:00, 20 pax) · Boda (cena, 21:00, 120 pax, Ala Wai) · Carlos (cena, 30 pax) — 170 pax en total'
    )
  })

  test('una mesa sola', () => {
    assert.equal(marcaDelDia([ev({ id: 'm', tipo: 'mesa' })])?.texto, '1 mesa')
    assert.equal(marcaDelDia([ev({ id: 'm', tipo: 'mesa' })])?.ocupa, false)
  })
})
