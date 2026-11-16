'use client'

import { useEffect, useState } from 'react'
import { BellOff, BellRing, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { borrarSuscripcionAction, guardarSuscripcionAction, probarAvisoAction } from '@/app/actions/avisos'

interface Props {
  /** La clave pública de los avisos (null si todavía no se cargó en Vercel). */
  clavePublica: string | null
  /** Una vez activados, solo una línea (para el panel de inicio). */
  compacto?: boolean
}

type Estado =
  | 'cargando'
  | 'sin-claves'
  | 'abrir-desde-inicio' // iPhone desde Safari: los avisos solo andan con la app en la pantalla de inicio
  | 'sin-soporte'
  | 'denegado'
  | 'apagados'
  | 'activos'

function claveABytes(base64: string): ArrayBuffer {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length))
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i)
  return bytes.buffer
}

function esIPhone() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function nombreDispositivo() {
  if (esIPhone()) return 'iPhone'
  if (/Android/i.test(navigator.userAgent)) return 'Android'
  return 'Computadora'
}

async function registro(): Promise<ServiceWorkerRegistration> {
  // En producción ya lo instaló RegistrarSW; si no, se instala acá.
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
}

/**
 * Activar los avisos de pedidos de horario en este teléfono (Enzo, 16/11: que a
 * Facu le llegue cada pedido). En iPhone solo andan con la app abierta desde el
 * ícono de la pantalla de inicio (iOS 16.4 o más nuevo).
 */
export default function ActivarAvisos({ clavePublica, compacto = false }: Props) {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [trabajando, setTrabajando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      const instalada =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
      let e: Estado
      if (!soporta) e = esIPhone() && !instalada ? 'abrir-desde-inicio' : 'sin-soporte'
      else if (!clavePublica) e = 'sin-claves'
      else if (Notification.permission === 'denied') e = 'denegado'
      else {
        const sub = await (await registro()).pushManager.getSubscription().catch(() => null)
        e = sub && Notification.permission === 'granted' ? 'activos' : 'apagados'
      }
      if (!cancelado) setEstado(e)
    })().catch(() => !cancelado && setEstado('sin-soporte'))
    return () => {
      cancelado = true
    }
  }, [clavePublica])

  async function activar() {
    if (!clavePublica) return
    setTrabajando(true)
    setMensaje(null)
    try {
      // El permiso se pide enseguida del toque: si no, el iPhone no muestra la pregunta.
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        setEstado(permiso === 'denied' ? 'denegado' : 'apagados')
        return
      }
      const reg = await registro()
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clavePublica) }))
      const json = sub.toJSON()
      const r = await guardarSuscripcionAction(
        { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
        nombreDispositivo()
      )
      if (!r.ok) {
        setMensaje({ ok: false, texto: r.error })
        return
      }
      setEstado('activos')
      setMensaje({ ok: true, texto: 'Listo: los pedidos te van a llegar a este teléfono.' })
    } catch (e) {
      setMensaje({ ok: false, texto: 'No se pudieron activar: ' + (e instanceof Error ? e.message : String(e)) })
    } finally {
      setTrabajando(false)
    }
  }

  async function desactivar() {
    setTrabajando(true)
    setMensaje(null)
    try {
      const sub = await (await registro()).pushManager.getSubscription()
      if (sub) {
        const r = await borrarSuscripcionAction(sub.endpoint)
        if (!r.ok) {
          setMensaje({ ok: false, texto: r.error })
          return
        }
        await sub.unsubscribe()
      }
      setEstado('apagados')
    } catch (e) {
      setMensaje({ ok: false, texto: 'No se pudieron desactivar: ' + (e instanceof Error ? e.message : String(e)) })
    } finally {
      setTrabajando(false)
    }
  }

  async function probar() {
    setTrabajando(true)
    setMensaje(null)
    const r = await probarAvisoAction()
    setTrabajando(false)
    setMensaje(r.ok ? { ok: true, texto: r.mensaje ?? 'Listo.' } : { ok: false, texto: r.error })
  }

  if (estado === 'cargando') return null

  const linea = mensaje && (
    <p role={mensaje.ok ? 'status' : 'alert'} className={cn('text-xs mt-2', mensaje.ok ? 'text-brand-success' : 'text-brand-error')}>
      {mensaje.texto}
    </p>
  )

  if (estado === 'activos' && compacto) {
    return (
      <div className="flex items-center gap-2 text-xs text-brand-muted flex-wrap">
        <Check className="w-3.5 h-3.5 text-brand-success" />
        <span>Avisos de pedidos activados en este teléfono.</span>
        <button type="button" onClick={probar} disabled={trabajando} className="font-semibold text-brand-accent hover:underline cursor-pointer disabled:opacity-50">
          {trabajando ? 'Mandando…' : 'Probar'}
        </button>
        {linea}
      </div>
    )
  }

  const textos: Record<Exclude<Estado, 'cargando'>, string> = {
    'sin-claves': 'Todavía faltan las claves de los avisos en Vercel. Mientras tanto, los pedidos llegan a la campanita.',
    'abrir-desde-inicio':
      'En iPhone los avisos solo andan con la app abierta desde el ícono de la pantalla de inicio (no desde Safari). Abrila desde ahí y activalos.',
    'sin-soporte': 'Este navegador no deja recibir avisos. Los pedidos igual te llegan a la campanita.',
    denegado:
      'Los avisos están bloqueados para la app. Para activarlos: Ajustes del teléfono → Notificaciones → Waikiki → Permitir. Después volvé acá.',
    apagados: 'Cuando alguien pida un cambio de horario, te llega al teléfono aunque tengas la app cerrada.',
    activos: 'Cada pedido de cambio de horario te llega a este teléfono.',
  }

  return (
    <section className="bg-brand-card border border-brand-border rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
          {estado === 'activos' ? (
            <BellRing className="w-5 h-5 text-brand-accent" />
          ) : (
            <BellOff className="w-5 h-5 text-brand-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-text">
            {estado === 'activos' ? 'Avisos activados en este teléfono' : 'Avisos de pedidos al teléfono'}
          </p>
          <p className="text-xs text-brand-muted leading-relaxed mt-0.5">{textos[estado]}</p>
        </div>
      </div>

      {estado === 'apagados' && (
        <button
          type="button"
          onClick={activar}
          disabled={trabajando}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-brand-accent text-white text-sm font-semibold uppercase tracking-[0.12em] hover:bg-brand-accent-hover cursor-pointer disabled:opacity-60 min-h-[48px]"
        >
          {trabajando ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
          Activar avisos
        </button>
      )}

      {estado === 'activos' && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={probar}
            disabled={trabajando}
            className="flex-1 px-3 py-2 rounded-xl bg-brand-accent/10 text-brand-accent text-xs font-semibold hover:bg-brand-accent/20 cursor-pointer disabled:opacity-50 min-h-[40px]"
          >
            {trabajando ? 'Un momento…' : 'Mandar un aviso de prueba'}
          </button>
          <button
            type="button"
            onClick={desactivar}
            disabled={trabajando}
            className="px-3 py-2 rounded-xl text-brand-muted text-xs font-semibold hover:bg-brand-card-hover cursor-pointer disabled:opacity-50 min-h-[40px]"
          >
            Desactivar
          </button>
        </div>
      )}
      {linea}
    </section>
  )
}
