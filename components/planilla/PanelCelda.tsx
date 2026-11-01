'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, Fingerprint, Loader2, NotebookPen, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { duracion, hhmm, textoFalta, textoHabitual, textoSegunHorario, type Sugerencia } from '@/lib/planilla'
import {
  CODIGOS,
  MESES,
  NOMBRES_DIA,
  diaDeSemana,
  fechaDelDia,
  textoHoras,
  type CeldaPlanilla,
  type CodigoCelda,
  type FilaPlanilla,
} from '@/lib/planilla-vista'
import {
  aplicarSugerenciaAction,
  editarCeldaAction,
  fichadasDelDiaAction,
  type CambioCelda,
  type FichadaDelDia,
} from '@/app/actions/planilla'

interface Props {
  fila: FilaPlanilla
  dia: number
  /** "2026-10" */
  mes: string
  cerrado: boolean
  onCerrar: (resultado?: { ok: boolean; texto: string }) => void
}

type Respuesta = { ok: true; mensaje: string } | { ok: false; error: string }

const NOMBRE_CODIGO: Record<CodigoCelda, string> = {
  VAC: 'Vacaciones',
  CERT: 'Certificado',
  LIC: 'Licencia',
  FRANCO: 'Franco',
  'NO VINO': 'No vino',
}

const ORIGEN: Record<CeldaPlanilla['origen'], string> = {
  reloj: 'Del reloj',
  papel: 'Con fichadas de papel',
  manual: 'Cargado a mano',
  codigo: 'Código cargado a mano',
}

