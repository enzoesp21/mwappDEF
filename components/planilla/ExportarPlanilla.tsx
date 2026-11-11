'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, ChevronDown, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { diasDelMes, fechaDelDia, nombreDelMes } from '@/lib/planilla-vista'
import { bajarArchivo as bajar } from '@/lib/bajar-archivo'

interface Props {
  /** "2026-10" */
  mes: string
}

/** Los Excel de la planilla, las horas y la propina del resto del personal. */
export default function ExportarPlanilla({ mes }: Props) {
  const ultimo = diasDelMes(mes)
  const [abierto, setAbierto] = useState(false)
  const [bajando, setBajando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [desde, setDesde] = useState(fechaDelDia(mes, 1))
  const [hasta, setHasta] = useState(fechaDelDia(mes, 15))

  async function correr(clave: string, url: string) {
    setBajando(clave)
    setError(null)
    setError(await bajar(url))
    setBajando(null)
  }

  const botonExcel = (clave: string, etiqueta: string, parte: 'mes' | 'q1' | 'q2') => (
    <button
      type="button"
      onClick={() => correr(clave, `/api/planilla/excel?mes=${mes}&parte=${parte}`)}
      disabled={bajando !== null}
      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-60 min-h-[44px]"
    >
      {bajando === clave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {etiqueta}
    </button>
  )

  return (
    <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-brand-card-hover/60"
      >
        <FileSpreadsheet className="w-5 h-5 text-brand-accent flex-shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-brand-text">Excel y propinas</span>
          <span className="block text-xs text-brand-muted">
            La planilla de {nombreDelMes(mes).toLowerCase()} en Excel, quincenas y la propina del resto del personal
          </span>
        </span>
        <ChevronDown className={cn('w-4 h-4 text-brand-muted transition-transform', abierto && 'rotate-180')} />
      </button>

      {abierto && (
        <div className="border-t border-brand-border/70 px-4 py-4 space-y-5">
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Planilla en Excel</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {botonExcel('mes', 'Mes entero', 'mes')}
              {botonExcel('q1', '1ra quincena (1 al 15)', 'q1')}
              {botonExcel('q2', `2da quincena (16 al ${ultimo})`, 'q2')}
            </div>
            <p className="text-[11px] text-brand-muted">
              Igual a la planilla de siempre: HORAS y DIAS con fórmulas, VAC en amarillo y las incompletas en rojo con un
              comentario.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Horas para propinas</h3>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-xs text-brand-muted">Desde</span>
                <input
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="mt-1 block h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
                />
              </label>
              <label className="block">
                <span className="text-xs text-brand-muted">Hasta</span>
                <input
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="mt-1 block h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
                />
              </label>
              <button
                type="button"
                onClick={() => correr('horas', `/api/planilla/horas?desde=${desde}&hasta=${hasta}`)}
                disabled={bajando !== null || !desde || !hasta || hasta < desde}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-60 min-h-[44px]"
              >
                {bajando === 'horas' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Excel de horas
              </button>
            </div>
            <p className="text-[11px] text-brand-muted">Empleado y Horas Calculadas (las de la planilla), sumadas en esas fechas.</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">
              Propina del resto del personal
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([1, 2] as const).map((q) => (
                <Link
                  key={q}
                  href={`/admin/fichadas/planilla/propina?mes=${mes}&q=${q}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text hover:border-brand-accent min-h-[44px]"
                >
                  {q === 1 ? '1ra quincena (1 al 15)' : `2da quincena (16 al ${ultimo})`} <ArrowRight className="w-4 h-4" />
                </Link>
              ))}
            </div>
            <p className="text-[11px] text-brand-muted">
              Sin camareros. Ponés el monto y se reparte 60 % Salón y 40 % Cocina, según las horas de la quincena.
            </p>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-brand-error">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
