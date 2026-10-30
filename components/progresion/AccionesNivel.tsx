'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowDown, ArrowUp, CalendarCheck, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NIVELES, REVISAR_CADA_DIAS, datosNivel, type EstadoProgresion } from '@/lib/progresion'
import { cambiarNivelAction, marcarRevisadoAction } from '@/app/actions/progresion'

interface Props {
  userId: string
  nombre: string
  estado: EstadoProgresion
}

/** Asignar el nivel, subir, bajar y dejar asentada la revisión. */
export default function AccionesNivel({ userId, nombre, estado }: Props) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inicial, setInicial] = useState(1)

  const nivel = estado.nivel
  const anterior = nivel ? datosNivel(nivel - 1) : undefined
  const siguiente = nivel ? datosNivel(nivel + 1) : undefined

  async function correr(id: string, accion: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setOcupado(id)
    setError(null)
    const res = await accion()
    setOcupado(null)
    if (!res.ok) return setError(res.error)
    router.refresh()
  }

  function asignar() {
    const n = datosNivel(inicial)!
    if (!confirm(`¿Poner a ${nombre} en el nivel ${n.nivel} (${n.porcentaje} %)? Desde hoy cuenta su tiempo en el nivel.`)) return
    correr('asignar', () => cambiarNivelAction(userId, inicial, 'Nivel inicial'))
  }

  function subir() {
    if (!siguiente) return
    const aviso = estado.puedeSubir
      ? `¿Pasar a ${nombre} al nivel ${siguiente.nivel} (${siguiente.porcentaje} %)?`
      : `A ${nombre} todavía le ${estado.faltan.length === 1 ? 'falta 1 requisito' : `faltan ${estado.faltan.length} requisitos`} del nivel ${siguiente.nivel}. ¿Subirlo igual?`
    if (!confirm(aviso)) return
    const motivo = estado.puedeSubir ? 'Cumplió los requisitos' : prompt('¿Por qué lo subís sin que cumpla todo?') ?? ''
    if (!estado.puedeSubir && !motivo.trim()) return
    correr('subir', () => cambiarNivelAction(userId, siguiente.nivel, motivo))
  }

  function bajar() {
    if (!anterior) return
    const motivo = prompt(
      `¿Por qué baja ${nombre} al nivel ${anterior.nivel} (${anterior.porcentaje} %)? Se borran las tildes del nivel que pierde y su tiempo vuelve a contar desde hoy.`
    )
    if (!motivo?.trim()) return
    correr('bajar', () => cambiarNivelAction(userId, anterior.nivel, motivo))
  }

  const tocaRevisar = estado.diasSinRevisar === null || estado.diasSinRevisar >= REVISAR_CADA_DIAS

  return (
    <section className="bg-brand-card border border-brand-border rounded-2xl p-4 space-y-3">
      {nivel === null ? (
        <>
          <p className="text-sm text-brand-text">
            Todavía no tiene un nivel. Elegí <strong>en cuál está hoy</strong>: desde ahí la app va mostrando qué le
            falta para subir.
          </p>
          <div className="flex gap-2 flex-wrap">
            {NIVELES.map((n) => (
              <button
                key={n.nivel}
                type="button"
                onClick={() => setInicial(n.nivel)}
                aria-pressed={inicial === n.nivel}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-semibold border cursor-pointer min-h-[44px]',
                  inicial === n.nivel
                    ? 'bg-brand-accent border-brand-accent text-white'
                    : 'bg-brand-card border-brand-border text-brand-text hover:border-brand-accent'
                )}
              >
                Nivel {n.nivel} · {n.porcentaje} %
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={asignar}
            disabled={ocupado !== null}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-accent text-white text-sm font-bold hover:bg-brand-accent-hover cursor-pointer min-h-[48px] disabled:opacity-60"
          >
            {ocupado === 'asignar' && <Loader2 className="w-4 h-4 animate-spin" />}
            Asignar nivel {inicial}
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs text-brand-muted">
            <CalendarCheck className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">
              {estado.diasSinRevisar === null
                ? 'Nunca se revisó.'
                : estado.diasSinRevisar === 0
                  ? 'Revisado hoy.'
                  : `Última revisión hace ${estado.diasSinRevisar} ${estado.diasSinRevisar === 1 ? 'día' : 'días'}.`}
              {tocaRevisar && <strong className="text-amber-700"> Toca revisar.</strong>}
            </span>
            <button
              type="button"
              onClick={() => correr('revisado', () => marcarRevisadoAction(userId))}
              disabled={ocupado !== null}
              className="px-2.5 py-1.5 rounded-lg border border-brand-border text-[11px] font-semibold text-brand-text hover:border-brand-accent cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {ocupado === 'revisado' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Revisado hoy'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {siguiente ? (
              <button
                type="button"
                onClick={subir}
                disabled={ocupado !== null}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold cursor-pointer min-h-[48px] disabled:opacity-60',
                  estado.puedeSubir
                    ? 'bg-brand-success text-white hover:brightness-95'
                    : 'bg-brand-card border border-brand-border text-brand-text hover:border-brand-accent'
                )}
              >
                {ocupado === 'subir' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                Subir al {siguiente.porcentaje} %
              </button>
            ) : (
              <p className="flex items-center justify-center text-xs text-brand-success font-semibold">Nivel más alto</p>
            )}
            {anterior ? (
              <button
                type="button"
                onClick={bajar}
                disabled={ocupado !== null}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold border border-brand-border text-brand-muted hover:text-brand-error hover:border-brand-error/50 cursor-pointer min-h-[48px] disabled:opacity-60"
              >
                {ocupado === 'bajar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
                Bajar al {anterior.porcentaje} %
              </button>
            ) : (
              <span />
            )}
          </div>
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-brand-error bg-brand-error/10 border border-brand-error/30 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}
