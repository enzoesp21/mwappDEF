// Pruebas del porcentaje de cada mozo (lib/propinas-grupos.ts): quién va al
// 100, al 75, al 50 o al 25 %, quién no es mozo, cómo se reconoce a cada uno
// en la lista del día y en qué parte de la pantalla del encargado va.

import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  armarListaGrupos,
  grupoConfigurado,
  grupoEfectivo,
  leerGruposConfigurados,
  marcadoNoMozo,
  seccionDe,
  type GrupoConfigurado,
} from '@/lib/propinas-grupos'

const grupos: GrupoConfigurado[] = [
  { nombre: 'IBARRA LUCAS DAMIAN', profileId: null, nombresHorario: ['Lucas Ibarra'], grupo: 'reducido' },
  { nombre: 'AGUIRRE RAQUEL NOEMI', profileId: null, nombresHorario: ['Raquel Aguirre'], grupo: 'camarero' },
  { nombre: 'ABRIL CASTRO', profileId: 'u-abril', nombresHorario: ['Abril Castro'], grupo: 'prueba' },
  { nombre: 'FUENTES NICOLAS LEANDRO', profileId: 'u-nico', nombresHorario: ['Nicolás Fuentes'], grupo: 'camarero' },
  { nombre: 'LUCAS LOPEZ', profileId: 'u-lucas', nombresHorario: ['Lucas Lopez'], grupo: 'camarero' },
  { nombre: 'FRANCIA BERON NICOLA', profileId: null, nombresHorario: ['Francia'], grupo: 'cuarto' },
  // Enzo: cargo MOZO en la planilla, pero es el encargado de salón.
  { nombre: 'ESPIÑO ENZO LUCIANO', profileId: 'u-enzo', nombresHorario: [], grupo: 'afuera' },
]

describe('el grupo de cada nombre de la lista', () => {
  test('por nombre de Horarios, por usuario y por la regla de las 2 palabras', () => {
    assert.deepEqual(grupoConfigurado('Lucas Ibarra', null, {}, grupos), { grupo: 'reducido', origen: 'grupos' })
    assert.deepEqual(grupoConfigurado('Abril Ayelen Valentina Castro Lucero', 'u-abril', {}, grupos), {
      grupo: 'prueba',
      origen: 'grupos',
    })
    assert.deepEqual(grupoConfigurado('Raquel Noemí Aguirre', null, {}, grupos), { grupo: 'camarero', origen: 'grupos' })
  })

  test('si tiene nivel en Progresión, manda el nivel', () => {
    // Nicolás está configurado al 100, pero en Progresión es nivel 1 (50 %).
    assert.deepEqual(grupoConfigurado('Nicolas Leandro Fuentes', 'u-nico', { 'u-nico': 1 }, grupos), {
      grupo: 'prueba',
      origen: 'progresion',
    })
    assert.deepEqual(grupoConfigurado('Alguien Sin Grupo', 'u-otro', { 'u-otro': 2 }, []), {
      grupo: 'reducido',
      origen: 'progresion',
    })
  })

  test('ante la duda, nada', () => {
    assert.equal(grupoConfigurado('Lucas', null, {}, grupos), null) // ¿Ibarra o López?
    assert.equal(grupoConfigurado('Pamela Almada', null, {}, grupos), null)
    assert.equal(grupoConfigurado('  ', null, {}, grupos), null)
    assert.equal(grupoConfigurado('Lucas Ibarra', null, {}, []), null)
  })

  test('al 25 %', () => {
    assert.deepEqual(grupoConfigurado('Francia', null, {}, grupos), { grupo: 'cuarto', origen: 'grupos' })
  })

  test('el que no es mozo no tiene porcentaje, y se sabe que no es mozo', () => {
    assert.equal(grupoConfigurado('Enzo Espiño', 'u-enzo', {}, grupos), null)
    assert.equal(marcadoNoMozo('Enzo Espiño', 'u-enzo', grupos), true)
    // Por la regla de las 2 palabras, aunque no tenga usuario vinculado.
    assert.equal(marcadoNoMozo('Enzo Espiño', null, grupos), true)
    assert.equal(marcadoNoMozo('Lucas Ibarra', null, grupos), false)
    assert.equal(marcadoNoMozo('', null, grupos), false)
  })

  test('lo que llega de la base', () => {
    assert.deepEqual(
      leerGruposConfigurados([
        { nombre: 'IBARRA LUCAS DAMIAN', profile_id: null, nombres_horario: ['Lucas Ibarra', 5], grupo: 'reducido' },
        { nombre: 'FRANCIA BERON NICOLA', grupo: 'cuarto' },
        { nombre: 'ESPIÑO ENZO LUCIANO', profile_id: 'u-enzo', grupo: 'afuera' },
        { nombre: 'X', grupo: 'otro' },
        { grupo: 'prueba' },
        null,
      ]),
      [
        { nombre: 'IBARRA LUCAS DAMIAN', profileId: null, nombresHorario: ['Lucas Ibarra'], grupo: 'reducido' },
        { nombre: 'FRANCIA BERON NICOLA', profileId: null, nombresHorario: [], grupo: 'cuarto' },
        { nombre: 'ESPIÑO ENZO LUCIANO', profileId: 'u-enzo', nombresHorario: [], grupo: 'afuera' },
      ]
    )
    assert.deepEqual(leerGruposConfigurados(null), [])
  })
})

