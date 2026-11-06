import Link from 'next/link'
import { CheckCircle2, ChevronRight, Circle, Clock3, MinusCircle, ShieldCheck } from 'lucide-react'
import { fechaHoraAR, type Capacitacion } from '@/lib/capacitaciones'

const LINK = 'inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:text-brand-accent-hover'

/**
 * En el perfil: las capacitaciones para todo el personal (la charla de la
 * ART) y qué hizo la persona en cada una. Lo que ya terminó queda acá
 * registrado; lo que le falta se termina desde Inicio.
 */
export default function MisCapacitaciones({
  capacitaciones,
  error,
}: {
  capacitaciones: Capacitacion[]
  error: string | null
}) {
  if (!error && capacitaciones.length === 0) return null

  return (
    <section id="capacitaciones" className="bg-brand-card border border-brand-border rounded-2xl p-5 space-y-4">
      <p className="text-brand-muted text-xs font-medium uppercase tracking-wider">Capacitaciones</p>

      {error && (
        <p role="alert" className="text-sm text-brand-error">
          No se pudieron leer tus capacitaciones: {error}
        </p>
      )}

      {capacitaciones.map((c) => (
        <div key={c.id} className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-brand-accent" />
            </div>
            <p className="text-sm font-semibold text-brand-text leading-tight">{c.titulo}</p>
          </div>

          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              {c.participo === null ? (
                <Circle className="w-4 h-4 text-brand-muted flex-shrink-0 mt-0.5" />
              ) : c.participo ? (
                <CheckCircle2 className="w-4 h-4 text-brand-success flex-shrink-0 mt-0.5" />
              ) : (
                <MinusCircle className="w-4 h-4 text-brand-muted flex-shrink-0 mt-0.5" />
              )}
              <span className={c.participo ? 'text-brand-success' : 'text-brand-text'}>
                {c.participo === null
                  ? 'Te falta contestar si participaste'
                  : c.participo
                    ? 'Participaste de la charla'
                    : 'Contestaste que no participaste' + (c.respondioEn ? ' (' + fechaHoraAR(c.respondioEn) + ')' : '')}
              </span>
            </li>

            {c.examenId && c.participo !== false && (
              <li className="flex items-start gap-2">
                {c.aprobado ? (
                  <CheckCircle2 className="w-4 h-4 text-brand-success flex-shrink-0 mt-0.5" />
                ) : c.esperandoCorreccion ? (
                  <Clock3 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-brand-muted flex-shrink-0 mt-0.5" />
                )}
                <span className={c.aprobado ? 'text-brand-success' : 'text-brand-text'}>
                  {c.aprobado
                    ? `Aprobaste el examen con ${c.aprobado.score} % · ${fechaHoraAR(c.aprobado.fecha)}`
                    : c.esperandoCorreccion
                      ? 'Tu examen está esperando que lo corrija un encargado'
                      : 'Te falta aprobar el examen'}
                </span>
              </li>
            )}
          </ul>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {!c.completa && (
              <Link href="/dashboard" className={LINK}>
                Terminala en Inicio
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {c.aprobado && (
              <Link href={'/dashboard/revision/' + c.aprobado.id} className={LINK}>
                Ver en qué me equivoqué
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {c.aprobado?.firma && (
              <details className="text-xs w-full">
                <summary className="text-brand-accent hover:text-brand-accent-hover cursor-pointer select-none font-medium">
                  Ver mi firma
                </summary>
                <div className="mt-2 p-2 bg-brand-dark rounded-lg border border-brand-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.aprobado.firma} alt="Tu firma del examen" className="max-w-full h-auto rounded" />
                </div>
              </details>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
