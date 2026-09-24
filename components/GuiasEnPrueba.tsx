import { Lock } from 'lucide-react'
import GuideCard from '@/components/GuideCard'
import type { GuideWithStatus } from '@/lib/types'

interface Props {
  principal: GuideWithStatus | null
}

/** Lo que ve en Guías quien está en período de prueba: solo la guía principal. */
export default function GuiasEnPrueba({ principal }: Props) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Guías</h1>
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
