import type { LucideIcon } from 'lucide-react'

interface Props {
  titulo: string
  icono: LucideIcon
  /** Qué va a tener la sección cuando se habilite. */
  descripcion: string
}

/** Una sección que todavía está en fase beta: el personal no ve nada de adentro. */
export default function EnBeta({ titulo, icono: Icono, descripcion }: Props) {
  return (
    <div className="space-y-4 animate-slide-up">
      <h1 className="text-2xl font-semibold text-brand-accent flex items-center gap-2">
        <Icono className="w-6 h-6 text-brand-accent" />
        {titulo}
      </h1>
      <section className="bg-brand-card border border-brand-border rounded-2xl px-6 py-10 text-center space-y-3">
        <span className="inline-block px-2.5 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-[11px] font-semibold uppercase tracking-[0.18em]">
          Fase beta
        </span>
        <p className="font-serif italic text-2xl text-brand-text">Se habilitará próximamente.</p>
        <p className="text-sm text-brand-muted leading-relaxed max-w-xs mx-auto">{descripcion}</p>
      </section>
    </div>
  )
}
