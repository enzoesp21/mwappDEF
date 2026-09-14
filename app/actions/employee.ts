'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { nextPeriod } from '@/lib/month-utils'

export type ActionResult = { ok: true } | { ok: false; error: string }

/** Guarda o cambia el voto del período que viene. */
export async function castVoteAction(candidateId: string, comment: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Se cerró tu sesión. Volvé a iniciar sesión.' }

  if (candidateId === session.user.id) {
    return { ok: false, error: 'No podés votarte a vos mismo.' }
  }

  const { data: candidate } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('id', candidateId)
    .single()

  if (!candidate || candidate.status !== 'approved') {
    return { ok: false, error: 'Esa persona no está activa en el equipo.' }
  }

  const { error } = await supabase.from('employee_votes').upsert(
    {
      period: nextPeriod(),
      voter_id: session.user.id,
      candidate_id: candidateId,
      comment: comment.trim() === '' ? null : comment.trim(),
    },
    { onConflict: 'period,voter_id' }
  )

  if (error) return { ok: false, error: 'No se pudo guardar el voto: ' + error.message }

  revalidatePath('/dashboard/empleado-del-mes')
  revalidatePath('/admin/empleado-del-mes')
  return { ok: true }
}

/** Publica (o reemplaza) el empleado del mes de un período. */
export async function publishEmployeeAction(
  period: string,
  userId: string,
  photoUrl: string | null,
  message: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Se cerró tu sesión. Volvé a iniciar sesión.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profile?.role !== 'admin') return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const { error } = await supabase.from('employee_of_month').upsert(
    {
      period,
      user_id: userId,
      photo_url: photoUrl,
      message: message.trim() === '' ? null : message.trim(),
      created_by: session.user.id,
    },
    { onConflict: 'period' }
  )

  if (error) return { ok: false, error: 'No se pudo publicar: ' + error.message }

  await supabase.from('notifications').insert({
    user_id: userId,
    message: '¡Te eligieron empleado del mes! Pasá por la app para verlo.',
  })

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/empleado-del-mes')
  revalidatePath('/admin/empleado-del-mes')
  return { ok: true }
}

export async function unpublishEmployeeAction(period: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Se cerró tu sesión.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profile?.role !== 'admin') return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const { error } = await supabase.from('employee_of_month').delete().eq('period', period)
  if (error) return { ok: false, error: 'No se pudo quitar: ' + error.message }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/empleado-del-mes')
  revalidatePath('/admin/empleado-del-mes')
  return { ok: true }
}
