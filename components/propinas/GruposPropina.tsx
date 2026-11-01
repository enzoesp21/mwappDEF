'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizarNombre } from '@/lib/horarios'
import { GRUPOS, type Grupo } from '@/lib/propinas'
import { grupoEfectivo, type FilaGrupo } from '@/lib/propinas-grupos'
import { guardarGrupoPropinaAction } from '@/app/actions/propinas'

type Filtro = 'todos' | Grupo | 'sin'

const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'camarero', texto: 'Al 100 %' },
  { valor: 'reducido', texto: 'Al 75 %' },
  { valor: 'prueba', texto: 'Al 50 %' },
  { valor: 'sin', texto: 'Sin definir' },
]

const porcentaje = (g: Grupo) => GRUPOS.find((x) => x.valor === g)?.corta ?? ''

/**
 * Quién cobra la hora al 100, al 75 o al 50 %. Un toque y se guarda; tocar el
 * que ya está lo deja sin definir. Quien tiene nivel en Progresión cobra según
 * su nivel y se cambia desde su ficha.
 */
export default function GruposPropina({ filas: iniciales }: { filas: FilaGrupo[] }) {
  const [filas, setFilas] = useState(iniciales)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [verTodos, setVerTodos] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // El salón (mozos y runners) y quien ya tenga grupo; el resto, si se pide.
  const visibles = filas.filter((f) => verTodos || f.tipo !== null || f.grupo !== null || f.nivel !== null)
  const pasaFiltro = (f: FilaGrupo, cual: Filtro) =>
    cual === 'todos' ? true : cual === 'sin' ? grupoEfectivo(f) === null : grupoEfectivo(f) === cual
  const buscado = normalizarNombre(busqueda)
  const lista = visibles.filter(
    (f) => pasaFiltro(f, filtro) && (!buscado || normalizarNombre(f.nombre + ' ' + f.detalle).includes(buscado))
  )
  const sinDefinir = visibles.filter((f) => f.tipo !== null && grupoEfectivo(f) === null).length

  async function poner(f: FilaGrupo, grupo: Grupo | null) {
    const antes = f.grupo
    setError(null)
    setFilas((prev) => prev.map((x) => (x.id === f.id ? { ...x, grupo } : x)))
    setGuardando((prev) => new Set(prev).add(f.id))
    const r = await guardarGrupoPropinaAction(f.id, grupo)
    setGuardando((prev) => {
      const sigue = new Set(prev)
      sigue.delete(f.id)
      return sigue
    })
    if (!r.ok) {
      setFilas((prev) => prev.map((x) => (x.id === f.id ? { ...x, grupo: antes } : x)))
      setError(`${f.nombre}: ${r.error}`)
    }
  }

  return (
    <div className="space-y-3">
      {sinDefinir > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {sinDefinir === 1 ? 'Hay 1 persona del salón' : `Hay ${sinDefinir} personas del salón`} sin grupo: en la
          propina van al 100 % hasta que les pongas uno.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTROS.map((x) => {
          const cuantos = visibles.filter((f) => pasaFiltro(f, x.valor)).length
          return (
            <button
              key={x.valor}
              type="button"
              aria-pressed={filtro === x.valor}
              onClick={() => setFiltro(x.valor)}
              className={cn(
                'px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer min-h-[34px] tabular-nums',
                filtro === x.valor
                  ? 'bg-brand-accent text-white border-brand-accent'
                  : 'bg-brand-card text-brand-text border-brand-border hover:border-brand-accent'
              )}
            >
              {x.texto} · {cuantos}
            </button>
          )
        })}
      </div>

      <label className="relative block">
        <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o sector"
          aria-label="Buscar"
          className="w-full h-11 pl-9 pr-3 rounded-xl border border-brand-border bg-brand-card text-sm text-brand-text placeholder:text-brand-muted/70 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent"
        />
      </label>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {lista.length === 0 ? (
        <p className="text-sm text-brand-muted bg-brand-card border border-brand-border rounded-2xl px-4 py-6 text-center">
          No hay nadie con ese filtro.
        </p>
      ) : (
        <ul className="bg-brand-card border border-brand-border rounded-2xl divide-y divide-brand-border/70 overflow-hidden">
          {lista.map((f) => (
            <li key={f.id} className="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex-1 min-w-[8rem]">
                <p className="text-sm font-semibold text-brand-text truncate">{f.nombre}</p>
                <p className="text-[11px] text-brand-muted truncate">{f.detalle || 'Sin sector en Horarios'}</p>
              </div>
              {f.nivel ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="px-2.5 py-1.5 rounded-lg bg-brand-accent/10 text-brand-accent text-xs font-bold tabular-nums">
                    Al {porcentaje(f.nivel.grupo)}
                  </span>
                  <Link
                    href={'/admin/progresion/' + f.nivel.userId}
                    className="text-[11px] text-brand-muted underline underline-offset-2 hover:text-brand-accent"
                  >
                    Nivel {f.nivel.nivel} en Progresión
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {guardando.has(f.id) && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-muted" />}
                  <div
                    role="radiogroup"
                    aria-label={'Grupo de ' + f.nombre}
                    className="inline-flex rounded-lg border border-brand-border overflow-hidden"
                  >
                    {GRUPOS.map((g) => {
                      const elegido = f.grupo === g.valor
                      return (
                        <button
                          key={g.valor}
                          type="button"
                          role="radio"
                          aria-checked={elegido}
                          disabled={guardando.has(f.id)}
                          onClick={() => poner(f, elegido ? null : g.valor)}
                          className={cn(
                            'px-2 min-w-[3.25rem] min-h-[38px] text-xs font-semibold tabular-nums cursor-pointer border-l first:border-l-0 border-brand-border disabled:opacity-60',
                            elegido ? 'bg-brand-accent text-white' : 'bg-brand-card text-brand-text hover:bg-brand-accent/5'
                          )}
                        >
                          {g.corta}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setVerTodos((v) => !v)}
        className="text-xs font-semibold text-brand-accent underline underline-offset-2 cursor-pointer"
      >
        {verTodos ? 'Mostrar solo el salón' : 'Mostrar también al resto de los empleados'}
      </button>

      <p className="text-[11px] text-brand-muted leading-relaxed">
        Tocá el grupo de cada uno: se guarda solo. Si tocás el que ya tiene, queda sin definir. Los del salón salen de
        Horarios (Camareros y Comiss / Runners). Quien tiene nivel en Progresión cobra según su nivel: se cambia desde
        su ficha.
      </p>
    </div>
  )
}
