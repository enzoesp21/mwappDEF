'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Timer, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizarNombre } from '@/lib/horarios'
import type { Aviso } from '@/lib/fichadas'
import { textoFalta, textoHabitual, textoSegunHorario } from '@/lib/planilla'
import {
  diaDeSemana,
  diasDelMes,
  nombreDelMes,
  textoDias,
  textoHoras,
  type CeldaPlanilla,
  type FilaPlanilla,
} from '@/lib/planilla-vista'
import { actualizarPlanillaAction } from '@/app/actions/planilla'
import PanelCelda from '@/components/planilla/PanelCelda'
import ExportarPlanilla from '@/components/planilla/ExportarPlanilla'

interface Props {
  /** "2026-10" */
  mes: string
  /** Los meses guardados, del más nuevo al más viejo. */
  meses: { mes: string; cerrado: boolean }[]
  filas: FilaPlanilla[]
  cerrado: boolean
  /** "hoy 17:20" */
  actualizada: string | null
  aviso: Aviso
  /** "2026-11-01" */
  hoy: string
  esMesActual: boolean
  sinMeses: boolean
  /** Personas del reloj que ficharon y no están asociadas a nadie. */
  sinAsociar: number
}

const INICIAL = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const CORTO: Record<string, string> = { VAC: 'VAC', CERT: 'CERT', LIC: 'LIC', FRANCO: 'FR', 'NO VINO': 'NV' }

/** Qué se ve en una celda y qué dice al pasar el mouse. */
function aspecto(c: CeldaPlanilla | undefined): { texto: ReactNode; clase: string; titulo: string } {
  if (!c) return { texto: '', clase: '', titulo: 'Sin datos: tocá para cargar horas o un código' }
  const avisos = c.avisos ?? []
  if (c.codigo) {
    return {
      texto: CORTO[c.codigo] ?? c.codigo,
      clase: c.codigo === 'VAC' ? 'bg-yellow-200 text-yellow-900 font-semibold' : 'bg-brand-dark/45 text-brand-text font-semibold',
      titulo: c.codigo + (c.nota ? ` · ${c.nota}` : ''),
    }
  }
  if (c.estado === 'incompleto') {
    const s = c.sugerencia && { ...c.sugerencia, segunHorario: c.sugerencia.segun_horario }
    const partes = s
      ? [textoFalta(s), textoHabitual(s), textoSegunHorario(s)].filter(Boolean)
      : avisos.map((a) => a.texto)
    return { texto: '?', clase: 'bg-[#FFC7CE] text-red-800 font-bold', titulo: partes.join(' · ') }
  }
  if (c.horas !== null) {
    const rango = c.entrada && c.salida ? ` (${c.entrada.slice(0, 5)} a ${c.salida.slice(0, 5)})` : ''
    return {
      texto: textoHoras(c.horas),
      clase: c.estado === 'revisar' ? 'text-amber-800 font-semibold bg-amber-50' : 'text-brand-text',
      titulo: `${textoHoras(c.horas)} h${rango}${c.estado === 'revisar' ? ' · más de 17 h: revisar' : ''}${c.nota ? ` · ${c.nota}` : ''}`,
    }
  }
  const adentro = avisos.find((a) => a.tipo === 'en-curso')
  if (adentro) return { texto: '●', clase: 'text-brand-success', titulo: adentro.texto }
  const sinFichadas = avisos.find((a) => a.tipo === 'sin-fichadas')
  if (sinFichadas) return { texto: '—', clase: 'text-brand-muted/70', titulo: sinFichadas.texto }
  return { texto: '', clase: '', titulo: c.nota ?? '' }
}

