// Pruebas de la cuenta de la planilla (lib/planilla.ts). Se corren con `npm test`.
// Los primeros casos son la tabla del pedido de Enzo, uno por uno.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularDia,
  calcularDias,
  completarConSugerencia,
  diasDeHoras,
  hhmm,
  horarioDelDia,
  puedeRecalcular,
  redondearMediaHora,
  textoFalta,
  textoHabitual,
  textoSegunHorario,
  turnoDelTexto,
  ubicarEnJornada,
  type DatosDia,
  type HorarioDia,
  type Marca,
  type ResultadoDia,
  type SemanaPublicada,
} from '@/lib/planilla'

/** Una fichada del reloj a esa hora de Argentina: "2026-10-23 16:00". */
function reloj(cuando: string, logid = 1): Marca {
  return { ms: Date.parse(cuando.replace(' ', 'T') + ':00-03:00'), fuente: 'reloj', logid }
}

function papel(cuando: string): Marca {
  return { ms: Date.parse(cuando.replace(' ', 'T') + ':00-03:00'), fuente: 'papel' }
}

function turno(texto: string, hayNoche = false): HorarioDia {
  const t = turnoDelTexto(texto, hayNoche)
  assert.ok(t, `no se entendió el turno "${texto}"`)
  return { texto, tipo: 'turno', entrada: t.entrada, salida: t.salida }
}

function dia(fecha: string, marcas: Marca[], extra: Partial<DatosDia> = {}): ResultadoDia {
  const r = calcularDia({ fecha, marcas, calendario: false, horario: null, ...extra })
  assert.ok(r, 'se esperaba un resultado')
  return r
}

const VIERNES = '2026-10-23'

