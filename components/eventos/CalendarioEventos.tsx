'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ChevronLeft, ChevronRight, Clock, MapPin, Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  eventosPorDia,
  fechaLarga,
  grillaDelMes,
  mesDe,
  nombreDelMes,
  salonesOcupados,
  sumarMeses,
  textoComida,
  textoHorario,
  textoTipo,
  type Evento,
} from '@/lib/eventos'
import FormEvento from '@/components/eventos/FormEvento'

interface Props {
  /** '/admin/eventos' o '/dashboard/eventos'. */
  base: string
  mes: string // AAAA-MM
  hoy: string // AAAA-MM-DD
  /** El día que arranca elegido (?dia=), si es de este mes. */
  dia: string | null
  /** Los del mes que se ve. */
  eventos: Evento[]
  /** De hoy en adelante (unos meses), para "Próximos". */
  proximos: Evento[]
  /** "Lo cargó Facu · lo cambió Enzo", por id. */
  autores: Record<string, string>
}

const LETRAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Mesa personalizada en verde (la marca); evento privado en rosa oscuro: ocupa el salón.
const COLOR = {
  mesa: { punto: 'bg-brand-accent', chip: 'bg-brand-accent/10 text-brand-accent border-brand-accent/25', borde: 'border-l-brand-accent' },
  evento: { punto: 'bg-rose-700', chip: 'bg-rose-50 text-rose-800 border-rose-200', borde: 'border-l-rose-700' },
}

