'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MESES, NOMBRES_DIA } from '@/lib/planilla-vista'
import { borrarPapelAction, cargarPapelAction } from '@/app/actions/planilla-papel'

export interface CargaManual {
  id: number
  empleadoId: string
  nombre: string
  /** La jornada a la que pertenece. */
  fecha: string
  /** "07:30", o "01:20 (+1)" si es de madrugada. */
  hora: string
  /** Minutos de la jornada, para ordenar. */
  minuto: number
  fuente: 'papel' | 'manual'
  nota: string | null
}

interface Props {
  empleados: { id: string; nombre: string; activo: boolean }[]
  hoy: string
  recientes: CargaManual[]
}

function titulo(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00Z')
  const dia = NOMBRES_DIA[d.getUTCDay()]
  return `${dia.charAt(0)}${dia.slice(1).toLowerCase()} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()].toLowerCase()}`
}

function ayer(hoy: string): string {
  const d = new Date(hoy + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Cargar las horas de la planilla en papel y ver (o borrar) lo que se cargó a mano. */
export default function CargarPapel({ empleados, hoy, recientes }: Props) {
  const router = useRouter()
  const [empleado, setEmpleado] = useState('')
  const [fecha, setFecha] = useState(ayer(hoy))
  const [horas, setHoras] = useState(['', ''])
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  async function guardar() {
    setGuardando(true)
    setMensaje(null)
    const r = await cargarPapelAction(empleado, fecha, horas, nota)
    setGuardando(false)
    setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
    if (r.ok) {
      setHoras(['', ''])
      setNota('')
      router.refresh()
    }
  }

  async function borrar(c: CargaManual) {
    if (!window.confirm(`¿Borrar la de las ${c.hora} de ${c.nombre}?`)) return
    setBorrando(c.id)
    setMensaje(null)
    const r = await borrarPapelAction(c.id)
    setBorrando(null)
    setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
    if (r.ok) router.refresh()
  }

  // Lo cargado, por día (el más nuevo primero) y por persona.
  const dias = new Map<string, Map<string, CargaManual[]>>()
  for (const c of [...recientes].sort((a, b) => a.minuto - b.minuto)) {
    const delDia = dias.get(c.fecha) ?? new Map<string, CargaManual[]>()
    delDia.set(c.empleadoId, [...(delDia.get(c.empleadoId) ?? []), c])
    dias.set(c.fecha, delDia)
  }
  const fechas = Array.from(dias.keys()).sort().reverse()
  const etiquetas = ['Entrada', 'Salida']

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Fichadas</p>
        <h1 className="text-2xl font-semibold text-brand-accent tracking-tight">Cargar papel</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Para los días que alguien no fichó o el reloj no lo leyó: cargá las horas de la planilla en papel. Ese día va
          de la hora más temprana a la más tarde, entre papel y reloj. Las horas antes de las 7 son de madrugada y
          cuentan para ese día (una salida a la 01:30 va acá).
        </p>
      </div>

      <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-brand-muted">Empleado</span>
            <select
              value={empleado}
              onChange={(e) => setEmpleado(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text cursor-pointer"
            >
              <option value="">Elegí el empleado</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                  {e.activo ? '' : ' (de baja)'}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-brand-muted">Día</span>
            <input
              type="date"
              value={fecha}
              max={hoy}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {horas.map((h, i) => (
            <label key={i} className="block">
              <span className="text-xs text-brand-muted">{etiquetas[i] ?? `Hora ${i + 1}`}</span>
              <input
                type="time"
                value={h}
                onChange={(e) => setHoras(horas.map((x, j) => (j === i ? e.target.value : x)))}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text tabular-nums"
              />
            </label>
          ))}
          {horas.length < 6 && (
            <button
              type="button"
              onClick={() => setHoras([...horas, ''])}
              className="self-end h-11 flex items-center justify-center gap-1 rounded-xl border border-dashed border-brand-border text-xs font-semibold text-brand-muted hover:text-brand-accent hover:border-brand-accent cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Otra hora
            </button>
          )}
        </div>

        <label className="block">
          <span className="text-xs text-brand-muted">Nota (opcional)</span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ej.: planilla de papel de la barra"
            maxLength={200}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
          />
        </label>

        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !empleado || !fecha || horas.every((h) => !h)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-50 min-h-[44px]"
        >
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar
        </button>
      </section>

      {mensaje && (
        <p role="status" className={cn('flex items-start gap-1.5 text-sm', mensaje.ok ? 'text-brand-success' : 'text-brand-error')}>
          {mensaje.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {mensaje.texto}
        </p>
      )}

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted mb-1.5">
          Cargadas a mano · últimos 45 días
        </h2>
        {fechas.length === 0 ? (
          <p className="text-sm text-brand-muted">Todavía no se cargó nada a mano.</p>
        ) : (
          <div className="space-y-3">
            {fechas.map((f) => (
              <div key={f} className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
                <p className="px-4 py-2 text-xs font-semibold text-brand-muted border-b border-brand-border/70">{titulo(f)}</p>
                <ul className="divide-y divide-brand-border/60">
                  {Array.from(dias.get(f)!.values()).map((cargas) => (
                    <li key={cargas[0].empleadoId} className="px-4 py-2">
                      <p className="text-sm font-semibold text-brand-text">{cargas[0].nombre}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {cargas.map((c) => (
                          <span
                            key={c.id}
                            title={c.nota ?? undefined}
                            className={cn(
                              'flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg border text-xs tabular-nums',
                              c.fuente === 'papel' ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-brand-border bg-brand-card text-brand-text'
                            )}
                          >
                            <span className="font-semibold">{c.hora}</span>
                            <span className="text-[10px] opacity-70">{c.fuente === 'papel' ? 'papel' : 'importada'}</span>
                            <button
                              type="button"
                              onClick={() => borrar(c)}
                              disabled={borrando !== null}
                              aria-label={`Borrar la de las ${c.hora}`}
                              className="p-0.5 rounded hover:bg-black/5 cursor-pointer disabled:opacity-50"
                            >
                              {borrando === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            </button>
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
