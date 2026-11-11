'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronDown, Fingerprint, Link2, Loader2, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sinSector, type Candidato } from '@/lib/planilla-reloj'
import {
  asociarRelojAction,
  desasociarRelojAction,
  ignorarRelojAction,
  nuevoDesdeRelojAction,
} from '@/app/actions/planilla-empleados'

export interface SinAsociar {
  userid: string
  /** El nombre que tiene en el reloj; null si todavía no lo mandó. */
  nombre: string | null
  fichadas: number
  /** "28/10" */
  desde: string
  hasta: string
  ultima: string
  sugerencias: Candidato[]
}

export interface Asociado {
  userid: string
  nombreReloj: string | null
  empleado: string
}

interface Props {
  sinAsociar: SinAsociar[]
  asociados: Asociado[]
  ignorados: { userid: string; nombreReloj: string | null }[]
  empleados: { id: string; nombre: string; activo: boolean }[]
}

type Respuesta = { ok: true; mensaje: string } | { ok: false; error: string }

/** Equivalencias del reloj: cada número de CrossChex, de qué empleado de la planilla es. */
export default function EquivalenciasReloj({ sinAsociar, asociados, ignorados, empleados }: Props) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  async function correr(clave: string, accion: () => Promise<Respuesta>) {
    setOcupado(clave)
    setMensaje(null)
    const r = await accion()
    setOcupado(null)
    setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
    if (r.ok) router.refresh()
  }

  return (
    <div className="space-y-4 max-w-3xl animate-fade-in">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Fichadas</p>
        <h1 className="text-2xl font-semibold text-brand-accent tracking-tight">Números del reloj</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Cada persona del reloj tiene un número. Acá se dice de qué empleado de la planilla es: sin eso, sus fichadas
          no llegan a la planilla. Al asociar, la planilla se recalcula sola.
        </p>
      </div>

      {sinAsociar.length > 0 ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {sinAsociar.length === 1 ? 'Hay 1 persona del reloj sin asociar' : `Hay ${sinAsociar.length} personas del reloj sin asociar`}:
            sus fichadas no cuentan para nadie hasta que digas quién es.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-brand-success">
          <CheckCircle2 className="w-4 h-4" /> Todas las personas que ficharon están asociadas.
        </div>
      )}

      {mensaje && (
        <p role="status" className={cn('flex items-start gap-1.5 text-sm', mensaje.ok ? 'text-brand-success' : 'text-brand-error')}>
          {mensaje.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {mensaje.texto}
        </p>
      )}

      <div className="space-y-3">
        {sinAsociar.map((p) => (
          <TarjetaSinAsociar key={p.userid} persona={p} empleados={empleados} ocupado={ocupado} correr={correr} />
        ))}
      </div>

      <Desplegable titulo={`Asociados (${asociados.length})`}>
        <ul className="divide-y divide-brand-border/60">
          {asociados.map((a) => (
            <li key={a.userid} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-11 text-right font-semibold tabular-nums text-brand-muted">{a.userid}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-brand-text font-medium truncate">{a.empleado}</span>
                <span className="block text-[11px] text-brand-muted truncate">En el reloj: {a.nombreReloj ?? 'sin nombre'}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Quitar el ${a.userid} del reloj de ${a.empleado}? Sus horas del reloj salen de la planilla.`)) {
                    correr(`quitar-${a.userid}`, () => desasociarRelojAction(a.userid))
                  }
                }}
                disabled={ocupado !== null}
                className="text-xs font-semibold text-brand-muted hover:text-brand-error cursor-pointer disabled:opacity-50"
              >
                {ocupado === `quitar-${a.userid}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Quitar'}
              </button>
            </li>
          ))}
        </ul>
      </Desplegable>

      {ignorados.length > 0 && (
        <Desplegable titulo={`Ignorados (${ignorados.length})`}>
          <ul className="divide-y divide-brand-border/60">
            {ignorados.map((i) => (
              <li key={i.userid} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="w-11 text-right font-semibold tabular-nums text-brand-muted">{i.userid}</span>
                <span className="flex-1 min-w-0 text-brand-text truncate">{i.nombreReloj ?? 'sin nombre'}</span>
                <button
                  type="button"
                  onClick={() => correr(`revisar-${i.userid}`, () => desasociarRelojAction(i.userid))}
                  disabled={ocupado !== null}
                  className="text-xs font-semibold text-brand-muted hover:text-brand-accent cursor-pointer disabled:opacity-50"
                >
                  {ocupado === `revisar-${i.userid}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Volver a revisar'}
                </button>
              </li>
            ))}
          </ul>
        </Desplegable>
      )}
    </div>
  )
}

function TarjetaSinAsociar({
  persona: p,
  empleados,
  ocupado,
  correr,
}: {
  persona: SinAsociar
  empleados: Props['empleados']
  ocupado: string | null
  correr: (clave: string, accion: () => Promise<Respuesta>) => void
}) {
  const [elegido, setElegido] = useState('')
  const [nuevo, setNuevo] = useState(false)
  const [nombre, setNombre] = useState(p.nombre ? sinSector(p.nombre) : '')
  const [cargo, setCargo] = useState('')
  const libre = ocupado === null

  return (
    <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
          <Fingerprint className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-brand-text">
            {p.nombre ?? <span className="text-brand-muted font-normal">Todavía sin nombre en el reloj</span>}
          </p>
          <p className="text-xs text-brand-muted">
            Nro. {p.userid} · {p.fichadas === 1 ? '1 fichada' : `${p.fichadas} fichadas`}
            {p.desde === p.hasta ? ` el ${p.desde}` : ` del ${p.desde} al ${p.hasta}`}
          </p>
        </div>
      </div>

      {p.sugerencias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {p.sugerencias.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => correr(`${p.userid}-${s.id}`, () => asociarRelojAction(p.userid, s.id))}
              disabled={!libre}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer disabled:opacity-60 min-h-[40px]',
                s.dudoso ? 'border-brand-border text-brand-text hover:border-brand-accent' : 'border-brand-accent/50 text-brand-accent hover:bg-brand-accent/5'
              )}
            >
              {ocupado === `${p.userid}-${s.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {s.dudoso ? `¿Es ${s.nombre}?` : `Es ${s.nombre}`}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <select
          value={elegido}
          onChange={(e) => setElegido(e.target.value)}
          aria-label={`Asociar el ${p.userid} a…`}
          className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text cursor-pointer"
        >
          <option value="">Asociar a…</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
              {e.activo ? '' : ' (de baja)'}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => correr(`${p.userid}-elegido`, () => asociarRelojAction(p.userid, elegido))}
          disabled={!libre || !elegido}
          className="px-4 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-50 min-h-[44px] flex items-center gap-1.5"
        >
          {ocupado === `${p.userid}-elegido` && <Loader2 className="w-4 h-4 animate-spin" />}
          Asociar
        </button>
      </div>

      {nuevo ? (
        <div className="rounded-xl border border-brand-border p-3 space-y-2">
          <p className="text-xs text-brand-muted">Va al final de la planilla con este nombre (lo podés corregir después en Empleados).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre en la planilla"
              aria-label="Nombre en la planilla"
              className="h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text uppercase placeholder:normal-case"
            />
            <input
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Cargo (opcional)"
              aria-label="Cargo"
              className="h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text uppercase placeholder:normal-case"
            />
          </div>
          <button
            type="button"
            onClick={() => correr(`${p.userid}-nuevo`, () => nuevoDesdeRelojAction(p.userid, nombre, cargo))}
            disabled={!libre || nombre.trim().length < 2}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {ocupado === `${p.userid}-nuevo` ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Agregar al final
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setNuevo(true)}
            disabled={!libre}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-60 min-h-[40px]"
          >
            <UserPlus className="w-3.5 h-3.5" /> Es alguien nuevo
          </button>
          <button
            type="button"
            onClick={() => correr(`${p.userid}-ignorar`, () => ignorarRelojAction(p.userid))}
            disabled={!libre}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-text cursor-pointer disabled:opacity-60 min-h-[40px]"
          >
            {ocupado === `${p.userid}-ignorar` && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Ignorar (no es de la planilla)
          </button>
        </div>
      )}
    </section>
  )
}

function Desplegable({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-brand-text cursor-pointer hover:bg-brand-card-hover/60"
      >
        {titulo}
        <ChevronDown className={cn('w-4 h-4 text-brand-muted transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && <div className="border-t border-brand-border/70">{children}</div>}
    </section>
  )
}
