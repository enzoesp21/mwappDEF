'use client'

import { useState } from 'react'
import { AlertCircle, Check, ChevronDown, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

/** Traduce los errores de Supabase que puede ver el personal. */
function mensajeDeError(codigo: string | undefined, mensaje: string): string {
  if (codigo === 'same_password' || /different from the old/i.test(mensaje)) {
    return 'Es la misma que ya tenías. Elegí otra.'
  }
  if (codigo === 'weak_password' || /at least/i.test(mensaje)) {
    return 'Es muy corta o muy fácil. Usá al menos 6 caracteres.'
  }
  if (codigo === 'reauthentication_needed') {
    return 'Por seguridad, cerrá sesión, volvé a entrar y probá de nuevo.'
  }
  return 'No se pudo cambiar: ' + mensaje
}

/** En el Perfil: cada uno cambia su propia contraseña (por ejemplo, la provisoria). */
export default function CambiarClave() {
  const [abierto, setAbierto] = useState(false)
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [ver, setVer] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lista, setLista] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (nueva.length < 6) return setError('Tiene que tener al menos 6 caracteres.')
    if (nueva !== repetida) return setError('Las dos no coinciden. Escribila igual en los dos lugares.')

    setGuardando(true)
    const { error: err } = await createClient().auth.updateUser({ password: nueva })
    setGuardando(false)
    if (err) return setError(mensajeDeError(err.code, err.message))

    setLista(true)
    setNueva('')
    setRepetida('')
  }

  const inputClase =
    'w-full px-3 py-2.5 bg-brand-card border border-brand-border rounded-xl text-sm text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent min-h-[44px]'

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v)
          setLista(false)
          setError(null)
        }}
        aria-expanded={abierto}
        className="w-full flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-brand-card-hover transition-colors"
      >
        <KeyRound className="w-4 h-4 text-brand-accent flex-shrink-0" />
        <span className="flex-1 text-left text-sm font-medium text-brand-text">Cambiar contraseña</span>
        <ChevronDown className={cn('w-4 h-4 text-brand-muted transition-transform', abierto && 'rotate-180')} />
      </button>

      {abierto && (
        <form onSubmit={guardar} className="px-5 pb-5 space-y-3 border-t border-brand-border pt-4">
          {lista ? (
            <p className="flex items-center gap-2 text-sm text-brand-success font-medium">
              <Check className="w-4 h-4" />
              Listo, la próxima vez entrás con la nueva.
            </p>
          ) : (
            <>
              <div className="relative">
                <input
                  type={ver ? 'text' : 'password'}
                  value={nueva}
                  onChange={(e) => {
                    setNueva(e.target.value)
                    setError(null)
                  }}
                  placeholder="Contraseña nueva"
                  autoComplete="new-password"
                  aria-label="Contraseña nueva"
                  className={cn(inputClase, 'pr-11')}
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-muted hover:text-brand-text cursor-pointer"
                >
                  {ver ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={ver ? 'text' : 'password'}
                value={repetida}
                onChange={(e) => {
                  setRepetida(e.target.value)
                  setError(null)
                }}
                placeholder="Repetila"
                autoComplete="new-password"
                aria-label="Repetir la contraseña nueva"
                className={inputClase}
              />

              {error && (
                <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={guardando}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer min-h-[48px] disabled:opacity-60"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar contraseña
              </button>
            </>
          )}
        </form>
      )}
    </div>
  )
}
