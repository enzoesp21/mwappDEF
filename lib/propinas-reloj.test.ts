// Pruebas de "Traer horas del reloj" en Propinas (lib/propinas-reloj.ts).
// El caso grande es el 31/10 de verdad: la lista arrancó con 2 nombres y el
// botón tenía que sumar a todos los mozos que trabajaron.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  armarDesdeReloj,
  emparejar,
  horasParaPropina,
  leerDatosReloj,
  leerDetalle,
  nombreParaPropinas,
  tipoEnElSalon,
  type DatosRelojPropinas,
  type DetalleReloj,
  type PersonaDelReloj,
} from '@/lib/propinas-reloj'
import { validarCarga } from '@/lib/propinas'

const usuarios = [
  { id: 'u-nico', full_name: 'Nicolas Leandro Fuentes' },
  { id: 'u-enzo', full_name: 'Enzo Espiño' },
  { id: 'u-enzo1', full_name: 'Enzo Espiño 1' },
  { id: 'u-giuli', full_name: 'Giuliana Bartellone Benitez' },
  { id: 'u-lucas', full_name: 'Lucas Uriel López Saaied' },
  { id: 'u-facu', full_name: 'Facundo Nuñez' },
  { id: 'u-prueba', full_name: 'Prueba11' },
]

function persona(p: Partial<PersonaDelReloj> & { nombre: string }): PersonaDelReloj {
  return { profileId: null, nombresHorario: [], horas: null, minutos: null, cargo: null, puesto: null, horario: [], detalle: null, ...p }
}
const en = (sector: string, celda: string | null) => [{ sector, celda }]

// Lo que devolvió la base para el sábado 31/10 (una parte, con los casos que importan).
const dia31: DatosRelojPropinas = {
  personas: [
    persona({ nombre: 'ESPIÑO ENZO LUCIANO', profileId: 'u-enzo', cargo: 'MOZO', puesto: 'Mozos' }),
    persona({
      nombre: 'FUENTES NICOLAS LEANDRO',
      profileId: 'u-nico',
      nombresHorario: ['Nicolás Fuentes'],
      horas: 9,
      minutos: 536,
      cargo: 'MOZO',
      puesto: 'Mozos',
      horario: en('CAMAREROS', '11 a 20'),
    }),
    persona({ nombre: 'AGUIRRE RAQUEL NOEMI', nombresHorario: ['Raquel Aguirre'], cargo: 'MOZO', horario: en('CAMAREROS', '7.30 a 17.30') }),
    persona({ nombre: 'IBARRA LUCAS DAMIAN', nombresHorario: ['Lucas Ibarra'], horas: 8, minutos: 489, cargo: 'MOZO', horario: en('CAMAREROS', '10 a 18.30') }),
    persona({ nombre: 'NUÑEZ FACUNDO RODRIGO', profileId: 'u-facu', horas: 13, cargo: 'ENCARGADO', puesto: 'Caja' }),
    persona({ nombre: 'MOLINA BRUNO EZEQUIEL', nombresHorario: ['Bruno Molina'], horas: 14, cargo: 'MOZO DE MOSTRADOR', horario: en('BARRA', '10 a 23.30') }),
    persona({
      nombre: 'LOPEZ IGNACIO GASTON',
      nombresHorario: ['Ignacio Gaston', 'Ignacio Lopez'],
      horas: 11,
      cargo: 'MOZO DE MOSTRADOR',
      horario: [
        { sector: 'BARRA', celda: '9 A 19.30' },
        { sector: 'CAJA', celda: 'X' },
      ],
    }),
    persona({
      nombre: 'LUCAS LOPEZ',
      profileId: 'u-lucas',
      nombresHorario: ['Lucas Lopez'],
      horas: 12.5,
      minutos: 755,
      cargo: 'MOZO',
      puesto: 'Mozos',
      horario: en('CAMAREROS', '11C'),
    }),
    persona({ nombre: 'ZULMA AGUILAR', horas: 12, cargo: 'LIMPIEZA' }),
    // En Horarios tenía licencia, pero el reloj dice que vino: es mozo igual.
    persona({ nombre: 'GABRIEL CRASINO', nombresHorario: ['Gabriel Cansino'], horas: 9, minutos: 531, cargo: 'MOZO', horario: en('CAMAREROS', 'LIC') }),
    persona({ nombre: 'URIEL ZABALA', nombresHorario: ['Uriel Zabala'], horas: 9.5, minutos: 578, cargo: 'PEON GENERAL', horario: en('COMISS / RUNNERS', '16C') }),
    // Cargo de peón en la planilla, pero en Horarios está en Camareros: manda Horarios.
    persona({ nombre: 'MARTINA BARCIA', nombresHorario: ['Martina Barcia'], horas: 13, minutos: 795, cargo: 'PEON GENERAL', horario: en('CAMAREROS', '11C') }),
    persona({ nombre: 'LAUREANO', nombresHorario: ['Laureano'], horas: 9, minutos: 538, horario: en('COMISS / RUNNERS', '10 a 18.30') }),
    persona({ nombre: 'VELARDEZ SANTIAGO', horas: 15 }),
    persona({ nombre: 'ALMA', horas: 9.5 }),
    // Recién llegadas: todavía no están en Horarios; sin cargo, vale el puesto de su usuario.
    persona({ nombre: 'GIULIANA BARTELLONE', profileId: 'u-giuli', horas: 9, minutos: 554, puesto: 'Mozos' }),
    persona({ nombre: 'ABRIL CASTRO', nombresHorario: ['Abril Castro'], horas: 6.5, minutos: 383, puesto: 'Mozos' }),
  ],
  sinReloj: [
    { sector: 'CAMAREROS', nombre: 'Pamela Almada', celda: 'X' },
    { sector: 'CAMAREROS', nombre: 'Micaela Dolesor', celda: '10 A 19.30' },
    { sector: 'CAMAREROS', nombre: 'Belen', celda: '11 a 19.30' },
    { sector: 'BARRA', nombre: 'Lazarte Lautaro Daniel', celda: 'M9' },
    { sector: 'COCINA', nombre: 'Moises', celda: '9C' },
  ],
}

