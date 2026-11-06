import Link from 'next/link'
import { CheckCircle2, ChevronRight, Circle, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  titulo: string
  anotado: boolean
  aprobado: boolean
}

/**
 * En Inicio, una charla para todo el personal (la de la ART) que a la persona
 * todavía le falta: anotarse y aprobar el examen. Desaparece cuando hizo las dos.
 */
export default function TarjetaCharla({ id, titulo, anotado, aprobado }: Props) {
  const paso = (hecho: boolean, pendiente: string, listo: string) => (
    <span className={cn('flex items-center gap-1', hecho ? 'text-brand-success' : 'text-brand-text')}>
      {hecho ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
      {hecho ? listo : pendiente}
    </span>
  )
  return (
    <Link
      href={'/dashboard/guides/' + id}
      className="block bg-brand-card border-2 border-brand-accent/40 rounded-2xl p-4 hover:border-brand-accent transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-brand-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">Para todo el personal</p>
          <p className="text-sm font-semibold text-brand-text mt-0.5">{titulo}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
            {paso(anotado, '1. Anotate', 'Anotado')}
            {paso(aprobado, '2. Respondé el examen', 'Examen aprobado')}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0 mt-1" />
      </div>
    </Link>
  )
}
