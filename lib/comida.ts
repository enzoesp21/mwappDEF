/**
 * Cuántas comidas le faltan contestar a cada uno (Enzo, 06/11: "no todos
 * están en todos los horarios").
 *
 * - Cada comida se contesta con una opción de menú o con "No vengo" ('no').
 * - Los días de franco del horario publicado de esa semana cuentan solos como
 *   "No vengo": no hace falta tocarlos, pero se pueden cambiar.
 * - Franco es lo que en la planilla dice "X", "VAC", "LIC" o "M9" (trabaja en
 *   Mirador 9). Una celda vacía no se sabe qué es: se sigue preguntando.
 *
 * Lógica pura: no lee la base ni la hora.
 */

import { tipoCelda, type DatosHorario, type PersonaHorario } from '@/lib/horarios'
import type { WeekDay } from '@/lib/meals-utils'

export function claveComida(fecha: string, comida: string): string {
  return fecha + '|' + comida
}

/**
 * Las fechas en que la persona tiene franco según el horario de esa semana.
 * `filas` son sus filas en el horario (puede estar en dos sectores): es
 * franco solo si no trabaja en ninguna. Sin horario o sin encontrarla, no
 * hay ninguno y se pregunta todo, como siempre.
 */
export function francosSegunHorario(
  datos: DatosHorario | null,
  filas: PersonaHorario[],
  semana: WeekDay[]
): Set<string> {
  const francos = new Set<string>()
  if (!datos || filas.length === 0) return francos
  semana.forEach((dia, i) => {
    const libre = filas.every((p) => {
      const tipo = tipoCelda(p.dias[i] ?? '')
      return tipo === 'libre' || tipo === 'vacaciones' || tipo === 'licencia' || tipo === 'otro_lugar'
    })
    if (libre) francos.add(dia.date)
  })
  return francos
}

/** Las comidas de la semana que todavía no contestó (ni eligió ni es franco). */
export function comidasSinContestar(
  semana: WeekDay[],
  contestadas: Set<string>,
  francos: Set<string>
): number {
  let faltan = 0
  for (const dia of semana) {
    if (francos.has(dia.date)) continue
    for (const comida of dia.meals) {
      if (!contestadas.has(claveComida(dia.date, comida))) faltan++
    }
  }
  return faltan
}
