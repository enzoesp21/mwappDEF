// Lo que se lee de la base para la comida semanal: los francos de cada uno
// según el horario publicado de esa semana. La lógica está en lib/comida.ts.

import type { SupabaseClient } from '@supabase/supabase-js'
import { buscarPersona, validarDatos, type DatosHorario } from '@/lib/horarios'
import { misNombresDeHorario } from '@/lib/horarios-datos'
import { francosSegunHorario } from '@/lib/comida'
import type { WeekDay } from '@/lib/meals-utils'

/**
 * Los días de franco de una persona en la semana de la comida, si el horario
 * de esa semana ya está publicado y se la encuentra (con la misma búsqueda
 * que su pantalla de Horario). Si algo falla, no hay ninguno: se le pregunta
 * todo, que es lo seguro (nunca le saca un plato a nadie).
 */
export async function francosDeLaSemana(
  supabase: SupabaseClient,
  nombreCompleto: string,
  semana: WeekDay[]
): Promise<Set<string>> {
  if (semana.length === 0 || !nombreCompleto.trim()) return new Set()
  const [{ data: horario }, { data: usuarios }, propios] = await Promise.all([
    supabase
      .from('schedule_weeks')
      .select('data')
      .eq('week_start', semana[0].date)
      .eq('status', 'published')
      .maybeSingle(),
    supabase.from('profiles').select('full_name'),
    misNombresDeHorario(supabase),
  ])
  if (!horario || !validarDatos(horario.data)) return new Set()
  const datos = horario.data as DatosHorario
  const otros = (usuarios ?? []).map((u) => (u.full_name as string) ?? '')
  const filas = buscarPersona(datos, nombreCompleto, otros, propios).map((f) => f.persona)
  return francosSegunHorario(datos, filas, semana)
}
