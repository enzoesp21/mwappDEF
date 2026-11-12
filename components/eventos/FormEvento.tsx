'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import EnPantalla from '@/components/navegacion/EnPantalla'
import { borrarEventoAction, guardarEventoAction } from '@/app/actions/eventos'
import {
  COMIDAS,
  TIPOS,
  mismoSalon,
  ordenarEventos,
  salonesParaElegir,
  textoComida,
  validarEvento,
  type Comida,
  type Evento,
  type TipoEvento,
} from '@/lib/eventos'

interface Props {
  /** Si viene, se edita; si no, es uno nuevo. */
  evento?: Evento
  fechaInicial: string
  /** Lo cargado (del mes y los próximos), para avisar si el salón está ocupado. */
  todos: Evento[]
  onCerrar: () => void
  onGuardado: (fecha: string) => void
}

const campo =
  'w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent min-h-[44px]'
const etiqueta = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted'

function Opcion({ elegida, onClick, children }: { elegida: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={elegida}
      onClick={onClick}
      className={cn(
        'px-2 py-2 rounded-xl border text-xs font-semibold cursor-pointer min-h-[44px] transition-colors',
        elegida
          ? 'bg-brand-accent text-white border-brand-accent'
          : 'bg-brand-card text-brand-text border-brand-border hover:border-brand-accent'
      )}
    >
      {children}
    </button>
  )
}

