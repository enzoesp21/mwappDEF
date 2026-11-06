'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCcw } from 'lucide-react'
import { borrarRespuestaCharlaAction } from '@/app/actions/capacitaciones'

/**
 * Para los encargados, en la lista de una charla: borra lo que contestó una
 * persona (por ejemplo, tocó NO sin querer) y la próxima vez que entre se le
 * vuelve a preguntar "¿Participaste de la charla?". Pide confirmar.
 */
export default function VolverAPreguntar({ guideId, userId }: { guideId: string; userId: string }) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function borrar() {
    setBorrando(true)
    setError(null)
    const r = await borrarRespuestaCharlaAction(guideId, userId)
    setBorrando(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    setConfirmando(false)
    router.refresh()
  }

  return (
    <div className="mt-2 space-y-1.5">
      {confirmando ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-brand-text">¿Borrar su respuesta?</span>
          <button
            type="button"
            onClick={borrar}
            disabled={borrando}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-accent text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
          >
            {borrando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Sí, borrar
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={borrando}
            className="px-3 py-1.5 rounded-lg border border-brand-border text-xs text-brand-muted cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent-hover cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Volver a preguntarle
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-brand-error">
          {error}
        </p>
      )}
    </div>
  )
}
