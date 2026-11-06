'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; error: string }

/**
 * Anotarse a una capacitación para todo el personal (la charla de la ART):
 * queda registrado que estuvo. Cada uno se anota solo a sí mismo; la base
 * no deja anotarse a una guía que no sea de las de todo el personal.
 */
export async function anotarmeCapacitacionAction(guideId: string): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Iniciá sesión para anotarte.' }
  if (!/^[0-9a-f-]{36}$/i.test(guideId)) return { ok: false, error: 'No se encontró esa charla.' }

  const { error } = await supabase
    .from('capacitacion_asistencias')
    .insert({ guide_id: guideId, user_id: session.user.id })
  // Si ya estaba anotado, está bien igual.
  if (error && error.code !== '23505') {
    if (/capacitacion_asistencias|schema cache|does not exist/i.test(error.message)) {
      return { ok: false, error: 'Todavía no se puede anotar: falta correr el SQL de la charla (supabase/add_charla_art.sql).' }
    }
    if (/row-level security/i.test(error.message)) return { ok: false, error: 'Esta guía no es una charla para anotarse.' }
    return { ok: false, error: error.message }
  }
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/guides/' + guideId)
  revalidatePath('/admin/guides/' + guideId + '/asistencia')
  return { ok: true }
}
