'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
