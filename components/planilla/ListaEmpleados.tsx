'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { AlertTriangle, CheckCircle2, ChevronDown, GripVertical, Loader2, Plus, Search, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizarNombre } from '@/lib/horarios'
import {
  agregarEmpleadoAction,
  guardarEmpleadoAction,
  reordenarEmpleadosAction,
} from '@/app/actions/planilla-empleados'

export interface EmpleadoLista {
  id: string
  nombre: string
  cargo: string
  orden: number
  activo: boolean
  calendario: boolean
  profileId: string | null
  nombresHorario: string[]
  /** Sus números del reloj. */
  reloj: string[]
}

interface Props {
  empleados: EmpleadoLista[]
  perfiles: { id: string; nombre: string; puesto: string | null }[]
  /** Los nombres que aparecen en las últimas semanas publicadas de Horarios. */
  nombresHorario: string[]
  /** Los cargos que ya se usan, para no escribirlos distinto. */
  cargos: string[]
}

type Mensaje = { ok: boolean; texto: string } | null

/** Los empleados de la planilla: orden de la hoja, alta al final, cargo, bajas y vínculos. */
export default function ListaEmpleados({ empleados, perfiles, nombresHorario, cargos }: Props) {
  const router = useRouter()
  const [lista, setLista] = useState(empleados)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [buscar, setBuscar] = useState('')
  const [mensaje, setMensaje] = useState<Mensaje>(null)
  const [ordenando, setOrdenando] = useState(false)
  const [agregando, setAgregando] = useState(false)

  // Si el servidor trae otra lista (después de guardar), se usa esa.
  const [base, setBase] = useState(empleados)
  if (base !== empleados) {
    setBase(empleados)
    setLista(empleados)
  }

  const perfilPorId = useMemo(() => new Map(perfiles.map((p) => [p.id, p])), [perfiles])
  const filtro = normalizarNombre(buscar)
  const visibles = filtro ? lista.filter((e) => normalizarNombre(`${e.nombre} ${e.cargo}`).includes(filtro)) : lista
  const deBaja = lista.filter((e) => !e.activo).length
  const sinCargo = lista.filter((e) => e.activo && !e.cargo).length

  async function alSoltar(r: DropResult) {
    if (!r.destination || r.destination.index === r.source.index) return
    const anterior = lista
    const nueva = [...lista]
    const [movido] = nueva.splice(r.source.index, 1)
    nueva.splice(r.destination.index, 0, movido)
    setLista(nueva.map((e, i) => ({ ...e, orden: i + 1 })))
    setOrdenando(true)
    setMensaje(null)
    const res = await reordenarEmpleadosAction(nueva.map((e) => e.id))
    setOrdenando(false)
    if (!res.ok) {
      setLista(anterior)
      setMensaje({ ok: false, texto: res.error })
      return
    }
    setMensaje({ ok: true, texto: `${movido.nombre} quedó en el lugar ${r.destination.index + 1}.` })
    router.refresh()
  }

  return (
    <div className="space-y-4 max-w-3xl animate-fade-in">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">Fichadas</p>
        <h1 className="text-2xl font-semibold text-brand-accent tracking-tight">Empleados de la planilla</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          El orden es el de la hoja de Excel. Los nuevos van siempre al final y los que no tienen horas quedan en su
          fila. Para cambiar el orden, arrastrá desde <GripVertical className="inline w-3.5 h-3.5 -mt-0.5" />.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-3 py-1.5 rounded-full bg-brand-card border border-brand-border text-brand-text font-semibold">
          {lista.length - deBaja} en la planilla
        </span>
        {deBaja > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-brand-card border border-brand-border text-brand-muted">
            {deBaja} de baja
          </span>
        )}
        {sinCargo > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 font-semibold">
            {sinCargo} sin cargo
          </span>
        )}
        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer min-h-[44px]"
        >
          <UserPlus className="w-4 h-4" />
          Agregar empleado
        </button>
      </div>

      {agregando && (
        <FormularioNuevo
          cargos={cargos}
          onListo={(m) => {
            setMensaje(m)
            if (m?.ok) {
              setAgregando(false)
              router.refresh()
            }
          }}
          onCancelar={() => setAgregando(false)}
        />
      )}

      {mensaje && (
        <p role="status" className={cn('flex items-start gap-1.5 text-sm', mensaje.ok ? 'text-brand-success' : 'text-brand-error')}>
          {mensaje.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {mensaje.texto}
        </p>
      )}

      <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-brand-card border border-brand-border">
        <Search className="w-4 h-4 text-brand-muted flex-shrink-0" />
        <input
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar empleado o cargo"
          className="flex-1 min-w-0 bg-transparent text-sm text-brand-text placeholder:text-brand-muted/70 outline-none"
        />
        {ordenando && <Loader2 className="w-4 h-4 animate-spin text-brand-muted" aria-label="Guardando el orden" />}
      </label>
      {filtro && <p className="text-xs text-brand-muted -mt-2">Mientras buscás no se puede arrastrar.</p>}

      <DragDropContext onDragEnd={alSoltar}>
        <Droppable droppableId="empleados" isDropDisabled={Boolean(filtro) || ordenando}>
          {(lugar) => (
            <ol ref={lugar.innerRef} {...lugar.droppableProps} className="space-y-1.5">
              {visibles.map((e, i) => (
                <Draggable key={e.id} draggableId={e.id} index={i} isDragDisabled={Boolean(filtro) || ordenando}>
                  {(arrastre, estado) => (
                    <li
                      ref={arrastre.innerRef}
                      {...arrastre.draggableProps}
                      className={cn(
                        'rounded-xl border bg-brand-card',
                        estado.isDragging ? 'border-brand-accent/50 shadow-lg' : 'border-brand-border',
                        !e.activo && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2 px-2 py-2">
                        <span
                          {...arrastre.dragHandleProps}
                          aria-label={`Mover a ${e.nombre}`}
                          className={cn('p-1.5 text-brand-muted', filtro ? 'invisible' : 'cursor-grab active:cursor-grabbing')}
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className="w-7 text-right text-xs font-semibold text-brand-muted tabular-nums flex-shrink-0">{e.orden}</span>
                        <button
                          type="button"
                          onClick={() => setAbierto((v) => (v === e.id ? null : e.id))}
                          aria-expanded={abierto === e.id}
                          className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer"
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-brand-text truncate">{e.nombre}</span>
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brand-muted">
                              {e.cargo ? <span className="truncate">{e.cargo}</span> : <span className="text-amber-700 font-semibold">sin cargo</span>}
                              {!e.activo && <span className="font-semibold">· de baja</span>}
                              {e.calendario && <span>· día calendario</span>}
                              {e.reloj.length > 0 ? (
                                <span>· reloj {e.reloj.join(', ')}</span>
                              ) : (
                                <span className="text-amber-700">· sin número del reloj</span>
                              )}
                              {e.profileId && <span>· usuario {perfilPorId.get(e.profileId)?.nombre ?? ''}</span>}
                            </span>
                          </span>
                          <ChevronDown className={cn('w-4 h-4 text-brand-muted flex-shrink-0 transition-transform', abierto === e.id && 'rotate-180')} />
                        </button>
                      </div>
                      {abierto === e.id && (
                        <Editor
                          empleado={e}
                          perfiles={perfiles}
                          nombresHorario={nombresHorario}
                          cargos={cargos}
                          onListo={(m) => {
                            setMensaje(m)
                            if (m?.ok) {
                              setAbierto(null)
                              router.refresh()
                            }
                          }}
                        />
                      )}
                    </li>
                  )}
                </Draggable>
              ))}
              {lugar.placeholder}
            </ol>
          )}
        </Droppable>
      </DragDropContext>

      {visibles.length === 0 && <p className="text-sm text-brand-muted">Nadie coincide con la búsqueda.</p>}
    </div>
  )
}

function FormularioNuevo({
  cargos,
  onListo,
  onCancelar,
}: {
  cargos: string[]
  onListo: (m: Mensaje) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function agregar() {
    setGuardando(true)
    const r = await agregarEmpleadoAction(nombre, cargo)
    setGuardando(false)
    onListo(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
  }

  return (
    <div className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
      <p className="text-sm text-brand-text font-semibold">Empleado nuevo · va al final de la planilla</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre, como va en la planilla"
          aria-label="Nombre"
          className="h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text uppercase placeholder:normal-case"
        />
        <input
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          placeholder="Cargo (se puede completar después)"
          aria-label="Cargo"
          list="cargos-planilla"
          className="h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text uppercase placeholder:normal-case"
        />
      </div>
      <ListaCargos cargos={cargos} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={agregar}
          disabled={guardando || nombre.trim().length < 2}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-50 min-h-[44px]"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar al final
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={guardando}
          className="px-4 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-text cursor-pointer min-h-[44px]"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function ListaCargos({ cargos }: { cargos: string[] }) {
  return (
    <datalist id="cargos-planilla">
      {cargos.map((c) => (
        <option key={c} value={c} />
      ))}
    </datalist>
  )
}

function Editor({
  empleado,
  perfiles,
  nombresHorario,
  cargos,
  onListo,
}: {
  empleado: EmpleadoLista
  perfiles: Props['perfiles']
  nombresHorario: string[]
  cargos: string[]
  onListo: (m: Mensaje) => void
}) {
  const [nombre, setNombre] = useState(empleado.nombre)
  const [cargo, setCargo] = useState(empleado.cargo)
  const [activo, setActivo] = useState(empleado.activo)
  const [calendario, setCalendario] = useState(empleado.calendario)
  const [perfil, setPerfil] = useState(empleado.profileId ?? '')
  const [enHorario, setEnHorario] = useState(empleado.nombresHorario)
  const [nuevoHorario, setNuevoHorario] = useState('')
  const [guardando, setGuardando] = useState(false)

  function sumarHorario() {
    const n = nuevoHorario.trim().replace(/\s+/g, ' ')
    if (n && !enHorario.includes(n)) setEnHorario([...enHorario, n])
    setNuevoHorario('')
  }

  async function guardar() {
    setGuardando(true)
    const r = await guardarEmpleadoAction(empleado.id, {
      nombre,
      cargo,
      activo,
      jornada_calendario: calendario,
      profile_id: perfil || null,
      nombres_horario: enHorario,
    })
    setGuardando(false)
    onListo(r.ok ? { ok: true, texto: `${nombre.trim().toUpperCase()}: ${r.mensaje}` } : { ok: false, texto: r.error })
  }

  const listaHorario = `horario-${empleado.id}`
  return (
    <div className="border-t border-brand-border/70 px-4 py-4 space-y-3 text-sm">
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-brand-muted">Nombre en la planilla</span>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text uppercase"
          />
        </label>
        <label className="block">
          <span className="text-xs text-brand-muted">Cargo</span>
          <input
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            list="cargos-planilla"
            placeholder="Sin cargo"
            className="mt-1 w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text uppercase placeholder:normal-case"
          />
        </label>
      </div>
      <ListaCargos cargos={cargos} />

      <label className="block">
        <span className="text-xs text-brand-muted">Usuario de la app (para pasar sus horas a Propinas)</span>
        <select
          value={perfil}
          onChange={(e) => setPerfil(e.target.value)}
          className="mt-1 w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text cursor-pointer"
        >
          <option value="">— Sin usuario —</option>
          {perfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
              {p.puesto ? ` · ${p.puesto}` : ''}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="text-xs text-brand-muted">Cómo figura en Horarios (para las sugerencias “según horario”)</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {enHorario.length === 0 && <span className="text-xs text-amber-700">No figura en ningún horario.</span>}
          {enHorario.map((n) => (
            <span key={n} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-semibold">
              {n}
              <button
                type="button"
                onClick={() => setEnHorario(enHorario.filter((x) => x !== n))}
                aria-label={`Sacar ${n}`}
                className="p-0.5 rounded-full hover:bg-brand-accent/20 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex gap-2">
          <input
            value={nuevoHorario}
            onChange={(e) => setNuevoHorario(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), sumarHorario())}
            list={listaHorario}
            placeholder="Elegí o escribí el nombre de Horarios"
            className="flex-1 min-w-0 h-10 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
          />
          <datalist id={listaHorario}>
            {nombresHorario.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={sumarHorario}
            disabled={!nuevoHorario.trim()}
            className="px-3 rounded-xl border border-brand-border text-xs font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-50"
          >
            Sumar
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={calendario} onChange={(e) => setCalendario(e.target.checked)} className="mt-1 w-4 h-4 accent-brand-accent" />
        <span>
          <span className="text-brand-text font-medium">Día calendario</span>
          <span className="block text-xs text-brand-muted">Su día va de 00:00 a 23:59, para quien entra de madrugada (como Zulma).</span>
        </span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={!activo} onChange={(e) => setActivo(!e.target.checked)} className="mt-1 w-4 h-4 accent-brand-accent" />
        <span>
          <span className="text-brand-text font-medium">De baja</span>
          <span className="block text-xs text-brand-muted">
            Sigue en los meses donde trabajó, pero ya no aparece en los meses nuevos. No se borra nunca.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-60 min-h-[44px]"
        >
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          Guardar
        </button>
        {empleado.reloj.length === 0 && (
          <p className="text-xs text-amber-700">
            No tiene número del reloj: asocialo en la pestaña Reloj, si no sus fichadas no llegan a la planilla.
          </p>
        )}
      </div>
    </div>
  )
}
