// Avisos al teléfono (Web Push), del lado del servidor. Enzo, 16/11: "que a
// Facu le llegue 'te pidieron un cambio de horario'". En iPhone llegan solo con
// la app agregada a la pantalla de inicio (iOS 16.4 o más nuevo).
//
// Las claves (VAPID) van en Vercel: NEXT_PUBLIC_VAPID_PUBLIC_KEY y
// VAPID_PRIVATE_KEY. Se generan una vez con `npx web-push generate-vapid-keys`.
// La privada nunca se sube al repo ni se pega en ningún chat.

import webpush from 'web-push'

export interface SuscripcionPush {
  endpoint: string
  p256dh: string
  auth: string
}

export interface AvisoPush {
  titulo: string
  cuerpo: string
  /** A dónde lleva al tocar la notificación. */
  url: string
}

/** Si están las claves en Vercel. Sin ellas, los avisos quedan solo en la campanita. */
export function clavesListas(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

let configurado = false
function configurar() {
  if (configurado) return
  webpush.setVapidDetails(
    // Quién manda los avisos (lo pide el estándar): la web del restaurante.
    process.env.VAPID_SUBJECT || 'https://miradorwaikiki.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  configurado = true
}

/**
 * Manda el aviso a cada teléfono. Devuelve cuántos salieron, los teléfonos que
 * el servicio dio de baja (hay que borrarlos) y el primer error, si hubo.
 */
export async function enviarPush(
  suscripciones: SuscripcionPush[],
  aviso: AvisoPush
): Promise<{ enviados: number; vencidas: string[]; error: string | null }> {
  if (!clavesListas()) return { enviados: 0, vencidas: [], error: 'Faltan las claves de los avisos en Vercel.' }
  configurar()
  const cuerpo = JSON.stringify(aviso)
  const vencidas: string[] = []
  let enviados = 0
  let error: string | null = null
  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, cuerpo, {
          TTL: 60 * 60 * 24,
          urgency: 'high',
        })
        enviados++
      } catch (e) {
        const codigo = (e as { statusCode?: number }).statusCode
        // 404 y 410: ese teléfono ya no recibe (desinstaló la app o sacó el permiso).
        if (codigo === 404 || codigo === 410) vencidas.push(s.endpoint)
        else error ??= e instanceof Error ? e.message : String(e)
      }
    })
  )
  return { enviados, vencidas, error }
}
