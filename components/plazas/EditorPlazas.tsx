'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp, Loader2, Minus, Plus, Printer, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { armarHoja, FILAS_MAXIMO, TEXTO_FILAS, type ClaveFilas } from '@/lib/plazas'
import type { MozoPlaza } from '@/lib/plazas-datos'
import {
  agregarMozoPlazaAction,
  cambiarFilasPlazaAction,
  moverMozoPlazaAction,
  quitarMozoPlazaAction,
} from '@/app/actions/plazas'
import VistaPreviaHoja from '@/components/plazas/VistaPreviaHoja'

interface Props {
  mozos: MozoPlaza[]
  filas: Record<ClaveFilas, number>
  hoy: string
}

const ORDEN_FILAS: ClaveFilas[] = ['almuerzo', 'merienda', 'desayuno_8', 'desayuno_10', 'cena', 'horas']
/** Cada cuánto se trae lo que cambiaron las otras cajeras. */
const REFRESCO_MS = 15_000

/**
 * La hoja de plazas de los mozos (Enzo, 21/11): las cajeras agregan o sacan
 * mozos y cambian las filas de cada sección; se guarda al momento y lo ven
 * todas. Después la imprimen (sale en una A4) y Facu la completa a mano.
 */
export default function EditorPlazas({ mozos: mozosIniciales, filas: filasIniciales, hoy }: Props) {
  const router = useRouter()
  const [mozos, setMozos] = useState(mozosIniciales)
  const [filas, setFilas] = useState(filasIniciales)
  const [nuevo, setNuevo] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sacando, setSacando] = useState<string | null>(null)
  const [fecha, setFecha] = useState(hoy)
  const pendientes = useRef(0)

  // Lo que llega del servidor (lo de las otras cajeras) reemplaza lo de acá,
  // salvo mientras se está guardando algo.
  useEffect(() => {
    if (pendientes.current === 0) {
      setMozos(mozosIniciales)
      setFilas(filasIniciales)
    }
  }, [mozosIniciales, filasIniciales])

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible' && pendientes.current === 0) router.refresh()
    }, REFRESCO_MS)
    return () => clearInterval(t)
  }, [router])

  const hoja = useMemo(() => armarHoja(mozos.map((m) => m.nombre), filas), [mozos, filas])

  async function hacer(clave: string, accion: () => Promise<{ ok: boolean; error?: string }>, optimista?: () => void) {
    setError(null)
    setOcupado(clave)
    pendientes.current++
    optimista?.()
    const r = await accion()
    pendientes.current--
    setOcupado(null)
    if (!r.ok) setError(r.error ?? 'No se pudo guardar.')
    router.refresh()
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    const nombre = nuevo.trim()
    if (!nombre) return
    setNuevo('')
    await hacer('agregar', () => agregarMozoPlazaAction(nombre), () =>
      setMozos((m) => [...m, { id: 'nuevo-' + Date.now(), nombre }])
    )
  }

  function mover(i: number, paso: -1 | 1) {
    const m = mozos[i]
    const destino = i + paso
    if (destino < 0 || destino >= mozos.length) return
    hacer('mover-' + m.id, () => moverMozoPlazaAction(m.id, paso), () =>
      setMozos((lista) => {
        const copia = [...lista]
        ;[copia[i], copia[destino]] = [copia[destino], copia[i]]
        return copia
      })
    )
  }

  function quitar(m: MozoPlaza) {
    setSacando(null)
    hacer('quitar-' + m.id, () => quitarMozoPlazaAction(m.id), () => setMozos((lista) => lista.filter((x) => x.id !== m.id)))
  }

  function cambiarFilas(clave: ClaveFilas, delta: number) {
    const n = Math.max(0, Math.min(FILAS_MAXIMO, filas[clave] + delta))
    if (n === filas[clave]) return
    hacer('filas-' + clave, () => cambiarFilasPlazaAction(clave, n), () => setFilas((f) => ({ ...f, [clave]: n })))
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      {/* Imprimir */}
      <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
        <div className="flex items-end gap-3">
          <label className="block flex-1 min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Fecha de la hoja</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text min-h-[44px]"
            />
          </label>
          <a
            href={`/plazas/imprimir?fecha=${fecha || 'no'}`}
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-full bg-brand-accent text-white text-sm font-semibold uppercase tracking-[0.12em] hover:bg-brand-accent-hover min-h-[44px]"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </a>
        </div>
        {hoja.noEntra ? (
          <p className="flex items-start gap-1.5 text-xs font-medium text-brand-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Con tantas filas no entra en una hoja: sacá filas de alguna sección.
          </p>
        ) : hoja.apretada ? (
          <p className="flex items-start gap-1.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Entra en una hoja, pero las filas quedan chicas para escribir.
          </p>
        ) : null}
        <VistaPreviaHoja hoja={hoja} fecha={fecha} />
      </section>

      {/* Los mozos */}
      <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-brand-text">Mozos de la hoja ({mozos.length})</h2>
          <p className="text-xs text-brand-muted mt-0.5">Van en el Almuerzo y en &quot;Horas del día&quot;, en este orden.</p>
        </div>
        <form onSubmit={agregar} className="px-4 pb-3 flex gap-2">
          <input
            type="text"
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            maxLength={40}
            placeholder="Mozo nuevo (ej.: Juan P.)"
            aria-label="Nombre del mozo nuevo"
            className="flex-1 min-w-0 px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!nuevo.trim() || ocupado === 'agregar'}
            className="flex-shrink-0 flex items-center gap-1 px-4 rounded-lg bg-brand-accent text-white text-sm font-semibold disabled:opacity-50 cursor-pointer min-h-[44px]"
          >
            {ocupado === 'agregar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </button>
        </form>
        <ul className="divide-y divide-brand-border/60 border-t border-brand-border/60">
          {mozos.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 px-4 py-2">
              <span className="w-6 text-xs text-brand-muted tabular-nums">{i + 1}</span>
              <span className="flex-1 min-w-0 truncate text-sm text-brand-text">{m.nombre}</span>
              {sacando === m.id ? (
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => quitar(m)}
                    className="px-3 py-1.5 rounded-lg bg-brand-error text-white text-xs font-semibold cursor-pointer min-h-[36px]"
                  >
                    Sacar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSacando(null)}
                    className="px-2 py-1.5 rounded-lg text-xs font-semibold text-brand-muted cursor-pointer min-h-[36px]"
                  >
                    No
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    disabled={i === 0 || ocupado !== null}
                    aria-label={`Subir a ${m.nombre}`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-muted hover:bg-brand-card-hover disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === mozos.length - 1 || ocupado !== null}
                    aria-label={`Bajar a ${m.nombre}`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-muted hover:bg-brand-card-hover disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSacando(m.id)}
                    disabled={m.id.startsWith('nuevo-')}
                    aria-label={`Sacar a ${m.nombre} de la hoja`}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 disabled:opacity-30 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
          {mozos.length === 0 && <li className="px-4 py-4 text-sm text-brand-muted">Todavía no hay mozos en la hoja.</li>}
        </ul>
      </section>

      {/* Filas de cada sección */}
      <section className="bg-brand-card border border-brand-border rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-brand-text">Filas de cada sección</h2>
        <p className="text-xs text-brand-muted mt-0.5">
          Si un día son más, sumale filas. La hoja se acomoda sola para entrar en una A4. En 0, la sección no sale.
        </p>
        <ul className="mt-3 space-y-2">
          {ORDEN_FILAS.map((clave) => (
            <li key={clave} className="flex items-center gap-3">
              <span className="flex-1 min-w-0 text-sm text-brand-text">{TEXTO_FILAS[clave]}</span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => cambiarFilas(clave, -1)}
                  disabled={filas[clave] === 0}
                  aria-label={`Una fila menos: ${TEXTO_FILAS[clave]}`}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-brand-border text-brand-text disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className={cn('w-8 text-center text-sm font-semibold tabular-nums', ocupado === 'filas-' + clave && 'text-brand-muted')}>
                  {filas[clave]}
                </span>
                <button
                  type="button"
                  onClick={() => cambiarFilas(clave, 1)}
                  disabled={filas[clave] === FILAS_MAXIMO}
                  aria-label={`Una fila más: ${TEXTO_FILAS[clave]}`}
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-brand-border text-brand-text disabled:opacity-30 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