function fechaCorta(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z')
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return `${dias[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}

function Detalle({ e }: { e: Evento }) {
  const horario = textoHorario(e)
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-muted">
      {horario && (
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {horario}
        </span>
      )}
      {e.pax !== null && (
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {e.pax} pax
        </span>
      )}
      <span className="inline-flex items-center gap-1 min-w-0">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{e.salon}</span>
      </span>
    </p>
  )
}

function TarjetaEvento({ e, autor, onEditar }: { e: Evento; autor?: string; onEditar: () => void }) {
  return (
    <li className={cn('bg-brand-card border border-brand-border border-l-4 rounded-xl p-3.5', COLOR[e.tipo].borde)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-[0.08em]', COLOR[e.tipo].chip)}>
              {textoTipo(e.tipo)}
            </span>
            <span className="px-2 py-0.5 rounded-full border border-brand-border text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-muted">
              {textoComida(e.comida)}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-brand-text break-words">{e.nombre}</p>
          <Detalle e={e} />
        </div>
        <button
          type="button"
          onClick={onEditar}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-brand-card-hover text-xs font-medium text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 cursor-pointer min-h-[36px]"
        >
          Editar
        </button>
      </div>
      {e.notas && (
        <p className="mt-2 text-xs text-brand-text leading-relaxed whitespace-pre-wrap break-words bg-brand-dark/20 rounded-lg px-2.5 py-2">
          {e.notas}
        </p>
      )}
      {e.tipo === 'evento' && (
        <p className="mt-2 text-[11px] font-medium text-rose-800">Salón ocupado: {e.salon}</p>
      )}
      {autor && <p className="mt-1.5 text-[11px] text-brand-muted">{autor}</p>}
    </li>
  )
}

/**
 * El calendario de mesas personalizadas y eventos privados (Enzo, 11/11). Lo
 * usan los encargados (/admin/eventos) y las personas con permiso
 * (/dashboard/eventos): todos pueden ver, cargar, cambiar y borrar.
 */
export default function CalendarioEventos({ base, mes, hoy, dia, eventos, proximos, autores }: Props) {
  const router = useRouter()
  const porDia = useMemo(() => eventosPorDia(eventos), [eventos])
  const semanas = useMemo(() => grillaDelMes(mes), [mes])
  const [elegido, setElegido] = useState<string>(() => {
    if (dia && mesDe(dia) === mes) return dia
    if (mesDe(hoy) === mes) return hoy
    // En otro mes: el primer día con algo, o el 1.
    return eventos[0]?.fecha ?? `${mes}-01`
  })
  // null: cerrado; {}: nuevo; con evento: editando.
  const [formulario, setFormulario] = useState<{ evento?: Evento } | null>(null)

  // Para avisar si el salón está ocupado: los del mes y los próximos, sin repetir.
  const todos = useMemo(() => {
    const vistos = new Map<string, Evento>()
    for (const e of [...eventos, ...proximos]) vistos.set(e.id, e)
    return Array.from(vistos.values())
  }, [eventos, proximos])

  const delDia = porDia.get(elegido) ?? []
  const ocupados = salonesOcupados(eventos, elegido)
  const siguientes = proximos.filter((e) => e.fecha >= hoy).slice(0, 12)

  function alGuardar(fecha: string) {
    setFormulario(null)
    if (mesDe(fecha) !== mes) {
      router.push(`${base}?mes=${mesDe(fecha)}&dia=${fecha}`)
      return
    }
    setElegido(fecha)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => setFormulario({})}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-brand-accent text-white text-sm font-semibold uppercase tracking-[0.12em] hover:bg-brand-accent-hover cursor-pointer min-h-[48px]"
      >
        <Plus className="w-4 h-4" />
        Agregar mesa o evento
      </button>

      {/* El mes */}
      <section className="bg-brand-card border border-brand-border rounded-2xl p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`${base}?mes=${sumarMeses(mes, -1)}`}
            aria-label="Mes anterior"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h2 className="text-base font-semibold text-brand-accent">{nombreDelMes(mes)}</h2>
          <Link
            href={`${base}?mes=${sumarMeses(mes, 1)}`}
            aria-label="Mes siguiente"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 mt-2">
          {LETRAS.map((l, i) => (
            <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-muted py-1">
              {l}
            </div>
          ))}
          {semanas.flat().map((fecha, i) => {
            if (!fecha) return <div key={i} />
            const lista = porDia.get(fecha) ?? []
            const conEvento = lista.some((e) => e.tipo === 'evento')
            const esElegido = fecha === elegido
            return (
              <button
                key={fecha}
                type="button"
                onClick={() => setElegido(fecha)}
                aria-pressed={esElegido}
                aria-label={`${fechaLarga(fecha)}${lista.length ? `: ${lista.length} cargado${lista.length === 1 ? '' : 's'}` : ''}`}
                className={cn(
                  'relative flex flex-col items-center justify-start pt-1.5 h-[52px] rounded-xl border text-sm tabular-nums cursor-pointer transition-colors',
                  esElegido
                    ? 'bg-brand-accent border-brand-accent text-white font-semibold'
                    : conEvento
                      ? 'bg-rose-50 border-rose-200 text-brand-text hover:border-rose-400'
                      : 'bg-brand-card border-transparent text-brand-text hover:border-brand-border',
                  fecha === hoy && !esElegido && 'border-brand-accent font-semibold text-brand-accent',
                  fecha < hoy && !esElegido && 'opacity-60'
                )}
              >
                {Number(fecha.slice(8))}
                {lista.length > 0 && (
                  <span className="mt-1 flex items-center gap-0.5">
                    {lista.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={cn('w-1.5 h-1.5 rounded-full', esElegido ? 'bg-white' : COLOR[e.tipo].punto)}
                      />
                    ))}
                    {lista.length > 3 && (
                      <span className={cn('text-[9px] leading-none font-bold', esElegido ? 'text-white' : 'text-brand-muted')}>
                        +
                      </span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-brand-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-accent" />
            Mesa personalizada
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-700" />
            Evento privado (salón ocupado)
          </span>
        </p>
      </section>

      {/* El día elegido */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">
              {elegido === hoy ? 'Hoy' : 'Día elegido'}
            </p>
            <h2 className="text-lg font-semibold text-brand-accent leading-tight">{fechaLarga(elegido)}</h2>
          </div>
          <button
            type="button"
            onClick={() => setFormulario({ evento: undefined })}
            className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 cursor-pointer min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>

        {ocupados.length > 0 && (
          <p className="flex items-start gap-1.5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Salón ocupado por un evento privado: {ocupados.join(' y ')}.
          </p>
        )}

        {delDia.length === 0 ? (
          <p className="text-sm text-brand-muted border border-dashed border-brand-border rounded-xl px-4 py-5 text-center">
            Nada cargado para este día.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {delDia.map((e) => (
              <TarjetaEvento key={e.id} e={e} autor={autores[e.id]} onEditar={() => setFormulario({ evento: e })} />
            ))}
          </ul>
        )}
      </section>

      {/* Lo que viene */}
      <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <h2 className="px-4 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Próximos</h2>
        {siguientes.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-brand-muted">No hay nada cargado de hoy en adelante.</p>
        ) : (
          <ul className="divide-y divide-brand-border/60">
            {siguientes.map((e) => (
              <li key={e.id}>
                <Link
                  href={`${base}?mes=${mesDe(e.fecha)}&dia=${e.fecha}`}
                  onClick={(ev) => {
                    // Del mismo mes: se elige el día sin recargar.
                    if (mesDe(e.fecha) === mes) {
                      ev.preventDefault()
                      setElegido(e.fecha)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  }}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-brand-card-hover"
                >
                  <span className={cn('mt-1.5 w-2 h-2 rounded-full flex-shrink-0', COLOR[e.tipo].punto)} />
                  <span className="w-[68px] flex-shrink-0 text-xs font-semibold text-brand-text tabular-nums pt-0.5">
                    {e.fecha === hoy ? 'Hoy' : fechaCorta(e.fecha)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-brand-text truncate">{e.nombre}</span>
                    <span className="block text-xs text-brand-muted truncate">
                      {[textoComida(e.comida), textoHorario(e), e.pax !== null ? `${e.pax} pax` : '', e.salon]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {formulario && (
        <FormEvento
          evento={formulario.evento}
          fechaInicial={elegido}
          todos={todos}
          onCerrar={() => setFormulario(null)}
          onGuardado={alGuardar}
        />
      )}
    </div>
  )
}
