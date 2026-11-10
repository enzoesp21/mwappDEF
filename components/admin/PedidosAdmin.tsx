'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ESTADOS_PEDIDO,
  diaCorto,
  semanaAbierta,
  textoDias,
  textoPedido,
  textoPlazo,
  textoSemana,
  type EstadoPedido,
  type PedidoConNombre,
} from '@/lib/pedidos-horario'
import { responderPedidoHorarioAction } from '@/app/actions/pedidos-horario'

interface Props {
  pedidos: PedidoConNombre[]
  /** "2026-11-05", en Argentina. */
  hoy: string
  /** En el editor de una semana: sin títulos por semana. */
  enEditor?: boolean
  /** Pedidos de gente que no aparece en el horario de esta semana. */
  sinFila?: string[]
}

/** El día en Argentina de una hora guardada en UTC. */
const fechaArgentina = (iso: string) => new Date(Date.parse(iso) - 3 * 3600 * 1000).toISOString().slice(0, 10)

const CHIP_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'bg-amber-50 text-amber-800 border-amber-200',
  aprobado: 'bg-brand-success/10 text-brand-success border-brand-success/30',
  rechazado: 'bg-brand-error/10 text-brand-error border-brand-error/30',
}

/**
 * Los pedidos de cambio de horario para los encargados: qué pide cada uno y
 * por qué, con Aprobar y No aprobar (y un comentario opcional que le llega a
 * la persona). Aprobar no cambia el horario: queda marcado en el editor.
 */
export default function PedidosAdmin({ pedidos: iniciales, hoy, enEditor = false, sinFila = [] }: Props) {
  const router = useRouter()
  const [pedidos, setPedidos] = useState(iniciales)
  const [filtro, setFiltro] = useState<'pendientes' | 'todos'>(
    iniciales.some((p) => p.estado === 'pendiente') ? 'pendientes' : 'todos'
  )
  const [comentarios, setComentarios] = useState<Record<string, string>>({})
  const [cambiando, setCambiando] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pendientes = pedidos.filter((p) => p.estado === 'pendiente')
  const lista = filtro === 'pendientes' ? pendientes : pedidos
  const semanas = Array.from(new Set(lista.map((p) => p.semana))).sort()

  async function responder(p: PedidoConNombre, estado: EstadoPedido) {
    const respuesta = comentarios[p.id] ?? ''
    setGuardando(p.id)
    setError(null)
    const r = await responderPedidoHorarioAction(p.id, estado, respuesta)
    setGuardando(null)
    if (!r.ok) {
      setError(`${p.nombre}: ${r.error}`)
      return
    }
    setPedidos((prev) =>
      prev.map((x) =>
        x.id === p.id ? { ...x, estado, respuesta: estado === 'pendiente' ? null : respuesta.trim() || null } : x
      )
    )
    setCambiando((prev) => {
      const sigue = new Set(prev)
      sigue.delete(p.id)
      return sigue
    })
    // Las marcas del editor y el número del menú salen de la base.
    router.refresh()
  }

  const tarjeta = (p: PedidoConNombre) => {
    const responde = p.estado === 'pendiente' || cambiando.has(p.id)
    return (
      <li key={p.id} className="px-4 py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-text">{p.nombre}</p>
            {p.puesto && <p className="text-[11px] text-brand-muted">{p.puesto}</p>}
          </div>
          <span className={cn('px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap', CHIP_ESTADO[p.estado])}>
            {ESTADOS_PEDIDO[p.estado]}
          </span>
        </div>
        <div className="text-xs leading-relaxed">
          <p className="font-semibold text-brand-text first-letter:uppercase">
            {textoDias(p.fechas)} · {textoPedido(p)}
          </p>
          <p className="text-brand-text">&ldquo;{p.motivo}&rdquo;</p>
          {p.creado && <p className="text-[11px] text-brand-muted">Lo pidió el {diaCorto(fechaArgentina(p.creado))}</p>}
        </div>
        {sinFila.includes(p.id) && (
          <p className="flex items-start gap-1.5 text-[11px] text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
            No lo encuentro en este horario con ese nombre: la marca no aparece en la grilla.
          </p>
        )}
        {p.respuesta && !responde && (
          <p className="text-xs text-brand-text bg-brand-dark/30 rounded-lg px-2.5 py-1.5">
            <span className="font-semibold">Respuesta:</span> {p.respuesta}
          </p>
        )}
        {responde ? (
          <div className="space-y-2">
            <input
              type="text"
              value={comentarios[p.id] ?? ''}
              onChange={(e) => setComentarios((prev) => ({ ...prev, [p.id]: e.target.value }))}
              maxLength={500}
              placeholder="Comentario para la persona (opcional)"
              aria-label={'Comentario para ' + p.nombre}
              className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-xs text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent min-h-[40px]"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => responder(p, 'aprobado')}
                disabled={guardando === p.id}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-success text-white text-xs font-semibold hover:brightness-95 cursor-pointer min-h-[40px] disabled:opacity-60"
              >
                {guardando === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Aprobar
              </button>
              <button
                type="button"
                onClick={() => responder(p, 'rechazado')}
                disabled={guardando === p.id}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand-error/40 text-brand-error text-xs font-semibold hover:bg-brand-error/10 cursor-pointer min-h-[40px] disabled:opacity-60"
              >
                <X className="w-3.5 h-3.5" />
                No aprobar
              </button>
              {p.estado !== 'pendiente' && (
                <button
                  type="button"
                  onClick={() => responder(p, 'pendiente')}
                  disabled={guardando === p.id}
                  className="px-2 py-2 text-xs text-brand-muted underline underline-offset-2 cursor-pointer min-h-[40px]"
                >
                  Dejarlo sin responder
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCambiando((prev) => new Set(prev).add(p.id))}
            className="text-[11px] font-semibold text-brand-accent underline underline-offset-2 cursor-pointer"
          >
            Cambiar la respuesta
          </button>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(['pendientes', 'todos'] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer min-h-[34px] tabular-nums',
              filtro === f
                ? 'bg-brand-accent text-white border-brand-accent'
                : 'bg-brand-card text-brand-text border-brand-border hover:border-brand-accent'
            )}
          >
            {f === 'pendientes' ? `Sin responder · ${pendientes.length}` : `Todos · ${pedidos.length}`}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-brand-muted bg-brand-card border border-brand-border rounded-2xl px-4 py-6 text-center">
          {filtro === 'pendientes' ? 'No hay pedidos sin responder.' : 'Todavía no hay pedidos.'}
        </p>
      ) : enEditor ? (
        <ul className="bg-brand-card border border-brand-border rounded-2xl divide-y divide-brand-border/70 overflow-hidden">
          {lista.map(tarjeta)}
        </ul>
      ) : (
        semanas.map((s) => (
          <section key={s} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="px-4 pt-3 pb-2 bg-brand-card-hover/50 border-b border-brand-border/70">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
                Semana del {textoSemana(s)}
              </h2>
              <p className="text-[11px] text-brand-muted">
                {semanaAbierta(s, hoy)
                  ? `Se puede pedir hasta el ${textoPlazo(s)}`
                  : `El plazo cerró el ${textoPlazo(s)}`}
              </p>
            </div>
            <ul className="divide-y divide-brand-border/70">{lista.filter((p) => p.semana === s).map(tarjeta)}</ul>
          </section>
        ))
      )}
    </div>
  )
}
