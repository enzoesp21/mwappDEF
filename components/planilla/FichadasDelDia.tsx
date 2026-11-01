'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sumarDias } from '@/lib/horarios'
import { textoFalta, textoHabitual, textoSegunHorario } from '@/lib/planilla'
import { MESES, NOMBRES_DIA, textoHoras, type CeldaPlanilla, type FilaPlanilla } from '@/lib/planilla-vista'
import PanelCelda from '@/components/planilla/PanelCelda'

export interface FilaDelDia {
  empleadoId: string
  nombre: string
  cargo: string | null
  orden: number
  celda: CeldaPlanilla
}

interface Props {
  /** "2026-10-31" */
  fecha: string
  hoy: string
  cerrado: boolean
  filas: FilaDelDia[]
}

const NOMBRE_CODIGO: Record<string, string> = {
  VAC: 'Vacaciones',
  CERT: 'Certificado',
  LIC: 'Licencia',
  FRANCO: 'Franco',
  'NO VINO': 'No vino',
}

function titulo(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00Z')
  const dia = NOMBRES_DIA[d.getUTCDay()]
  return `${dia.charAt(0)}${dia.slice(1).toLowerCase()} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()].toLowerCase()}`
}

function deSugerencia(c: CeldaPlanilla): string {
  if (!c.sugerencia) return (c.avisos ?? []).map((a) => a.texto).join(' · ')
  const s = { ...c.sugerencia, segunHorario: c.sugerencia.segun_horario }
  return [textoFalta(s), textoHabitual(s), textoSegunHorario(s)].filter(Boolean).join(' · ')
}

