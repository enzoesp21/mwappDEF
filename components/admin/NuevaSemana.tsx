'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Loader2, AlertCircle } from 'lucide-react'
import { crearSemanaAction } from '@/app/actions/horarios'
import { etiquetaSemana, lunesDe } from '@/lib/horarios'

interface Props {
  /** El lunes que se propone por defecto: el de la semana que viene. */
  lunesSugerido: string
  hayAnterior: boolean
}

export default function NuevaSemana({ lunesSugerido, hayAnterior }: Props) {
  const router = useRouter()
  const [fecha, setFecha] = useState(lunesSugerido)
  const [copiar, setCopiar] = useState(hayAnterior)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lunes = fecha ? lunesDe(fecha) : ''

  async function crear() {
    if (!fecha) return
    setCreando(true)
    setError(null)
    const res = await crearSemanaAction(fecha, copiar)
    if (res.ok && res.value) {
      router.push('/admin/horarios/' + res.value)
    } else {
      setCreando(false)
      setError(res.ok ? 'No se pudo crear.' : res.error)
    }
  }

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarPlus className="w-4 h-4 text-brand-accent" />
        <h2 className="text-sm font-semibold text-brand-text">Armar una semana nueva</h2>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <label className="space-y-1">
          <span className="block text-xs text-brand-muted">Cualquier día de la semana</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 py-2 text-sm bg-brand-dark/40 border border-brand-border rounded-lg text-brand-text focus:outline-none focus:border-brand-accent"
          />
        </label>
        {lunes && (
          <p className="text-sm text-brand-text pb-2">
            Semana del <strong>{etiquetaSemana(lunes)}</strong>
          </p>
        )}
      </div>

      {hayAnterior && (
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={copiar}
            onChange={(e) => setCopiar(e.target.checked)}
            className="mt-0.5 accent-brand-accent"
          />
          <span className="text-xs text-brand-text leading-relaxed">
            Arrancar desde la semana anterior
            <span className="block text-brand-muted">
              Copia sectores, personas y horarios. Después cambiás solo lo que cambia.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-brand-error">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={crear}
        disabled={creando || !fecha}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent-hover transition-colors cursor-pointer min-h-[40px] disabled:opacity-50"
      >
        {creando && <Loader2 className="w-4 h-4 animate-spin" />}
        Crear borrador
      </button>
    </div>
  )
}
