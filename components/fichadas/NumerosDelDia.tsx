'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import NombreConHorario from '@/components/fichadas/NombreConHorario'

/** Una persona en la lista que se abre al tocar un número. */
export interface FilaDelDia {
  userid: string
  nombre: string
  sector: string | null
  /** A qué hora le tocaba entrar según Horarios (texto para mostrar). */
  entradaHorario: string
  /** Lo que va destacado a la derecha: "se fue 16:12". */
  principal: string
  /** Debajo, más chico: "07:58 – 16:12 · 8 h 14". */
  secundario: string
}

type Lista = 'fueron' | 'vinieron'

/** Los tres números de hoy. "Se fueron" y "Vinieron hoy" se tocan y muestran quiénes. */
export default function NumerosDelDia({
  adentro,
  fueron,
  vinieron,
}: {
  adentro: number
  fueron: FilaDelDia[]
  vinieron: FilaDelDia[]
}) {
  const [abierta, setAbierta] = useState<Lista | null>(null)
  const alternar = (lista: Lista) => setAbierta((actual) => (actual === lista ? null : lista))
  const filas = abierta === 'fueron' ? fueron : abierta === 'vinieron' ? vinieron : []

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <a
          href="#adentro"
          className="rounded-2xl border p-3 text-center bg-brand-accent border-brand-accent text-white"
        >
          <p className="text-2xl font-bold tabular-nums text-white">{adentro}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mt-0.5 text-white/80">Adentro</p>
        </a>
        <BotonNumero valor={fueron.length} texto="Se fueron" activo={abierta === 'fueron'} onClick={() => alternar('fueron')} />
        <BotonNumero
          valor={vinieron.length}
          texto="Vinieron hoy"
          activo={abierta === 'vinieron'}
          onClick={() => alternar('vinieron')}
        />
      </div>

      {abierta && (
        <section className="bg-brand-card border border-brand-border rounded-2xl p-4 animate-fade-in">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-muted">
            {abierta === 'fueron' ? 'Se fueron hoy' : 'Vinieron hoy'}
          </h2>
          {filas.length === 0 ? (
            <p className="text-sm text-brand-muted mt-2">
              {abierta === 'fueron' ? 'Todavía no se fue nadie.' : 'Todavía no vino nadie.'}
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-brand-border/50">
              {filas.map((f) => (
                <li key={f.userid} className="flex items-start gap-3 py-1.5">
                  <div className="flex-1 min-w-0 pt-0.5 flex">
                    <NombreConHorario nombre={f.nombre} entrada={f.entradaHorario} debajo={f.sector} />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-brand-text tabular-nums">{f.principal}</p>
                    <p className="text-[11px] text-brand-muted tabular-nums">{f.secundario}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function BotonNumero({
  valor,
  texto,
  activo,
  onClick,
}: {
  valor: number
  texto: string
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'rounded-2xl border p-3 text-center bg-brand-card cursor-pointer transition-colors hover:bg-brand-card-hover',
        activo ? 'border-brand-accent ring-2 ring-brand-accent/30' : 'border-brand-border'
      )}
    >
      <p className="text-2xl font-bold tabular-nums text-brand-accent">{valor}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] mt-0.5 text-brand-muted flex items-center justify-center gap-0.5">
        {texto}
        <ChevronDown className={cn('w-3 h-3 transition-transform', activo && 'rotate-180')} />
      </p>
    </button>
  )
}
