// Lo que se lee de la base para la hoja de plazas de los mozos. La lógica está
// en lib/plazas.ts.

import type { createClient } from '@/lib/supabase/server'
import { FILAS_POR_DEFECTO, type ClaveFilas } from '@/lib/plazas'

type Cliente = Awaited<ReturnType<typeof createClient>>

export const FALTA_SQL_PLAZAS = 'Falta correr el SQL de la hoja de plazas (supabase/add_plazas_mozos.sql) en Supabase.'

export const faltaSqlPlazas = (m: string) =>
  /plazas_mozos|plazas_secciones|plazas_mover/i.test(m) && /does not exist|schema cache|could not find/i.test(m)

export interface MozoPlaza {
  id: string
  nombre: string
}

/** Los mozos de la hoja, en orden, y las filas de cada sección. */
export async function traerPlazas(
  supabase: Cliente
): Promise<{ mozos: MozoPlaza[]; filas: Record<ClaveFilas, number>; error: string | null }> {
  const [mozosRes, seccionesRes] = await Promise.all([
    supabase.from('plazas_mozos').select('id, nombre, orden').order('orden').order('created_at'),
    supabase.from('plazas_secciones').select('clave, filas'),
  ])
  const filas = { ...FILAS_POR_DEFECTO }
  const error = mozosRes.error ?? seccionesRes.error
  if (error) return { mozos: [], filas, error: faltaSqlPlazas(error.message) ? FALTA_SQL_PLAZAS : error.message }
  for (const s of seccionesRes.data ?? []) {
    if ((s.clave as string) in filas) filas[s.clave as ClaveFilas] = s.filas as number
  }
  return {
    mozos: (mozosRes.data ?? []).map((m) => ({ id: m.id as string, nombre: m.nombre as string })),
    filas,
    error: null,
  }
}
