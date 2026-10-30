import Link from 'next/link'
import { ChevronRight, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { listarMozos } from '@/lib/progresion-datos'
import { REVISAR_CADA_DIAS, datosNivel } from '@/lib/progresion'
import AvisoProgresion from '@/components/progresion/AvisoProgresion'

export const dynamic = 'force-dynamic'

/** Los mozos con su nivel, qué les falta para subir y si toca revisarlos. */
export default async function ProgresionPage() {
  const supabase = await createClient()
  const { mozos, error } = await listarMozos(supabase)

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-brand-accent" />
          Progresión de mozos
        </h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Del 50 % al 100 % de la propina en tres niveles. Revisá a cada uno cada {REVISAR_CADA_DIAS} días: los
          exámenes se tildan solos, el resto lo marcás vos.
        </p>
      </div>

      {error ? (
        <AvisoProgresion error={error} />
      ) : mozos.length === 0 ? (
        <p className="text-sm text-brand-muted">No hay mozos con usuario aprobado.</p>
      ) : (
        <ul className="bg-brand-card border border-brand-border rounded-2xl divide-y divide-brand-border/70 overflow-hidden">
          {mozos.map(({ id, nombre, estado }) => {
            const actual = datosNivel(estado.nivel ?? 0)
            const siguiente = estado.niveles.find((n) => n.estado === 'siguiente')
            const totalSiguiente = siguiente?.requisitos.length ?? 0
            const hechos = siguiente?.cumplidos ?? 0
            const tocaRevisar =
              estado.nivel !== null && (estado.diasSinRevisar === null || estado.diasSinRevisar >= REVISAR_CADA_DIAS)
            return (
              <li key={id}>
                <Link
                  href={'/admin/progresion/' + id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-brand-card-hover transition-colors cursor-pointer"
                >
                  <span
                    className={cn(
                      'w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-bold leading-none',
                      actual ? 'bg-brand-accent/10 text-brand-accent' : 'bg-brand-card-hover text-brand-muted'
                    )}
                  >
                    <span className="text-sm">{actual ? actual.porcentaje + '%' : '—'}</span>
                    <span className="text-[9px] font-semibold mt-0.5">{actual ? 'Nivel ' + actual.nivel : 'Sin nivel'}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-brand-text truncate">{nombre}</p>
                    {siguiente ? (
                      <>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-brand-border/60 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', estado.puedeSubir ? 'bg-brand-success' : 'bg-brand-accent')}
                              style={{ width: `${totalSiguiente ? (hechos / totalSiguiente) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-brand-muted tabular-nums whitespace-nowrap">
                            {hechos}/{totalSiguiente}
                          </span>
                        </div>
                        <p className="text-[11px] text-brand-muted mt-0.5">
                          {estado.nivel === null
                            ? 'Asignale su nivel actual'
                            : estado.puedeSubir
                              ? `Listo para pasar al ${siguiente.porcentaje} %`
                              : `Hacia el ${siguiente.porcentaje} %`}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-brand-success font-medium mt-0.5">En el nivel más alto</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {estado.puedeSubir && estado.nivel !== null && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-success/15 text-brand-success whitespace-nowrap">
                        Puede subir
                      </span>
                    )}
                    {tocaRevisar && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                        Toca revisar
                      </span>
                    )}
                  </div>
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
