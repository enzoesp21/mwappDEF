'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CalendarClock, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fechasDeLaSemana, nombreDiaCorto, numeroDeDia } from '@/lib/horarios'
import {
  ESTADOS_PEDIDO,
  TIPOS_PEDIDO,
  esFranja,
  semanaAbierta,
  semanasParaPedir,
  textoDias,
  textoPedido,
  textoPlazo,
  textoSemana,
  validarPedido,
  type EstadoPedido,
  type PedidoHorario,
  type TipoPedido,
} from '@/lib/pedidos-horario'
import { cancelarPedidoHorarioAction, pedirCambioHorarioAction } from '@/app/actions/pedidos-horario'

interface Props {
  /** Los pedidos de la persona, de la semana pasada en adelante. */
  pedidos: PedidoHorario[]
  /** "2026-11-05", en Argentina. */
  hoy: string
}

const CHIP_ESTADO: Record<EstadoPedido, string> = {
  pendiente: 'bg-amber-50 text-amber-800 border-amber-200',
  aprobado: 'bg-brand-success/10 text-brand-success border-brand-success/30',
  rechazado: 'bg-brand-error/10 text-brand-error border-brand-error/30',
}

const campo =
  'w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent min-h-[44px]'

/**
 * Los pedidos de cambio de horario de la persona: hasta el miércoles a las 22
 * puede pedir para la semana siguiente (o cualquiera más adelante) que no
 * puede venir un día, que solo puede o no puede en una franja, u otro cambio,
 * con el motivo. Ve sus pedidos con la respuesta del encargado.
 */