describe('la lista para configurar', () => {
  const persona = (id: string, nombre: string, cargo: string | null, nombresHorario: string[], profileId: string | null = null) => ({
    id,
    nombre,
    cargo,
    nombresHorario,
    profileId,
  })
  const filas = armarListaGrupos({
    empleados: [
      persona('molina', 'MOLINA BRUNO EZEQUIEL', 'MOZO DE MOSTRADOR', ['Bruno Molina']),
      persona('zabala', 'URIEL ZABALA', 'PEON GENERAL', ['Uriel Zabala']),
      persona('ibarra', 'IBARRA LUCAS DAMIAN', 'MOZO', ['Lucas Ibarra']),
      persona('barcia', 'MARTINA BARCIA', 'PEON GENERAL', ['Martina Barcia']),
      persona('giuli', 'GIULIANA BARTELLONE', null, [], 'u-giuli'),
      persona('nico', 'FUENTES NICOLAS LEANDRO', 'MOZO', ['Nicolás Fuentes'], 'u-nico'),
      persona('facu', 'NUÑEZ FACUNDO RODRIGO', 'ENCARGADO', [], 'u-facu'),
      persona('alma', 'ALMA', null, []),
      persona('cajal', 'CAJAL LUIS OSCAR', 'AYUDANTE DE COCINA', ['Luis Cajal']),
      persona('enzo', 'ESPIÑO ENZO LUCIANO', 'MOZO', [], 'u-enzo'),
      persona('francia', 'FRANCIA BERON NICOLA', null, ['Francia']),
    ],
    grupos: [
      { empleadoId: 'ibarra', grupo: 'reducido' },
      { empleadoId: 'cajal', grupo: 'camarero' },
      { empleadoId: 'enzo', grupo: 'afuera' },
      { empleadoId: 'francia', grupo: 'cuarto' },
    ],
    puestoPorUsuario: new Map([
      ['u-giuli', 'Mozos'],
      ['u-nico', 'Mozos'],
      ['u-facu', 'Mozos'],
      ['u-enzo', 'Mozos'],
    ]),
    nivelPorUsuario: new Map([['u-nico', 1]]),
    sectores: [
      { nombre: 'BARRA', personas: [{ nombre: 'Bruno Molina', dias: [] }] },
      {
        nombre: 'CAMAREROS ',
        personas: [
          { nombre: 'Lucas Ibarra', dias: [] },
          { nombre: 'Martina Barcia ', dias: [] },
          { nombre: 'Nicolás  Fuentes', dias: [] },
          { nombre: 'Francia', dias: [] },
        ],
      },
      { nombre: 'COMISS / RUNNERS', personas: [{ nombre: 'Uriel Zabala', dias: [] }] },
      { nombre: 'COCINA', personas: [{ nombre: 'Luis Cajal', dias: [] }] },
    ],
  })

  test('en orden alfabético, con lo que es cada uno según Horarios, el cargo o el puesto', () => {
    assert.deepEqual(
      filas.map((f) => [f.nombre, f.tipo]),
      [
        ['Alma', null],
        ['Bruno Molina', null],
        ['Espiño Enzo Luciano', 'mozo'], // por el cargo MOZO de la planilla
        ['Francia', 'mozo'],
        ['Giuliana Bartellone', 'mozo'],
        ['Lucas Ibarra', 'mozo'],
        ['Luis Cajal', null],
        ['Martina Barcia', 'mozo'],
        ['Nicolás Fuentes', 'mozo'],
        ['Nuñez Facundo Rodrigo', null],
        ['Uriel Zabala', 'runner'],
      ]
    )
  })

  test('en qué parte de la pantalla va cada uno', () => {
    const seccion = Object.fromEntries(filas.map((f) => [f.id, seccionDe(f)]))
    assert.deepEqual(seccion, {
      alma: 'otros',
      molina: 'otros',
      enzo: 'afuera', // no es mozo, aunque su cargo diga MOZO
      francia: 'cuarto',
      giuli: 'sin', // mozo sin porcentaje: en la propina va al 100 %
      ibarra: 'reducido',
      cajal: 'camarero', // de cocina, pero alguien le puso porcentaje: se ve
      barcia: 'sin',
      nico: 'prueba', // su nivel 1 de Progresión manda
      facu: 'otros', // encargado: no es mozo para la propina
      zabala: 'otros', // runner sin porcentaje
    })
  })

  test('el detalle sale de Horarios, si no del cargo o del puesto', () => {
    const de = (id: string) => filas.find((f) => f.id === id)!
    assert.equal(de('ibarra').detalle, 'Camareros')
    assert.equal(de('zabala').detalle, 'Comiss / Runners')
    assert.equal(de('facu').detalle, 'Encargado')
    assert.equal(de('giuli').detalle, 'Mozos')
    assert.equal(de('alma').detalle, '')
  })

  test('el grupo configurado y el de Progresión, que manda', () => {
    const de = (id: string) => filas.find((f) => f.id === id)!
    assert.equal(de('ibarra').grupo, 'reducido')
    assert.equal(grupoEfectivo(de('ibarra')), 'reducido')
    assert.deepEqual(de('nico').nivel, { nivel: 1, grupo: 'prueba', userId: 'u-nico' })
    assert.equal(grupoEfectivo(de('nico')), 'prueba')
    assert.equal(grupoEfectivo(de('barcia')), null)
    assert.equal(grupoEfectivo(de('francia')), 'cuarto')
    assert.equal(grupoEfectivo(de('enzo')), null)
  })
})
