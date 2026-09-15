'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, Plus, X, Check, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveGuidePathAction } from '@/app/actions/guide-paths'

export interface GuideOption {
  id: string
  title: string
  description: string | null
}

interface Paso {
  guide_id: string
  etiqueta: string
}

interface Props {
  puesto: string
  puestoNombre: string
  guias: GuideOption[]
  inicial: Paso[]
}

export default function PathEditor({ puesto, puestoNombre, guias, inicial }: Props) {
  const router = useRouter()
  const [pasos, setPasos] = useState<Paso[]>(inicial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const porId = new Map(guias.map((g) => [g.id, g]))
  const usadas = new Set(pasos.map((p) => p.guide_id))
  const disponibles = guias.filter((g) => !usadas.has(g.id))

  const sucio = JSON.stringify(pasos) !== JSON.stringify(inicial)

  function tocar(nuevos: Paso[]) {
    setPasos(nuevos)
    setSaved(false)
    setError(null)
  }

  function agregar(id: string) {
    tocar([...pasos, { guide_id: id, etiqueta: 'Guía ' + (pasos.length + 1) }])
  }

  function quitar(i: number) {
    tocar(pasos.filter((_, j) => j !== i))
  }

  function mover(i: number, delta: number) {
    const j = i + delta
    if (j < 0 || j >= pasos.length) return
    const copia = [...pasos]
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
    tocar(copia)
  }

  function renombrar(i: number, etiqueta: string) {
    tocar(pasos.map((p, j) => (j === i ? { ...p, etiqueta } : p)))
  }

  async function guardar() {
    setSaving(true)
    setError(null)
    const res = await saveGuidePathAction(puesto, pasos)
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      setError(res.error ?? 'No se pudo guardar')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-brand-text mb-1">
          Qué ve {puestoNombre}, y en qué orden
        </h2>
        <p className="text-xs text-brand-muted leading-relaxed">
          Solo estas guías le aparecen a la gente de este puesto. La etiqueta es el texto que ven
          arriba de cada una.
        </p>
      </div>

      {pasos.length === 0 ? (
        <div className="border border-dashed border-brand-border rounded-xl p-6 text-center">
          <p className="text-sm text-brand-muted">
            Este puesto no tiene ninguna guía asignada todavía.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {pasos.map((paso, i) => {
            const g = porId.get(paso.guide_id)
            return (
              <li
                key={paso.guide_id}
                className="bg-brand-card border border-brand-border rounded-xl p-3 flex items-start gap-3"
              >
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => mover(i, -1)}
                    disabled={i === 0}
                    aria-label="Subir"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:bg-brand-card-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(i, 1)}
                    disabled={i === pasos.length - 1}
                    aria-label="Bajar"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:bg-brand-card-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm font-medium text-brand-text leading-tight break-words">
                    {g?.title ?? 'Guía que ya no existe'}
                  </p>
                  <input
                    type="text"
                    value={paso.etiqueta}
                    onChange={(e) => renombrar(i, e.target.value)}
                    placeholder={'Guía ' + (i + 1)}
                    aria-label="Etiqueta"
                    className="w-full max-w-[200px] px-2.5 py-1.5 text-xs bg-brand-dark/40 border border-brand-border rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => quitar(i)}
                  aria-label="Quitar del recorrido"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-brand-muted hover:text-brand-error hover:bg-brand-error/10 flex-shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            )
          })}
        </ol>
      )}

      {disponibles.length > 0 && (
        <div>
          <p className="text-xs font-medium text-brand-muted uppercase tracking-wider mb-2">
            Agregar al recorrido
          </p>
          <div className="flex flex-wrap gap-2">
            {disponibles.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => agregar(g.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border bg-brand-card text-xs font-medium text-brand-text hover:border-brand-accent hover:text-brand-accent transition-colors cursor-pointer text-left max-w-full"
              >
                <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{g.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-brand-error">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={guardar}
          disabled={saving || !sucio}
          className={cn(
            'flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors min-h-[44px]',
            saving || !sucio
              ? 'bg-brand-border text-brand-muted cursor-not-allowed'
              : 'bg-brand-accent text-white hover:bg-brand-accent-hover cursor-pointer'
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Guardar
        </button>

        {saved && !sucio && (
          <span className="text-xs text-brand-success font-medium">Guardado</span>
        )}
        {sucio && <span className="text-xs text-amber-700 font-medium">Sin guardar</span>}
      </div>
    </div>
  )
}
