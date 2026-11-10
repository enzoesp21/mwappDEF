// Lo que se lee de la base para las capacitaciones para todo el personal (la
// charla de la ART). La lógica está en lib/capacitaciones.ts. Sirve con el
// cliente del servidor y con el del navegador (el perfil se arma en el
// navegador).

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  armarCapacitaciones,
  type Capacitacion,
  type FilaRespuesta,
  type FilaResultadoCapacitacion,
} from '@/lib/capacitaciones'

/**
 * Las capacitaciones de una persona, con lo que contestó a "¿Participaste de
 * la charla?" y sus intentos (con la firma). Si todavía no se corrió el SQL de
 * la charla, no hay ninguna; cualquier otro problema vuelve como error, para
 * no mostrar "te falta" a quien ya aprobó.
 */
export async function traerCapacitaciones(
  supabase: SupabaseClient,
  userId: string
): Promise<{ capacitaciones: Capacitacion[]; error: string | null }> {
  const [guiasRes, examenesRes, respuestasRes] = await Promise.all([
    // '*' por capacitacion_cerrada, que es más nueva: sin ella, todas abiertas.
    supabase.from('guides').select('*').eq('para_todos', true),
    supabase.from('exams').select('id, guide_id, passing_score'),
    // '*' por la columna participo, que es más nueva.
    supabase.from('capacitacion_asistencias').select('*').eq('user_id', userId),
  ])
  if (guiasRes.error) {
    // Sin el SQL de la charla no existe para_todos: no hay capacitaciones.
    if (/para_todos|schema cache|does not exist/i.test(guiasRes.error.message)) return { capacitaciones: [], error: null }
    return { capacitaciones: [], error: guiasRes.error.message }
  }
  const guias = guiasRes.data ?? []
  if (guias.length === 0) return { capacitaciones: [], error: null }
  const error = examenesRes.error ?? respuestasRes.error
  if (error) return { capacitaciones: [], error: error.message }

  const ids = new Set(guias.map((g) => g.id as string))
  const examenes = (examenesRes.data ?? []).filter((e) => ids.has(e.guide_id as string))
  const resultadosRes = examenes.length
    ? await supabase
        .from('exam_results')
        .select('id, exam_id, score, passed, completed_at, review_status, signature_data')
        .eq('user_id', userId)
        .in(
          'exam_id',
          examenes.map((e) => e.id as string)
        )
    : { data: [], error: null }
  if (resultadosRes.error) return { capacitaciones: [], error: resultadosRes.error.message }

  return {
    capacitaciones: armarCapacitaciones({
      guias: guias.map((g) => ({
        id: g.id as string,
        title: g.title as string,
        created_at: g.created_at as string,
        capacitacion_cerrada: g.capacitacion_cerrada === true,
      })),
      examenes: examenes.map((e) => ({
        id: e.id as string,
        guide_id: e.guide_id as string,
        passing_score: e.passing_score as number,
      })),
      resultados: (resultadosRes.data ?? []) as FilaResultadoCapacitacion[],
      respuestas: (respuestasRes.data ?? []) as FilaRespuesta[],
    }),
    error: null,
  }
}
