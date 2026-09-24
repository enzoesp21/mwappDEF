import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fechaConDia, pesos } from '@/lib/propinas'
import type { DiaResumen } from '@/lib/propinas-datos'

interface Props {
  base: string
  dias: DiaResumen[]
}

/** Los días cargados, para quien carga propinas. */
export default function ListaDias({ base, dias }: Props) {
  return (
    <div className="space-y-3">
      <Link
        href={base + '/nuevo'}
        className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-brand-accent text-white font-bold text-sm hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[52px]"
      >
        <Plus className="w-4 h-4" />
        Cargar un día
      </Link>

      {dias.length === 0 ? (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 text-center">
          <p className="text-sm text-brand-text font-medium">Todavía no hay días cargados</p>
          <p className="text-xs text-brand-muted mt-1">Tocá &quot;Cargar un día&quot; para empezar.</p>
        </div>
      ) : (
        <ul className="bg-brand-card border border-brand-border rounded-2xl divide-y divide-brand-border/70 overflow-hidden">
          {dias.map((d) => {
            const todosPagos = d.personas > 0 && d.pagados === d.personas
            return (
              <li key={d.fecha}>
                <Link
                  href={base + '/' + d.fecha}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-brand-card-hover transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-text capitalize">{fechaConDia(d.fecha)}</p>
                    <p className="text-xs text-brand-muted mt-0.5">
                      Salón {pesos(d.total - d.general)} · {d.personas}{' '}
                      {d.personas === 1 ? 'persona' : 'personas'} · {pesos(d.porHora)}/h
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
                      todosPagos
                        ? 'bg-brand-success/15 text-brand-success'
                        : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {todosPagos ? 'Pagado' : `${d.pagados}/${d.personas} pagos`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
