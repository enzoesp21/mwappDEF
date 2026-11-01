'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, ChevronDown, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { diasDelMes, fechaDelDia, nombreDelMes } from '@/lib/planilla-vista'

interface Props {
  /** "2026-10" */
  mes: string
  /** "2026-11-01" */
  hoy: string
}

/** Baja un archivo de la app; si el servidor contesta un error, lo devuelve en texto. */
async function bajar(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) {
      const cuerpo = await r.json().catch(() => null)
      return (cuerpo as { error?: string } | null)?.error ?? `No se pudo bajar (error ${r.status}).`
    }
    const disposicion = r.headers.get('Content-Disposition') ?? ''
    const nombre = decodeURIComponent(
      disposicion.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? disposicion.match(/filename="([^"]+)"/)?.[1] ?? 'planilla.xlsx'
    )
    const enlace = document.createElement('a')
    enlace.href = URL.createObjectURL(await r.blob())
    enlace.download = nombre
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10_000)
    return null
  } catch {
    return 'No se pudo bajar el archivo: revisá la conexión.'
  }
}

/** Los Excel de la planilla y las horas para propinas. */
export default function ExportarPlanilla({ mes, hoy }: Props) {
  const ultimo = diasDelMes(mes)
  const ayer = (() => {
    const d = new Date(hoy + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const [abierto, setAbierto] = useState(false)
  const [bajando, setBajando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [desde, setDesde] = useState(fechaDelDia(mes, 1))
  const [hasta, setHasta] = useState(fechaDelDia(mes, 15))
  const [diaPropinas, setDiaPropinas] = useState(ayer.startsWith(mes) ? ayer : fechaDelDia(mes, 1))

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
          <span className="block text-xs text-brand-muted">La planilla de {nombreDelMes(mes).toLowerCase()} en Excel, quincenas y horas para propinas</span>
        </span>
        <ChevronDown className={cn('w-4 h-4 text-brand-muted transition-transform', abierto && 'rotate-180')} />
      </button>

      {abierto && (
        <div className="border-t border-brand-border/70 px-4 py-4 space-y-5">
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Planilla en Excel</h3>
            <div className="grid sm:grid-cols-3 gap-2">
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
            <p className="text-[11px] text-brand-muted">
              Empleado y Horas Calculadas, sumadas en esas fechas. Cada día va de a cuarto de hora (8,25, 8,75), como
              se cuenta para la propina; la planilla sigue de a media.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Pasar a Propinas</h3>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="text-xs text-brand-muted">Día</span>
                <input
                  type="date"
                  value={diaPropinas}
                  max={hoy}
                  onChange={(e) => setDiaPropinas(e.target.value)}
                  className="mt-1 block h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
                />
              </label>
              <Link
                href={`/admin/propinas/${diaPropinas}?traer=reloj`}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover min-h-[44px]"
              >
                Abrir en Propinas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-[11px] text-brand-muted">
              Abre las propinas de ese día, suma a los mozos y completa sus horas con las del reloj, de a cuarto de
              hora. Revisá y guardá como siempre.
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
