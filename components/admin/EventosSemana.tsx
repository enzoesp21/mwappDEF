import Link from 'next/link'
import { CalendarHeart, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { nombreDiaCorto, numeroDeDia, sumarDias } from '@/lib/horarios'
import { eventosPorDia, textoComida, textoHorario, textoSalon, type Evento } from '@/lib/eventos'

interface Props {
  lunes: string
  totalDias: number
  eventos: Evento[]
  /** Si no se pudieron leer (por ejemplo, falta el SQL). */
  error: string | null
}

/**
 * Las mesas personalizadas y los eventos privados de la semana, arriba del
 * editor de horarios (Enzo, 12/11: "que a Facu cuando hace el horario ya le
 * aparezca que ese día hay algo"). Se cargan en Eventos.
 */
export default function EventosSemana({ lunes, totalDias, eventos, error }: Props) {
  const porDia = eventosPorDia(eventos)
  const dias = Array.from({ length: totalDias }, (_, i) => ({ i, fecha: sumarDias(lunes, i) })).filter(
    (d) => porDia.has(d.fecha)
  )
  const mes = lunes.slice(0, 7)

  return (
    <section className="bg-brand-card border border-brand-border rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-brand-text flex items-center gap-1.5">
          <CalendarHeart className="w-4 h-4 text-brand-accent" />
          Eventos y mesas de la semana
        </p>
        <Link
          href={`/admin/eventos?mes=${dias[0]?.fecha.slice(0, 7) ?? mes}${dias[0] ? `&dia=${dias[0].fecha}` : ''}`}
          className="flex items-center text-[11px] font-semibold text-brand-accent hover:underline whitespace-nowrap"
        >
          Ver en Eventos
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {error ? (
        <p className="mt-1.5 text-[11px] text-brand-muted">{error}</p>
      ) : dias.length === 0 ? (
        <p className="mt-1.5 text-[11px] text-brand-muted">No hay mesas personalizadas ni eventos cargados para esta semana.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {dias.map(({ i, fecha }) => (
            <li key={fecha} className="flex items-start gap-2 text-xs">
              <span className="w-[52px] flex-shrink-0 font-semibold text-brand-text tabular-nums pt-px">
                {nombreDiaCorto(i)} {numeroDeDia(lunes, i)}
              </span>
              <ul className="min-w-0 flex-1 space-y-1">
                {(porDia.get(fecha) ?? []).map((e) => (
                  <li key={e.id} className="flex items-start gap-1.5 min-w-0">
                    <span
                      className={cn(
                        'mt-1 w-2 h-2 rounded-full flex-shrink-0',
                        e.tipo === 'evento' ? 'bg-rose-700' : 'bg-brand-accent'
                      )}
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-brand-text">{e.nombre}</span>
                      <span className="text-brand-muted">
                        {' · '}
                        {[
                          textoComida(e.comida),
                          textoHorario(e),
                          e.pax !== null ? `${e.pax} pax` : '',
                          textoSalon(e.salon),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {e.tipo === 'evento' && (
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-rose-800">
                          salón ocupado
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
