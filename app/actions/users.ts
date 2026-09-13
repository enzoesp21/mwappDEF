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

export async function setUserStatusAction(
  userId: string,
  status: 'approved' | 'rejected'
): Promise<ApprovalResult> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  if (userId === session.user.id) {
    return { ok: false, error: 'No podés cambiar tu propio estado.' }
  }

  const { error } = await supabase.from('profiles').update({ status }).eq('id', userId)
  if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message }

  const message =
    status === 'approved'
      ? 'Tu acceso fue aprobado. Ya podés usar la aplicación.'
      : 'Tu solicitud de acceso fue rechazada. Consultá con el encargado.'

  await supabase.from('notifications').insert({ user_id: userId, message })

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { ok: true }
}