export default function PedidosHorario({ pedidos, hoy }: Props) {
  const router = useRouter()
  const semanas = semanasParaPedir(hoy)
  const primera = semanas[0]

  const [abierto, setAbierto] = useState(false)
  const [semana, setSemana] = useState(primera)
  const [dias, setDias] = useState<string[]>([])
  const [tipo, setTipo] = useState<TipoPedido>('no_puedo')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [cancelando, setCancelando] = useState<string | null>(null)

  const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length
  const ordenados = [...pedidos].sort((a, b) => b.semana.localeCompare(a.semana) || b.creado.localeCompare(a.creado))

  function abrir() {
    setAbierto(true)
    setListo(false)
    setError(null)
  }

  function limpiar() {
    setAbierto(false)
    setDias([])
    setTipo('no_puedo')
    setDesde('')
    setHasta('')
    setMotivo('')
    setError(null)
  }

  function alternarDia(fecha: string) {
    setDias((prev) => (prev.includes(fecha) ? prev.filter((d) => d !== fecha) : [...prev, fecha].sort()))
    setError(null)
  }

  async function mandar() {
    const datos = { fechas: dias, tipo, desde: esFranja(tipo) ? desde : null, hasta: esFranja(tipo) ? hasta : null, motivo }
    const problema = validarPedido(datos, hoy)
    if (problema) {
      setError(problema)
      return
    }
    setEnviando(true)
    setError(null)
    const r = await pedirCambioHorarioAction(datos)
    setEnviando(false)
    if (!r.ok) {
      setError(r.error)
      return
    }
    limpiar()
    setListo(true)
    router.refresh()
  }

  async function cancelar(p: PedidoHorario) {
    if (!confirm(`¿Cancelar el pedido del ${textoDias(p.fechas)}?`)) return
    setCancelando(p.id)
    setError(null)
    const r = await cancelarPedidoHorarioAction(p.id)
    setCancelando(null)
    if (!r.ok) {
      setError(r.error)
      return
    }
    router.refresh()
  }

  return (
    <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden" data-sin-tirar={abierto || undefined}>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
            <CalendarClock className="w-5 h-5 text-brand-accent" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-brand-text">¿Necesitás un cambio de horario?</h2>
            <p className="text-xs text-brand-muted leading-relaxed mt-0.5">
              Para la semana del {textoSemana(primera)} tenés tiempo hasta el{' '}
              <strong className="text-brand-text">{textoPlazo(primera)}</strong>.
            </p>
          </div>
        </div>

        {/* El mensaje de los encargados antes de pedir (Enzo, 11/11). */}
        <div className="rounded-xl bg-brand-dark/25 border border-brand-border/70 px-3.5 py-3 space-y-2 text-xs text-brand-text leading-relaxed">
          <p>
            Les pedimos que las solicitudes de cambios de horario se realicen con responsabilidad y a conciencia,
            priorizando aquellas situaciones que realmente lo justifiquen.
          </p>
          <p>
            Cada integrante del equipo cumple un rol importante dentro de la organización diaria del restaurante, y
            cualquier modificación de horario puede afectar la cobertura y el funcionamiento de los distintos sectores.
          </p>
          <p>
            Valoramos mucho la disponibilidad, la predisposición y el compromiso de cada uno. Las solicitudes serán
            evaluadas según las necesidades del servicio y no implican una aprobación automática.
          </p>
          <p className="font-serif italic text-sm text-brand-accent">
            Les pedimos criterio y compromiso a la hora de realizarlas.
          </p>
        </div>

        {listo && (
          <p role="status" className="flex items-start gap-1.5 text-xs text-brand-success font-medium">
            <Check className="w-3.5 h-3.5 mt-px flex-shrink-0" />
            Listo, les llegó a los encargados. Cuando respondan, te avisa la campanita.
          </p>
        )}
        {pendientes > 0 && !abierto && (
          <p className="text-xs text-amber-800">
            {pendientes === 1 ? 'Tenés 1 pedido esperando respuesta.' : `Tenés ${pendientes} pedidos esperando respuesta.`}
          </p>
        )}

        {!abierto && (
          <button
            type="button"
            onClick={abrir}
            className="w-full flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent-hover cursor-pointer min-h-[44px]"
          >
            Pedir un cambio
          </button>
        )}
      </div>

      {abierto && (
        <div className="px-4 pb-4 space-y-4 border-t border-brand-border/70 pt-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Semana</span>
            <select
              value={semana}
              onChange={(e) => {
                setSemana(e.target.value)
                setDias([])
                setError(null)
              }}
              className={cn(campo, 'mt-1 cursor-pointer')}
            >
              {semanas.map((s) => (
                <option key={s} value={s}>
                  {textoSemana(s)} · hasta el {textoPlazo(s)}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">¿Qué días?</legend>
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {fechasDeLaSemana(semana).map((fecha, i) => {
                const elegido = dias.includes(fecha)
                return (
                  <button
                    key={fecha}
                    type="button"
                    aria-pressed={elegido}
                    onClick={() => alternarDia(fecha)}
                    className={cn(
                      'px-2 py-2 rounded-xl border text-xs font-semibold cursor-pointer min-h-[44px]',
                      elegido
                        ? 'bg-brand-accent text-white border-brand-accent'
                        : 'bg-brand-card text-brand-text border-brand-border hover:border-brand-accent'
                    )}
                  >
                    {nombreDiaCorto(i)} {numeroDeDia(semana, i)}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">¿Qué necesitás?</legend>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {TIPOS_PEDIDO.map((t) => {
                const elegido = tipo === t.valor
                return (
                  <button
                    key={t.valor}
                    type="button"
                    aria-pressed={elegido}
                    onClick={() => {
                      setTipo(t.valor)
                      setError(null)
                    }}
                    className={cn(
                      'px-3 py-2 rounded-xl border text-left cursor-pointer min-h-[56px]',
                      elegido
                        ? 'bg-brand-accent/10 border-brand-accent text-brand-accent'
                        : 'bg-brand-card border-brand-border text-brand-text hover:border-brand-accent'
                    )}
                  >
                    <span className="block text-xs font-semibold">{t.texto}</span>
                    <span className="block text-[11px] text-brand-muted leading-snug mt-0.5">{t.ayuda}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {esFranja(tipo) && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-brand-muted">Desde</span>
                <input type="time" step={900} value={desde} onChange={(e) => setDesde(e.target.value)} className={cn(campo, 'mt-1')} />
              </label>
              <label className="block">
                <span className="text-xs text-brand-muted">Hasta</span>
                <input type="time" step={900} value={hasta} onChange={(e) => setHasta(e.target.value)} className={cn(campo, 'mt-1')} />
              </label>
            </div>
          )}

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Motivo</span>
            <textarea
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value)
                setError(null)
              }}
              rows={3}
              maxLength={500}
              placeholder="Ej: turno médico, examen en la facultad, un viaje."
              className={cn(campo, 'mt-1 resize-none')}
            />
          </label>

          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={mandar}
              disabled={enviando}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent-hover cursor-pointer min-h-[44px] disabled:opacity-60"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              Mandar el pedido
            </button>
            <button
              type="button"
              onClick={limpiar}
              disabled={enviando}
              className="px-3 py-2.5 text-sm text-brand-muted hover:text-brand-text cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {ordenados.length > 0 && (
        <div className="border-t border-brand-border/70">
          <h3 className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">Tus pedidos</h3>
          {!abierto && error && (
            <p role="alert" className="mx-4 my-2 text-xs text-brand-error">
              {error}
            </p>
          )}
          <ul className="divide-y divide-brand-border/70">
            {ordenados.map((p) => (
              <li key={p.id} className="px-4 py-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-brand-text first-letter:uppercase">{textoDias(p.fechas)}</p>
                  <span className={cn('px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap', CHIP_ESTADO[p.estado])}>
                    {p.estado === 'pendiente' ? 'Esperando respuesta' : ESTADOS_PEDIDO[p.estado]}
                  </span>
                </div>
                <p className="text-xs text-brand-text">
                  {textoPedido(p, 'yo')} · <span className="text-brand-muted">{p.motivo}</span>
                </p>
                {p.respuesta && (
                  <p className="text-xs text-brand-text bg-brand-dark/30 rounded-lg px-2.5 py-1.5">
                    <span className="font-semibold">Respuesta:</span> {p.respuesta}
                  </p>
                )}
                {p.estado === 'pendiente' && semanaAbierta(p.semana, hoy) && (
                  <button
                    type="button"
                    onClick={() => cancelar(p)}
                    disabled={cancelando === p.id}
                    className="text-[11px] font-semibold text-brand-muted underline underline-offset-2 hover:text-brand-error cursor-pointer disabled:opacity-60"
                  >
                    {cancelando === p.id ? 'Cancelando…' : 'Cancelar el pedido'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
