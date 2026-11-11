'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ChevronDown, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GRUPOS, type Grupo } from '@/lib/propinas'
import { seccionDe, type FilaGrupo, type GrupoGuardado, type Seccion } from '@/lib/propinas-grupos'
import { guardarGrupoPropinaAction } from '@/app/actions/propinas'
import EnPantalla from '@/components/navegacion/EnPantalla'

const porcentaje = (g: Grupo) => GRUPOS.find((x) => x.valor === g)?.corta ?? ''
const personas = (n: number) => (n === 0 ? 'Nadie' : n === 1 ? '1 persona' : `${n} personas`)
const titulo = 'text-[11px] font-semibold uppercase tracking-[0.14em]'

/**
 * El porcentaje de cada mozo, separado como en la carga del día (al 100, 75,
 * 50 y 25 %). Se toca un nombre y se elige: se guarda solo. Arriba, los mozos
 * que todavía no tienen (en la propina van al 100 %). Quien tiene nivel en
 * Progresión cobra según su nivel, y se cambia desde su ficha.
 */
export default function PorcentajeMozos({ filas: iniciales }: { filas: FilaGrupo[] }) {
  const [filas, setFilas] = useState(iniciales)
  const [abiertaId, setAbiertaId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [verOtros, setVerOtros] = useState(false)

  const de = (s: Seccion) => filas.filter((f) => seccionDe(f) === s)
  const sinDefinir = de('sin')
  const noSonMozos = de('afuera')
  // Primero los runners (los más probables), cada grupo en orden alfabético.
  const otros = de('otros').sort((a, b) => (a.tipo === 'runner' ? 0 : 1) - (b.tipo === 'runner' ? 0 : 1))
  const abierta = filas.find((f) => f.id === abiertaId) ?? null

  async function poner(ids: string[], grupo: GrupoGuardado) {
    setAbiertaId(null)
    const cambian = filas.filter((f) => ids.includes(f.id) && f.grupo !== grupo)
    if (cambian.length === 0) return
    const antes = new Map(cambian.map((f) => [f.id, f.grupo]))
    const cuales = cambian.map((f) => f.id)
    setError(null)
    setFilas((prev) => prev.map((f) => (antes.has(f.id) ? { ...f, grupo } : f)))
    setGuardando((prev) => new Set(Array.from(prev).concat(cuales)))
    const r = await guardarGrupoPropinaAction(cuales, grupo)
    setGuardando((prev) => new Set(Array.from(prev).filter((id) => !antes.has(id))))
    if (!r.ok) {
      setFilas((prev) => prev.map((f) => (antes.has(f.id) ? { ...f, grupo: antes.get(f.id) ?? null } : f)))
      setError(r.error)
    }
  }

  const nombres = (lista: FilaGrupo[]) => (
    <ul className="flex flex-wrap gap-1.5">
      {lista.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setAbiertaId(f.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-border bg-brand-card text-[13px] font-medium text-brand-text hover:border-brand-accent cursor-pointer min-h-[36px]"
          >
            {f.nombre}
            {f.nivel && (
              <span className="text-[10px] font-bold text-brand-accent" title={`Nivel ${f.nivel.nivel} en Progresión`}>
                N{f.nivel.nivel}
              </span>
            )}
            {guardando.has(f.id) && <Loader2 className="w-3 h-3 animate-spin text-brand-muted" />}
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-1.5 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {sinDefinir.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div>
            <h2 className={cn(titulo, 'text-amber-800')}>Sin definir · {sinDefinir.length}</h2>
            <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
              Mozos sin porcentaje: en la propina van al 100 % hasta que les pongas uno.
            </p>
          </div>
          {nombres(sinDefinir)}
          <button
            type="button"
            onClick={() => poner(sinDefinir.map((f) => f.id), 'camarero')}
            className="w-full min-h-[40px] rounded-xl border border-amber-300 bg-white text-xs font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
          >
            {sinDefinir.length === 1 ? 'Ponerlo al 100 %' : `Poner a los ${sinDefinir.length} al 100 %`}
          </button>
        </section>
      )}

      <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
        {GRUPOS.map((g, i) => {
          const delGrupo = de(g.valor)
          return (
            <div key={g.valor} className={cn(i > 0 && 'border-t border-brand-border/70')}>
              <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2 bg-brand-card-hover/50">
                <h2 className={cn(titulo, 'text-brand-accent')}>Al {g.corta}</h2>
                <span className="text-[11px] text-brand-muted tabular-nums">{personas(delGrupo.length)}</span>
              </div>
              {delGrupo.length > 0 && <div className="px-4 py-3">{nombres(delGrupo)}</div>}
            </div>
          )
        })}
      </section>

      {noSonMozos.length > 0 && (
        <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-2">
          <h2 className={cn(titulo, 'text-brand-muted')}>No son mozos · {noSonMozos.length}</h2>
          <p className="text-xs text-brand-muted leading-relaxed">
            &ldquo;Traer horas del reloj&rdquo; no los suma a la propina de los mozos.
          </p>
          {nombres(noSonMozos)}
        </section>
      )}

      {otros.length > 0 && (
        <section className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
          <button
            type="button"
            aria-expanded={verOtros}
            onClick={() => setVerOtros((v) => !v)}
            className="flex items-center justify-between gap-3 w-full px-4 py-3 text-left cursor-pointer min-h-[52px]"
          >
            <span>
              <span className={cn(titulo, 'block text-brand-muted')}>Runners y resto del personal · {otros.length}</span>
              <span className="block text-xs text-brand-muted mt-0.5">Por si alguno cobra la propina de los mozos.</span>
            </span>
            <ChevronDown className={cn('w-4 h-4 text-brand-muted flex-shrink-0 transition-transform', verOtros && 'rotate-180')} />
          </button>
          {verOtros && <div className="px-4 pb-4">{nombres(otros)}</div>}
        </section>
      )}

      <p className="text-[11px] text-brand-muted leading-relaxed">
        Tocá un nombre para cambiarle el porcentaje: se guarda solo. Los mozos salen de Horarios (Camareros) o, si no
        están, del cargo de la planilla. Quien tiene nivel en Progresión (N1, N2, N3) cobra según su nivel.
      </p>

      {abierta && (
        <ElegirPorcentaje fila={abierta} onElegir={(g) => poner([abierta.id], g)} onCerrar={() => setAbiertaId(null)} />
      )}
    </div>
  )
}

/** La ventana para elegir el porcentaje de alguien: botones grandes, un toque. */
function ElegirPorcentaje({
  fila,
  onElegir,
  onCerrar,
}: {
  fila: FilaGrupo
  onElegir: (g: GrupoGuardado) => void
  onCerrar: () => void
}) {
  // Al abrir, el foco va a la ventana (así el lector de pantalla la anuncia); Esc la cierra.
  const panel = useRef<HTMLDivElement>(null)
  const cerrar = useRef(onCerrar)
  cerrar.current = onCerrar
  useEffect(() => {
    panel.current?.focus()
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar.current()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [])

  return (
    <EnPantalla>
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="porcentaje-de"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div ref={panel} tabIndex={-1} className="w-full max-w-sm bg-brand-card rounded-2xl shadow-xl p-5 space-y-4 outline-none">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 id="porcentaje-de" className="text-base font-bold text-brand-text truncate">
              {fila.nombre}
            </h2>
            <p className="text-xs text-brand-muted truncate">{fila.detalle || 'Sin sector en Horarios'}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-brand-muted hover:bg-brand-card-hover cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {fila.nivel ? (
          <>
            <p className="text-sm text-brand-text leading-relaxed">
              Tiene nivel {fila.nivel.nivel} en Progresión: cobra al {porcentaje(fila.nivel.grupo)}.
            </p>
            <p className="text-xs text-brand-muted leading-relaxed">
              El porcentaje sale de su nivel. Para cambiarlo, cambiale el nivel desde su ficha.
            </p>
            <Link
              href={'/admin/progresion/' + fila.nivel.userId}
              className="flex items-center justify-center w-full min-h-[44px] rounded-xl border border-brand-accent/50 text-sm font-semibold text-brand-accent hover:bg-brand-accent/5"
            >
              Abrir su ficha
            </Link>
          </>
        ) : (
          <>
            <p className={cn(titulo, 'text-brand-muted')}>¿A cuánto cobra la hora?</p>
            <div className="grid grid-cols-2 gap-2">
              {GRUPOS.map((g) => {
                const elegido = fila.grupo === g.valor
                return (
                  <button
                    key={g.valor}
                    type="button"
                    aria-pressed={elegido}
                    onClick={() => onElegir(g.valor)}
                    className={cn(
                      'min-h-[56px] rounded-xl border text-lg font-semibold tabular-nums cursor-pointer',
                      elegido
                        ? 'bg-brand-accent text-white border-brand-accent'
                        : 'bg-brand-card text-brand-text border-brand-border hover:border-brand-accent'
                    )}
                  >
                    {g.corta}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              aria-pressed={fila.grupo === 'afuera'}
              onClick={() => onElegir('afuera')}
              className={cn(
                'w-full min-h-[44px] rounded-xl border text-sm font-semibold cursor-pointer',
                fila.grupo === 'afuera'
                  ? 'bg-brand-text text-white border-brand-text'
                  : 'bg-brand-card text-brand-muted border-brand-border hover:border-brand-text hover:text-brand-text'
              )}
            >
              No es mozo
            </button>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Si no es mozo, &ldquo;Traer horas del reloj&rdquo; no lo suma solo. Si la cajera lo agrega a mano, entra
              igual.
            </p>
          </>
        )}
      </div>
    </div>
    </EnPantalla>
  )
}