/** La planilla del mes como la de Excel: tocá un día para ver sus fichadas y corregirlo. */
export default function GrillaPlanilla(p: Props) {
  const router = useRouter()
  const [buscar, setBuscar] = useState('')
  const [soloIncompletas, setSoloIncompletas] = useState(false)
  const [abierta, setAbierta] = useState<{ empleadoId: string; dia: number } | null>(null)
  const [actualizando, setActualizando] = useState<'reciente' | 'mes' | null>(null)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  const dias = Array.from({ length: diasDelMes(p.mes) }, (_, i) => i + 1)
  const totalHoras = p.filas.reduce((s, f) => s + f.horas, 0)
  const incompletas = p.filas.reduce((s, f) => s + f.incompletas, 0)
  const diaDeHoy = p.hoy.startsWith(p.mes) ? Number(p.hoy.slice(8)) : null

  const visibles = useMemo(() => {
    const q = normalizarNombre(buscar)
    return p.filas.filter(
      (f) =>
        (!soloIncompletas || f.incompletas > 0) &&
        (!q || normalizarNombre(`${f.nombre} ${f.cargo ?? ''}`).includes(q))
    )
  }, [p.filas, buscar, soloIncompletas])

  // Para ir al mes de antes o de después entre los guardados.
  const ordenados = [...p.meses].map((m) => m.mes).sort()
  const posicion = ordenados.indexOf(p.mes)
  const anterior = posicion > 0 ? ordenados[posicion - 1] : null
  const siguiente = posicion >= 0 && posicion < ordenados.length - 1 ? ordenados[posicion + 1] : null

  async function actualizar(todoElMes: boolean) {
    setActualizando(todoElMes ? 'mes' : 'reciente')
    setMensaje(null)
    // En un mes que no es el de hoy, "actualizar" es recalcularlo entero.
    const r = await actualizarPlanillaAction(todoElMes || !p.esMesActual ? p.mes : undefined)
    setActualizando(null)
    setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
    if (r.ok) router.refresh()
  }

  const filaAbierta = abierta ? p.filas.find((f) => f.empleadoId === abierta.empleadoId) : undefined

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Fichadas</p>
        <h1 className="text-2xl font-semibold text-brand-accent tracking-tight">Planilla del mes</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed max-w-2xl">
          Se llena sola con el reloj cada 2 horas. Tocá un día para ver sus fichadas, completar lo que falta o cargar
          un código.
        </p>
      </div>

      {/* Mes y actualizar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <FlechaMes destino={anterior} etiqueta="Mes anterior">
            <ChevronLeft className="w-4 h-4" />
          </FlechaMes>
          <select
            value={p.mes}
            onChange={(e) => router.push(`/admin/fichadas/planilla?mes=${e.target.value}`)}
            aria-label="Elegí el mes"
            className="h-10 rounded-xl border border-brand-border bg-brand-card px-3 text-sm font-semibold text-brand-text cursor-pointer"
          >
            {p.meses.length === 0 && <option value={p.mes}>{nombreDelMes(p.mes)}</option>}
            {p.meses.map((m) => (
              <option key={m.mes} value={m.mes}>
                {nombreDelMes(m.mes)}
                {m.cerrado ? ' · cerrado' : ''}
              </option>
            ))}
          </select>
          <FlechaMes destino={siguiente} etiqueta="Mes siguiente">
            <ChevronRight className="w-4 h-4" />
          </FlechaMes>
        </div>
        {!p.cerrado && (
          <div className="flex items-center gap-2 ml-auto">
            {p.esMesActual && (
              <button
                type="button"
                onClick={() => actualizar(true)}
                disabled={actualizando !== null}
                className="text-xs font-semibold text-brand-muted hover:text-brand-accent underline-offset-2 hover:underline cursor-pointer disabled:opacity-50"
              >
                {actualizando === 'mes' ? 'Recalculando…' : 'Recalcular todo el mes'}
              </button>
            )}
            <button
              type="button"
              onClick={() => actualizar(false)}
              disabled={actualizando !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-60 min-h-[44px]"
            >
              {actualizando === 'reciente' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Actualizar ahora
            </button>
          </div>
        )}
      </div>

      {/* Contadores */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-brand-card border border-brand-border text-brand-text font-semibold">
          {textoHoras(totalHoras)} h en el mes
        </span>
        <button
          type="button"
          onClick={() => setSoloIncompletas((v) => !v)}
          aria-pressed={soloIncompletas}
          className={cn(
            'px-3 py-1.5 rounded-full border font-semibold cursor-pointer',
            incompletas > 0 ? 'bg-[#FFC7CE] border-red-300 text-red-800' : 'bg-brand-success/10 border-brand-success/30 text-brand-success',
            soloIncompletas && 'ring-2 ring-red-400'
          )}
        >
          {incompletas === 0 ? 'Sin incompletas' : incompletas === 1 ? '1 incompleta' : `${incompletas} incompletas`}
        </button>
        {p.actualizada && (
          <span className="px-3 py-1.5 rounded-full bg-brand-card border border-brand-border text-brand-muted">
            Actualizada {p.actualizada}
          </span>
        )}
        <span
          title={p.aviso.detalle}
          className={cn(
            'px-3 py-1.5 rounded-full border flex items-center gap-1',
            p.aviso.nivel === 'ok' && 'bg-brand-success/10 border-brand-success/30 text-brand-success',
            p.aviso.nivel === 'atencion' && 'bg-amber-50 border-amber-300 text-amber-800',
            p.aviso.nivel === 'problema' && 'bg-brand-error/10 border-brand-error/30 text-brand-error'
          )}
        >
          {p.aviso.nivel === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          Reloj: {p.aviso.titulo}
        </span>
      </div>

      {p.sinAsociar > 0 && (
        <Link
          href="/admin/fichadas/reloj"
          className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:border-amber-400"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {p.sinAsociar === 1 ? 'Hay 1 persona del reloj sin asociar' : `Hay ${p.sinAsociar} personas del reloj sin asociar`}: sus
            fichadas no llegan a la planilla. <span className="font-semibold underline underline-offset-2">Asociarlas</span>
          </span>
        </Link>
      )}

      {mensaje && (
        <p
          role="status"
          className={cn('flex items-start gap-1.5 text-sm', mensaje.ok ? 'text-brand-success' : 'text-brand-error')}
        >
          {mensaje.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {mensaje.texto}
        </p>
      )}

      {p.cerrado && (
        <div className="bg-brand-card border border-brand-border rounded-2xl px-4 py-3 text-sm text-brand-text">
          <span className="font-semibold">{nombreDelMes(p.mes)} está cerrado.</span>{' '}
          <span className="text-brand-muted">Se ve como quedó; para cambiar algo hay que reabrirlo.</span>
        </div>
      )}

      {!p.sinMeses && <ExportarPlanilla mes={p.mes} hoy={p.hoy} />}

      {p.sinMeses ? (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 text-center text-sm text-brand-muted">
          Todavía no se armó ninguna planilla. Se arma sola cada 2 horas; si no querés esperar, tocá
          <span className="font-semibold text-brand-text"> Actualizar ahora</span>.
        </div>
      ) : (
        <>
          {/* Buscar */}
          <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-brand-card border border-brand-border max-w-sm">
            <Search className="w-4 h-4 text-brand-muted flex-shrink-0" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar empleado o cargo"
              className="flex-1 min-w-0 bg-transparent text-sm text-brand-text placeholder:text-brand-muted/70 outline-none"
            />
          </label>

          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-auto max-h-[72vh] overscroll-contain">
            <table className="border-separate border-spacing-0 text-[11px] text-brand-text">
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-30 bg-brand-card border-b border-r border-brand-border px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted w-[120px] min-w-[120px] md:w-[220px] md:min-w-[220px]">
                    Empleado
                  </th>
                  <th className="hidden md:table-cell sticky top-0 z-20 bg-brand-card border-b border-r border-brand-border px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted min-w-[150px]">
                    Cargo
                  </th>
                  {dias.map((d) => {
                    const semana = diaDeSemana(p.mes, d)
                    const esHoy = d === diaDeHoy
                    return (
                      <th
                        key={d}
                        className={cn(
                          'sticky top-0 z-20 border-b border-r border-brand-border/60 px-0 py-1 text-center font-semibold min-w-[38px]',
                          esHoy ? 'bg-brand-accent text-white' : semana === 0 || semana === 6 ? 'bg-[#efe9d6]' : 'bg-brand-card'
                        )}
                      >
                        <span className="block text-[11px] leading-none">{d}</span>
                        <span className={cn('block text-[9px] leading-none mt-0.5', esHoy ? 'text-white/80' : 'text-brand-muted')}>
                          {INICIAL[semana]}
                        </span>
                      </th>
                    )
                  })}
                  <th className="sticky top-0 z-20 md:z-30 md:right-[52px] bg-brand-card border-b border-r border-l border-brand-border px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-brand-muted min-w-[56px] w-[56px]">
                    Horas
                  </th>
                  <th className="sticky top-0 z-20 md:z-30 md:right-0 bg-brand-card border-b border-brand-border px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-brand-muted min-w-[52px] w-[52px]">
                    Días
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.empleadoId} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-brand-card group-hover:bg-[#f7f4ea] border-b border-r border-brand-border/60 px-2 py-1 text-left font-medium w-[120px] min-w-[120px] max-w-[120px] md:w-[220px] md:min-w-[220px] md:max-w-[220px]"
                    >
                      <span className="block truncate text-[10.5px] md:text-[11px]" title={f.nombre}>
                        {f.nombre}
                      </span>
                      <span className="block truncate text-[9px] text-brand-muted font-normal md:hidden">{f.cargo ?? ''}</span>
                    </th>
                    <td className="hidden md:table-cell border-b border-r border-brand-border/60 px-2 py-1 text-brand-muted truncate max-w-[180px] group-hover:bg-[#f7f4ea]">
                      {f.cargo ?? ''}
                    </td>
                    {dias.map((d) => {
                      const celda = f.celdas[d]
                      const a = aspecto(celda)
                      const semana = diaDeSemana(p.mes, d)
                      return (
                        <td
                          key={d}
                          className={cn(
                            'p-0 border-b border-r border-brand-border/40',
                            (semana === 0 || semana === 6) && 'bg-[#f7f3e6]',
                            d === diaDeHoy && 'bg-brand-accent/[0.06]'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setAbierta({ empleadoId: f.empleadoId, dia: d })}
                            title={a.titulo}
                            aria-label={`${f.nombre}, día ${d}: ${a.titulo || 'sin datos'}`}
                            className={cn(
                              'relative w-full h-8 min-w-[38px] px-0.5 tabular-nums cursor-pointer hover:outline hover:outline-2 hover:-outline-offset-2 hover:outline-brand-accent/50',
                              a.clase
                            )}
                          >
                            {a.texto}
                            {celda?.estado === 'revisar' && (
                              <Timer className="absolute top-0.5 left-0.5 w-2.5 h-2.5 text-amber-700" aria-hidden />
                            )}
                            {celda && (celda.bloqueada || celda.origen === 'papel') && (
                              <span
                                aria-hidden
                                className={cn(
                                  'absolute top-0 right-0 w-0 h-0 border-t-[7px] border-l-[7px] border-l-transparent',
                                  celda.origen === 'papel' ? 'border-t-sky-500' : 'border-t-brand-accent'
                                )}
                              />
                            )}
                          </button>
                        </td>
                      )
                    })}
                    <td className="md:sticky md:right-[52px] md:z-10 bg-brand-card border-b border-r border-l border-brand-border/60 px-2 text-right font-bold tabular-nums group-hover:bg-[#f7f4ea]">
                      {f.horas > 0 ? textoHoras(f.horas) : ''}
                    </td>
                    <td className="md:sticky md:right-0 md:z-10 bg-brand-card border-b border-brand-border/60 px-2 text-right tabular-nums text-brand-muted group-hover:bg-[#f7f4ea]">
                      {f.horas > 0 ? textoDias(f.dias) : ''}
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={dias.length + 4} className="px-4 py-6 text-left text-sm text-brand-muted">
                      {soloIncompletas ? 'No hay incompletas con ese filtro.' : 'Nadie coincide con la búsqueda.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Referencias */}
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-brand-muted">
            <li className="flex items-center gap-1.5">
              <span className="w-6 h-4 rounded bg-[#FFC7CE] text-red-800 font-bold text-center leading-4">?</span> Incompleta
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-6 h-4 rounded bg-yellow-200 text-yellow-900 font-semibold text-center leading-4 text-[9px]">VAC</span>{' '}
              Vacaciones
            </li>
            <li className="flex items-center gap-1.5">
              <Timer className="w-3 h-3 text-amber-700" /> Más de 17 h
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-brand-muted/70">—</span> Tenía horario y no fichó
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-brand-success">●</span> Adentro ahora
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-0 h-0 border-t-[7px] border-l-[7px] border-l-transparent border-t-brand-accent" /> Cargado a mano
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-0 h-0 border-t-[7px] border-l-[7px] border-l-transparent border-t-sky-500" /> Con papel
            </li>
            <li>FR franco · NV no vino · DÍAS = horas ÷ 8,5</li>
          </ul>
        </>
      )}

      {abierta && filaAbierta && (
        <PanelCelda
          fila={filaAbierta}
          dia={abierta.dia}
          mes={p.mes}
          cerrado={p.cerrado}
          onCerrar={(resultado) => {
            setAbierta(null)
            if (resultado) setMensaje(resultado)
          }}
        />
      )}
    </div>
  )
}

function FlechaMes({ destino, etiqueta, children }: { destino: string | null; etiqueta: string; children: ReactNode }) {
  const clase = 'w-10 h-10 rounded-xl border border-brand-border bg-brand-card flex items-center justify-center'
  if (!destino) {
    return (
      <span aria-hidden className={cn(clase, 'text-brand-muted/40')}>
        {children}
      </span>
    )
  }
  return (
    <Link href={`/admin/fichadas/planilla?mes=${destino}`} aria-label={etiqueta} className={cn(clase, 'text-brand-text hover:border-brand-accent')}>
      {children}
    </Link>
  )
}