describe('quién es del salón', () => {
  test('manda el sector de Horarios donde tiene turno ese día', () => {
    assert.equal(tipoEnElSalon({ cargo: 'PEON GENERAL', puesto: null, horario: en('CAMAREROS', '11C') }), 'mozo')
    assert.equal(tipoEnElSalon({ cargo: 'PEON GENERAL', puesto: null, horario: en('COMISS / RUNNERS', '16C') }), 'runner')
    assert.equal(tipoEnElSalon({ cargo: 'MOZO DE MOSTRADOR', puesto: null, horario: en('BARRA', '10 a 20') }), null)
    // Con licencia o franco en Horarios pero con horas en el reloj: su sector igual.
    assert.equal(tipoEnElSalon({ cargo: 'MOZO', puesto: null, horario: en('CAMAREROS', 'LIC') }), 'mozo')
  })

  test('si está en dos sectores, vale el que tiene turno ese día', () => {
    const dos = (celdaSalon: string, celdaCaja: string) => [
      { sector: 'CAMAREROS', celda: celdaSalon },
      { sector: 'CAJA', celda: celdaCaja },
    ]
    assert.equal(tipoEnElSalon({ cargo: null, puesto: null, horario: dos('X', '8 A 16') }), null)
    assert.equal(tipoEnElSalon({ cargo: null, puesto: null, horario: dos('11C', 'X') }), 'mozo')
  })

  test('sin Horarios esa semana: el cargo MOZO, o sin cargo el puesto de su usuario', () => {
    assert.equal(tipoEnElSalon({ cargo: 'MOZO', puesto: null, horario: [] }), 'mozo')
    assert.equal(tipoEnElSalon({ cargo: ' moza ', puesto: null, horario: [] }), 'mozo')
    assert.equal(tipoEnElSalon({ cargo: 'MOZO DE MOSTRADOR', puesto: null, horario: [] }), null)
    assert.equal(tipoEnElSalon({ cargo: null, puesto: 'Mozos', horario: [] }), 'mozo')
    assert.equal(tipoEnElSalon({ cargo: '', puesto: 'Commis', horario: [] }), 'runner')
    // El encargado tiene usuario de Mozos, pero su cargo es otro: no se suma.
    assert.equal(tipoEnElSalon({ cargo: 'ENCARGADO', puesto: 'Mozos', horario: [] }), null)
    assert.equal(tipoEnElSalon({ cargo: null, puesto: null, horario: [] }), null)
  })
})

