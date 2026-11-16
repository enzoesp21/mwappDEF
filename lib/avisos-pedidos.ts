// Avisos de los pedidos de horario al teléfono de los encargados. Lo usa la
// acción de pedir un cambio (app/actions/pedidos-horario.ts). No es una acción
// de servidor: no se puede llamar desde el navegador.

import type { createClient } from '@/lib/supabase/server'
import { clavesListas, enviarPush, type SuscripcionPush } from '@/lib/avisos-push'

type Cliente = Awaited<ReturnType<typeof createClient>>

export const FALTA_SQL_AVISOS = 'Falta correr el SQL de los avisos (supabase/add_avisos_pedidos.sql) en Supabase.'
export const faltaSqlAvisos = (m: string) =>
  /push_suscripciones|guardar_suscripcion_push|avisos_push_de_pedido|push_vencida/i.test(m) &&
  /does not exist|schema cache|could not find/i.test(m)

/** Borra los teléfonos que el servicio de avisos dio de baja. */
export async function borrarVencidas(supabase: Cliente, vencidas: string[]) {
  for (const endpoint of vencidas) await supabase.rpc('push_vencida', { p_endpoint: endpoint })
}

/**
 * Después de que alguien pide un cambio de horario: le manda el aviso al
 * teléfono a los encargados que lo tienen activado (la campanita ya la llenó la
 * base). Nunca hace fallar el pedido, que ya quedó guardado: si algo sale mal,
 * queda en el registro del servidor.
 */
export async function avisarPedidoAlTelefono(supabase: Cliente, pedidoId: string): Promise<void> {
  if (!clavesListas()) return
  try {
    const { data, error } = await supabase.rpc('avisos_push_de_pedido', { p_pedido: pedidoId })
    if (error) {
      if (!faltaSqlAvisos(error.message)) console.error('Avisos de pedido:', error.message)
      return
    }
    const filas = (data ?? []) as (SuscripcionPush & { mensaje: string })[]
    if (filas.length === 0) return
    const r = await enviarPush(filas, {
      titulo: 'Pedido de cambio de horario',
      cuerpo: filas[0].mensaje,
      url: '/admin/horarios/pedidos',
    })
    await borrarVencidas(supabase, r.vencidas)
    if (r.error) console.error('Avisos de pedido:', r.error)
  } catch (e) {
    console.error('Avisos de pedido:', e)
  }
}

/**
 * Si esa persona recibe los avisos de pedidos (admin con "Avisos" en Usuarios).
 * Con select('*'), antes de correr el SQL da false en vez de anular la consulta.
 */
export async function recibeAvisosPedidos(supabase: Cliente, userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return data?.role === 'admin' && data?.avisos_pedidos === true
}