describe('casos del pedido', () => {
  test('normal: 07:28 a 16:01 → 8,5 h (8 h 33)', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 07:28'), reloj('2026-10-23 16:01')])
    assert.equal(r.minutos, 8 * 60 + 33)
    assert.equal(r.horas, 8.5)
    assert.equal(r.estado, 'ok')
    assert.equal(hhmm(r.entrada!), '07:28')
    assert.equal(hhmm(r.salida!), '16:01')
  })

  test('empate: 08:00 a 16:15 → 8 h (8 h 15 baja)', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 08:00'), reloj('2026-10-23 16:15')])
    assert.equal(r.minutos, 8 * 60 + 15)
    assert.equal(r.horas, 8)
  })

  test('redondeo: 10:00 a 15:45 → 5,5 h', () => {
    assert.equal(dia(VIERNES, [reloj('2026-10-23 10:00'), reloj('2026-10-23 15:45')]).horas, 5.5)
  })

  test('doble entrada: 07:30, 07:41 y 16:00 → se colapsa, 07:30 a 16:00 = 8,5 h, con aviso suave', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 07:30'), reloj('2026-10-23 07:41'), reloj('2026-10-23 16:00')])
    assert.equal(hhmm(r.entrada!), '07:30')
    assert.equal(r.horas, 8.5)
    assert.equal(r.estado, 'ok')
    assert.deepEqual(
      r.avisos.map((a) => a.tipo),
      ['doble']
    )
  })

  test('cierre nocturno: viernes 16:00 y sábado 01:20 → 9,5 h en el viernes (9 h 20)', () => {
    const marcas = [reloj('2026-10-23 16:00'), reloj('2026-10-24 01:20')]
    const r = dia(VIERNES, marcas)
    assert.equal(r.minutos, 9 * 60 + 20)
    assert.equal(r.horas, 9.5)
    assert.equal(hhmm(r.salida!), '01:20')
    assert.equal(calcularDia({ fecha: '2026-10-24', marcas, calendario: false, horario: null }), null)
  })

  test('cortado: 11:00, 15:00, 19:00 y 23:30 → 4 + 4,5 = 8,5 h', () => {
    const r = dia(VIERNES, [
      reloj('2026-10-23 11:00'),
      reloj('2026-10-23 15:00'),
      reloj('2026-10-23 19:00'),
      reloj('2026-10-23 23:30'),
    ])
    assert.equal(r.tramos.length, 2)
    assert.deepEqual(
      r.tramos.map((t) => `${hhmm(t.desde)}-${hhmm(t.hasta)}`),
      ['11:00-15:00', '19:00-23:30']
    )
    assert.equal(r.horas, 8.5)
  })

  test('una fichada: 09:58 sola con horario "10 A 18.30" → incompleto, falta salida, salida según horario 18:30', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 09:58')], { horario: turno('10 A 18.30') })
    assert.equal(r.estado, 'incompleto')
    assert.equal(r.horas, null)
    assert.equal(r.sugerencia?.falta, 'salida')
    assert.equal(textoFalta(r.sugerencia!), 'Falta salida · fichó entrada 09:58')
    assert.equal(textoSegunHorario(r.sugerencia!), 'Salida según horario: 18:30hs')
  })

  test('una fichada tarde: 16:05 sola, habitual 08:00 → incompleto, falta entrada, posible entrada 08:00', () => {
    // Tres días de 08:00 a 16:00 antes, y el viernes solo fichó a las 16:05.
    const marcas = [
      reloj('2026-10-20 08:00'),
      reloj('2026-10-20 16:00'),
      reloj('2026-10-21 07:58'),
      reloj('2026-10-21 16:02'),
      reloj('2026-10-22 08:03'),
      reloj('2026-10-22 16:00'),
      reloj('2026-10-23 16:05'),
    ]
    const r = calcularDias({ marcas, calendario: false, horarioDe: () => null, fechas: [VIERNES] }).get(VIERNES)!
    assert.equal(r.estado, 'incompleto')
    assert.equal(r.sugerencia?.falta, 'entrada')
    assert.equal(textoHabitual(r.sugerencia!), 'Posible entrada: 08:00hs')
    assert.equal(textoSegunHorario(r.sugerencia!), null)
  })

  test('Zulma: 03:40 y 11:10 del mismo día → 7,5 h (7 h 30) en ese día calendario', () => {
    const marcas = [reloj('2026-10-23 03:40'), reloj('2026-10-23 11:10')]
    const r = dia(VIERNES, marcas, { calendario: true })
    assert.equal(r.minutos, 7 * 60 + 30)
    assert.equal(r.horas, 7.5)
    // Sin la jornada calendario, las 03:40 serían del jueves.
    assert.equal(ubicarEnJornada(marcas[0].ms, false).fecha, '2026-10-22')
  })

  test('larga: 07:00 y 01:30 del día siguiente → 18,5 h y revisar', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 07:00'), reloj('2026-10-24 01:30')])
    assert.equal(r.horas, 18.5)
    assert.equal(r.estado, 'revisar')
    assert.ok(r.avisos.some((a) => a.tipo === 'larga'))
  })

  test('papel + reloj: papel 07:30 y 17:00, reloj 12:02 → 07:30 a 17:00 = 9,5 h', () => {
    const r = dia(VIERNES, [papel('2026-10-23 07:30'), papel('2026-10-23 17:00'), reloj('2026-10-23 12:02')])
    assert.equal(r.origen, 'papel')
    assert.equal(hhmm(r.entrada!), '07:30')
    assert.equal(hhmm(r.salida!), '17:00')
    assert.equal(r.horas, 9.5)
  })

  test('celda bloqueada: el admin cargó VAC y después llega una fichada → queda VAC', () => {
    assert.equal(puedeRecalcular({ bloqueada: true, origen: 'codigo' }), false)
    assert.equal(puedeRecalcular({ bloqueada: false, origen: 'codigo' }), false)
    assert.equal(puedeRecalcular({ bloqueada: false, origen: 'manual' }), false)
    assert.equal(puedeRecalcular({ bloqueada: false, origen: 'papel' }), false)
    assert.equal(puedeRecalcular({ bloqueada: true, origen: 'reloj' }), false)
    assert.equal(puedeRecalcular({ bloqueada: false, origen: 'reloj' }), true)
    assert.equal(puedeRecalcular(null), true)
  })
})

