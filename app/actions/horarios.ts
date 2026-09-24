'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  copiarDatos,
  lunesDe,
  semanaVacia,
  validarDatos,
  type DatosHorario,
} from '@/lib/horarios'

type Resultado<T = undefined> = { ok: true; value?: T } | { ok: false; error: string }

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

function revalidarTodo(id?: string) {
  revalidatePath('/admin/horarios')
  if (id) revalidatePath('/admin/horarios/' + id)
  revalidatePath('/dashboard/horario')
  revalidatePath('/dashboard')
}

/**
 * Crea la planilla de una semana. Por defecto copia la última que exista, que
 * es lo que se hace en Excel: se arranca de la anterior y se cambia lo que
 * cambia. Si no hay ninguna, arranca vacía.
 */
export async function crearSemanaAction(
  fecha: string,
  copiarAnterior: boolean
): Promise<Resultado<string>> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: 'Fecha inválida.' }
  const lunes = lunesDe(fecha)

  const { data: existente } = await supabase
    .from('schedule_weeks')
    .select('id')
    .eq('week_start', lunes)
    .maybeSingle()
  if (existente) {
    return { ok: false, error: 'Esa semana ya existe. Abrila desde la lista para editarla.' }
  }

  let datos: DatosHorario = semanaVacia()
  if (copiarAnterior) {
    const { data: anterior } = await supabase
      .from('schedule_weeks')
      .select('data')
      .lt('week_start', lunes)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (anterior && validarDatos(anterior.data)) datos = copiarDatos(anterior.data)
  }

  const { data: creada, error } = await supabase
    .from('schedule_weeks')
    .insert({ week_start: lunes, status: 'draft', data: datos, updated_by: session.user.id })
    .select('id')
    .single()
  if (error || !creada) return { ok: false, error: 'No se pudo crear: ' + (error?.message ?? '') }

  revalidarTodo()
  return { ok: true, value: creada.id as string }
}

/**
 * Guarda la planilla. Recibe cuándo se guardó por última vez lo que el
 * encargado tiene abierto: si en el medio la guardó otro, no pisa nada y
 * avisa. Sin esto, dos encargados editando a la vez se borrarían los cambios
 * sin enterarse.
 */
export async function guardarSemanaAction(
  id: string,
  datos: DatosHorario,
  versionQueTengo: string
): Promise<Resultado<string>> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  if (!validarDatos(datos)) {
    return { ok: false, error: 'Los datos no tienen la forma esperada. No se guardó nada.' }
  }

  const ahora = new Date().toISOString()
  const { data: guardada, error } = await supabase
    .from('schedule_weeks')
    .update({ data: datos, updated_at: ahora, updated_by: session.user.id })
    .eq('id', id)
    .eq('updated_at', versionQueTengo)
    .select('updated_at')
    .maybeSingle()

  if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message }
  if (!guardada) {
    return {
      ok: false,
      error:
        'Otra persona guardó cambios en esta semana mientras la editabas. Recargá la página para ver la versión nueva antes de seguir.',
    }
  }

  revalidatePath('/dashboard/horario')
  return { ok: true, value: guardada.updated_at as string }
}

export async function publicarSemanaAction(id: string, publicar: boolean): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const { error } = await supabase
    .from('schedule_weeks')
    .update({
      status: publicar ? 'published' : 'draft',
      published_at: publicar ? new Date().toISOString() : null,
    })
    .eq('id', id)
  if (error) return { ok: false, error: 'No se pudo cambiar: ' + error.message }

  revalidarTodo(id)
  return { ok: true }
}

/** Solo borradores: una semana publicada ya la vio el personal. */
export async function borrarSemanaAction(id: string): Promise<Resultado> {
  const { supabase, session } = await requireAdmin()
  if (!session) return { ok: false, error: 'No tenés permiso para hacer esto.' }

  const { data: borrada, error } = await supabase
    .from('schedule_weeks')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()
  if (error) return { ok: false, error: 'No se pudo borrar: ' + error.message }
  if (!borrada) {
    return { ok: false, error: 'Solo se pueden borrar borradores. Despublicala primero.' }
  }

  revalidarTodo()
  return { ok: true }
}
