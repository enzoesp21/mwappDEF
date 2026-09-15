'use client'

import { useEffect, useState } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'mw_install_dismissed'

/** Android y escritorio avisan por evento; iOS no tiene API y hay que explicarlo. */
type Modo = 'oculto' | 'boton' | 'ios'

interface Props {
  /** En Inicio va como aviso que se puede cerrar. En Mi Perfil, siempre visible. */
  dismissible?: boolean
}

export default function InstallPrompt({ dismissible = false }: Props) {
  const [modo, setModo] = useState<Modo>('oculto')
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null)
  const [verPasosIos, setVerPasosIos] = useState(false)

  useEffect(() => {
    // Si ya está instalada, no hay nada que ofrecer.
    const instalada =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS marca esto en su propio Safari.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (instalada) return

    if (dismissible) {
      try {
        if (localStorage.getItem(DISMISSED_KEY) === '1') return
      } catch {
        // Modo privado: si no se puede leer, mostramos igual.
      }
    }

    const ua = window.navigator.userAgent
    const esIos = /iPad|iPhone|iPod/.test(ua)
    // En iOS solo Safari puede instalar; Chrome y Firefox ahí no ofrecen nada.
    const esSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)

    if (esIos) {
      if (esSafari) setModo('ios')
      return
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvento(e as BeforeInstallPromptEvent)
      setModo('boton')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const onInstalled = () => setModo('oculto')
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [dismissible])

  function cerrar() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Si no se puede guardar, se cierra igual por esta vez.
    }
    setModo('oculto')
  }

  async function instalar() {
    if (!evento) return
    await evento.prompt()
    const { outcome } = await evento.userChoice
    if (outcome === 'accepted') setModo('oculto')
    setEvento(null)
  }

  if (modo === 'oculto') return null

  return (
    <div className="relative bg-brand-card border border-brand-accent/30 rounded-2xl p-4">
      {dismissible && (
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:bg-brand-dark transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-brand-accent" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className={dismissible ? 'pr-7' : undefined}>
            <p className="font-semibold text-brand-text text-sm leading-tight">
              Agregá la app a tu pantalla de inicio
            </p>
            <p className="text-brand-muted text-xs leading-relaxed mt-0.5">
              Se abre como una aplicación, sin la barra del navegador, y la tenés a mano
              con el resto de tus apps.
            </p>
          </div>

          {modo === 'boton' && (
            <button
              type="button"
              onClick={instalar}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-accent text-white font-semibold text-sm hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              Agregar a pantalla de inicio
            </button>
          )}

          {modo === 'ios' && (
            <>
              <button
                type="button"
                onClick={() => setVerPasosIos((v) => !v)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-accent text-white font-semibold text-sm hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[44px]"
              >
                <Share className="w-4 h-4" />
                Cómo agregarla
              </button>

              {verPasosIos && (
                <ol className="space-y-2 text-xs text-brand-text leading-relaxed border-t border-brand-border pt-3">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-brand-accent flex-shrink-0">1.</span>
                    <span className="inline-flex flex-wrap items-center gap-1">
                      Tocá el botón <Share className="w-3.5 h-3.5 inline text-brand-accent" />
                      <strong>Compartir</strong>, abajo en el centro de Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-brand-accent flex-shrink-0">2.</span>
                    <span className="inline-flex flex-wrap items-center gap-1">
                      Bajá y elegí <Plus className="w-3.5 h-3.5 inline text-brand-accent" />
                      <strong>Agregar a pantalla de inicio</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-brand-accent flex-shrink-0">3.</span>
                    <span>
                      Tocá <strong>Agregar</strong> arriba a la derecha. Listo.
                    </span>
                  </li>
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
