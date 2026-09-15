'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface PathItem {
  guide_id: string
  etiqueta: string
}

interface Result {
  ok: boolean
  error?: string
}

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

  return { supabase, session: profile?.role === 'admin' ? session : null }
}

/**
 * Reemplaza el recorrido completo de un puesto.
 *
 * Se puede borrar y volver a insertar sin miedo, al revés que con
 * exam_questions: nada cuelga de guide_paths, así que no hay cascada que
 * se lleve puestos datos de nadie.
 */
export async function saveGuidePathAction(puesto: string, items: PathItem[]): Promise<Result> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  if (!puesto.trim()) return { ok: false, error: 'Falta el puesto.' }

  // Que no entren dos veces la misma guía.
  const vistos = new Set<string>()
  for (const it of items) {
    if (vistos.has(it.guide_id)) {
      return { ok: false, error: 'Hay una guía repetida en el recorrido.' }
    }
    vistos.add(it.guide_id)
  }

  const { error: delErr } = await supabase.from('guide_paths').delete().eq('puesto', puesto)
  if (delErr) return { ok: false, error: 'No se pudo guardar: ' + delErr.message }

  if (items.length > 0) {
    const { error: insErr } = await supabase.from('guide_paths').insert(
      items.map((it, i) => ({
        puesto,
        guide_id: it.guide_id,
        orden: i + 1,
        etiqueta: it.etiqueta.trim() || 'Guía ' + (i + 1),
      }))
    )
    if (insErr) return { ok: false, error: 'No se pudo guardar: ' + insErr.message }
  }

  revalidatePath('/admin/guides')
  revalidatePath('/admin/guides/puesto/' + encodeURIComponent(puesto))
  revalidatePath('/dashboard/guides')
  revalidatePath('/dashboard/guides/puesto/' + encodeURIComponent(puesto))
  return { ok: true }
}
