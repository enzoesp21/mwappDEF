'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PUESTOS } from '@/lib/types'

export type ApprovalResult = { ok: true } | { ok: false; error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') return { supabase, session: null }
  return { supabase, session }
}

export async function setExperienceAction(
  experience: 'nuevo' | 'experimentado'
): Promise<ApprovalResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Se cerró tu sesión. Volvé a iniciar sesión.' }

  const { error } = await supabase
    .from('profiles')
    .update({ experience, onboarded_at: new Date().toISOString() })
    .eq('id', session.user.id)

  if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message }

  // 'layout' para que también se invalide en las rutas anidadas, si no al
  // navegar a la guía el layout seguiría mostrando el onboarding.
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

export async function deleteUserAction(userId: string): Promise<ApprovalResult> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  if (userId === session.user.id) {
    return { ok: false, error: 'No podés eliminar tu propia cuenta.' }
  }

  const { error } = await supabase.rpc('delete_user_completely', { p_user_id: userId })
  if (error) return { ok: false, error: 'No se pudo eliminar: ' + error.message }

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { ok: true }
}

export async function setUserStatusAction(
  userId: string,
  status: 'approved' | 'rejected' | 'inactive'
): Promise<ApprovalResult> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  if (userId === session.user.id) {
    return { ok: false, error: 'No podés cambiar tu propio estado.' }
  }

  const { error } = await supabase.from('profiles').update({ status }).eq('id', userId)
  if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message }

  // Al dar de baja no se notifica: la persona ya no entra a la app.
  if (status !== 'inactive') {
    const message =
      status === 'approved'
        ? 'Tu acceso fue aprobado. Ya podés usar la aplicación.'
        : 'Tu solicitud de acceso fue rechazada. Consultá con el encargado.'

    await supabase.from('notifications').insert({ user_id: userId, message })
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { ok: true }
}

/**
 * Corrige el nombre de una persona desde el panel.
 *
 * Solo el nombre: el rol, el estado y el puesto siguen protegidos por el
 * trigger de la base, y esta acción no los toca.
 */
export async function updateUserNameAction(
  userId: string,
  fullName: string
): Promise<ApprovalResult> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  // Se guarda sin espacios de sobra, aunque el admin no haya usado el botón
  // de sugerencia: un nombre con espacios al final desordena el ranking.
  const limpio = fullName.replace(/\s+/g, ' ').trim()

  if (limpio.length < 2) return { ok: false, error: 'El nombre es demasiado corto.' }
  if (limpio.length > 80) return { ok: false, error: 'El nombre es demasiado largo.' }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: limpio })
    .eq('id', userId)
  if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message }

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  revalidatePath('/dashboard/resultados')
  return { ok: true }
}

/**
 * Pasa a alguien de "nuevo" a "del equipo", o al revés.
 *
 * Hace falta: mientras alguien figura como nuevo solo ve las guías de su
 * puesto, y sin esto quedaría encerrado ahí para siempre — la persona solo
 * puede elegirlo una vez, en la pantalla de bienvenida.
 */
export async function setUserExperienceAction(
  userId: string,
  experience: 'nuevo' | 'experimentado'
): Promise<ApprovalResult> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const { error } = await supabase.from('profiles').update({ experience }).eq('id', userId)
  if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message }

  revalidatePath('/admin/users')
  revalidatePath('/dashboard/guides', 'layout')
  return { ok: true }
}

/**
 * Da o saca el permiso de cargar propinas. Lo usan los cajeros; los admin
 * pueden siempre, sin necesidad de tildarlo.
 */
export async function setCargaPropinasAction(
  userId: string,
  valor: boolean
): Promise<ApprovalResult> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const { data, error } = await supabase
    .from('profiles')
    .update({ carga_propinas: valor })
    .eq('id', userId)
    .select('id')
  if (error) {
    return {
      ok: false,
      error: /carga_propinas/.test(error.message)
        ? 'Falta correr el SQL de propinas (supabase/add_propinas.sql) en Supabase.'
        : 'No se pudo guardar: ' + error.message,
    }
  }
  if (!data || data.length === 0) return { ok: false, error: 'No se guardó: no se encontró el usuario.' }

  revalidatePath('/admin/users')
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}

/**
 * Corrige el puesto de alguien (hay quien se registra en el que no es).
 * Cambia las guías que ve: su recorrido sale de guide_paths según el puesto.
 */
export async function setUserPuestoAction(userId: string, puesto: string): Promise<ApprovalResult> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  if (!(PUESTOS as readonly string[]).includes(puesto)) {
    return { ok: false, error: 'Ese puesto no existe.' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ puesto })
    .eq('id', userId)
    .select('id')
  if (error) return { ok: false, error: 'No se pudo cambiar el puesto: ' + error.message }
  if (!data || data.length === 0) return { ok: false, error: 'No se guardó: no se encontró el usuario.' }

  revalidatePath('/admin/users')
  revalidatePath('/dashboard', 'layout')
  return { ok: true }
}
