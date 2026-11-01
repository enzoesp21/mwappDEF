// Pruebas de las sugerencias del reloj (lib/planilla-reloj.ts), con nombres reales.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { sinSector, sugerirEmpleados, type EmpleadoParaSugerir } from '@/lib/planilla-reloj'

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