/** El detalle de un día de alguien: sus fichadas, lo que falta y cómo corregirlo. */
export default function PanelCelda({ fila, dia, mes, cerrado, onCerrar }: Props) {
  const router = useRouter()
  const celda = fila.celdas[dia] as CeldaPlanilla | undefined
  const fecha = fechaDelDia(mes, dia)
  const semana = NOMBRES_DIA[diaDeSemana(mes, dia)]
  const titulo = `${semana.charAt(0)}${semana.slice(1).toLowerCase()} ${dia} de ${MESES[Number(mes.slice(5)) - 1].toLowerCase()}`

  const [fichadas, setFichadas] = useState<FichadaDelDia[] | null>(null)
  const [errorFichadas, setErrorFichadas] = useState<string | null>(null)
  const [horas, setHoras] = useState(celda?.horas != null && !celda.codigo ? textoHoras(celda.horas) : '')
  const [nota, setNota] = useState(celda?.nota ?? '')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    fichadasDelDiaAction(fila.empleadoId, fecha).then((r) => {
      if (!vigente) return
      if (r.ok) setFichadas(r.fichadas)
      else setErrorFichadas(r.error)
    })
    return () => {
      vigente = false
    }
  }, [fila.empleadoId, fecha])

  useEffect(() => {
    const alApretar = (e: KeyboardEvent) => e.key === 'Escape' && !ocupado && onCerrar()
    window.addEventListener('keydown', alApretar)
    return () => window.removeEventListener('keydown', alApretar)
  }, [ocupado, onCerrar])

  async function correr(clave: string, accion: () => Promise<Respuesta>) {
    setOcupado(clave)
    setError(null)
    const r = await accion()
    setOcupado(null)
    if (!r.ok) {
      setError(r.error)
      return
    }
    router.refresh()
    onCerrar({ ok: true, texto: `${fila.nombre}, ${dia}/${mes.slice(5)}: ${r.mensaje}` })
  }

  const editar = (clave: string, cambio: CambioCelda) =>
    correr(clave, () => editarCeldaAction(`${mes}-01`, fila.empleadoId, dia, cambio))

  function guardarHoras() {
    const valor = Number(horas.trim().replace(',', '.'))
    if (horas.trim() === '' || !Number.isFinite(valor)) {
      setError('Escribí las horas, por ejemplo 8 o 8,5.')
      return
    }
    editar('horas', { tipo: 'horas', horas: valor, nota })
  }

  const sugerencia: Sugerencia | null = celda?.sugerencia
    ? {
        falta: celda.sugerencia.falta,
        fichada: celda.sugerencia.fichada,
        habitual: celda.sugerencia.habitual,
        segunHorario: celda.sugerencia.segun_horario,
      }
    : null
  const avisos = (celda?.avisos ?? []).filter((a) => a.tipo !== 'sin-fichadas' && a.tipo !== 'en-curso')
  const adentro = celda?.avisos?.find((a) => a.tipo === 'en-curso')
  const sinFichadas = celda?.avisos?.find((a) => a.tipo === 'sin-fichadas')
  const tocadaAMano = celda && (celda.bloqueada || celda.origen === 'manual' || celda.origen === 'codigo')

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${fila.nombre}, ${titulo}`}
      onClick={(e) => e.target === e.currentTarget && !ocupado && onCerrar()}
    >
      <div className="w-full sm:max-w-md bg-brand-card rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[88vh] overflow-y-auto overscroll-contain">
        {/* Encabezado */}
        <div className="sticky top-0 bg-brand-card border-b border-brand-border/70 px-4 py-3 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted">{titulo}</p>
            <h2 className="text-base font-semibold text-brand-text truncate">{fila.nombre}</h2>
            {fila.cargo && <p className="text-xs text-brand-muted truncate">{fila.cargo}</p>}
          </div>
          <button
            type="button"
            onClick={() => onCerrar()}
            disabled={ocupado !== null}
            aria-label="Cerrar"
            className="p-2 -mr-1 rounded-lg text-brand-muted hover:bg-brand-card-hover cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Cómo quedó el día */}
          <section className="flex items-center gap-3">
            {celda?.codigo ? (
              <span
                className={cn(
                  'px-3 py-1.5 rounded-xl text-lg font-bold',
                  celda.codigo === 'VAC' ? 'bg-yellow-200 text-yellow-900' : 'bg-brand-dark/45 text-brand-text'
                )}
              >
                {NOMBRE_CODIGO[celda.codigo]}
              </span>
            ) : celda?.estado === 'incompleto' ? (
              <span className="px-3 py-1.5 rounded-xl text-lg font-bold bg-[#FFC7CE] text-red-800">Incompleta</span>
            ) : celda?.horas != null ? (
              <span className="text-3xl font-semibold text-brand-accent tabular-nums">
                {textoHoras(celda.horas)} <span className="text-lg">h</span>
              </span>
            ) : adentro ? (
              <span className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-brand-success/10 text-brand-success">{adentro.texto}</span>
            ) : sinFichadas ? (
              <span className="text-sm text-brand-muted">Sin fichadas</span>
            ) : (
              <span className="text-sm text-brand-muted">Sin datos ese día</span>
            )}
            <div className="text-xs text-brand-muted leading-snug">
              {celda?.minutos != null && celda.horas != null && <p>{duracion(celda.minutos)} reales</p>}
              {celda && <p>{ORIGEN[celda.origen]}</p>}
              {celda?.estado === 'revisar' && <p className="text-amber-800 font-semibold">Más de 17 h: revisar</p>}
            </div>
          </section>

          {/* Horario y tramos */}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-brand-muted">Horario</dt>
            <dd className="text-brand-text">{celda?.horario ?? 'Sin horario publicado ese día'}</dd>
            {celda?.tramos && celda.tramos.length > 0 && (
              <>
                <dt className="text-brand-muted">{celda.tramos.length > 1 ? 'Tramos' : 'Contó'}</dt>
                <dd className="text-brand-text tabular-nums">
                  {celda.tramos.map((t) => `${hhmm(t.desde)} a ${hhmm(t.hasta)}`).join(' y ')}
                </dd>
              </>
            )}
            {celda?.nota && (
              <>
                <dt className="text-brand-muted">Nota</dt>
                <dd className="text-brand-text">{celda.nota}</dd>
              </>
            )}
          </dl>

          {/* Fichadas crudas */}
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted mb-1.5 flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5" /> Fichadas de ese día
            </h3>
            {errorFichadas ? (
              <p className="text-xs text-brand-error">{errorFichadas}</p>
            ) : fichadas === null ? (
              <p className="text-xs text-brand-muted flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…
              </p>
            ) : fichadas.length === 0 ? (
              <p className="text-xs text-brand-muted">No fichó en esa jornada.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {fichadas.map((f, i) => (
                  <li
                    key={i}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-sm tabular-nums',
                      f.fuente === 'reloj' ? 'border-brand-border bg-brand-card' : 'border-sky-300 bg-sky-50'
                    )}
                  >
                    <span className="font-semibold text-brand-text">{f.hora}</span>
                    <span className="block text-[10px] text-brand-muted leading-tight">
                      {f.fuente === 'reloj' ? `reloj ${f.numero}${f.tecla ? ` · tecla ${f.tecla}` : ''}` : f.fuente}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {fichadas && fichadas.length > 0 && (
              <p className="text-[11px] text-brand-muted mt-1.5">
                La tecla que apretaron no se usa: entrada o salida sale del orden.
              </p>
            )}
          </section>

          {/* Avisos */}
          {(avisos.length > 0 || sinFichadas) && (
            <ul className="space-y-1">
              {sinFichadas && <li className="text-xs text-brand-muted">{sinFichadas.texto}</li>}
              {avisos.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                  {a.texto}
                </li>
              ))}
            </ul>
          )}

          {/* Sugerencias */}
          {!cerrado && celda?.estado === 'incompleto' && sugerencia && (
            <section className="rounded-xl border border-red-200 bg-red-50/60 p-3 space-y-2">
              <p className="text-sm text-red-800 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{textoFalta(sugerencia)}</span>
              </p>
              <div className="grid gap-2">
                {(['habitual', 'segunHorario'] as const).map((cual) => {
                  const texto = cual === 'habitual' ? textoHabitual(sugerencia) : textoSegunHorario(sugerencia)
                  if (!texto) return null
                  return (
                    <button
                      key={cual}
                      type="button"
                      onClick={() => correr(cual, () => aplicarSugerenciaAction(`${mes}-01`, fila.empleadoId, dia, cual))}
                      disabled={ocupado !== null}
                      className="flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-xl border border-brand-accent/40 bg-brand-card text-left text-sm font-semibold text-brand-accent hover:bg-brand-accent/5 cursor-pointer disabled:opacity-60 min-h-[44px]"
                    >
                      <span>
                        {texto}
                        <span className="block text-[11px] font-normal text-brand-muted">
                          {cual === 'habitual' ? 'Lo de siempre en los últimos 30 días' : 'Lo que dice el horario publicado'}
                        </span>
                      </span>
                      {ocupado === cual ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> : <span className="text-xs">Usar</span>}
                    </button>
                  )
                })}
                {!textoHabitual(sugerencia) && !textoSegunHorario(sugerencia) && (
                  <p className="text-xs text-brand-muted">No hay sugerencia para este día: cargá las horas a mano acá abajo.</p>
                )}
              </div>
            </section>
          )}

          {/* Corregir a mano */}
          {cerrado ? (
            <p className="text-xs text-brand-muted">El mes está cerrado: para cambiar algo hay que reabrirlo.</p>
          ) : (
            <section className="space-y-3 border-t border-brand-border/70 pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-muted flex items-center gap-1.5">
                <NotebookPen className="w-3.5 h-3.5" /> Corregir a mano
              </h3>
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="sr-only">Horas</span>
                  <input
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                    inputMode="decimal"
                    placeholder="Horas, ej. 8,5"
                    className="w-full h-11 px-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
                  />
                </label>
                <button
                  type="button"
                  onClick={guardarHoras}
                  disabled={ocupado !== null}
                  className="px-4 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer disabled:opacity-60 min-h-[44px] flex items-center gap-1.5"
                >
                  {ocupado === 'horas' && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {CODIGOS.map((codigo) => (
                  <button
                    key={codigo}
                    type="button"
                    aria-pressed={celda?.codigo === codigo}
                    onClick={() => editar(codigo, { tipo: 'codigo', codigo, nota })}
                    disabled={ocupado !== null}
                    className={cn(
                      'px-2 py-2 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-60 min-h-[40px] flex items-center justify-center gap-1',
                      celda?.codigo === codigo
                        ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                        : codigo === 'VAC'
                          ? 'border-yellow-300 bg-yellow-50 text-yellow-900 hover:bg-yellow-100'
                          : 'border-brand-border text-brand-text hover:border-brand-accent'
                    )}
                  >
                    {ocupado === codigo && <Loader2 className="w-3 h-3 animate-spin" />}
                    {NOMBRE_CODIGO[codigo]}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="text-xs text-brand-muted">Nota (se guarda con las horas o el código)</span>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={2}
                  maxLength={300}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {celda && (
                  <button
                    type="button"
                    onClick={() => editar('nota', { tipo: 'nota', nota })}
                    disabled={ocupado !== null}
                    className="px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-60 min-h-[40px] flex items-center gap-1"
                  >
                    {ocupado === 'nota' && <Loader2 className="w-3 h-3 animate-spin" />}
                    Guardar solo la nota
                  </button>
                )}
                {tocadaAMano && (
                  <button
                    type="button"
                    onClick={() => editar('reloj', { tipo: 'reloj' })}
                    disabled={ocupado !== null}
                    className="px-3 py-2 rounded-xl border border-brand-border text-xs font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-60 min-h-[40px] flex items-center gap-1"
                  >
                    {ocupado === 'reloj' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Volver a lo que dice el reloj
                  </button>
                )}
              </div>
              <p className="text-[11px] text-brand-muted">
                Lo que cargues a mano queda fijo: el proceso automático ya no lo cambia.
              </p>
            </section>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-brand-error">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