/** La ventana para cargar o cambiar una mesa personalizada o un evento privado. */
export default function FormEvento({ evento, fechaInicial, todos, onCerrar, onGuardado }: Props) {
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo ?? 'mesa')
  const [fecha, setFecha] = useState(evento?.fecha ?? fechaInicial)
  const [comida, setComida] = useState<Comida | null>(evento?.comida ?? null)
  const [hora, setHora] = useState(evento?.hora ?? '')
  const [horaFin, setHoraFin] = useState(evento?.horaFin ?? '')
  const [nombre, setNombre] = useState(evento?.nombre ?? '')
  const [pax, setPax] = useState(evento?.pax != null ? String(evento.pax) : '')
  const [salon, setSalon] = useState(evento?.salon ?? '')
  const [notas, setNotas] = useState(evento?.notas ?? '')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)

  // Un error viejo no queda en pantalla cuando ya se corrigió algo.
  useEffect(() => setError(null), [tipo, fecha, comida, hora, horaFin, nombre, pax, salon])

  const salones = salonesParaElegir(todos)

  // Lo que ya hay ese día en ese salón: un evento privado lo ocupa; si lo que se
  // carga es un evento privado, también importan las mesas de ahí.
  const choques = salon.trim()
    ? ordenarEventos(
        todos.filter(
          (e) =>
            e.fecha === fecha &&
            e.id !== evento?.id &&
            mismoSalon(e.salon, salon) &&
            (e.tipo === 'evento' || tipo === 'evento')
        )
      )
    : []

  async function guardar() {
    setError(null)
    const datos = {
      id: evento?.id ?? null,
      tipo,
      fecha,
      comida: (comida ?? '') as Comida,
      hora: hora || null,
      horaFin: horaFin || null,
      nombre,
      pax: pax.trim() === '' ? null : Number(pax),
      salon,
      notas: notas || null,
    }
    if (!comida) {
      setError('Elegí la comida: desayuno, almuerzo, merienda o cena.')
      return
    }
    const revisado = validarEvento(datos)
    if (!revisado.ok) {
      setError(revisado.error)
      return
    }
    setGuardando(true)
    const res = await guardarEventoAction(revisado.datos)
    setGuardando(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    onGuardado(fecha)
  }

  async function borrar() {
    if (!evento) return
    if (!confirmarBorrar) {
      setConfirmarBorrar(true)
      return
    }
    setError(null)
    setGuardando(true)
    const res = await borrarEventoAction(evento.id)
    setGuardando(false)
    if (!res.ok) {
      setError(res.error)
      setConfirmarBorrar(false)
      return
    }
    onGuardado(evento.fecha)
  }

  return (
    <EnPantalla>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onCerrar}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={evento ? 'Cambiar mesa o evento' : 'Agregar mesa o evento'}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto overscroll-contain bg-brand-card rounded-t-2xl sm:rounded-2xl shadow-xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-brand-card border-b border-brand-border/70">
            <h2 className="text-base font-semibold text-brand-accent">{evento ? 'Cambiar' : 'Agregar'}</h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-card-hover cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <fieldset>
              <legend className={etiqueta}>¿Qué es?</legend>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {TIPOS.map((t) => (
                  <Opcion key={t.valor} elegida={tipo === t.valor} onClick={() => setTipo(t.valor)}>
                    {t.texto}
                  </Opcion>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-brand-muted leading-relaxed">
                {tipo === 'mesa'
                  ? 'Una mesa grande con menú armado. El salón sigue abierto.'
                  : 'Boda, cumpleaños, empresa… El salón queda ocupado para el resto.'}
              </p>
            </fieldset>

            <label className="block">
              <span className={etiqueta}>Fecha</span>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={cn(campo, 'mt-1')} />
            </label>

            <fieldset>
              <legend className={etiqueta}>Comida</legend>
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {COMIDAS.map((c) => (
                  <Opcion key={c.valor} elegida={comida === c.valor} onClick={() => setComida(c.valor)}>
                    {c.texto}
                  </Opcion>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0">
                <span className={etiqueta}>Desde (opcional)</span>
                <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={cn(campo, 'mt-1')} />
              </label>
              <label className="block min-w-0">
                <span className={etiqueta}>Hasta (opcional)</span>
                <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={cn(campo, 'mt-1')} />
              </label>
            </div>

            <label className="block">
              <span className={etiqueta}>Nombre</span>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={120}
                placeholder={tipo === 'mesa' ? 'A nombre de quién (ej.: Cumpleaños de Marta)' : 'Qué evento es (ej.: Boda Pérez y Gómez)'}
                className={cn(campo, 'mt-1')}
              />
            </label>

            <label className="block">
              <span className={etiqueta}>Cantidad de personas (pax){tipo === 'evento' ? ' (opcional)' : ''}</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={2000}
                value={pax}
                onChange={(e) => setPax(e.target.value)}
                placeholder="20"
                className={cn(campo, 'mt-1')}
              />
            </label>

            <div>
              <span className={etiqueta}>Salón{tipo === 'mesa' ? ' (si ya se sabe)' : ''}</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {salones.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={mismoSalon(s, salon)}
                    onClick={() => setSalon(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer min-h-[36px]',
                      mismoSalon(s, salon)
                        ? 'bg-brand-accent text-white border-brand-accent'
                        : 'bg-brand-card text-brand-text border-brand-border hover:border-brand-accent'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={salon}
                onChange={(e) => setSalon(e.target.value)}
                maxLength={60}
                placeholder={tipo === 'mesa' ? 'U otro. Vacío: a definir' : 'U otro: escribilo acá'}
                aria-label="Salón"
                className={cn(campo, 'mt-2')}
              />
            </div>

            {choques.length > 0 && (
              <div className="flex items-start gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" />
                <div>
                  <p className="font-semibold">Ese día ya hay algo en {salon.trim()}:</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {choques.map((e) => (
                      <li key={e.id}>
                        {e.tipo === 'evento' ? 'Evento privado' : 'Mesa'}: {e.nombre} ({textoComida(e.comida).toLowerCase()}
                        {e.hora ? `, ${e.hora}` : ''})
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-amber-800">Se puede guardar igual; fijate que no se pisen.</p>
                </div>
              </div>
            )}

            <label className="block">
              <span className={etiqueta}>Menú y detalles (opcional)</span>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Menú armado, bebidas, torta, alergias, contacto, seña…"
                className={cn(campo, 'mt-1 resize-y leading-relaxed')}
              />
            </label>

            {error && (
              <p role="alert" className="flex items-start gap-1.5 text-xs font-medium text-brand-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-brand-accent text-white text-sm font-semibold uppercase tracking-[0.12em] hover:bg-brand-accent-hover cursor-pointer disabled:opacity-60 min-h-[48px]"
              >
                {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                {evento ? 'Guardar cambios' : 'Guardar'}
              </button>
              {evento && (
                <button
                  type="button"
                  onClick={borrar}
                  disabled={guardando}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 min-h-[44px]',
                    confirmarBorrar
                      ? 'bg-brand-error text-white'
                      : 'text-brand-error hover:bg-brand-error/10'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  {confirmarBorrar ? 'Tocá de nuevo para borrarlo' : 'Borrar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </EnPantalla>
  )
}