/** Lo de un día para controlar a la mañana: lo que hay que resolver arriba, después el resto. */
export default function FichadasDelDia({ fecha, hoy, cerrado, filas }: Props) {
  const router = useRouter()
  const [abierta, setAbierta] = useState<FilaDelDia | null>(null)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  const avisos = (c: CeldaPlanilla) => c.avisos ?? []
  const resolver = filas.filter((f) => f.celda.estado === 'incompleto' || f.celda.estado === 'revisar')
  const adentro = filas.filter((f) => avisos(f.celda).some((a) => a.tipo === 'en-curso'))
  const trabajaron = filas.filter((f) => f.celda.estado === 'ok' && f.celda.horas !== null && !f.celda.codigo)
  const conCodigo = filas.filter((f) => f.celda.codigo)
  const noFicharon = filas.filter((f) => avisos(f.celda).some((a) => a.tipo === 'sin-fichadas') && !f.celda.codigo)
  const horas = filas.reduce((s, f) => s + (f.celda.horas ?? 0), 0)
  const vinieron = resolver.length + adentro.length + trabajaron.length

  const etiqueta = fecha === hoy ? 'Hoy' : fecha === sumarDias(hoy, -1) ? 'Ayer' : null
  const fila: FilaPlanilla | null = abierta && {
    empleadoId: abierta.empleadoId,
    nombre: abierta.nombre,
    cargo: abierta.cargo,
    celdas: { [Number(fecha.slice(8))]: abierta.celda },
    horas: abierta.celda.horas ?? 0,
    dias: 0,
    incompletas: 0,
  }

  return (
    <div className="space-y-4 max-w-3xl animate-fade-in">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Fichadas</p>
        <h1 className="text-2xl font-semibold text-brand-accent tracking-tight">Fichadas del día</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Para controlar cada mañana: quién vino, a qué hora entró y salió, y lo que hay que resolver. Tocá a alguien
          para corregirlo.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/admin/fichadas/dia?fecha=${sumarDias(fecha, -1)}`}
          aria-label="Día anterior"
          className="w-10 h-10 rounded-xl border border-brand-border bg-brand-card flex items-center justify-center text-brand-text hover:border-brand-accent"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <input
          type="date"
          value={fecha}
          max={hoy}
          onChange={(e) => e.target.value && router.push(`/admin/fichadas/dia?fecha=${e.target.value}`)}
          aria-label="Elegí el día"
          className="h-10 px-3 rounded-xl border border-brand-border bg-brand-card text-sm font-semibold text-brand-text"
        />
        {fecha < hoy ? (
          <Link
            href={`/admin/fichadas/dia?fecha=${sumarDias(fecha, 1)}`}
            aria-label="Día siguiente"
            className="w-10 h-10 rounded-xl border border-brand-border bg-brand-card flex items-center justify-center text-brand-text hover:border-brand-accent"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span aria-hidden className="w-10 h-10 rounded-xl border border-brand-border bg-brand-card flex items-center justify-center text-brand-muted/40">
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
        <span className="text-sm text-brand-muted">
          {etiqueta && <span className="font-semibold text-brand-text">{etiqueta} · </span>}
          {titulo(fecha)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-brand-card border border-brand-border text-brand-text font-semibold">
          {vinieron === 1 ? '1 vino' : `${vinieron} vinieron`} · {textoHoras(horas)} h
        </span>
        <span
          className={cn(
            'px-3 py-1.5 rounded-full border font-semibold',
            resolver.length > 0 ? 'bg-[#FFC7CE] border-red-300 text-red-800' : 'bg-brand-success/10 border-brand-success/30 text-brand-success'
          )}
        >
          {resolver.length === 0 ? 'Nada para resolver' : resolver.length === 1 ? '1 para resolver' : `${resolver.length} para resolver`}
        </span>
        {cerrado && <span className="px-3 py-1.5 rounded-full bg-brand-card border border-brand-border text-brand-muted">Mes cerrado</span>}
      </div>

      {mensaje && (
        <p role="status" className={cn('flex items-start gap-1.5 text-sm', mensaje.ok ? 'text-brand-success' : 'text-brand-error')}>
          {mensaje.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {mensaje.texto}
        </p>
      )}

      {filas.length === 0 && (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 text-center text-sm text-brand-muted">
          No hay nada de ese día en la planilla.
        </div>
      )}

      <Grupo titulo="Para resolver" filas={resolver} onTocar={setAbierta} rojo>
        {(f) =>
          f.celda.estado === 'revisar' ? (
            <span className="flex items-center gap-1 text-amber-800">
              <Timer className="w-3.5 h-3.5" /> {textoHoras(f.celda.horas ?? 0)} h · más de 17 h, revisar
            </span>
          ) : (
            <span className="text-red-800">{deSugerencia(f.celda)}</span>
          )
        }
      </Grupo>

      <Grupo titulo="Adentro ahora" filas={adentro} onTocar={setAbierta}>
        {(f) => <span className="text-brand-success">{avisos(f.celda).find((a) => a.tipo === 'en-curso')?.texto}</span>}
      </Grupo>

      <Grupo titulo="Trabajaron" filas={trabajaron} onTocar={setAbierta}>
        {(f) => (
          <span className="flex flex-wrap items-center gap-x-2">
            <span className="tabular-nums">
              {f.celda.tramos && f.celda.tramos.length > 1
                ? f.celda.tramos.map((t) => `${hhmmCorto(t.desde)}–${hhmmCorto(t.hasta)}`).join(' y ')
                : `${f.celda.entrada?.slice(0, 5) ?? '?'} → ${f.celda.salida?.slice(0, 5) ?? '?'}`}
            </span>
            {avisos(f.celda)
              .filter((a) => a.tipo === 'franco' || a.tipo === 'doble')
              .map((a, i) => (
                <span key={i} className="text-amber-800">
                  · {a.texto}
                </span>
              ))}
            {f.celda.bloqueada && <span className="text-brand-muted">· cargado a mano</span>}
          </span>
        )}
      </Grupo>

      <Grupo titulo="Con código" filas={conCodigo} onTocar={setAbierta}>
        {(f) => <span>{NOMBRE_CODIGO[f.celda.codigo ?? ''] ?? f.celda.codigo}</span>}
      </Grupo>

      <Grupo titulo="Tenían horario y no ficharon" filas={noFicharon} onTocar={setAbierta} gris>
        {(f) => <span className="text-brand-muted">{f.celda.horario}</span>}
      </Grupo>

      {fila && abierta && (
        <PanelCelda
          fila={fila}
          dia={Number(fecha.slice(8))}
          mes={fecha.slice(0, 7)}
          cerrado={cerrado}
          onCerrar={(r) => {
            setAbierta(null)
            if (r) setMensaje(r)
          }}
        />
      )}
    </div>
  )
}

function hhmmCorto(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function Grupo({
  titulo,
  filas,
  onTocar,
  children,
  rojo = false,
  gris = false,
}: {
  titulo: string
  filas: FilaDelDia[]
  onTocar: (f: FilaDelDia) => void
  children: (f: FilaDelDia) => ReactNode
  rojo?: boolean
  gris?: boolean
}) {
  if (filas.length === 0) return null
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted mb-1.5">
        {titulo} · {filas.length}
      </h2>
      <ul className={cn('bg-brand-card border rounded-2xl divide-y overflow-hidden', rojo ? 'border-red-200 divide-red-100' : 'border-brand-border divide-brand-border/60')}>
        {filas.map((f) => (
          <li key={f.empleadoId}>
            <button
              type="button"
              onClick={() => onTocar(f)}
              className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer hover:bg-brand-card-hover/60', gris && 'opacity-80')}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-brand-text truncate">{f.nombre}</span>
                <span className="block text-xs mt-0.5">{children(f)}</span>
              </span>
              {f.celda.horas !== null && !f.celda.codigo && (
                <span className="text-base font-semibold text-brand-accent tabular-nums whitespace-nowrap">{textoHoras(f.celda.horas)} h</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
