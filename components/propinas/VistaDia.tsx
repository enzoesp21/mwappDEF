import { cn } from '@/lib/utils'
import { GRUPOS, fechaConDia, horasTexto, pagoTexto, pesos } from '@/lib/propinas'
import type { DiaCompleto } from '@/lib/propinas-datos'

interface Props {
  dia: DiaCompleto
  /** Para resaltar la fila de quien mira. */
  userId: string
}

/** El reparto de un día, de solo lectura, para los mozos y runners. */
export default function VistaDia({ dia, userId }: Props) {
  const salon = dia.total - dia.general
  const horas = dia.personas.reduce(
    (s, p) => s + p.horas * (GRUPOS.find((g) => g.valor === p.grupo)?.factor ?? 1),
    0
  )
  const porHora = horas > 0 ? salon / horas : 0

  return (
    <div className="space-y-4">
      <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-brand-text capitalize">{fechaConDia(dia.fecha)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Dato etiqueta="Total" valor={pesos(dia.total)} />
          <Dato etiqueta="General" valor={pesos(dia.general)} />
          <Dato etiqueta="Salón" valor={pesos(salon)} />
          <Dato etiqueta="Por hora" valor={pesos(porHora)} destacado />
        </div>
      </section>

      {GRUPOS.map((g) => {
        const delGrupo = dia.personas
          .filter((p) => p.grupo === g.valor)
          .sort((a, b) => b.monto - a.monto)
        if (delGrupo.length === 0) return null
        return (
          <section key={g.valor} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <h2 className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-brand-muted">
              {g.titulo}
            </h2>
            <ul className="divide-y divide-brand-border/70">
              {delGrupo.map((p) => {
                const soyYo = p.user_id === userId
                const pago = pagoTexto(p.pago, p.efectivo)
                return (
                  <li
                    key={p.nombre}
                    className={cn('flex items-center gap-3 px-4 py-2.5', soyYo && 'bg-brand-accent/10')}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-text truncate">
                        {p.nombre}
                        {soyYo && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-accent text-white text-[10px] font-bold align-middle">
                            VOS
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-brand-muted">{horasTexto(p.horas)} h</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-text tabular-nums">{pesos(p.monto)}</p>
                      {pago && <p className="text-[11px] font-medium text-brand-success">{pago}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function Dato({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-2 border',
        destacado ? 'bg-brand-accent/10 border-brand-accent/30' : 'bg-brand-card-hover border-brand-border/60'
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">{etiqueta}</p>
      <p className={cn('text-sm font-bold tabular-nums', destacado ? 'text-brand-accent' : 'text-brand-text')}>
        {valor}
      </p>
    </div>
  )
}