describe('cómo se llama en la lista', () => {
  test('el de Horarios, que es como se escribía en el grupo', () => {
    assert.equal(nombreParaPropinas({ nombre: 'IBARRA LUCAS DAMIAN', profileId: null, nombresHorario: [' Lucas  Ibarra '] }, usuarios), 'Lucas Ibarra')
    // Con usuario: "Lucas Lopez" lleva a su usuario, así que queda corto.
    assert.equal(nombreParaPropinas({ nombre: 'LUCAS LOPEZ', profileId: 'u-lucas', nombresHorario: ['Lucas Lopez'] }, usuarios), 'Lucas Lopez')
  })

  test('si el nombre corto no lleva a su usuario, el de su usuario: así ve lo suyo', () => {
    // "Enzo Espiño" es exacto a un usuario, pero el de esta persona es otro.
    assert.equal(nombreParaPropinas({ nombre: 'ESPIÑO ENZO LUCIANO', profileId: 'u-enzo1', nombresHorario: ['Enzo Espiño'] }, usuarios), 'Enzo Espiño 1')
  })

  test('sin Horarios, el de la planilla en minúscula', () => {
    assert.equal(nombreParaPropinas({ nombre: 'VELARDEZ SANTIAGO', profileId: null, nombresHorario: [] }, usuarios), 'Velardez Santiago')
    assert.equal(nombreParaPropinas({ nombre: 'GIULIANA BARTELLONE', profileId: 'u-giuli', nombresHorario: [] }, usuarios), 'Giuliana Bartellone')
  })
})

describe('emparejar la lista con el reloj', () => {
  const personas = [
    persona({ nombre: 'ROCIO CONDE', profileId: 'u-rocio', nombresHorario: ['Rocio Conde'], horas: 8.5 }),
    persona({ nombre: 'AGUIRRE RAQUEL NOEMI', nombresHorario: ['Raquel Aguirre'], horas: 8 }),
    persona({ nombre: 'FUENTES NICOLAS LEANDRO', horas: 9.5 }),
    persona({ nombre: 'LUCAS LOPEZ', nombresHorario: ['Lucas Lopez'], horas: 7 }),
    persona({ nombre: 'IBARRA LUCAS DAMIAN', nombresHorario: ['Lucas Ibarra'], horas: 6 }),
  ]

  test('por usuario, por nombre de Horarios y por la regla de las 2 palabras; ante la duda, nada', () => {
    const pares = emparejar(
      [
        { clave: '1', nombre: 'Rocío', usuarioId: 'u-rocio' },
        { clave: '2', nombre: 'Raquel Aguirre', usuarioId: null },
        { clave: '3', nombre: 'Nicolás Fuentes', usuarioId: null },
        { clave: '4', nombre: 'Lucas', usuarioId: null },
        { clave: '5', nombre: 'Pamela Almada', usuarioId: null },
        { clave: '6', nombre: '', usuarioId: null },
      ],
      personas
    )
    assert.deepEqual(Object.fromEntries(pares), { 1: 0, 2: 1, 3: 2 })
  })

  test('cada persona del reloj se usa una sola vez', () => {
    const pares = emparejar(
      [
        { clave: 'a', nombre: 'Lucas Lopez', usuarioId: null },
        { clave: 'b', nombre: 'Lucas Lopez', usuarioId: null },
      ],
      personas
    )
    assert.deepEqual(Object.fromEntries(pares), { a: 3 })
  })

  test('el nombre igual gana a la regla de las 2 palabras aunque venga después en la lista', () => {
    const dos = [persona({ nombre: 'MARTINA BARCIA', horas: 13 }), persona({ nombre: 'MARTINA BARCIA SILVA', horas: 5 })]
    const pares = emparejar(
      [
        { clave: 'x', nombre: 'Barcia Silva Martina', usuarioId: null },
        { clave: 'y', nombre: 'Martina Barcia', usuarioId: null },
      ],
      dos
    )
    assert.deepEqual(Object.fromEntries(pares), { y: 0, x: 1 })
  })
})

