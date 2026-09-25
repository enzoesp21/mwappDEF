'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DIAS_CORTOS,
  esFeriado,
  normalizarNombre,
  numeroDeDia,
  diasConNoche,
  pintaComoFinde,
  totalesDelSector,
  type DatosHorario,
} from '@/lib/horarios'
import { claseCelda, claseColumna, claseEncabezadoDia, REFERENCIAS } from '@/components/horario/estilos'

interface Props {
  datos: DatosHorario
  lunes: string
  /** Índice de hoy si la semana es la actual; null si no. */
  hoy: number | null
  /** Nombres (tal cual figuran en la planilla) a resaltar: los de quien mira. */
  resaltar: string[]
}

export default function TablaHorario({ datos, lunes, hoy, resaltar }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const aResaltar = useMemo(() => new Set(resaltar.map(normalizarNombre)), [resaltar])

  const findes = Array.from({ length: 7 }, (_, i) => pintaComoFinde(datos, i))
  const noches = diasConNoche(datos)
  const filtro = normalizarNombre(busqueda)
  const sectores = useMemo(() => {
    if (!filtro) return datos.sectores
    return datos.sectores
      .map((s) => ({
        ...s,
        personas: s.personas.filter((p) => normalizarNombre(p.nombre).includes(filtro)),
      }))
      .filter((s) => s.personas.length > 0 || normalizarNombre(s.nombre).includes(filtro))
  }, [datos.sectores, filtro])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar un nombre o un sector"
          aria-label="Buscar en el horario"
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-brand-card border border-brand-border rounded-xl text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-accent"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            aria-label="Borrar la búsqueda"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-brand-muted hover:text-brand-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {REFERENCIAS.map((r) => (
          <span key={r.etiqueta} className="flex items-center gap-1.5 text-[11px] text-brand-muted">
            <span className={cn('w-3 h-3 rounded-sm border border-brand-border', r.clase)} />
            {r.etiqueta}
          </span>
        ))}
      </div>

      {sectores.length === 0 && (
        <p className="text-sm text-brand-muted text-center py-8">
          No aparece nadie con &quot;{busqueda}&quot;.
        </p>
      )}

      {sectores.map((sector, si) => {
        const totales = totalesDelSector(sector, noches)
        return (
          <section key={si} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <h2 className="px-3 py-2 bg-brand-text text-white text-xs font-bold uppercase tracking-wider">
              {sector.nombre}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="sticky left-0 z-10 bg-brand-card text-left font-semibold text-brand-muted px-2 py-1.5 min-w-[112px]">
                      &nbsp;
                    </th>
                    {DIAS_CORTOS.map((d, i) => (
                      <th
                        key={d}
                        className={cn(
                          'font-semibold px-1 py-1.5 text-center whitespace-nowrap',
                          claseEncabezadoDia(findes[i]),
                          hoy === i && !findes[i] && 'text-brand-accent'
                        )}
                      >
                        {hoy === i ? 'Hoy' : d} {numeroDeDia(lunes, i)}
                        {esFeriado(datos, i) && (
                          <span className="block text-[8px] font-bold uppercase tracking-wider">Feriado</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sector.personas.map((p, pi) => {
                    const esVos = aResaltar.has(normalizarNombre(p.nombre))
                    return (
                      <tr key={pi} className={cn('border-b border-brand-border/60', esVos && 'bg-brand-accent/10')}>
                        <td
                          className={cn(
                            'sticky left-0 z-10 px-2 py-1 font-medium text-brand-text whitespace-nowrap',
                            esVos ? 'bg-[#e8efe9]' : 'bg-brand-card'
                          )}
                        >
                          {p.nombre}
                          {esVos && <span className="ml-1 text-[9px] text-brand-accent font-bold">VOS</span>}
                        </td>
                        {p.dias.map((valor, i) => (
                          <td key={i} className={cn('p-0.5', claseColumna(findes[i]))}>
                            <div
                              className={cn(
                                'rounded px-1 py-1 text-center whitespace-nowrap',
                                claseCelda(valor, findes[i], noches[i]),
                                hoy === i && 'ring-1 ring-brand-accent/60'
                              )}
                            >
                              {valor || '—'}
                            </div>
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  {!filtro && (
                    <tr className="bg-brand-dark/30">
                      <td className="sticky left-0 z-10 bg-[#f3efe4] px-2 py-1 text-[10px] font-semibold text-brand-muted">
                        Trabajan
                      </td>
                      {totales.map((t, i) => (
                        <td key={i} className={cn('px-1 py-1 text-center text-[10px] font-semibold text-brand-text', claseColumna(findes[i]))}>
                          {t.total}
                          {t.noche > 0 && <span className="text-brand-accent"> ({t.noche}N)</span>}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </div>
  )
}
