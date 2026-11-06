import { Lock } from 'lucide-react'
import GuideCard from '@/components/GuideCard'
import type { GuideWithStatus } from '@/lib/types'

interface Props {
  principal: GuideWithStatus | null
  /** Las charlas para todo el personal (la de la ART): también para quien está a prueba. */
  capacitaciones?: GuideWithStatus[]
}

/**
 * Lo que ve en Guías quien está en período de prueba: la guía principal y las
 * charlas para todo el personal.
 */
export default function GuiasEnPrueba({ principal, capacitaciones = [] }: Props) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-xl font-semibold text-brand-accent">Guías</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Empezá por acá: es la guía base de cómo trabajamos en Mirador Waikiki.
        </p>
      </div>

      {principal ? (
        <GuideCard guide={principal} />
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 text-center">
          <p className="text-brand-muted text-sm">Todavía no hay guías cargadas.</p>
        </div>
      )}

      {capacitaciones.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
            Charlas para todo el personal
          </h2>
          {capacitaciones.map((g) => (
            <GuideCard key={g.id} guide={g} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-3 bg-brand-card border border-brand-border rounded-2xl p-4">
        <div className="w-9 h-9 rounded-xl bg-brand-dark flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-brand-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-text">
            Las demás guías se habilitan más adelante
          </p>
          <p className="text-xs text-brand-muted leading-relaxed mt-0.5">
            Mientras estás en período de prueba, lo único que tenés que estudiar es esta. Cuando
            pases a formar parte del equipo, se abren las guías de tu puesto.
          </p>
        </div>
      </div>
    </div>
  )
}