describe('el 31/10: traer horas del reloj suma a todos los mozos', () => {
  const lista = [
    { clave: 'f1', nombre: 'Nicolas Leandro Fuentes', usuarioId: 'u-nico' },
    { clave: 'f2', nombre: 'Enzo Espiño', usuarioId: 'u-enzo' },
    { clave: 'f3', nombre: 'Prueba11', usuarioId: 'u-prueba' },
    { clave: 'f4', nombre: '', usuarioId: null },
  ]
  const r = armarDesdeReloj(lista, dia31, usuarios)

  test('a los que ya estaban les pone sus horas, o avisa por qué no', () => {
    assert.deepEqual(Object.fromEntries(r.filas), {
      f1: { tipo: 'horas', horas: 9 },
      f2: { tipo: 'incompleta' },
      f3: { tipo: 'no_esta' },
    })
  })

  test('suma a los mozos que faltaban, con horas, incompletos o con turno y sin fichadas', () => {
    assert.deepEqual(
      r.mozos.map((m) => [m.nombre, m.horas, m.motivo]),
      [
        ['Abril Castro', 6.5, 'horas'],
        ['Belen', null, 'sin_fichadas'],
        // De a cuarto: 8 h 51 es 8,75 (la planilla dice 9) y 9 h 14 es 9,25 (la planilla dice 9).
        ['Gabriel Cansino', 8.75, 'horas'],
        ['Giuliana Bartellone', 9.25, 'horas'],
        ['Lucas Ibarra', 8.25, 'horas'],
        ['Lucas Lopez', 12.5, 'horas'],
        ['Martina Barcia', 13.25, 'horas'],
        ['Micaela Dolesor', null, 'sin_fichadas'],
        ['Raquel Aguirre', null, 'incompleta'],
      ]
    )
  })

  test('a runners y a los sin sector solo los ofrece; barra, cocina, limpieza y el encargado, nada', () => {
    assert.deepEqual(
      r.ofrecer.map((o) => [o.nombre, o.horas, o.tipo]),
      [
        ['Laureano', 9, 'runner'],
        ['Uriel Zabala', 9.75, 'runner'],
        ['Alma', 9.5, 'sin_sector'],
        ['Velardez Santiago', 15, 'sin_sector'],
      ]
    )
  })

  test('tocarlo de nuevo no repite a nadie', () => {
    const conTodos = [
      ...lista,
      ...r.mozos.map((m, i) => ({ clave: 'm' + i, nombre: m.nombre, usuarioId: m.nombre === 'Lucas Lopez' ? 'u-lucas' : null })),
    ]
    const otra = armarDesdeReloj(conTodos, dia31, usuarios)
    assert.deepEqual(otra.mozos, [])
    assert.equal(otra.filas.get('m0')?.tipo, 'horas') // Abril Castro
    assert.equal(otra.filas.get('m1')?.tipo, 'sin_fichadas') // Belen
    assert.equal(otra.filas.get('m8')?.tipo, 'incompleta') // Raquel Aguirre
  })

  test('alguien de la lista con turno en Horarios y sin fichadas no se duplica', () => {
    const otra = armarDesdeReloj([{ clave: 'b', nombre: 'Belen Gallegos', usuarioId: null }], dia31, usuarios)
    assert.deepEqual(otra.filas.get('b'), { tipo: 'sin_fichadas' })
    assert.ok(!otra.mozos.some((m) => m.nombre === 'Belen'))
  })

  test('un día sin planilla no suma a nadie', () => {
    const vacio = armarDesdeReloj(lista, { personas: [], sinReloj: [] }, usuarios)
    assert.deepEqual(vacio.mozos, [])
    assert.deepEqual(vacio.ofrecer, [])
    assert.equal(vacio.filas.get('f1')?.tipo, 'no_esta')
  })
})

describe('los que no son mozos no se suman solos (Enzo, 03/11)', () => {
  // El 01/11 Enzo fichó de 13:08 a 21:02: con cargo MOZO en la planilla, el reloj lo sumaba.
  const dia: DatosRelojPropinas = {
    personas: [
      persona({ nombre: 'ESPIÑO ENZO LUCIANO', profileId: 'u-enzo', horas: 8, minutos: 474, cargo: 'MOZO', puesto: 'Mozos' }),
      persona({ nombre: 'IBARRA LUCAS DAMIAN', nombresHorario: ['Lucas Ibarra'], horas: 7, minutos: 416, cargo: 'MOZO', horario: en('CAMAREROS', '10 a 17') }),
    ],
    sinReloj: [{ sector: 'CAMAREROS', nombre: 'Belen', celda: '11 a 19.30' }],
  }
  const enzo = { nombre: 'ESPIÑO ENZO LUCIANO', profileId: 'u-enzo', nombresHorario: [] }

  test('sin marcarlo, entra como mozo; marcado, no se suma', () => {
    assert.deepEqual(
      armarDesdeReloj([], dia, usuarios).mozos.map((m) => m.nombre),
      ['Belen', 'Enzo Espiño', 'Lucas Ibarra']
    )
    assert.deepEqual(
      armarDesdeReloj([], dia, usuarios, [enzo]).mozos.map((m) => m.nombre),
      ['Belen', 'Lucas Ibarra']
    )
  })

  test('si la cajera lo escribe a mano, le trae sus horas igual', () => {
    const r = armarDesdeReloj([{ clave: 'e', nombre: 'Enzo Espiño', usuarioId: 'u-enzo' }], dia, usuarios, [enzo])
    assert.deepEqual(r.filas.get('e'), { tipo: 'horas', horas: 8 })
  })

  test('tampoco se suma si tenía turno en Horarios y no fichó', () => {
    const belen = { nombre: 'GALLEGOS BELEN', profileId: null, nombresHorario: ['Belen'] }
    assert.deepEqual(
      armarDesdeReloj([], dia, usuarios, [belen]).mozos.map((m) => m.nombre),
      ['Enzo Espiño', 'Lucas Ibarra']
    )
  })
})

