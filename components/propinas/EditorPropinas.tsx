'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  Check,
  Copy,
  Fingerprint,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  GRUPOS,
  PAGOS,
  calcularReparto,
  fechaConDia,
  pesos,
  textoReporte,
  vincularUsuario,
  type Grupo,
  type Pago,
  type PersonaPropina,
} from '@/lib/propinas'
import { borrarDiaPropinasAction, guardarPropinasAction, horasDelRelojAction } from '@/app/actions/propinas'
import { emparejarHoras } from '@/lib/planilla-reloj'
import { datosNivel, grupoDeNivel } from '@/lib/progresion'

interface Fila {
  key: string
  nombre: string
  grupo: Grupo
  horas: string
  pago: Pago | null
  efectivo: string
}

interface Props {
  /** '/admin/propinas' o '/dashboard/propinas'. */
  base: string
  fecha: string
  esNuevo: boolean
  total: number | null
  general: number | null
  personas: PersonaPropina[]
  version: string | null
  usuarios: { id: string; full_name: string }[]
  sugerencias: string[]
  /** Nivel de progresión de cada mozo (por id de usuario): define su grupo. */
  nivelPorUsuario?: Record<string, number>
}

let contador = 0
const nuevaKey = () => 'f' + ++contador

function aFila(p: PersonaPropina): Fila {
  return {
    key: nuevaKey(),
    nombre: p.nombre,
    grupo: p.grupo,
    horas: p.horas > 0 ? String(p.horas) : '',
    pago: p.pago,
    efectivo: p.efectivo ? String(p.efectivo) : '',
  }
}

/** "277.850" o "$ 277850" -> 277850. */
function aPesos(texto: string): number {
  const limpio = texto.replace(/\D/g, '')
  return limpio ? Number(limpio) : 0
}

/** "6,5" -> 6.5. Vacío o inválido -> 0. */
function aHoras(texto: string): number {
  const n = Number(texto.replace(',', '.').trim())
  return Number.isFinite(n) && n > 0 ? n : 0
}

function aPersona(f: Fila): PersonaPropina {
  return {
    nombre: f.nombre,
    grupo: f.grupo,
    horas: aHoras(f.horas),
    pago: f.pago,
    efectivo: f.pago === 'tr_ef' && f.efectivo ? aPesos(f.efectivo) : null,
  }
}

const inputBase =
  'w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-sm text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent min-h-[40px]'

