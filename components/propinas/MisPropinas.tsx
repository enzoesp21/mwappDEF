import { Banknote } from 'lucide-react'
import { GRUPOS, fechaConDia, horasTexto, pagoTexto, pesos } from '@/lib/propinas'
import type { MiPropina } from '@/lib/propinas-datos'

interface Props {
  propinas: MiPropina[]
  /** "2026-09" del mes en curso, para el total del mes. */
  mes: string
}

/** Lo que le tocó a la persona logueada. Nunca lo de los demás. */
export default function MisPropinas({ propinas, mes }: Props) {
  if (propinas.length === 0) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-2xl p-8 text-center space-y-2">
        <Banknote className="w-9 h-9 text-brand-muted mx-auto" />
        <p className="text-brand-text font-medium">Todavía no tenés propinas cargadas</p>
        <p className="text-brand-muted text-sm leading-relaxed">
          El cajero las carga al día siguiente. Si trabajaste y no te aparecen, avisale: puede que tu
          nombre esté escrito distinto que en tu usuario.
        </p>
      </div>
    )
  }

  const delMes = propinas.filter((p) => p.fecha.startsWith(mes))
  const totalMes = delMes.reduce((s, p) => s + p.monto, 0)
  const horasMes = delMes.reduce((s, p) => s + p.horas, 0)

  return (
    <div className="space-y-4">
      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <p className="text-brand-muted text-xs font-medium uppercase tracking-wider">Este mes</p>
        <p className="text-3xl font-bold text-brand-accent mt-1 tabular-nums">{pesos(totalMes)}</p>
        <p className="text-sm text-brand-muted mt-0.5">
          {delMes.length} {delMes.length === 1 ? 'día' : 'días'} · {horasTexto(horasMes)} h
        </p>
      </div>

      <ul className="bg-brand-card border border-brand-border rounded-2xl divide-y divide-brand-border/70 overflow-hidden">
        {propinas.map((p) => {
          const grupo = GRUPOS.find((g) => g.valor === p.grupo)
          const pago = pagoTexto(p.pago, p.efectivo)
          return (
            <li key={p.fecha} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-text capitalize">{fechaConDia(p.fecha)}</p>
                <p className="text-xs text-brand-muted mt-0.5">
                  {horasTexto(p.horas)} h
                  {p.grupo !== 'camarero' && grupo ? ` al ${grupo.corta}` : ''} · {pesos(p.porHora)}/h
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brand-text tabular-nums">{pesos(p.monto)}</p>
                {/* Sin forma de pago no se dice "sin pagar": puede que el cajero no la haya anotado. */}
                {pago && <p className="text-[11px] font-medium text-brand-success">{pago}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
