// Pruebas de las sugerencias del reloj (lib/planilla-reloj.ts), con nombres reales.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { emparejarHoras, sinSector, sugerirEmpleados, type EmpleadoParaSugerir } from '@/lib/planilla-reloj'

const empleados: EmpleadoParaSugerir[] = [
  { id: '1', nombre: 'VALLEJOS GISELLE MARIA', conReloj: false },
  { id: '2', nombre: 'MATIAS MILLAN', conReloj: false },
  { id: '3', nombre: 'FERNANDEZ ORNELLA', conReloj: true },
  { id: '4', nombre: 'FERNANDEZ JAZMIN', conReloj: true },
  { id: '5', nombre: 'MOISES', conReloj: false },
  { id: '6', nombre: 'LUCAS LOPEZ', conReloj: true },
  { id: '7', nombre: 'LOPEZ IGNACIO GASTON', conReloj: true },
  { id: '8', nombre: 'ESPIÑO ENZO LUCIANO', conReloj: true },
]
const ids = (nombre: string) => sugerirEmpleados(nombre, empleados).map((c) => c.id)

describe('sugerencias del reloj', () => {
  test('dos palabras con prefijo común de más de 3 letras: GISELA es GISELLE', () => {
    assert.deepEqual(ids('VALLEJOS GISELA'), ['1'])
  })

  test('las tildes y las mayúsculas no importan', () => {
    assert.deepEqual(ids('enzo espino'), ['8'])
  })

  test('una sola palabra en común no alcanza: FEDERICO FERNANDEZ no es nadie', () => {
    assert.deepEqual(ids('FEDERICO FERNANDEZ'), [])
  })

  test('MILIAN y MILLAN comparten solo 3 letras: no se sugiere', () => {
    assert.deepEqual(ids('MATIAS MILIAN'), [])
  })

  test('el sector usado de apellido no cuenta, y un nombre suelto se sugiere como dudoso', () => {
    const c = sugerirEmpleados('MOISES COCINA', empleados)
    assert.deepEqual(c, [{ id: '5', nombre: 'MOISES', dudoso: true }])
  })

  test('un nombre suelto no se sugiere a quien ya tiene número del reloj', () => {
    assert.deepEqual(ids('LOPEZ'), [])
  })

  test('IGNACIO LOPEZ es LOPEZ IGNACIO GASTON y no LUCAS LOPEZ', () => {
    assert.deepEqual(ids('IGNACIO LOPEZ'), ['7'])
  })

  test('sacar el sector del nombre del reloj', () => {
    assert.equal(sinSector('LURDES COCINA'), 'LURDES')
    assert.equal(sinSector('Abril Castro'), 'ABRIL CASTRO')
    assert.equal(sinSector('COCINA'), 'COCINA')
  })
})

describe('propinas: horas del reloj para la lista del día', () => {
  const delReloj = [
    { nombre: 'ROCIO CONDE', profileId: 'u-rocio', nombresHorario: ['Rocio Conde'], horas: 8.5 },
    { nombre: 'AGUIRRE RAQUEL NOEMI', profileId: null, nombresHorario: ['Raquel Aguirre'], horas: 8 },
    { nombre: 'FUENTES NICOLAS LEANDRO', profileId: null, nombresHorario: [], horas: 9.5 },
    { nombre: 'LUCAS LOPEZ', profileId: null, nombresHorario: ['Lucas Lopez'], horas: 7 },
    { nombre: 'IBARRA LUCAS DAMIAN', profileId: null, nombresHorario: ['Lucas Ibarra'], horas: 6 },
  ]

  test('por usuario, por nombre de Horarios y por la regla de las 2 palabras; ante la duda, nada', () => {
    const r = emparejarHoras(
      [
        { clave: '1', nombre: 'Rocío', usuarioId: 'u-rocio' },
        { clave: '2', nombre: 'Raquel Aguirre', usuarioId: null },
        { clave: '3', nombre: 'Nicolás Fuentes', usuarioId: null },
        { clave: '4', nombre: 'Lucas', usuarioId: null },
        { clave: '5', nombre: 'Pamela Almada', usuarioId: null },
        { clave: '6', nombre: '', usuarioId: null },
      ],
      delReloj
    )
    assert.deepEqual(Object.fromEntries(r.horas), { 1: 8.5, 2: 8, 3: 9.5 })
    assert.deepEqual(r.sinHoras, ['Lucas', 'Pamela Almada'])
  })

  test('las mismas horas no se le dan a dos personas', () => {
    const r = emparejarHoras(
      [
        { clave: 'a', nombre: 'Lucas Lopez', usuarioId: null },
        { clave: 'b', nombre: 'Lucas Lopez', usuarioId: null },
      ],
      delReloj
    )
    assert.deepEqual(Object.fromEntries(r.horas), { a: 7 })
    assert.deepEqual(r.sinHoras, ['Lucas Lopez'])
  })
})
