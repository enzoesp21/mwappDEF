import { CheckCircle2, Circle, MinusCircle, XCircle } from 'lucide-react'
import VolverAPreguntar from '@/components/capacitacion/VolverAPreguntar'
import { cn } from '@/lib/utils'

export interface FilaAsistencia {
  id: string
  nombre: string
  puesto: string
  /** Lo que contestó a "¿Participaste de la charla?" y cuándo, o null si todavía no contestó. */
  respuesta: { participo: boolean; en: string } | null
  /** El intento que cuenta: aprobado primero, si no la nota más alta. */
  examen: { score: number; passed: boolean } | null
}

/** "06/11 18:20", en hora de Argentina. */
function cuando(iso: string): string {
  const d = new Date(Date.parse(iso) - 3 * 3600 * 1000)
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`
}

/**
 * La lista de una charla para todo el personal, para los encargados: arriba a
 * quién le falta algo (no contestó, o dijo que participó y no aprobó), después
 * los que dijeron que no participaron (con "Volver a preguntarle") y abajo los
 * que ya están.
 */
export default function ListaAsistencia({
  filas,
  guideId,
  conExamen,
}: {
  filas: FilaAsistencia[]
  guideId: string
  conExamen: boolean
}) {
  const listo = (f: FilaAsistencia) => f.respuesta?.participo === true && (!conExamen || f.examen?.passed === true)
  const noParticiparon = filas.filter((f) => f.respuesta?.participo === false)
  const completos = filas.filter(listo)
  const faltan = filas.filter((f) => f.respuesta?.participo !== false && !listo(f))
  const participaron = filas.filter((f) => f.respuesta?.participo === true).length
  const aprobaron = filas.filter((f) => f.examen?.passed).length

  const fila = (f: FilaAsistencia) => (
    <li key={f.id} className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-brand-text truncate">{f.nombre}</p>
        <p className="text-[11px] text-brand-muted flex-shrink-0">{f.puesto}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs">
        <span
          className={cn(
            'flex items-center gap-1',
            !f.respuesta ? 'text-brand-muted' : f.respuesta.participo ? 'text-brand-success' : 'text-amber-700'
          )}
        >
          {!f.respuesta ? (
            <Circle className="w-3.5 h-3.5" />
          ) : f.respuesta.participo ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <MinusCircle className="w-3.5 h-3.5" />
          )}
          {!f.respuesta
            ? 'Sin contestar'
            : (f.respuesta.participo ? 'Participó · ' : 'No participó · ') + cuando(f.respuesta.en)}
        </span>
        {conExamen && (f.respuesta?.participo !== false || f.examen) && (
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
        )}
      </div>
      {f.respuesta?.participo === false && <VolverAPreguntar guideId={guideId} userId={f.id} />}
    </li>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { etiqueta: 'Participaron', valor: `${participaron} de ${filas.length}` },
          { etiqueta: 'Aprobaron', valor: String(aprobaron) },
          { etiqueta: 'Les falta', valor: String(faltan.length) },
        ].map((d) => (
          <div key={d.etiqueta} className="bg-brand-card border border-brand-border rounded-xl px-3 py-2">
            {/* Espaciado más corto que el de siempre: "PARTICIPARON" no entra a 390 px. */}
            <p className="text-[10px] uppercase tracking-[0.06em] text-brand-muted font-semibold">{d.etiqueta}</p>
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

      {noParticiparon.length > 0 && (
        <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <h2 className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted border-b border-brand-border/70">
            Dijeron que no participaron · {noParticiparon.length}
          </h2>
          <ul className="divide-y divide-brand-border/70">{noParticiparon.map(fila)}</ul>
        </section>
      )}

      {completos.length > 0 && (
        <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <h2 className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent bg-brand-card-hover/50 border-b border-brand-border/70">
            {conExamen ? 'Participaron y aprobaron' : 'Participaron'} · {completos.length}
          </h2>
          <ul className="divide-y divide-brand-border/70">{completos.map(fila)}</ul>
        </section>
      )}
    </div>
  )
}