describe('redondeo y días', () => {
  test('la tabla del pedido', () => {
    const casos: [number, number][] = [
      [8 * 60 + 12, 8],
      [8 * 60 + 15, 8],
      [8 * 60 + 16, 8.5],
      [8 * 60 + 42, 8.5],
      [8 * 60 + 45, 8.5],
      [2 * 60 + 48, 3],
      [5 * 60 + 45, 5.5],
      [10, 0],
    ]
    for (const [minutos, horas] of casos) assert.equal(redondearMediaHora(minutos), horas, `${minutos} min`)
  })

  test('se redondea el total del día, no cada tramo', () => {
    // 4 h 10 + 4 h 10 = 8 h 20 → 8,5 (cada tramo solo daría 4 + 4 = 8).
    const r = dia(VIERNES, [
      reloj('2026-10-23 09:00'),
      reloj('2026-10-23 13:10'),
      reloj('2026-10-23 17:00'),
      reloj('2026-10-23 21:10'),
    ])
    assert.equal(r.minutos, 500)
    assert.equal(r.horas, 8.5)
  })

  test('los segundos no cuentan: vale la hora que se ve', () => {
    const entrada = reloj('2026-10-23 08:00')
    const salida = reloj('2026-10-23 16:15')
    entrada.ms += 10_000
    salida.ms += 50_000
    assert.equal(dia(VIERNES, [entrada, salida]).horas, 8)
  })

  test('DÍAS = HORAS / 8,5', () => {
    assert.equal(diasDeHoras(8.5), 1)
    assert.equal(diasDeHoras(17), 2)
  })
})

describe('jornada', () => {
  test('06:59 es del día anterior y 07:00 del mismo día', () => {
    assert.deepEqual(ubicarEnJornada(reloj('2026-10-24 06:59').ms, false), { fecha: VIERNES, min: 30 * 60 + 59 })
    assert.deepEqual(ubicarEnJornada(reloj('2026-10-24 07:00').ms, false), { fecha: '2026-10-24', min: 7 * 60 })
  })

  test('las fichadas de otra jornada no se mezclan', () => {
    const r = dia(VIERNES, [reloj('2026-10-22 08:00'), reloj('2026-10-23 08:00'), reloj('2026-10-23 16:00')])
    assert.equal(r.horas, 8)
  })
})

describe('dobles, impares y avisos', () => {
  test('doble a menos de 5 min: se colapsa sin avisar', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 07:30'), reloj('2026-10-23 07:33'), reloj('2026-10-23 16:00')])
    assert.equal(r.horas, 8.5)
    assert.deepEqual(r.avisos, [])
  })

  test('doble en la salida: vale la última', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 08:00'), reloj('2026-10-23 16:00'), reloj('2026-10-23 16:20')])
    assert.equal(hhmm(r.salida!), '16:20')
    assert.equal(r.horas, 8.5)
  })

  test('tres fichadas sueltas: incompleto, falta o sobra una', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 08:00'), reloj('2026-10-23 12:00'), reloj('2026-10-23 16:00')])
    assert.equal(r.estado, 'incompleto')
    assert.equal(r.horas, null)
    assert.ok(r.avisos.some((a) => a.tipo === 'impar'))
  })

  test('un corte de menos de 2 h no es horario cortado: cuenta de la primera a la última', () => {
    const r = dia(VIERNES, [
      reloj('2026-10-23 08:00'),
      reloj('2026-10-23 12:00'),
      reloj('2026-10-23 13:00'),
      reloj('2026-10-23 17:00'),
    ])
    assert.equal(r.tramos.length, 1)
    assert.equal(r.horas, 9)
  })

  test('fichó en día de franco según horario', () => {
    const franco: HorarioDia = { texto: 'X', tipo: 'franco', entrada: null, salida: null }
    const r = dia(VIERNES, [reloj('2026-10-23 08:00'), reloj('2026-10-23 16:00')], { horario: franco })
    assert.equal(r.horas, 8)
    assert.deepEqual(
      r.avisos.map((a) => a.texto),
      ['Fichó en día de franco según horario']
    )
  })

  test('tenía horario y no fichó: en gris, sin horas y sin rojo', () => {
    const r = dia(VIERNES, [], { horario: turno('7.30 A 16') })
    assert.equal(r.estado, 'ok')
    assert.equal(r.horas, null)
    assert.deepEqual(
      r.avisos.map((a) => a.texto),
      ['Sin fichadas · horario 7.30 A 16']
    )
  })

  test('sin horario y sin fichadas: no hay nada que mostrar', () => {
    assert.equal(calcularDia({ fecha: VIERNES, marcas: [], calendario: false, horario: null }), null)
  })
})

