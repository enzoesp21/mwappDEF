import Link from 'next/link'
import { ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PuestoInfo } from '@/lib/puestos'

interface Props {
  info: PuestoInfo
  /** Guías en el recorrido de ese puesto. */
  total: number
  /** Cuántas aprobó la persona que está mirando. */
  aprobadas: number
  esTuPuesto: boolean
}

export default function PuestoCard({ info, total, aprobadas, esTuPuesto }: Props) {
  const Icono = info.icono
  const completo = total > 0 && aprobadas === total

  return (
    <Link
      href={'/dashboard/guides/puesto/' + encodeURIComponent(info.valor)}
      className={cn(
        'relative block rounded-2xl overflow-hidden transition-transform active:scale-[0.99] cursor-pointer',
        esTuPuesto && 'ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-dark'
      )}
      style={{ background: 'linear-gradient(135deg, ' + info.desde + ', ' + info.hasta + ')' }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'url(/logo.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right -20% center',
          backgroundSize: 'auto 160%',
          mixBlendMode: 'multiply',
        }}
      />

      <div className="relative p-4 flex items-center gap-3 min-h-[92px]">
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Icono className="w-5 h-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          {esTuPuesto && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-widest text-white/90 bg-white/20 px-1.5 py-0.5 rounded-full mb-1">
              Tu puesto
            </span>
          )}
          <p className="text-white font-bold text-[15px] leading-tight break-words">
            {info.nombre}
          </p>
          <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
            {completo && <Check className="w-3 h-3 flex-shrink-0" />}
            {total === 0
              ? 'Sin guías todavía'
              : aprobadas + ' de ' + total + (total === 1 ? ' guía' : ' guías')}
          </p>
        </div>

        <ChevronRight className="w-4 h-4 text-white/70 flex-shrink-0" />
      </div>
    </Link>
  )
}
