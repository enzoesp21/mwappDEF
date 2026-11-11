// El vínculo de cada usuario con su nombre en Horarios, que se lleva en la
// planilla (Fichadas → Empleados: usuario y "nombres en Horarios"). Lo usa
// buscarPersona (lib/horarios.ts).

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Los nombres en Horarios de quien está mirando. El personal no puede leer la
 * planilla: los pide con la RPC `mis_nombres_horario`
 * (add_horario_vinculo_planilla.sql). Si falla o no está vinculado, no hay
 * ninguno y se lo busca por nombre, como siempre.
 */
export async function misNombresDeHorario(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc('mis_nombres_horario')
  if (error || !Array.isArray(data)) return []
  return (data as unknown[]).filter((n): n is string => typeof n === 'string')
}

/** Para los encargados (pueden leer la planilla): los nombres en Horarios de cada usuario vinculado. */
export async function nombresDeHorarioPorUsuario(supabase: SupabaseClient): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('planilla_empleados')
    .select('profile_id, nombres_horario')
    .eq('activo', true)
    .not('profile_id', 'is', null)
  if (error) return {}
  const porUsuario: Record<string, string[]> = {}
  for (const e of data ?? []) {
    const nombres = Array.isArray(e.nombres_horario) ? (e.nombres_horario as string[]) : []
    porUsuario[e.profile_id as string] = [...(porUsuario[e.profile_id as string] ?? []), ...nombres]
  }
  return porUsuario
}