describe('una sola fichada', () => {
  test('"11C" sin noche: la salida según horario es el cierre de las 21:00', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 11:02')], { horario: turno('11C') })
    assert.equal(textoSegunHorario(r.sugerencia!), 'Salida según horario: 21:00hs')
  })

  test('"11C" un día con noche: cierra a la 01:00', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 11:02')], { horario: turno('11C', true) })
    assert.equal(textoSegunHorario(r.sugerencia!), 'Salida según horario: 01:00hs')
  })

  test('sin horario: a la madrugada es salida (falta la entrada)', () => {
    const r = dia(VIERNES, [reloj('2026-10-24 00:40')])
    assert.equal(r.sugerencia?.falta, 'entrada')
  })

  test('entre las 12 y las 17 decide su historial; sin historial, el corte de las 15', () => {
    const tarde = { entradas: [13 * 60, 13 * 60 + 5, 12 * 60 + 55], salidas: [21 * 60, 21 * 60, 22 * 60] }
    const manana = { entradas: [7 * 60, 7 * 60, 7 * 60], salidas: [14 * 60, 14 * 60, 14 * 60 + 10] }
    const falta = (cuando: string, historial?: { entradas: number[]; salidas: number[] }) =>
      dia(VIERNES, [reloj(cuando)], { historial }).sugerencia!.falta
    // 13:05 con turnos de tarde es la entrada: falta la salida.
    assert.equal(falta('2026-10-23 13:05', tarde), 'salida')
    // 14:10 con turnos de mañana es la salida: falta la entrada.
    assert.equal(falta('2026-10-23 14:10', manana), 'entrada')
    assert.equal(falta('2026-10-23 14:10'), 'salida')
    assert.equal(falta('2026-10-23 15:10'), 'entrada')
  })

  test('el habitual no se muestra con menos de 3 días', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 16:05')], { historial: { entradas: [480, 480], salidas: [960, 960] } })
    assert.equal(r.sugerencia?.habitual, null)
    assert.equal(textoHabitual(r.sugerencia!), null)
  })

  test('tocar la sugerencia completa la hora y recalcula', () => {
    const r = dia(VIERNES, [reloj('2026-10-23 09:58')], { horario: turno('10 A 18.30') })
    const completo = completarConSugerencia(r.sugerencia!, 'segunHorario')!
    assert.equal(hhmm(completo.entrada), '09:58')
    assert.equal(hhmm(completo.salida), '18:30')
    assert.equal(completo.horas, 8.5)
    assert.equal(completo.nota, 'salida según horario')
    assert.equal(completarConSugerencia(r.sugerencia!, 'habitual'), null)
  })

  test('el que entró y sigue adentro no figura incompleto mientras dura la jornada', () => {
    const marcas = [reloj('2026-10-23 08:00')]
    const durante = dia(VIERNES, marcas, { ahora: reloj('2026-10-23 14:00').ms })
    assert.equal(durante.estado, 'ok')
    assert.ok(durante.avisos.some((a) => a.tipo === 'en-curso'))
    const despues = dia(VIERNES, marcas, { ahora: reloj('2026-10-24 08:00').ms })
    assert.equal(despues.estado, 'incompleto')
    assert.equal(despues.sugerencia?.falta, 'salida')
  })
})