export default function EditorPropinas(props: Props) {
  const router = useRouter()
  const [fecha, setFecha] = useState(props.fecha)
  const [total, setTotal] = useState(props.total ? String(props.total) : '')
  const [general, setGeneral] = useState(props.general ? String(props.general) : '')
  // El grupo que le toca a cada uno según su nivel de progresión, si tiene.
  const nivelDe = (nombre: string): number | null => {
    const id = nombre.trim() ? vincularUsuario(nombre, props.usuarios) : null
    return id ? props.nivelPorUsuario?.[id] ?? null : null
  }
  const grupoSegunNivel = (nombre: string): Grupo | null => grupoDeNivel(nivelDe(nombre))

  const [filas, setFilas] = useState<Fila[]>(() =>
    props.personas.length > 0
      ? props.personas.map((p) =>
          // En un día nuevo arranca con el grupo de su nivel; uno ya guardado queda como está.
          aFila(props.esNuevo ? { ...p, grupo: grupoSegunNivel(p.nombre) ?? p.grupo } : p)
        )
      : [aFila({ nombre: '', grupo: 'camarero', horas: 0, pago: null, efectivo: null })]
  )
  const [version, setVersion] = useState(props.version)
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [trayendo, setTrayendo] = useState(false)
  const [avisoReloj, setAvisoReloj] = useState<{ ok: boolean; texto: string } | null>(null)

  const personas = useMemo(() => filas.map(aPersona), [filas])
  const totalN = aPesos(total)
  const generalN = aPesos(general)
  const reparto = useMemo(() => calcularReparto(totalN, generalN, personas), [totalN, generalN, personas])
  const conHoras = personas.filter((p) => p.horas > 0).length

  // Qué se guardó por última vez, para saber si hay cambios sin guardar.
  const foto = JSON.stringify({ fecha, totalN, generalN, personas: personas.filter((p) => p.horas > 0) })
  const [guardado, setGuardado] = useState(props.esNuevo ? '' : foto)
  const sinGuardar = foto !== guardado

  useEffect(() => {
    if (!sinGuardar) return
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [sinGuardar])

  function cambiar(key: string, cambio: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambio } : f)))
    setError(null)
  }

  /** Completa las horas con las de la planilla maestra de ese día (el reloj). */
  async function traerHoras() {
    setTrayendo(true)
    setAvisoReloj(null)
    const res = await horasDelRelojAction(fecha)
    setTrayendo(false)
    if (!res.ok) {
      setAvisoReloj({ ok: false, texto: res.error })
      return
    }
    const delReloj = res.value ?? []
    if (delReloj.length === 0) {
      setAvisoReloj({ ok: false, texto: 'La planilla no tiene horas de ese día todavía.' })
      return
    }
    const { horas, sinHoras } = emparejarHoras(
      filas.map((f) => ({
        clave: f.key,
        nombre: f.nombre,
        usuarioId: f.nombre.trim() ? vincularUsuario(f.nombre, props.usuarios) : null,
      })),
      delReloj
    )
    setFilas((prev) =>
      prev.map((f) => (horas.has(f.key) ? { ...f, horas: String(horas.get(f.key)).replace('.', ',') } : f))
    )
    const faltan = sinHoras.length > 0 ? ` Sin horas en el reloj ese día: ${sinHoras.join(', ')} (revisalos a mano).` : ''
    setAvisoReloj({ ok: true, texto: `Horas del reloj para ${horas.size} ${horas.size === 1 ? 'persona' : 'personas'}.${faltan}` })
  }

  // Desde la planilla ("Pasar a Propinas") se llega con ?traer=reloj: se traen solas, una vez.
  const parametros = useSearchParams()
  const yaTrajo = useRef(false)
  useEffect(() => {
    if (yaTrajo.current || parametros.get('traer') !== 'reloj') return
    yaTrajo.current = true
    traerHoras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros])

  function agregar() {
    setFilas((prev) => [...prev, aFila({ nombre: '', grupo: 'camarero', horas: 0, pago: null, efectivo: null })])
  }

  function quitar(key: string) {
    setFilas((prev) => prev.filter((f) => f.key !== key))
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    const res = await guardarPropinasAction(
      { fecha, total: totalN, general: generalN, personas },
      props.esNuevo ? null : version
    )
    setGuardando(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setGuardado(foto)
    if (props.esNuevo) {
      router.replace(props.base + '/' + fecha)
      router.refresh()
    } else {
      setVersion(res.value ?? null)
      router.refresh()
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar las propinas del ${fechaConDia(fecha)}? No se puede deshacer.`)) return
    setBorrando(true)
    setError(null)
    const res = await borrarDiaPropinasAction(fecha)
    if (!res.ok) {
      setBorrando(false)
      setError(res.error)
      return
    }
    setGuardado(foto)
    router.replace(props.base)
    router.refresh()
  }

  const reporte = textoReporte(fecha, totalN, generalN, personas)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(reporte)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setError('No se pudo copiar. Mantené apretado el texto de abajo y copialo a mano.')
    }
  }

  const nombresSugeridos = useMemo(
    () =>
      Array.from(new Set([...props.sugerencias, ...props.usuarios.map((u) => u.full_name.trim())]))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [props.sugerencias, props.usuarios]
  )

  return (
    <div className="space-y-4">
      <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-brand-text">Datos del día</h2>
        {props.esNuevo ? (
          <label className="block">
            <span className="text-xs text-brand-muted">Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={cn(inputBase, 'mt-1')}
            />
          </label>
        ) : (
          <p className="text-sm text-brand-text capitalize">{fechaConDia(fecha)}</p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-brand-muted">Propina total</span>
            <input
              type="text"
              inputMode="numeric"
              value={total}
              onChange={(e) => {
                setTotal(e.target.value)
                setError(null)
              }}
              placeholder="Ej: 277850"
              className={cn(inputBase, 'mt-1')}
            />
          </label>
          <label className="block">
            <span className="text-xs text-brand-muted">General (1,5 %)</span>
            <input
              type="text"
              inputMode="numeric"
              value={general}
              onChange={(e) => {
                setGeneral(e.target.value)
                setError(null)
              }}
              placeholder="Ej: 44200"
              className={cn(inputBase, 'mt-1')}
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <Dato etiqueta="Salón" valor={pesos(reparto.salon)} />
          <Dato etiqueta="Por hora" valor={reparto.porHora > 0 ? pesos(reparto.porHora) : '—'} destacado />
          <Dato etiqueta="Personas" valor={String(conHoras)} />
        </div>
      </section>

      <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-brand-text">Horas de cada uno</h2>
              <p className="text-xs text-brand-muted mt-0.5 leading-relaxed">
                Quien no trabajó, dejalo sin horas: no entra en el reparto.
              </p>
            </div>
            <button
              type="button"
              onClick={traerHoras}
              disabled={trayendo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-accent/50 text-xs font-semibold text-brand-accent hover:bg-brand-accent/5 cursor-pointer disabled:opacity-60 whitespace-nowrap min-h-[40px]"
            >
              {trayendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Fingerprint className="w-3.5 h-3.5" />}
              Traer horas del reloj
            </button>
          </div>
          {avisoReloj && (
            <p
              role="status"
              className={cn('text-xs mt-2 leading-relaxed', avisoReloj.ok ? 'text-brand-success' : 'text-brand-error')}
            >
              {avisoReloj.texto}
            </p>
          )}
        </div>

        <datalist id="nombres-propinas">
          {nombresSugeridos.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        <ul className="divide-y divide-brand-border/70">
          {filas.map((f, i) => {
            const p = personas[i]
            const trabajo = p.horas > 0
            const vinculado = f.nombre.trim() ? vincularUsuario(f.nombre, props.usuarios) : null
            const nivel = datosNivel(nivelDe(f.nombre) ?? 0)
            return (
              <li key={f.key} className={cn('px-4 py-3 space-y-2', !trabajo && 'bg-brand-card-hover/60')}>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      list="nombres-propinas"
                      value={f.nombre}
                      onChange={(e) => {
                        const nombre = e.target.value
                        const grupo = grupoSegunNivel(nombre)
                        cambiar(f.key, grupo ? { nombre, grupo } : { nombre })
                      }}
                      placeholder="Nombre y apellido"
                      aria-label="Nombre"
                      className={cn(inputBase, 'font-medium', vinculado && 'pr-8')}
                    />
                    {vinculado && (
                      <UserCheck
                        className="w-4 h-4 text-brand-accent absolute right-2.5 top-1/2 -translate-y-1/2"
                        aria-label="Tiene usuario: lo ve en su app"
                      />
                    )}
                  </div>
                  <div className="relative w-[4.5rem] flex-shrink-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={f.horas}
                      onChange={(e) => cambiar(f.key, { horas: e.target.value })}
                      placeholder="0"
                      aria-label={'Horas de ' + (f.nombre || 'esta persona')}
                      className={cn(inputBase, 'pr-6 text-right tabular-nums')}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-brand-muted pointer-events-none">
                      h
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(f.key)}
                    aria-label={'Sacar a ' + (f.nombre || 'esta fila')}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 cursor-pointer flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {trabajo && (
                  <div className="flex items-center gap-2">
                    <select
                      value={f.grupo}
                      onChange={(e) => cambiar(f.key, { grupo: e.target.value as Grupo })}
                      aria-label="Grupo"
                      className="px-2 py-1.5 bg-brand-card border border-brand-border rounded-lg text-xs text-brand-text cursor-pointer min-h-[34px]"
                    >
                      {GRUPOS.map((g) => (
                        <option key={g.valor} value={g.valor}>
                          {g.opcion}
                        </option>
                      ))}
                    </select>
                    <select
                      value={f.pago ?? ''}
                      onChange={(e) =>
                        cambiar(f.key, { pago: (e.target.value || null) as Pago | null })
                      }
                      aria-label="Cómo se le pagó"
                      className={cn(
                        'px-2 py-1.5 border rounded-lg text-xs cursor-pointer min-h-[34px]',
                        f.pago
                          ? 'bg-brand-accent/10 border-brand-accent/40 text-brand-accent font-semibold'
                          : 'bg-brand-card border-brand-border text-brand-muted'
                      )}
                    >
                      <option value="">Sin pagar</option>
                      {PAGOS.map((x) => (
                        <option key={x.valor} value={x.valor}>
                          {x.corta}
                        </option>
                      ))}
                    </select>
                    <span className="ml-auto text-sm font-bold text-brand-text tabular-nums whitespace-nowrap">
                      {pesos(reparto.montos[i])}
                    </span>
                  </div>
                )}

                {trabajo && nivel && (
                  <p
                    className={cn(
                      'text-[11px]',
                      nivel.grupo === f.grupo ? 'text-brand-muted' : 'text-amber-700 font-medium'
                    )}
                  >
                    {nivel.grupo === f.grupo
                      ? `Nivel ${nivel.nivel} de progresión · ${nivel.porcentaje} %`
                      : `Su nivel de progresión es ${nivel.porcentaje} %: hoy lo pusiste distinto.`}
                  </p>
                )}

                {trabajo && f.pago === 'tr_ef' && (
                  <label className="flex items-center gap-2">
                    <span className="text-xs text-brand-muted whitespace-nowrap">En efectivo</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={f.efectivo}
                      onChange={(e) => cambiar(f.key, { efectivo: e.target.value })}
                      placeholder="Ej: 20800"
                      className={cn(inputBase, 'min-h-[34px] py-1.5 text-xs')}
                    />
                  </label>
                )}
              </li>
            )
          })}
        </ul>

        <div className="px-4 py-3 border-t border-brand-border/70 space-y-2">
          <button
            type="button"
            onClick={agregar}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-accent hover:text-brand-accent-hover cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Agregar persona
          </button>
          <p className="flex items-start gap-1.5 text-[11px] text-brand-muted leading-relaxed">
            <UserCheck className="w-3.5 h-3.5 flex-shrink-0 mt-px text-brand-accent" />
            Tiene usuario en la app y ve lo que le tocó. Si alguien no lo tiene, revisá que el nombre
            y apellido estén igual que en su usuario. El grupo se pone solo según el nivel de cada mozo
            (Progresión); si hace falta, lo cambiás.
          </p>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || borrando || (!sinGuardar && !props.esNuevo)}
          className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-5 py-3 rounded-xl bg-brand-accent text-white font-bold text-sm hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[48px] disabled:opacity-50 disabled:cursor-default"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {props.esNuevo ? 'Guardar el día' : sinGuardar ? 'Guardar cambios' : 'Guardado'}
        </button>
        {!props.esNuevo && (
          <button
            type="button"
            onClick={borrar}
            disabled={guardando || borrando}
            className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm text-brand-muted hover:text-brand-error hover:bg-brand-error/10 cursor-pointer min-h-[48px] disabled:opacity-50"
          >
            {borrando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Borrar día
          </button>
        )}
      </div>

      {!props.esNuevo && (
        <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-brand-text">Reporte para el grupo</h2>
            <p className="text-xs text-brand-muted mt-0.5">
              {sinGuardar
                ? 'Guardá los cambios antes de mandarlo, así el grupo y la app dicen lo mismo.'
                : 'Copialo o mandalo directo por WhatsApp.'}
            </p>
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-brand-text bg-brand-card-hover border border-brand-border/70 rounded-xl p-3 font-sans">
            {reporte}
          </pre>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copiar}
              disabled={sinGuardar}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-brand-border bg-brand-card text-sm font-semibold text-brand-text hover:border-brand-accent cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-default"
            >
              {copiado ? <Check className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
            <a
              href={sinGuardar ? undefined : 'https://wa.me/?text=' + encodeURIComponent(reporte)}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={sinGuardar}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold min-h-[44px]',
                sinGuardar ? 'opacity-50 pointer-events-none' : 'hover:brightness-95 cursor-pointer'
              )}
            >
              <Send className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </section>
      )}
    </div>
  )
}

function Dato({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl px-2.5 py-2 border',
        destacado ? 'bg-brand-accent/10 border-brand-accent/30' : 'bg-brand-card-hover border-brand-border/60'
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">{etiqueta}</p>
      <p className={cn('text-sm font-bold tabular-nums truncate', destacado ? 'text-brand-accent' : 'text-brand-text')}>
        {valor}
      </p>
    </div>
  )
}
