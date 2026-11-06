'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle, Loader2, UserCheck } from 'lucide-react'
import { anotarmeCapacitacionAction } from '@/app/actions/capacitaciones'

interface Props {
  guideId: string
  /** Cuándo se anotó (ISO), o null si todavía no. */
  anotadoEn: string | null
}

/** "06/11 a las 18:20", en hora de Argentina. */
function cuando(iso: string): string {
  const d = new Date(Date.parse(iso) - 3 * 3600 * 1000)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)} a las ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`
}

/**
 * El primer paso de una charla para todo el personal (la de la ART):
 * anotarse, para que quede registrado que estuvo. Después va el examen.
 */
export default function AnotarseCharla({ guideId, anotadoEn }: Props) {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function anotarme() {
    setGuardando(true)
    setError(null)
    const r = await anotarmeCapacitacionAction(guideId)
    setGuardando(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    router.refresh()
  }

  if (anotadoEn) {
    return (
      <div className="flex items-center gap-2 bg-brand-success/10 border border-brand-success/30 rounded-xl px-4 py-3">
        <CheckCircle className="w-4 h-4 text-brand-success flex-shrink-0" />
        <p className="text-brand-success text-sm font-medium">
          Te anotaste a la charla el {cuando(anotadoEn)}. Ahora respondé el examen del final.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-brand-card border border-brand-accent/30 rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-5 h-5 text-brand-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">Paso 1 de 2</p>
          <h2 className="font-semibold text-brand-text">Anotate a la charla</h2>
          <p className="text-sm text-brand-muted leading-relaxed mt-0.5">
            Así queda registrado que estuviste. Después leé el resumen y respondé el examen del final.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={anotarme}
        disabled={guardando}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent-hover cursor-pointer min-h-[48px] disabled:opacity-60"
      >
        {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
        Me anoto
      </button>
    </div>
  )
}
