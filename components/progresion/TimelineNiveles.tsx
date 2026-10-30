'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Check,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Loader2,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EstadoNivel, EstadoProgresion, EstadoRequisito } from '@/lib/progresion'
import { marcarRequisitoAction } from '@/app/actions/progresion'

interface Props {
  estado: EstadoProgresion
  /** Solo los encargados tildan los requisitos manuales. */
  editable?: boolean
  userId?: string
}

const ICONO_TIPO = { manual: ClipboardCheck, examen: GraduationCap, tiempo: Clock }

const ETIQUETA_ESTADO: Record<EstadoNivel['estado'], string> = {
  logrado: 'Logrado',
  actual: 'Nivel actual',
  siguiente: 'Próximo',
  futuro: 'Más adelante',
}

/** Los tres niveles, uno debajo del otro, con lo que pide cada uno. */
export default function TimelineNiveles({ estado, editable = false, userId }: Props) {
  return (
    <ol className="relative space-y-3">
      {estado.niveles.map((n, i) => (
        <li key={n.nivel} className="relative pl-11">
          {/* Línea que une los niveles */}
          {i < estado.niveles.length - 1 && (
            <span
              className={cn(
                'absolute left-[17px] top-9 bottom-[-12px] w-0.5',
                n.estado === 'logrado' ? 'bg-brand-accent' : 'bg-brand-border'
              )}
              aria-hidden
            />
          )}
          <span
            className={cn(
              'absolute left-0 top-1 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2',
              n.estado === 'logrado' && 'bg-brand-accent border-brand-accent text-white',
              n.estado === 'actual' && 'bg-brand-card border-brand-accent text-brand-accent',
              n.estado === 'siguiente' && 'bg-brand-card border-amber-400 text-amber-700',
              n.estado === 'futuro' && 'bg-brand-card-hover border-brand-border text-brand-muted'
            )}
          >
            {n.estado === 'logrado' ? <Check className="w-4 h-4" /> : n.nivel}
          </span>
          <TarjetaNivel nivel={n} editable={editable} userId={userId} />
        </li>
      ))}
    </ol>
  )
}

function TarjetaNivel({ nivel: n, editable, userId }: { nivel: EstadoNivel; editable: boolean; userId?: string }) {
  // Los niveles ya logrados se muestran cerrados: lo que importa es lo que viene.
  const [abierto, setAbierto] = useState(n.estado !== 'logrado')
  const total = n.requisitos.length

  return (
    <section
      className={cn(
        'bg-brand-card border rounded-2xl overflow-hidden',
        n.estado === 'actual' ? 'border-brand-accent' : n.estado === 'siguiente' ? 'border-amber-300' : 'border-brand-border'
      )}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-brand-card-hover/60 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
            Nivel {n.nivel} · {ETIQUETA_ESTADO[n.estado]}
          </p>
          <p className="text-base font-bold text-brand-text">
            {n.nombre} <span className="text-brand-accent">· {n.porcentaje} %</span>
          </p>
        </div>
        <span
          className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
            n.cumplidos === total ? 'bg-brand-success/15 text-brand-success' : 'bg-brand-card-hover text-brand-muted'
          )}
        >
          {n.cumplidos}/{total}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-brand-muted transition-transform', abierto && 'rotate-180')} />
      </button>

      {abierto && (
        <ul className="border-t border-brand-border/70 divide-y divide-brand-border/50">
          {n.requisitos.map((r) => (
            <FilaRequisito key={r.clave} requisito={r} editable={editable && r.tipo === 'manual'} userId={userId} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FilaRequisito({ requisito: r, editable, userId }: { requisito: EstadoRequisito; editable: boolean; userId?: string }) {
  const router = useRouter()
  const [cumplido, setCumplido] = useState(r.cumplido)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Icono = ICONO_TIPO[r.tipo]

  async function alternar() {
    if (!userId || guardando) return
    const nuevo = !cumplido
    setGuardando(true)
    setError(null)
    setCumplido(nuevo)
    const res = await marcarRequisitoAction(userId, r.clave, nuevo)
    setGuardando(false)
    if (!res.ok) {
      setCumplido(!nuevo)
      setError(res.error)
      return
    }
    router.refresh()
  }

  const ayuda =
    r.tipo === 'examen'
      ? cumplido
        ? 'Examen aprobado'
        : r.nota ?? 'Se tilda solo al aprobar el examen'
      : r.tipo === 'tiempo'
        ? r.nota ?? (cumplido ? 'Cumplido' : 'Cuenta desde que llega al nivel anterior')
        : cumplido
          ? 'Lo marcó un encargado'
          : 'Lo evalúa un encargado'

  const marca = (
    <span
      className={cn(
        'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 border',
        cumplido ? 'bg-brand-accent border-brand-accent text-white' : 'bg-brand-card border-brand-border text-brand-muted'
      )}
    >
      {guardando ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : cumplido ? (
        <Check className="w-3.5 h-3.5" />
      ) : r.tipo === 'manual' ? null : r.tipo === 'tiempo' ? (
        <CircleDashed className="w-3.5 h-3.5" />
      ) : (
        <Lock className="w-3 h-3" />
      )}
    </span>
  )

  const contenido = (
    <>
      {marca}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', cumplido ? 'text-brand-text' : 'text-brand-text/90')}>{r.texto}</p>
        <p className="flex items-center gap-1 text-[11px] text-brand-muted mt-0.5">
          <Icono className="w-3 h-3 flex-shrink-0" />
          {ayuda}
        </p>
        {error && (
          <p className="flex items-start gap-1 text-[11px] text-brand-error mt-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-px" />
            {error}
          </p>
        )}
      </div>
    </>
  )

  return (
    <li>
      {editable ? (
        <button
          type="button"
          onClick={alternar}
          disabled={guardando}
          aria-pressed={cumplido}
          className="w-full flex items-start gap-3 px-4 py-2.5 text-left cursor-pointer hover:bg-brand-card-hover/60 transition-colors disabled:cursor-default"
        >
          {contenido}
        </button>
      ) : (
        <div className="flex items-start gap-3 px-4 py-2.5">{contenido}</div>
      )}
    </li>
  )
}
