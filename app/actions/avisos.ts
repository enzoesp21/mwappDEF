'use server'

import { createClient } from '@/lib/supabase/server'
import { clavesListas, enviarPush, type SuscripcionPush } from '@/lib/avisos-push'
import { FALTA_SQL_AVISOS as FALTA_SQL, borrarVencidas, faltaSqlAvisos as falta } from '@/lib/avisos-pedidos'

type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string }

/** Anota este teléfono para recibir avisos (después de que la persona aceptó el permiso). */
export async function guardarSuscripcionAction(s: SuscripcionPush, dispositivo: string): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Iniciá sesión de nuevo.' }
  if (!s?.endpoint?.startsWith('https://') || !s.p256dh || !s.auth) {
    return { ok: false, error: 'El teléfono no devolvió los datos para los avisos. Probá de nuevo.' }
  }

  const { error } = await supabase.rpc('guardar_suscripcion_push', {
    p_endpoint: s.endpoint,
    p_p256dh: s.p256dh,
    p_auth: s.auth,
    p_dispositivo: dispositivo.slice(0, 120),
  })
  if (error) return { ok: false, error: falta(error.message) ? FALTA_SQL : 'No se pudo guardar: ' + error.message }
  return { ok: true }
}

/** Deja de mandar avisos a este teléfono. */
export async function borrarSuscripcionAction(endpoint: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('push_suscripciones').delete().eq('endpoint', endpoint)
  if (error) return { ok: false, error: falta(error.message) ? FALTA_SQL : 'No se pudo desactivar: ' + error.message }
  return { ok: true }
}

/** Manda un aviso de prueba a los teléfonos de quien lo toca. */
export async function probarAvisoAction(): Promise<Resultado> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Iniciá sesión de nuevo.' }
  if (!clavesListas()) return { ok: false, error: 'Faltan las claves de los avisos en Vercel (ver CLAUDE.md, "Avisos").' }

  const { data, error } = await supabase
    .from('push_suscripciones')
    .select('endpoint, p256dh, auth')
    .eq('user_id', session.user.id)
  if (error) return { ok: false, error: falta(error.message) ? FALTA_SQL : error.message }
  if (!data || data.length === 0) return { ok: false, error: 'Este usuario no tiene ningún teléfono con avisos activados.' }

  const r = await enviarPush(data as SuscripcionPush[], {
    titulo: 'Mirador Waikiki',
    cuerpo: 'Aviso de prueba: así te van a llegar los pedidos de cambio de horario.',
    url: '/admin/horarios/pedidos',
  })
  await borrarVencidas(supabase, r.vencidas)
  if (r.enviados === 0) return { ok: false, error: r.error ?? 'El teléfono ya no recibe avisos: activalos de nuevo.' }
  return { ok: true, mensaje: r.enviados === 1 ? 'Listo: te llegó a 1 teléfono.' : `Listo: te llegó a ${r.enviados} teléfonos.` }
}
