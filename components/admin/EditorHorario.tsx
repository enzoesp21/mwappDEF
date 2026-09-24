'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
  Send,
  EyeOff,
  RefreshCw,
  MoreHorizontal,
  FileDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DIAS_CORTOS,
  numeroDeDia,
  pintaComoFinde,
  totalesDelSector,
  type DatosHorario,
  type PersonaHorario,
  type SectorHorario,
} from '@/lib/horarios'
import { claseCelda, claseColumna, claseEncabezadoDia, REFERENCIAS } from '@/components/horario/estilos'
import { guardarSemanaAction, publicarSemanaAction } from '@/app/actions/horarios'

interface Props {
  id: string
  lunes: string
  etiqueta: string
  publicada: boolean
  datosIniciales: DatosHorario
  /** Tal cual vino de la base: no pasar por Date, perdería los microsegundos. */
  versionInicial: string
}

type EstadoGuardado =
  | { tipo: 'al_dia' }
  | { tipo: 'pendiente' }
  | { tipo: 'guardando' }
  | { tipo: 'guardado'; hora: string }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'conflicto'; mensaje: string }

const ESPERA_AUTOGUARDADO = 1200
const RELLENOS = ['X', 'VAC', 'LIC', 'M9']

export default function EditorHorario({
  id,
  lunes,
  etiqueta,
  publicada,
  datosIniciales,
  versionInicial,
}: Props) {
  const router = useRouter()
  const [datos, setDatos] = useState<DatosHorario>(datosIniciales)
  const [estado, setEstado] = useState<EstadoGuardado>({ tipo: 'al_dia' })
  const [publicando, setPublicando] = useState(false)
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null)
  const [generandoPDF, setGenerandoPDF] = useState(false)

  const version = useRef(versionInicial)
  const datosRef = useRef(datos)
  datosRef.current = datos
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bloqueado = useRef(false)
  const cambioSinProgramar = useRef(false)

  /** Devuelve si quedó guardado, para que publicar no avance sobre un error. */
  const guardar = useCallback(
    async (aGuardar: DatosHorario): Promise<boolean> => {
      if (bloqueado.current) return false
      setEstado({ tipo: 'guardando' })
      const res = await guardarSemanaAction(id, aGuardar, version.current)
      if (res.ok && res.value) {
        version.current = res.value
        const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        setEstado({ tipo: 'guardado', hora })
        return true
      }
      if (!res.ok && res.error.startsWith('Otra persona')) {
        // Se deja de autoguardar: seguir escribiendo encima sería perder algo.
        bloqueado.current = true
        setEstado({ tipo: 'conflicto', mensaje: res.error })
      } else if (!res.ok) {
        setEstado({ tipo: 'error', mensaje: res.error })
      }
      return false
    },
    [id]
  )

  /**
   * Única vía para cambiar la planilla: recibe una transformación y la aplica
   * sobre el estado más reciente. Así dos cambios seguidos nunca se pisan, y
   * las funciones quedan estables para que las filas memorizadas no se
   * redibujen de más.
   */
  const aplicar = useCallback((fn: (d: DatosHorario) => DatosHorario) => {
    cambioSinProgramar.current = true
    setDatos((prev) => fn(prev))
  }, [])

  // El autoguardado se programa después de cada cambio, fuera del actualizador
  // de estado: ahí tiene que ser una función pura.
  useEffect(() => {
    if (!cambioSinProgramar.current) return
    cambioSinProgramar.current = false
    if (bloqueado.current) return
    setEstado({ tipo: 'pendiente' })
    if (temporizador.current) clearTimeout(temporizador.current)
    const aGuardar = datos
    temporizador.current = setTimeout(() => guardar(aGuardar), ESPERA_AUTOGUARDADO)
  }, [datos, guardar])

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    function antesDeSalir(e: BeforeUnloadEvent) {
      if (estado.tipo === 'pendiente' || estado.tipo === 'guardando') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', antesDeSalir)
    return () => window.removeEventListener('beforeunload', antesDeSalir)
  }, [estado.tipo])

  // ---------- Operaciones sobre la planilla ----------

  const conSector = useCallback(
    (si: number, fn: (s: SectorHorario) => SectorHorario) =>
      aplicar((d) => ({ ...d, sectores: d.sectores.map((s, i) => (i === si ? fn(s) : s)) })),
    [aplicar]
  )

  const conPersona = useCallback(
    (si: number, pi: number, fn: (p: PersonaHorario) => PersonaHorario) =>
      conSector(si, (s) => ({ ...s, personas: s.personas.map((p, j) => (j === pi ? fn(p) : p)) })),
    [conSector]
  )

  const cambiarCelda = useCallback(
    (si: number, pi: number, dia: number, valor: string) =>
      conPersona(si, pi, (p) => ({ ...p, dias: p.dias.map((c, d) => (d === dia ? valor : c)) })),
    [conPersona]
  )

  const renombrarPersona = useCallback(
    (si: number, pi: number, nombre: string) => conPersona(si, pi, (p) => ({ ...p, nombre })),
    [conPersona]
  )

  const rellenarFila = useCallback(
    (si: number, pi: number, valor: string) =>
      conPersona(si, pi, (p) => ({ ...p, dias: Array(7).fill(valor) })),
    [conPersona]
  )

  const moverPersona = useCallback(
    (si: number, pi: number, delta: number) =>
      conSector(si, (s) => {
        const j = pi + delta
        if (j < 0 || j >= s.personas.length) return s
        const personas = [...s.personas]
        ;[personas[pi], personas[j]] = [personas[j], personas[pi]]
        return { ...s, personas }
      }),
    [conSector]
  )

  const quitarPersona = useCallback(
    (si: number, pi: number) => {
      const p = datosRef.current.sectores[si]?.personas[pi]
      if (p?.nombre.trim() && !confirm('¿Sacar a ' + p.nombre + ' de esta semana?')) return
      conSector(si, (s) => ({ ...s, personas: s.personas.filter((_, j) => j !== pi) }))
    },
    [conSector]
  )

  function agregarPersona(si: number) {
    conSector(si, (s) => ({
      ...s,
      personas: [...s.personas, { nombre: '', dias: Array(7).fill('') }],
    }))
  }

  function renombrarSector(si: number, nombre: string) {
    conSector(si, (s) => ({ ...s, nombre }))
  }

  function moverSector(si: number, delta: number) {
    aplicar((d) => {
      const j = si + delta
      if (j < 0 || j >= d.sectores.length) return d
      const sectores = [...d.sectores]
      ;[sectores[si], sectores[j]] = [sectores[j], sectores[si]]
      return { ...d, sectores }
    })
  }

  function quitarSector(si: number) {
    const s = datos.sectores[si]
    const aviso =
      s.personas.length > 0
        ? '¿Sacar el sector ' + s.nombre + ' con sus ' + s.personas.length + ' personas?'
        : '¿Sacar el sector ' + s.nombre + '?'
    if (!confirm(aviso)) return
    aplicar((d) => ({ ...d, sectores: d.sectores.filter((_, i) => i !== si) }))
  }

  function alternarFeriado(dia: number) {
    aplicar((d) => {
      const actuales = d.feriados ?? []
      const feriados = actuales.includes(dia)
        ? actuales.filter((x) => x !== dia)
        : [...actuales, dia].sort((a, b) => a - b)
      return { ...d, feriados }
    })
  }

  // Qué días se pintan como fin de semana. Depende solo de los feriados, así que
  // se memoriza por ellos: si no, cada tecla redibujaría todas las filas.
  const claveFeriados = (datos.feriados ?? []).join(',')
  const findes = useMemo(() => {
    const feriados = claveFeriados ? claveFeriados.split(',').map(Number) : []
    return Array.from({ length: 7 }, (_, i) => pintaComoFinde({ sectores: [], feriados }, i))
  }, [claveFeriados])

  function agregarSector() {
    aplicar((d) => ({ ...d, sectores: [...d.sectores, { nombre: 'NUEVO SECTOR', personas: [] }] }))
  }

  async function alternarPublicacion() {
    // Antes de publicar se guarda lo pendiente, para no publicar algo viejo.
    if (temporizador.current) {
      clearTimeout(temporizador.current)
      temporizador.current = null
    }
    if (estado.tipo === 'pendiente' || estado.tipo === 'error') {
      const ok = await guardar(datosRef.current)
      if (!ok) {
        setErrorPublicar('No se publicó: primero tiene que quedar guardado.')
        return
      }
    }
    if (bloqueado.current) return

    if (!publicada && !confirm('¿Publicar la semana del ' + etiqueta + '? La va a ver todo el personal.')) {
      return
    }
    setPublicando(true)
    setErrorPublicar(null)
    const res = await publicarSemanaAction(id, !publicada)
    setPublicando(false)
    if (res.ok) router.refresh()
    else setErrorPublicar(res.error)
  }

  /**
   * Baja el PDF de lo que está en pantalla, aunque no esté guardado ni
   * publicado todavía: es lo que se manda al grupo. La librería se carga recién
   * al tocar el botón, para no hacer más pesada la página.
   */
  async function descargarPDF() {
    setGenerandoPDF(true)
    try {
      const { generarPDFHorario, nombreDelArchivo } = await import('@/lib/horario-pdf')
      generarPDFHorario(datosRef.current, lunes).save(nombreDelArchivo(lunes))
    } catch (e) {
      alert('No se pudo armar el PDF: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setGenerandoPDF(false)
    }
  }

  // Enter baja a la misma columna de la persona siguiente, como en Excel.
  const alPresionar = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const fila = Number(e.currentTarget.dataset.fila)
    const col = e.currentTarget.dataset.col
    const siguiente = document.querySelector<HTMLInputElement>(
      'input[data-fila="' + (fila + 1) + '"][data-col="' + col + '"]'
    )
    siguiente?.focus()
    siguiente?.select()
  }, [])

  // Número de fila global, para poder navegar entre sectores con Enter.
  let filaGlobal = 0

  return (
    <div className="space-y-5">
      {/* Barra de estado y publicación */}
      <div className="sticky top-14 lg:top-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 py-3 bg-brand-dark/95 backdrop-blur-sm border-b border-brand-border flex items-center gap-3 flex-wrap">
        <IndicadorGuardado estado={estado} />
        <div className="flex-1" />
        {errorPublicar && <span className="text-xs text-brand-error">{errorPublicar}</span>}
        <button
          type="button"
          onClick={descargarPDF}
          disabled={generandoPDF || datos.sectores.length === 0}
          title="Baja la planilla en PDF para mandar al grupo"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-brand-card border border-brand-border text-brand-text hover:border-brand-accent hover:text-brand-accent transition-colors min-h-[40px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generandoPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Descargar PDF
        </button>
        <button
          type="button"
          onClick={alternarPublicacion}
          disabled={publicando || estado.tipo === 'conflicto' || estado.tipo === 'guardando'}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors min-h-[40px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
            publicada
              ? 'bg-brand-card border border-brand-border text-brand-muted hover:text-brand-error'
              : 'bg-brand-accent text-white hover:bg-brand-accent-hover'
          )}
        >
          {publicando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : publicada ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {publicada ? 'Despublicar' : 'Publicar'}
        </button>
      </div>

      {estado.tipo === 'conflicto' && (
        <div className="flex items-start gap-3 bg-brand-error/10 border border-brand-error/30 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-brand-error flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm text-brand-text">{estado.mensaje}</p>
            <p className="text-xs text-brand-muted">
              Lo último que escribiste no se guardó. Anotalo antes de recargar.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recargar
            </button>
          </div>
        </div>
      )}

      {publicada && (
        <p className="text-xs text-brand-muted bg-brand-accent/10 border border-brand-accent/20 rounded-lg px-3 py-2">
          Esta semana está <strong className="text-brand-text">publicada</strong>: lo que cambies
          acá lo ve el personal al instante.
        </p>
      )}

      <div className="bg-brand-card border border-brand-border rounded-xl p-3">
        <p className="text-xs font-semibold text-brand-text mb-2">
          ¿Hay algún feriado esta semana? Tocá el día y se pinta como sábado y domingo.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DIAS_CORTOS.map((d, i) => {
            const esFinde = i >= 5
            const marcado = (datos.feriados ?? []).includes(i)
            return (
              <button
                key={d}
                type="button"
                onClick={() => alternarFeriado(i)}
                disabled={esFinde}
                aria-pressed={marcado}
                title={esFinde ? 'Ya se pinta como fin de semana' : marcado ? 'Sacar el feriado' : 'Marcar como feriado'}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[36px]',
                  esFinde
                    ? 'bg-[#d6e7cf] border-transparent text-brand-muted cursor-not-allowed'
                    : marcado
                      ? 'bg-brand-accent border-brand-accent text-white cursor-pointer'
                      : 'bg-brand-card border-brand-border text-brand-text hover:border-brand-accent cursor-pointer'
                )}
              >
                {d} {numeroDeDia(lunes, i)}
                {marcado && ' · feriado'}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {REFERENCIAS.map((r) => (
          <span key={r.etiqueta} className="flex items-center gap-1.5 text-[11px] text-brand-muted">
            <span className={cn('w-3 h-3 rounded-sm border border-brand-border', r.clase)} />
            {r.etiqueta}
          </span>
        ))}
      </div>

      {datos.sectores.length === 0 && (
        <div className="border border-dashed border-brand-border rounded-xl p-8 text-center">
          <p className="text-sm text-brand-muted">
            La planilla está vacía. Agregá el primer sector para empezar.
          </p>
        </div>
      )}

      {datos.sectores.map((sector, si) => {
        const totales = totalesDelSector(sector)
        return (
          <section key={si} className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-text text-white">
              <input
                type="text"
                value={sector.nombre}
                onChange={(e) => renombrarSector(si, e.target.value)}
                aria-label="Nombre del sector"
                className="flex-1 min-w-0 bg-transparent text-sm font-bold uppercase tracking-wide focus:outline-none focus:bg-white/10 rounded px-1.5 py-1"
              />
              <button type="button" onClick={() => moverSector(si, -1)} disabled={si === 0} aria-label="Subir sector" className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => moverSector(si, 1)} disabled={si === datos.sectores.length - 1} aria-label="Bajar sector" className="p-1 rounded hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => quitarSector(si)} aria-label="Sacar sector" className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="sticky left-0 z-10 bg-brand-card text-left font-semibold text-brand-muted px-2 py-2 w-[190px]">
                      Persona
                    </th>
                    {DIAS_CORTOS.map((d, i) => (
                      <th key={d} className={cn('font-semibold px-1 py-2 text-center', claseEncabezadoDia(findes[i]))}>
                        {d} {numeroDeDia(lunes, i)}
                        {(datos.feriados ?? []).includes(i) && (
                          <span className="block text-[9px] font-bold uppercase tracking-wider">Feriado</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sector.personas.map((persona, pi) => {
                    const fila = filaGlobal++
                    return (
                      <FilaPersona
                        key={si + '-' + pi}
                        si={si}
                        pi={pi}
                        fila={fila}
                        persona={persona}
                        esPrimera={pi === 0}
                        esUltima={pi === sector.personas.length - 1}
                        onCelda={cambiarCelda}
                        onNombre={renombrarPersona}
                        onMover={moverPersona}
                        onQuitar={quitarPersona}
                        onRellenar={rellenarFila}
                        onTecla={alPresionar}
                        findes={findes}
                      />
                    )
                  })}
                  <tr className="border-t border-brand-border bg-brand-dark/30">
                    <td className="sticky left-0 z-10 bg-[#f3efe4] px-2 py-1.5 text-[11px] font-semibold text-brand-muted">
                      Trabajan
                    </td>
                    {totales.map((t, i) => (
                      <td key={i} className={cn('px-1 py-1.5 text-center text-[11px] font-semibold text-brand-text', claseColumna(findes[i]))}>
                        {t.total}
                        {t.noche > 0 && <span className="text-brand-accent"> ({t.noche}N)</span>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => agregarPersona(si)}
              className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-brand-accent hover:bg-brand-accent/5 border-t border-brand-border cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar persona a {sector.nombre || 'este sector'}
            </button>
          </section>
        )
      })}

      <button
        type="button"
        onClick={agregarSector}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-brand-border text-sm font-medium text-brand-muted hover:text-brand-accent hover:border-brand-accent cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Agregar sector
      </button>
    </div>
  )
}

// ---------- Fila de una persona ----------

interface FilaProps {
  si: number
  pi: number
  fila: number
  persona: PersonaHorario
  esPrimera: boolean
  esUltima: boolean
  onCelda: (si: number, pi: number, dia: number, valor: string) => void
  onNombre: (si: number, pi: number, nombre: string) => void
  onMover: (si: number, pi: number, delta: number) => void
  onQuitar: (si: number, pi: number) => void
  onRellenar: (si: number, pi: number, valor: string) => void
  onTecla: (e: React.KeyboardEvent<HTMLInputElement>) => void
  findes: boolean[]
}

// Memorizada: con 400 celdas, redibujar todo en cada tecla se nota en el celular.
const FilaPersona = memo(function FilaPersona({
  si,
  pi,
  fila,
  persona,
  esPrimera,
  esUltima,
  onCelda,
  onNombre,
  onMover,
  onQuitar,
  onRellenar,
  onTecla,
  findes,
}: FilaProps) {
  const [menu, setMenu] = useState(false)

  return (
    <tr className="border-b border-brand-border/60 group">
      <td className="sticky left-0 z-10 bg-brand-card px-1 py-0.5">
        <div className="flex items-center gap-0.5">
          <input
            type="text"
            value={persona.nombre}
            onChange={(e) => onNombre(si, pi, e.target.value)}
            placeholder="Nombre"
            aria-label="Nombre de la persona"
            className="flex-1 min-w-0 px-1.5 py-1 rounded text-xs font-medium text-brand-text bg-transparent focus:outline-none focus:bg-brand-dark/40"
          />
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-label="Opciones de la fila"
              className="p-1 rounded text-brand-muted hover:bg-brand-dark/40 cursor-pointer"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menu && (
              <div
                className="absolute left-0 top-full mt-1 z-30 bg-brand-card border border-brand-border rounded-lg shadow-lg p-2 w-44 space-y-1"
                onMouseLeave={() => setMenu(false)}
              >
                <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider px-1">
                  Toda la semana
                </p>
                <div className="flex gap-1 flex-wrap">
                  {RELLENOS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => {
                        onRellenar(si, pi, v)
                        setMenu(false)
                      }}
                      className="px-2 py-1 text-[11px] font-semibold rounded bg-brand-dark/50 hover:bg-brand-accent/20 cursor-pointer"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 pt-1 border-t border-brand-border">
                  <button type="button" onClick={() => onMover(si, pi, -1)} disabled={esPrimera} className="flex-1 flex justify-center p-1 rounded hover:bg-brand-dark/40 disabled:opacity-30 cursor-pointer" aria-label="Subir">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => onMover(si, pi, 1)} disabled={esUltima} className="flex-1 flex justify-center p-1 rounded hover:bg-brand-dark/40 disabled:opacity-30 cursor-pointer" aria-label="Bajar">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false)
                      onQuitar(si, pi)
                    }}
                    className="flex-1 flex justify-center p-1 rounded text-brand-error hover:bg-brand-error/10 cursor-pointer"
                    aria-label="Sacar de esta semana"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
      {persona.dias.map((valor, dia) => (
        <td key={dia} className={cn('p-0.5', claseColumna(findes[dia]))}>
          <input
            type="text"
            value={valor}
            onChange={(e) => onCelda(si, pi, dia, e.target.value)}
            onKeyDown={onTecla}
            onFocus={(e) => e.currentTarget.select()}
            data-fila={fila}
            data-col={dia}
            maxLength={40}
            aria-label={(persona.nombre || 'Persona') + ', ' + DIAS_CORTOS[dia]}
            className={cn(
              'w-full min-w-[78px] px-1.5 py-1.5 rounded text-center text-[11px] border border-transparent focus:border-brand-accent focus:outline-none',
              claseCelda(valor, dia, findes[dia])
            )}
          />
        </td>
      ))}
    </tr>
  )
})

// ---------- Indicador de guardado ----------

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  switch (estado.tipo) {
    case 'al_dia':
      return <span className="text-xs text-brand-muted">Sin cambios</span>
    case 'pendiente':
      return <span className="text-xs text-amber-700">Cambios sin guardar…</span>
    case 'guardando':
      return (
        <span className="flex items-center gap-1.5 text-xs text-brand-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Guardando…
        </span>
      )
    case 'guardado':
      return (
        <span className="flex items-center gap-1.5 text-xs text-brand-success">
          <Check className="w-3.5 h-3.5" />
          Guardado {estado.hora}
        </span>
      )
    case 'error':
      return (
        <span className="flex items-center gap-1.5 text-xs text-brand-error">
          <AlertCircle className="w-3.5 h-3.5" />
          {estado.mensaje}
        </span>
      )
    case 'conflicto':
      return (
        <span className="flex items-center gap-1.5 text-xs text-brand-error font-semibold">
          <AlertCircle className="w-3.5 h-3.5" />
          No se guardó
        </span>
      )
  }
}
