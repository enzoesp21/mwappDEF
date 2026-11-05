// Leer de la base los pedidos de cambio de horario con el nombre de quien los
// hizo (para los encargados). Sin join anidado: los pedidos y los perfiles van
// en consultas sueltas y se juntan acá.

import type { createClient } from '@/lib/supabase/server'
import { leerPedido, type PedidoConNombre, type PedidoHorario } from '@/lib/pedidos-horario'

type Cliente = Awaited<ReturnType<typeof createClient>>

/** Si el error es porque todavía no se corrió add_pedidos_horario.sql. */
export const faltaSqlPedidos = (mensaje: string) => /pedidos_horario|schema cache|does not exist/i.test(mensaje)

/**
 * Los pedidos de las semanas pedidas (sus lunes) o, sin `semanas`, de la
 * semana `desde` en adelante, con el nombre y el puesto de cada uno. También
 * devuelve los nombres de todos los usuarios, para buscarlos en el horario.
 */
export async function traerPedidosConNombre(
  supabase: Cliente,
  filtro: { semanas: string[] } | { desde: string }
): Promise<{ pedidos: PedidoConNombre[]; usuarios: string[]; error: string | null }> {
  let consulta = supabase.from('pedidos_horario').select('*')
  consulta = 'semanas' in filtro ? consulta.in('semana', filtro.semanas) : consulta.gte('semana', filtro.desde)
  const [pedidosRes, perfilesRes] = await Promise.all([
    consulta.order('semana', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('profiles').select('id, full_name, puesto'),
  ])
  const error = pedidosRes.error ?? perfilesRes.error
  if (error) return { pedidos: [], usuarios: [], error: error.message }

  const perfil = new Map((perfilesRes.data ?? []).map((p) => [p.id as string, p]))
  const pedidos = (pedidosRes.data ?? [])
    .map((f) => leerPedido(f as Record<string, unknown>))
    .filter((p): p is PedidoHorario => p !== null)
    .map((p) => ({
      ...p,
      nombre: ((perfil.get(p.userId)?.full_name as string | null) ?? '').trim() || 'Sin nombre',
      puesto: (perfil.get(p.userId)?.puesto as string | null) ?? null,
    }))
  const usuarios = (perfilesRes.data ?? []).map((p) => (p.full_name as string | null) ?? '')
  return { pedidos, usuarios, error: null }
}
