'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { puedeCargarPropinas } from '@/lib/propinas-datos'
import { filasValidas, limpiarNombre, FILAS_MAXIMO, type ClaveFilas } from '@/lib/plazas'
import { FALTA_SQL_PLAZAS, faltaSqlPlazas } from '@/lib/plazas-datos'

type Resultado = { ok: true } | { ok: false; error: string }

const SIN_PERMISO = 'La hoja de plazas la cambian las cajeras con permiso de propinas y los encargados.'
const CLAVES: ClaveFilas[] = ['desayuno_8', 'desayuno_10', 'almuerzo', 'merienda', 'cena', 'horas']

function traducir(m: string): string {
  if (faltaSqlPlazas(m)) return FALTA_SQL_PLAZAS
  if (/row-level security|permission denied|permiso/i.test(m)) return SIN_PERMISO
  return 'No se pudo guardar: ' + m
}

function revalidar() {
  revalidatePath('/admin/plazas')
  revalidatePath('/dashboard/plazas')
  revalidatePath('/plazas/imprimir')
}

async function conPermiso() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, error: 'Iniciá sesión de nuevo.' }
  if (!(await puedeCargarPropinas(supabase, session.user.id))) return { supabase, error: SIN_PERMISO }
  return { supabase, error: null }
}

/** Suma un mozo al final de la hoja. */
export async function agregarMozoPlazaAction(nombre: string): Promise<Resultado> {
  const limpio = limpiarNombre(nombre)
  if (!limpio) return { ok: false, error: 'Escribí el nombre del mozo.' }
  const { supabase, error: sinPermiso } = await conPermiso()
  if (sinPermiso) return { ok: false, error: sinPermiso }

  const { data: ultimo, error: errorUltimo } = await supabase
    .from('plazas_mozos')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errorUltimo) return { ok: false, error: traducir(errorUltimo.message) }
  const { error } = await supabase.from('plazas_mozos').insert({ nombre: limpio, orden: ((ultimo?.orden as number) ?? 0) + 1 })
  if (error) return { ok: false, error: traducir(error.message) }
  revalidar()
  return { ok: true }
}

/** Saca a un mozo de la hoja. */
export async function quitarMozoPlazaAction(id: string): Promise<Resultado> {
  const { supabase, error: sinPermiso } = await conPermiso()
  if (sinPermiso) return { ok: false, error: sinPermiso }
  const { data, error } = await supabase.from('plazas_mozos').delete().eq('id', id).select('id')
  if (error) return { ok: false, error: traducir(error.message) }
  if (!data || data.length === 0) return { ok: false, error: 'Ya no estaba en la hoja (puede que otra cajera lo haya sacado).' }
  revalidar()
  return { ok: true }
}

/** Sube (-1) o baja (+1) a un mozo un lugar. */
export async function moverMozoPlazaAction(id: string, paso: -1 | 1): Promise<Resultado> {
  const { supabase, error: sinPermiso } = await conPermiso()
  if (sinPermiso) return { ok: false, error: sinPermiso }
  const { error } = await supabase.rpc('plazas_mover', { p_id: id, p_paso: paso })
  if (error) return { ok: false, error: traducir(error.message) }
  revalidar()
  return { ok: true }
}

/** Cambia cuántas filas lleva una sección (de 0 a 30). */
export async function cambiarFilasPlazaAction(clave: ClaveFilas, filas: number): Promise<Resultado> {
  if (!CLAVES.includes(clave)) return { ok: false, error: 'Esa sección no existe.' }
  if (!filasValidas(filas)) return { ok: false, error: `Las filas van de 0 a ${FILAS_MAXIMO}.` }
  const { supabase, error: sinPermiso } = await conPermiso()
  if (sinPermiso) return { ok: false, error: sinPermiso }
  const { data, error } = await supabase
    .from('plazas_secciones')
    .update({ filas, updated_at: new Date().toISOString() })
    .eq('clave', clave)
    .select('clave')
  if (error) return { ok: false, error: traducir(error.message) }
  if (!data || data.length === 0) return { ok: false, error: FALTA_SQL_PLAZAS }
  revalidar()
  return { ok: true }
}
