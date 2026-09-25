'use client'

import { useState } from 'react'
import { AlertCircle, Check, Copy, KeyRound, Loader2, Shuffle, X } from 'lucide-react'
import { resetUserPasswordAction } from '@/app/actions/users'

interface Props {
  userId: string
  nombre: string
  onCerrar: () => void
}

/** Una clave fácil de dictar: una palabra de la casa y cuatro números. */
function inventarClave(): string {
  const palabras = ['waikiki', 'mirador', 'playa', 'salon', 'mar']
  const palabra = palabras[Math.floor(Math.random() * palabras.length)]
  const numeros = String(Math.floor(1000 + Math.random() * 9000))
  return palabra + numeros
}

/**
 * Ventana para ponerle una contraseña provisoria a alguien que se olvidó la
 * suya. La clave se ve en claro: el admin se la tiene que pasar.
 */
export default function CambiarClaveUsuario({ userId, nombre, onCerrar }: Props) {
  const [clave, setClave] = useState(inventarClave)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lista, setLista] = useState(false)
  const [copiada, setCopiada] = useState(false)

  async function guardar() {
    const limpia = clave.trim()
    if (limpia.length < 6) {
      setError('La contraseña tiene que tener al menos 6 caracteres.')
      return
    }
    setGuardando(true)
    setError(null)
    const res = await resetUserPasswordAction(userId, limpia)
    setGuardando(false)
    if (res.ok) {
      setClave(limpia)
      setLista(true)
    } else {
      setError(res.error)
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(clave)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2000)
    } catch {
      // Si el navegador no deja copiar, la clave igual está a la vista.
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={'Cambiar la contraseña de ' + nombre}
      onClick={(e) => e.target === e.currentTarget && !guardando && onCerrar()}
    >
      <div className="w-full max-w-sm bg-brand-card rounded-2xl shadow-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5 text-brand-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-brand-text">
              {lista ? 'Contraseña cambiada' : 'Nueva contraseña'}
            </h2>
            <p className="text-xs text-brand-muted truncate">{nombre}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-brand-muted hover:bg-brand-card-hover cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {lista ? (
          <>
            <div className="bg-brand-card-hover border border-brand-border rounded-xl p-4 text-center">
              <p className="text-[11px] text-brand-muted uppercase tracking-wider font-semibold">
                Pasale esta clave
              </p>
              <p className="text-2xl font-bold text-brand-text tracking-wide mt-1 select-all break-all">
                {clave}
              </p>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed">
              Entra con su mail de siempre y esta clave. Después la puede cambiar en Perfil →
              Cambiar contraseña.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copiar}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text hover:border-brand-accent cursor-pointer min-h-[44px]"
              >
                {copiada ? <Check className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
                {copiada ? 'Copiada' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={onCerrar}
                className="py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer min-h-[44px]"
              >
                Listo
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-brand-muted leading-relaxed">
              Poné una clave provisoria y pasásela. La que tenía deja de funcionar.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={clave}
                onChange={(e) => {
                  setClave(e.target.value)
                  setError(null)
                }}
                autoComplete="off"
                spellCheck={false}
                aria-label="Nueva contraseña"
                className="flex-1 min-w-0 px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-base font-semibold text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => {
                  setClave(inventarClave())
                  setError(null)
                }}
                title="Inventar otra"
                aria-label="Inventar otra clave"
                className="px-3 rounded-xl border border-brand-border text-brand-muted hover:text-brand-accent hover:border-brand-accent cursor-pointer"
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer min-h-[48px] disabled:opacity-60"
            >
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Cambiar contraseña
            </button>
          </>
        )}
      </div>
    </div>
  )
}