describe('la entrada y la salida, para que la cajera controle', () => {
  const detalle = (d: Partial<DetalleReloj>): DetalleReloj => ({
    entrada: '10:53',
    salida: '20:55',
    tramos: [{ desde: 653, hasta: 1255 }],
    estado: 'ok',
    falta: null,
    origen: 'reloj',
    ...d,
  })

  test('un día normal: a qué hora entró y salió, y cuánto estuvo', () => {
    assert.deepEqual(leerDetalle(detalle({}), 602), { linea: 'Entró 10:53 · salió 20:55 (10 h 02)', alerta: null })
  })

  test('si cortó, cada tramo (y una salida pasada la medianoche)', () => {
    const cortado = detalle({ entrada: '11:00', salida: '00:30', tramos: [{ desde: 660, hasta: 900 }, { desde: 1140, hasta: 1470 }] })
    assert.deepEqual(leerDetalle(cortado, 570), { linea: '11:00 a 15:00 y 19:00 a 00:30 (9 h 30)', alerta: null })
  })

  test('le falta la salida o la entrada: aviso', () => {
    const sinSalida = detalle({ salida: null, tramos: [], estado: 'incompleto', falta: 'salida' })
    assert.deepEqual(leerDetalle(sinSalida, null), { linea: 'Entró 10:53 · no fichó la salida', alerta: 'no fichó la salida' })
    const sinEntrada = detalle({ entrada: null, salida: '16:03', tramos: [], estado: 'incompleto', falta: 'entrada' })
    assert.deepEqual(leerDetalle(sinEntrada, null), { linea: 'No fichó la entrada · salió 16:03', alerta: 'no fichó la entrada' })
  })

  test('tres fichadas: falta o sobra una', () => {
    const impar = detalle({ entrada: '10:02', salida: '18:30', tramos: [], estado: 'incompleto' })
    assert.deepEqual(leerDetalle(impar, null), {
      linea: 'Fichó de 10:02 a 18:30, con una fichada de más o de menos',
      alerta: 'una fichada de más o de menos',
    })
  })

  test('si un encargado ya le puso las horas a mano, no hay aviso pero se dice', () => {
    // Baldiviezo el 01/11: entró 07:32, no fichó la salida y le pusieron 4,5 h.
    const resuelta = detalle({ entrada: '07:32', salida: null, tramos: [], origen: 'manual' })
    assert.deepEqual(leerDetalle(resuelta, null), {
      linea: 'Entró 07:32 · no fichó la salida: un encargado le puso las horas a mano',
      alerta: null,
    })
    const sinNada = detalle({ entrada: null, salida: null, tramos: [], origen: 'manual' })
    assert.deepEqual(leerDetalle(sinNada, null), { linea: 'Sin fichadas: un encargado le puso las horas a mano', alerta: null })
  })

  test('más de 17 h: revisar', () => {
    const larga = detalle({ entrada: '07:00', salida: '01:30', tramos: [{ desde: 420, hasta: 1530 }], estado: 'revisar' })
    assert.deepEqual(leerDetalle(larga, 1110), {
      linea: 'Entró 07:00 · salió 01:30 (18 h 30) · más de 17 h, revisar',
      alerta: 'más de 17 h',
    })
  })
})

