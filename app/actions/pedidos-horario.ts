'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { hoyEnArgentina } from '@/lib/horarios'
import { validarPedido, type DatosPedido, type EstadoPedido } from '@/lib/pedidos-horario'

type Resultado = { ok: true } | { ok: false; error: string }

const FALTA_SQL = 'Falta correr el SQL de pedidos de horario (supabase/add_pedidos_horario.sql) en Supabase.'
const falta = (mensaje: string) =>
  /pedidos_horario|pedir_cambio_horario|cancelar_pedido_horario|responder_pedido_horario/i.test(mensaje) &&
  /does not exist|schema cache|could not find/i.test(mensaje)

function revalidar() {
  revalidatePath('/dashboard/horario')
  revalidatePath('/admin/horarios', 'layout')
}

/**
 * Pide un cambio de horario para uno o más días de una semana. La base frena
 * si ya cerró el plazo (el jueves anterior a las 23:59).
 */
export async function pedirCambioHorarioAction(d: DatosPedido): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Iniciá sesión para pedir un cambio.' }

  const error = validarPedido(d, hoyEnArgentina())
  if (error) return { ok: false, error }

  const { error: errorBase } = await supabase.rpc('pedir_cambio_horario', {
    p_fechas: d.fechas,
    p_tipo: d.tipo,
    p_desde: d.desde,
    p_hasta: d.hasta,
    p_motivo: d.motivo.trim(),
  })
  if (errorBase) return { ok: false, error: falta(errorBase.message) ? FALTA_SQL : errorBase.message }
  revalidar()
  return { ok: true }
}

/** Borra un pedido propio que sigue sin respuesta y en plazo. */
export async function cancelarPedidoHorarioAction(id: string): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Iniciá sesión.' }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: 'No se encontró ese pedido.' }

  const { error } = await supabase.rpc('cancelar_pedido_horario', { p_id: id })
  if (error) return { ok: false, error: falta(error.message) ? FALTA_SQL : error.message }
  revalidar()
  return { ok: true }
}

/**
 * Un encargado aprueba o no un pedido (o lo vuelve a dejar sin responder). La
 * persona recibe el aviso en la campanita. No cambia el horario: el pedido
 * aprobado queda marcado en el editor de esa semana.
 */
export async function responderPedidoHorarioAction(
  id: string,
  estado: EstadoPedido,
  respuesta: string
): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Iniciá sesión.' }
  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
  if (perfil?.role !== 'admin') return { ok: false, error: 'Solo un encargado puede responder los pedidos.' }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: 'No se encontró ese pedido.' }
  if (!['pendiente', 'aprobado', 'rechazado'].includes(estado)) return { ok: false, error: 'Esa respuesta no existe.' }
  if (respuesta.trim().length > 500) return { ok: false, error: 'La respuesta es muy larga: hasta 500 letras.' }

  const { error } = await supabase.rpc('responder_pedido_horario', {
    p_id: id,
    p_estado: estado,
    p_respuesta: respuesta.trim(),
  })
  if (error) return { ok: false, error: falta(error.message) ? FALTA_SQL : error.message }
  revalidar()
  return { ok: true }
}
