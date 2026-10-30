'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { esRequisitoManual } from '@/lib/progresion'

type Resultado = { ok: true } | { ok: false; error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, session: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  return { supabase, session: profile?.role === 'admin' ? session : null }
}

/** Traduce el error de la base; si falta el SQL, dice cuál correr. */
function mensaje(error: { message: string }): string {
  if (/mozo_niveles|cambiar_nivel_mozo|marcar_requisito_mozo|schema cache/i.test(error.message)) {
    return 'Falta correr el SQL de progresión (supabase/add_progresion_mozos.sql) en Supabase.'
  }
  return error.message
}

function revalidar(userId: string) {
  revalidatePath('/admin/progresion')
  revalidatePath('/admin/progresion/' + userId)
  revalidatePath('/dashboard/progresion')
  revalidatePath('/dashboard')
  revalidatePath('/admin/propinas', 'layout')
  revalidatePath('/dashboard/propinas', 'layout')
}

/** Asigna el primer nivel, o sube o baja a alguien. El tiempo vuelve a contar desde hoy. */
export async function cambiarNivelAction(userId: string, nivel: number, motivo: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }
  if (![1, 2, 3].includes(nivel)) return { ok: false, error: 'El nivel tiene que ser 1, 2 o 3.' }

  const { error } = await supabase.rpc('cambiar_nivel_mozo', {
    p_user_id: userId,
    p_nivel: nivel,
    p_motivo: motivo.trim().slice(0, 500),
  })
  if (error) return { ok: false, error: mensaje(error) }
  revalidar(userId)
  return { ok: true }
}

/** Tilda o destilda un requisito que evalúa un encargado. */
export async function marcarRequisitoAction(userId: string, clave: string, cumplido: boolean): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }
  if (!esRequisitoManual(clave)) return { ok: false, error: 'Ese requisito no se tilda a mano.' }

  const { error } = await supabase.rpc('marcar_requisito_mozo', {
    p_user_id: userId,
    p_clave: clave,
    p_cumplido: cumplido,
  })
  if (error) return { ok: false, error: mensaje(error) }
  revalidar(userId)
  return { ok: true }
}

/** Deja asentado que un encargado lo revisó hoy, aunque no haya cambiado nada. */
export async function marcarRevisadoAction(userId: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const { data, error } = await supabase
    .from('mozo_niveles')
    .update({ revisado_at: new Date().toISOString(), updated_by: session.user.id })
    .eq('user_id', userId)
    .select('user_id')
  if (error) return { ok: false, error: mensaje(error) }
  if (!data || data.length === 0) return { ok: false, error: 'Primero asignale un nivel.' }
  revalidar(userId)
  return { ok: true }
}
