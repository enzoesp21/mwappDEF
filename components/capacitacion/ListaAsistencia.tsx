import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilaAsistencia {
  id: string
  nombre: string
  puesto: string
  /** Cuándo se anotó (ISO), o null. */
  anotado: string | null
  /** El mejor intento del examen: aprobado primero, si no la nota más alta. */
  examen: { score: number; passed: boolean } | null
}

/** "06/11 18:20", en hora de Argentina. */
function cuando(iso: string): string {
  const d = new Date(Date.parse(iso) - 3 * 3600 * 1000)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`
}

/**
 * La lista de una charla para todo el personal: arriba quién todavía no se
 * anotó o no aprobó, abajo los que ya están.
 */
export default function ListaAsistencia({ filas }: { filas: FilaAsistencia[] }) {
  const completos = filas.filter((f) => f.anotado && f.examen?.passed)
  const faltan = filas.filter((f) => !(f.anotado && f.examen?.passed))
  const anotados = filas.filter((f) => f.anotado).length
  const aprobaron = filas.filter((f) => f.examen?.passed).length

  const fila = (f: FilaAsistencia) => (
    <li key={f.id} className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-brand-text truncate">{f.nombre}</p>
        <p className="text-[11px] text-brand-muted flex-shrink-0">{f.puesto}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
        <span className={cn('flex items-center gap-1', f.anotado ? 'text-brand-success' : 'text-brand-muted')}>
          {f.anotado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
          {f.anotado ? 'Anotado ' + cuando(f.anotado) : 'Sin anotarse'}
        </span>
        <span
          className={cn(
            'flex items-center gap-1',
            !f.examen ? 'text-brand-muted' : f.examen.passed ? 'text-brand-success' : 'text-brand-error'
          )}
        >
          {!f.examen ? (
            <Circle className="w-3.5 h-3.5" />
          ) : f.examen.passed ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <XCircle className="w-3.5 h-3.5" />
          )}
          {!f.examen ? 'No rindió' : (f.examen.passed ? 'Aprobó con ' : 'No aprobó: ') + f.examen.score + ' %'}
        </span>
      </div>
    </li>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { etiqueta: 'Anotados', valor: `${anotados} de ${filas.length}` },
          { etiqueta: 'Aprobaron', valor: String(aprobaron) },
          { etiqueta: 'Les falta', valor: String(faltan.length) },
        ].map((d) => (
          <div key={d.etiqueta} className="bg-brand-card border border-brand-border rounded-xl px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">{d.etiqueta}</p>
            <p className="text-sm font-bold text-brand-text tabular-nums">{d.valor}</p>
          </div>
        ))}
      </div>

      {faltan.length > 0 && (
        <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <h2 className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800 bg-amber-50 border-b border-amber-200">
            Les falta algo · {faltan.length}
          </h2>
          <ul className="divide-y divide-brand-border/70">{faltan.map(fila)}</ul>
        </section>
      )}

      {completos.length > 0 && (
        <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <h2 className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent bg-brand-card-hover/50 border-b border-brand-border/70">
            Anotados y aprobados · {completos.length}
          </h2>
          <ul className="divide-y divide-brand-border/70">{completos.map(fila)}</ul>
        </section>
      )}
    </div>
  )
}
