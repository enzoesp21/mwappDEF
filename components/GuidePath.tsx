import Link from 'next/link'
import { Check, ChevronRight, BookOpen, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PathStep {
  guide_id: string
  etiqueta: string
  title: string
  description: string | null
  /** Aprobó el examen de esta guía. */
  passed: boolean
  score: number | null
  /** La guía tiene examen cargado. */
  hasExam: boolean
}

interface Props {
  puesto: string
  steps: PathStep[]
}

export default function GuidePath({ puesto, steps }: Props) {
  // La que sigue: la primera sin aprobar. Se resalta, pero no bloquea nada.
  const siguiente = steps.findIndex((s) => !s.passed)
  const aprobadas = steps.filter((s) => s.passed).length

  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-1">
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider">
          Tu recorrido · {puesto}
        </h2>
        <span className="text-xs text-brand-muted flex-shrink-0">
          {aprobadas} de {steps.length}
        </span>
      </div>

      <div className="h-1.5 bg-brand-dark rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-brand-accent rounded-full transition-all"
          style={{ width: steps.length ? (aprobadas / steps.length) * 100 + '%' : '0%' }}
        />
      </div>

      <ol className="relative">
        {steps.map((step, i) => {
          const esSiguiente = i === siguiente
          const esUltimo = i === steps.length - 1

          return (
            <li key={step.guide_id} className="relative pl-11 pb-3 last:pb-0">
              {/* Riel vertical que une los pasos. */}
              {!esUltimo && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-[15px] top-8 bottom-0 w-0.5',
                    step.passed ? 'bg-brand-accent' : 'bg-brand-border'
                  )}
                />
              )}

              {/* Punto del paso. */}
              <span
                aria-hidden
                className={cn(
                  'absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2',
                  step.passed
                    ? 'bg-brand-accent border-brand-accent text-white'
                    : esSiguiente
                      ? 'bg-brand-card border-brand-accent text-brand-accent'
                      : 'bg-brand-card border-brand-border text-brand-muted'
                )}
              >
                {step.passed ? <Check className="w-4 h-4" /> : i + 1}
              </span>

              <Link
                href={'/dashboard/guides/' + step.guide_id}
                className={cn(
                  'block bg-brand-card border rounded-2xl p-4 transition-colors cursor-pointer',
                  esSiguiente
                    ? 'border-brand-accent/50 ring-1 ring-brand-accent/20'
                    : 'border-brand-border hover:border-brand-accent/40'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-accent">
                        {step.etiqueta}
                      </span>
                      {esSiguiente && (
                        <span className="text-[10px] font-medium text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded-full">
                          Seguí por acá
                        </span>
                      )}
                      {step.passed && step.score !== null && (
                        <span className="text-[10px] font-medium text-brand-success bg-brand-success/10 px-1.5 py-0.5 rounded-full">
                          Aprobada · {step.score}%
                        </span>
                      )}
                    </div>

                    <p className="font-semibold text-brand-text text-sm leading-tight break-words">
                      {step.title}
                    </p>

                    {step.description && (
                      <p className="text-xs text-brand-muted leading-relaxed mt-1 line-clamp-2">
                        {step.description}
                      </p>
                    )}

                    <p className="flex items-center gap-1.5 text-[11px] text-brand-muted mt-2">
                      {step.hasExam ? (
                        <>
                          <PenLine className="w-3 h-3 flex-shrink-0" />
                          {step.passed ? 'Examen aprobado' : 'Tiene examen'}
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3 h-3 flex-shrink-0" />
                          Solo lectura
                        </>
                      )}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0 mt-1" />
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