describe('lo que llega de la base', () => {
  test('pasa los nombres de la base a los de la app y aguanta datos raros', () => {
    const datos = leerDatosReloj({
      semana: '2026-10-26',
      personas: [
        {
          nombre: 'IBARRA LUCAS DAMIAN',
          profile_id: null,
          nombres_horario: ['Lucas Ibarra', 3],
          horas: '8.0',
          minutos: 489,
          estado: 'ok',
          cargo: 'MOZO',
          puesto: null,
          horario: [{ sector: 'CAMAREROS', celda: '10 a 18.30' }, { celda: 'sin sector' }],
        },
        { nombre: 'AGUIRRE RAQUEL NOEMI', horas: null, horario: null },
        { horas: 3 },
        null,
      ],
      sin_reloj: [{ sector: 'CAMAREROS', nombre: 'Belen', celda: null }, { nombre: 'sin sector' }],
    })
    assert.deepEqual(datos, {
      personas: [
        {
          nombre: 'IBARRA LUCAS DAMIAN',
          profileId: null,
          nombresHorario: ['Lucas Ibarra'],
          horas: 8,
          minutos: 489,
          cargo: 'MOZO',
          puesto: null,
          horario: [{ sector: 'CAMAREROS', celda: '10 a 18.30' }],
          // Antes del SQL nuevo no vienen la entrada ni la salida.
          detalle: null,
        },
        {
          nombre: 'AGUIRRE RAQUEL NOEMI',
          profileId: null,
          nombresHorario: [],
          horas: null,
          minutos: null,
          cargo: null,
          puesto: null,
          horario: [],
          detalle: null,
        },
      ],
      sinReloj: [{ sector: 'CAMAREROS', nombre: 'Belen', celda: null }],
    })
    assert.deepEqual(leerDatosReloj(null), { personas: [], sinReloj: [] })
  })

  test('con el SQL nuevo, la entrada, la salida y lo que falta', () => {
    const datos = leerDatosReloj({
      personas: [
        {
          nombre: 'ESPIÑO ENZO LUCIANO',
          horas: 8,
          minutos: 474,
          estado: 'ok',
          origen: 'reloj',
          entrada: '13:08',
          salida: '21:02',
          tramos: [{ desde: 788, hasta: 1262 }, { desde: 'x', hasta: 2 }],
          falta: null,
        },
        { nombre: 'AGUIRRE RAQUEL NOEMI', horas: null, estado: 'incompleto', origen: 'reloj', entrada: '07:38:00', salida: null, tramos: null, falta: 'salida' },
      ],
    })
    assert.deepEqual(
      datos.personas.map((p) => p.detalle),
      [
        { entrada: '13:08', salida: '21:02', tramos: [{ desde: 788, hasta: 1262 }], estado: 'ok', falta: null, origen: 'reloj' },
        { entrada: '07:38', salida: null, tramos: [], estado: 'incompleto', falta: 'salida', origen: 'reloj' },
      ]
    )
  })
})

describe('las horas de la propina van de a cuarto', () => {
  test('desde los minutos reales; si un encargado corrigió la celda a mano, valen sus horas', () => {
    assert.equal(horasParaPropina({ horas: 8, minutos: 489 }), 8.25) // Lucas Ibarra, 8 h 09
    assert.equal(horasParaPropina({ horas: 9, minutos: 531 }), 8.75) // Gabriel Cansino, 8 h 51
    assert.equal(horasParaPropina({ horas: 9.5, minutos: 585 }), 9.75) // Brisa Di Scala, 9 h 45
    assert.equal(horasParaPropina({ horas: 9, minutos: 536 }), 9) // Nicolás Fuentes, 8 h 56
    // A mano: el reloj daba 8 h 09 y el encargado puso 9.
    assert.equal(horasParaPropina({ horas: 9, minutos: 489 }), 9)
    // Sin minutos (cargada a mano desde cero): sus horas.
    assert.equal(horasParaPropina({ horas: 8.5, minutos: null }), 8.5)
    assert.equal(horasParaPropina({ horas: null, minutos: 489 }), null)
    assert.equal(horasParaPropina({ horas: 0, minutos: 0 }), null)
  })

  test('al guardar no deja horas que no sean de a cuarto', () => {
    const con = (horas: number) => validarCarga('2026-10-31', 300000, 45000, [{ nombre: 'Lucas Ibarra', grupo: 'camarero', horas, pago: null, efectivo: null }])
    for (const bien of [8, 8.25, 8.5, 8.75, 12.75, 0.25]) assert.equal(con(bien), null, String(bien))
    assert.equal(con(8.3), 'Las horas de Lucas Ibarra van de a cuarto: 8, 8,25, 8,5 u 8,75.')
    assert.equal(con(8.1), 'Las horas de Lucas Ibarra van de a cuarto: 8, 8,25, 8,5 u 8,75.')
  })
})
