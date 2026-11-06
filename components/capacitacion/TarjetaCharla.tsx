'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, ChevronRight, Clock3, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { responderCharlaAction } from '@/app/actions/capacitaciones'
import type { Capacitacion } from '@/lib/capacitaciones'

const PILDORA =
  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent-hover cursor-pointer min-h-[48px] disabled:opacity-60'
const PILDORA_BLANCA =
  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border-2 border-brand-accent bg-brand-card text-brand-accent text-xs font-semibold uppercase tracking-[0.12em] hover:bg-brand-accent/10 cursor-pointer min-h-[48px] disabled:opacity-60'

/**
 * Arriba de todo en Inicio, ni bien entran: una capacitación para todo el
 * personal (la charla de la ART) que a la persona todavía le falta. Sin el
 * contenido del curso: "¿Participaste de la charla?". Con SÍ va derecho al
 * examen, para ver si prestó atención; con NO (después de confirmar) queda
 * registrado y no rinde. Cuando termina, sale de Inicio y queda en su perfil.
 */
export default function TarjetaCharla({ c }: { c: Capacitacion }) {
  const router = useRouter()
  const [enviando, setEnviando] = useState<'si' | 'no' | null>(null)
  const [confirmandoNo, setConfirmandoNo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const examen = '/dashboard/guides/' + c.id + '/exam'
  const desaprobo = !c.aprobado && !c.esperandoCorreccion && c.ultimo !== null && !c.ultimo.passed

  async function responder(participo: boolean) {
    setEnviando(participo ? 'si' : 'no')
    setError(null)
    const r = await responderCharlaAction(c.id, participo)
    if (!r.ok) {
      setEnviando(null)
      setError(r.error)
      return
    }
    // Con SÍ, derecho al examen ("que tengan que rendir de una", Enzo).
    if (participo && c.examenId && !c.aprobado) router.push(examen)
    else router.refresh()
  }

  return (
    <section className="bg-brand-card border-2 border-brand-accent rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-accent flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">Para todo el personal</p>
          <h2 className="text-lg font-semibold text-brand-text leading-tight mt-0.5">{c.titulo}</h2>
        </div>
      </div>

      {c.participo === null && !confirmandoNo && (
        <div className="space-y-3">
          <div>
            <p className="text-base font-semibold text-brand-text">¿Participaste de la charla?</p>
            {c.examenId && !c.aprobado && (
              <p className="text-sm text-brand-muted leading-relaxed mt-0.5">
                Si participaste, pasás directo a un examen corto. Se aprueba con {c.aprobarCon} %.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => responder(true)} disabled={enviando !== null} className={PILDORA}>
              {enviando === 'si' && <Loader2 className="w-4 h-4 animate-spin" />}
              Sí
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setConfirmandoNo(true)
              }}
              disabled={enviando !== null}
              className={PILDORA_BLANCA}
            >
              No
            </button>
          </div>
        </div>
      )}

      {c.participo === null && confirmandoNo && (
        <div className="space-y-3">
          <div>
            <p className="text-base font-semibold text-brand-text">¿Seguro que no participaste?</p>
            <p className="text-sm text-brand-muted leading-relaxed mt-0.5">
              Queda registrado y lo ven los encargados. {c.examenId ? 'No rendís el examen.' : ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => responder(false)} disabled={enviando !== null} className={PILDORA}>
              {enviando === 'no' && <Loader2 className="w-4 h-4 animate-spin" />}
              No participé
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoNo(false)}
              disabled={enviando !== null}
              className={PILDORA_BLANCA}
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {c.participo === true && c.examenId && !c.aprobado && (
        <div className="space-y-3">
          <p className="flex items-start gap-2.5 text-sm text-brand-success">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="pt-px">Participaste de la charla</span>
          </p>
          {c.esperandoCorreccion ? (
            <p className="flex items-start gap-2.5 text-sm text-amber-700">
              <Clock3 className="w-5 h-5 flex-shrink-0" />
              <span className="pt-px">Tu examen está esperando que lo corrija un encargado</span>
            </p>
          ) : desaprobo && c.ultimo ? (
            <p className="flex items-start gap-2.5 text-sm text-brand-error">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <span className="pt-px">
                Sacaste {c.ultimo.score} % en el examen: necesitás {c.aprobarCon} para aprobar
              </span>
            </p>
          ) : (
            <p className="text-sm text-brand-text leading-relaxed">
              Te falta el examen. Se aprueba con {c.aprobarCon} %.
            </p>
          )}
          {!c.esperandoCorreccion && (
            <Link href={examen} className={PILDORA}>
              {desaprobo ? 'Volver a rendir' : 'Empezar el examen'}
            </Link>
          )}
          {desaprobo && c.ultimo && (
            <Link
              href={'/dashboard/revision/' + c.ultimo.id}
              className="flex items-center justify-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent-hover py-1"
            >
              Ver en qué me equivoqué
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </section>
  )
}
