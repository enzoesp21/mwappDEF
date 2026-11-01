'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronDown, Download, Loader2, Lock, LockOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { nombreDelMes } from '@/lib/planilla-vista'
import { cerrarMesAction, excelDelCierreAction, reabrirMesAction } from '@/app/actions/planilla-cierre'

export interface DatosCierre {
  /** El mes ya terminó (se puede cerrar). */
  terminado: boolean
  /** "03/11 09:15" */
  cerradoEn: string | null
  cerradoPor: string | null
  tieneExcel: boolean
  historial: { accion: string; detalle: string | null; por: string; cuando: string }[]
}

interface Props {
  /** "2026-10" */
  mes: string
  cerrado: boolean
  incompletas: number
  cierre: DatosCierre
}

/** Cerrar el mes (queda de solo lectura, con su Excel y totales), reabrirlo y su historial. */
export default function CierreMes({ mes, cerrado, incompletas, cierre }: Props) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<'cerrar' | 'reabrir' | 'excel' | null>(null)
  const [confirmar, setConfirmar] = useState<number | null>(null)
  const [reabriendo, setReabriendo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)
  const [verHistorial, setVerHistorial] = useState(false)
  const nombre = nombreDelMes(mes)

  async function cerrar(aunqueHayaIncompletas: boolean) {
    setOcupado('cerrar')
    setMensaje(null)
    const r = await cerrarMesAction(mes, aunqueHayaIncompletas)
    setOcupado(null)
    if (!r.ok && r.incompletas) {
      setConfirmar(r.incompletas)
      return
    }
    setConfirmar(null)
    setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
    if (r.ok) router.refresh()
  }

  async function reabrir() {
    setOcupado('reabrir')
    setMensaje(null)
    const r = await reabrirMesAction(mes, motivo)
    setOcupado(null)
    setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
    if (r.ok) {
      setReabriendo(false)
      setMotivo('')
      router.refresh()
    }
  }

  async function bajarExcel() {
    setOcupado('excel')
    setMensaje(null)
    const r = await excelDelCierreAction(mes)
    setOcupado(null)
    if (r.ok) window.location.assign(r.url)
    else setMensaje({ ok: false, texto: r.error })
  }

  if (!cerrado && !cierre.terminado && cierre.historial.length === 0) return null

  return (
    <section className={cn('rounded-2xl border px-4 py-3 space-y-3', cerrado ? 'bg-brand-card border-brand-accent/40' : 'bg-brand-card border-brand-border')}>
      {cerrado ? (
        <>
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-brand-accent mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold text-brand-text">{nombre} está cerrado</p>
              <p className="text-xs text-brand-muted">
                {cierre.cerradoEn ? `El ${cierre.cerradoEn}` : 'Cerrado'}
                {cierre.cerradoPor ? ` por ${cierre.cerradoPor}` : ''}. Se ve como quedó: no se puede cambiar nada.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {cierre.tieneExcel && (
              <button
                type="button"
                onClick={bajarExcel}
                disabled={ocupado !== null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border text-sm font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-60 min-h-[44px]"
              >
                {ocupado === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Excel del cierre
              </button>
            )}
            {!reabriendo && (
              <button
                type="button"
                onClick={() => setReabriendo(true)}
                disabled={ocupado !== null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border text-sm font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-60 min-h-[44px]"
              >
                <LockOpen className="w-4 h-4" /> Reabrir
              </button>
            )}
          </div>
          {reabriendo && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
              <p className="text-xs text-amber-900">
                Reabrirlo deja volver a corregir {nombre.toLowerCase()}. Queda anotado quién lo reabrió y por qué; después
                cerralo de nuevo.
              </p>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Por qué lo reabrís (ej.: faltaba un certificado)"
                maxLength={300}
                className="w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reabrir}
                  disabled={ocupado !== null || motivo.trim().length < 3}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-50 min-h-[44px]"
                >
                  {ocupado === 'reabrir' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reabrir {nombre.toLowerCase()}
                </button>
                <button
                  type="button"
                  onClick={() => setReabriendo(false)}
                  className="px-4 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text cursor-pointer min-h-[44px]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      ) : cierre.terminado ? (
        <>
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-brand-muted mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold text-brand-text">Cerrar {nombre.toLowerCase()}</p>
              <p className="text-xs text-brand-muted leading-relaxed">
                Cuando esté todo revisado: se recalcula una última vez, queda de solo lectura y se guardan los totales y el
                Excel. Se puede reabrir.
              </p>
              {incompletas > 0 && (
                <p className="text-xs text-red-800 mt-1">
                  Hay {incompletas === 1 ? '1 incompleta' : `${incompletas} incompletas`}: conviene resolverlas antes (tocá el
                  contador rojo de arriba para verlas).
                </p>
              )}
            </div>
          </div>
          {confirmar !== null ? (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 space-y-2">
              <p className="text-sm text-red-800">
                Quedan {confirmar === 1 ? '1 celda incompleta' : `${confirmar} celdas incompletas`}. Si cerrás igual, en el
                Excel quedan vacías y en rojo, con su comentario.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cerrar(true)}
                  disabled={ocupado !== null}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-60 min-h-[44px]"
                >
                  {ocupado === 'cerrar' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cerrar igual
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmar(null)}
                  className="px-4 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text cursor-pointer min-h-[44px]"
                >
                  Mejor las reviso
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => cerrar(false)}
              disabled={ocupado !== null}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-60 min-h-[44px]"
            >
              {ocupado === 'cerrar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Cerrar el mes
            </button>
          )}
        </>
      ) : null}

      {mensaje && (
        <p role="status" className={cn('flex items-start gap-1.5 text-sm', mensaje.ok ? 'text-brand-success' : 'text-brand-error')}>
          {mensaje.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {mensaje.texto}
        </p>
      )}

      {cierre.historial.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setVerHistorial((v) => !v)}
            aria-expanded={verHistorial}
            className="flex items-center gap-1 text-xs font-semibold text-brand-muted hover:text-brand-accent cursor-pointer"
          >
            Historial del cierre ({cierre.historial.length})
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', verHistorial && 'rotate-180')} />
          </button>
          {verHistorial && (
            <ul className="mt-1.5 space-y-1">
              {cierre.historial.map((h, i) => (
                <li key={i} className="text-xs text-brand-text">
                  <span className="font-semibold">{h.accion === 'cerrar' ? 'Cerrado' : h.accion === 'reabrir' ? 'Reabierto' : h.accion}</span>{' '}
                  el {h.cuando} por {h.por}
                  {h.detalle && <span className="text-brand-muted"> · {h.detalle}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
