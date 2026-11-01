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
  nombreParaPropinas,
  tipoEnElSalon,
  type DatosRelojPropinas,
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
  return { profileId: null, nombresHorario: [], horas: null, minutos: null, cargo: null, puesto: null, horario: [], ...p }
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
        },
        { nombre: 'AGUIRRE RAQUEL NOEMI', profileId: null, nombresHorario: [], horas: null, minutos: null, cargo: null, puesto: null, horario: [] },
      ],
      sinReloj: [{ sector: 'CAMAREROS', nombre: 'Belen', celda: null }],
    })
    assert.deepEqual(leerDatosReloj(null), { personas: [], sinReloj: [] })
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
