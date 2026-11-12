// Lo que se lee de la base para el calendario de eventos y mesas
// personalizadas. La lógica está en lib/eventos.ts.

import type { createClient } from '@/lib/supabase/server'
import { leerEvento, type Evento } from '@/lib/eventos'

type Cliente = Awaited<ReturnType<typeof createClient>>

export const FALTA_SQL_EVENTOS = 'Falta correr el SQL del calendario de eventos (supabase/add_eventos.sql) en Supabase.'

/** Si el error es porque todavía no se corrió add_eventos.sql. */
export const faltaSqlEventos = (mensaje: string) =>
  /eventos|ve_eventos/i.test(mensaje) && /does not exist|schema cache|could not find/i.test(mensaje)

/**
 * Si esa persona puede ver el calendario: los admin siempre; el resto, si un
 * admin le tildó "Eventos" en Usuarios. Con select('*'), antes de correr el SQL
 * da false en vez de anular la consulta.
 */
export async function puedeVerEventos(supabase: Cliente, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (!data) return false
  return data.role === 'admin' || (data.ve_eventos === true && data.status === 'approved')
}

/** Los eventos entre dos fechas (inclusive), con el nombre de quien los cargó o cambió. */
export async function traerEventos(
  supabase: Cliente,
  desde: string,
  hasta: string
): Promise<{ eventos: Evento[]; autores: Record<string, string>; error: string | null }> {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
  if (error) return { eventos: [], autores: {}, error: faltaSqlEventos(error.message) ? FALTA_SQL_EVENTOS : error.message }

  const filas = (data ?? []) as Record<string, unknown>[]
  const ids = Array.from(
    new Set(filas.flatMap((f) => [f.creado_por, f.actualizado_por]).filter((x): x is string => typeof x === 'string'))
  )
  const nombres = new Map<string, string>()
  if (ids.length > 0) {
    // Consulta suelta, sin join anidado. Si no se pueden leer los nombres, el calendario anda igual.
    const { data: perfiles } = await supabase.from('profiles').select('id, full_name').in('id', ids)
    for (const p of perfiles ?? []) nombres.set(p.id as string, ((p.full_name as string | null) ?? '').trim())
  }

  const autores: Record<string, string> = {}
  for (const f of filas) {
    const cargo = nombres.get(f.creado_por as string)
    const cambio = nombres.get(f.actualizado_por as string)
    const creado = String(f.creado_en ?? '')
    const actualizado = String(f.actualizado_en ?? '')
    // Si se cambió más de un minuto después de cargarlo, se dice quién lo cambió.
    const seCambio = cambio && Date.parse(actualizado) - Date.parse(creado) > 60_000
    const partes = [cargo ? `Lo cargó ${cargo}` : '', seCambio ? `lo cambió ${cambio}` : ''].filter(Boolean)
    if (partes.length) autores[String(f.id)] = partes.join(' · ')
  }

  return { eventos: filas.map(leerEvento), autores, error: null }
}

/** Quiénes tienen el permiso (sin contar los admin), para mostrarlo a los encargados. */
export async function quienesVenEventos(supabase: Cliente): Promise<string[]> {
  const { data, error } = await supabase.from('profiles').select('*').eq('ve_eventos', true)
  if (error) return []
  return (data ?? [])
    .filter((p) => p.role !== 'admin')
    .map((p) => ((p.full_name as string | null) ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}