describe('horario publicado', () => {
  const semanas: SemanaPublicada[] = [
    {
      week_start: '2026-10-19',
      data: {
        noches: [4, 5],
        diasExtra: 1,
        sectores: [
          {
            nombre: 'BARRA',
            personas: [
              { nombre: 'Ignacio Gaston', dias: ['X', '11C', 'X', 'X', 'X', '9 A 19.30', '7.30 A 16', '10 A 18'] },
              { nombre: 'Lucho Pelizardi', dias: ['', '', '', '', '11C', '', '', ''] },
            ],
          },
          { nombre: 'CAJA', personas: [{ nombre: 'Ignacio Lopez ', dias: ['X', 'X', '14C', '14C', 'X', 'X', 'X', ''] }] },
          { nombre: 'MAESTRANZA', personas: [{ nombre: 'Ailen Shroeder', dias: ['8 A 16.30', '', '', '', '', '', '', ''] }] },
          { nombre: 'ENSALADA', personas: [{ nombre: 'Ailen Shroeder ', dias: ['10 A 18', '', '', '', '', '', '', ''] }] },
        ],
      },
    },
  ]
  const ignacio = ['Ignacio Gaston', 'Ignacio Lopez']

  test('con dos nombres, cada día toma el que tiene turno', () => {
    assert.equal(horarioDelDia(semanas, ignacio, '2026-10-20')?.texto, '11C')
    assert.equal(horarioDelDia(semanas, ignacio, '2026-10-21')?.texto, '14C')
    assert.equal(horarioDelDia(semanas, ignacio, '2026-10-19')?.tipo, 'franco')
  })

  test('"11C" cierra a las 21:00, o a la 01:00 los días con noche (viernes y sábado)', () => {
    const martes = horarioDelDia(semanas, ['Ignacio Gaston'], '2026-10-20')
    assert.equal(martes?.entrada, 11 * 60)
    assert.equal(martes?.salida, 21 * 60)
    const viernes = horarioDelDia(semanas, ['Lucho Pelizardi'], '2026-10-23')
    assert.equal(viernes?.salida, 25 * 60)
    const sabado = horarioDelDia(semanas, ['Ignacio Gaston'], '2026-10-24')
    assert.equal(sabado?.entrada, 9 * 60)
    assert.equal(sabado?.salida, 19 * 60 + 30)
  })

  test('en dos sectores el mismo día: de la entrada más temprana a la salida más tarde', () => {
    const h = horarioDelDia(semanas, ['Ailen Shroeder'], '2026-10-19')
    assert.equal(h?.entrada, 8 * 60)
    assert.equal(h?.salida, 18 * 60)
  })

  test('el lunes feriado sale del día extra de la semana anterior', () => {
    const h = horarioDelDia(semanas, ignacio, '2026-10-26')
    assert.equal(h?.texto, '10 A 18')
  })

  test('sin semana publicada no hay horario', () => {
    assert.equal(horarioDelDia(semanas, ignacio, '2026-11-03'), null)
    assert.equal(horarioDelDia(semanas, [], '2026-10-20'), null)
  })

  test('"12 a 16.30 + NOCHE": entra 12:00 y sale al cierre de la noche', () => {
    assert.deepEqual(turnoDelTexto('12 a 16.30 + NOCHE', false), { entrada: 12 * 60, salida: 25 * 60 })
    assert.deepEqual(turnoDelTexto('M9+NOCHE WAIKIKI', false), { entrada: null, salida: 25 * 60 })
    assert.equal(turnoDelTexto('LIC', false), null)
  })
})
