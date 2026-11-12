'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validarEvento, type DatosEvento } from '@/lib/eventos'
import { FALTA_SQL_EVENTOS, faltaSqlEventos, puedeVerEventos } from '@/lib/eventos-datos'

type Resultado = { ok: true; id: string } | { ok: false; error: string }

const SIN_PERMISO = 'No tenés permiso para el calendario de eventos. Lo da un encargado desde Usuarios.'

function traducir(mensaje: string): string {
  if (faltaSqlEventos(mensaje)) return FALTA_SQL_EVENTOS
  if (/row-level security/i.test(mensaje)) return SIN_PERMISO
  return 'No se pudo guardar: ' + mensaje
}

function revalidar() {
  revalidatePath('/admin/eventos')
  revalidatePath('/dashboard/eventos')
  revalidatePath('/dashboard')
}

async function sesionConPermiso() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, error: 'Iniciá sesión de nuevo.' }
  if (!(await puedeVerEventos(supabase, session.user.id))) return { supabase, error: SIN_PERMISO }
  return { supabase, error: null }
}

/** Carga una mesa o un evento nuevo, o cambia uno que ya está (si trae id). */
export async function guardarEventoAction(d: DatosEvento): Promise<Resultado> {
  const { supabase, error: sinPermiso } = await sesionConPermiso()
  if (sinPermiso) return { ok: false, error: sinPermiso }

  const revisado = validarEvento(d)
  if (!revisado.ok) return revisado
  const e = revisado.datos
  const fila = {
    fecha: e.fecha,
    tipo: e.tipo,
    comida: e.comida,
    hora: e.hora,
    hora_fin: e.horaFin,
    nombre: e.nombre,
    pax: e.pax,
    salon: e.salon || null,
    notas: e.notas,
  }

  if (e.id) {
    const { data, error } = await supabase.from('eventos').update(fila).eq('id', e.id).select('id')
    if (error) return { ok: false, error: traducir(error.message) }
    if (!data || data.length === 0) return { ok: false, error: 'No se guardó: ya no está (puede que alguien lo haya borrado).' }
    revalidar()
    return { ok: true, id: e.id }
  }

  const { data, error } = await supabase.from('eventos').insert(fila).select('id').single()
  if (error) return { ok: false, error: traducir(error.message) }
  revalidar()
  return { ok: true, id: String(data.id) }
}

export async function borrarEventoAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, error: sinPermiso } = await sesionConPermiso()
  if (sinPermiso) return { ok: false, error: sinPermiso }

  const { data, error } = await supabase.from('eventos').delete().eq('id', id).select('id')
  if (error) return { ok: false, error: traducir(error.message) }
  if (!data || data.length === 0) return { ok: false, error: 'No se borró: ya no estaba.' }
  revalidar()
  return { ok: true }
}
