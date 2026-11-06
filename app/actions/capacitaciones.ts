'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Resultado = { ok: true } | { ok: false; error: string }

const ID = /^[0-9a-f-]{36}$/i
const FALTA_SQL =
  'Falta correr el SQL nuevo de la charla (supabase/fix_charla_art_examen_en_inicio.sql) en Supabase.'

function revalidar(guideId: string) {
  revalidatePath('/dashboard')
  revalidatePath('/admin/guides')
  revalidatePath('/admin/guides/' + guideId + '/asistencia')
}

/**
 * La respuesta a "¿Participaste de la charla?" (la de la ART), desde la
 * tarjeta de Inicio. Con SÍ, la pantalla lo manda derecho al examen; con NO
 * queda registrado y no rinde. Se contesta una sola vez: para cambiarla, un
 * encargado la borra y se le vuelve a preguntar.
 */
export async function responderCharlaAction(guideId: string, participo: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Iniciá sesión para contestar.' }
  if (!ID.test(guideId)) return { ok: false, error: 'No se encontró esa charla.' }

  // El SÍ va sin la columna (vale por defecto): así anda aunque falte el SQL nuevo.
  const fila: { guide_id: string; user_id: string; participo?: boolean } = {
    guide_id: guideId,
    user_id: session.user.id,
  }
  if (!participo) fila.participo = false
  const { error } = await supabase.from('capacitacion_asistencias').insert(fila)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Ya habías contestado. Si te equivocaste, pedile a un encargado que lo borre.' }
    }
    if (/participo/i.test(error.message)) return { ok: false, error: FALTA_SQL }
    if (/capacitacion_asistencias|schema cache|does not exist/i.test(error.message)) {
      return { ok: false, error: 'Falta correr el SQL de la charla (supabase/add_charla_art.sql) en Supabase.' }
    }
    if (/row-level security/i.test(error.message)) return { ok: false, error: 'Esto no es una charla para contestar.' }
    return { ok: false, error: error.message }
  }

  revalidar(guideId)
  return { ok: true }
}

/**
 * Un encargado borra lo que contestó alguien (por ejemplo, tocó NO sin
 * querer): la próxima vez que entre, se le vuelve a preguntar. No toca los
 * exámenes que haya rendido.
 */
export async function borrarRespuestaCharlaAction(guideId: string, userId: string): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Iniciá sesión.' }
  if (!ID.test(guideId) || !ID.test(userId)) return { ok: false, error: 'No se encontró esa respuesta.' }

  const { data, error } = await supabase
    .from('capacitacion_asistencias')
    .delete()
    .eq('guide_id', guideId)
    .eq('user_id', userId)
    .select('user_id')
  if (error) return { ok: false, error: error.message }
  // Sin permiso, la base no borra nada y tampoco avisa: se controla acá.
  if (!data || data.length === 0) {
    return { ok: false, error: 'No se borró: solo un encargado puede hacerlo, o ya estaba borrada.' }
  }

  revalidar(guideId)
  return { ok: true }
}
