import Link from 'next/link'
import { ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react'
import GuideCover from './GuideCover'
import { cn } from '@/lib/utils'
import type { GuideWithStatus } from '@/lib/types'

interface GuideCardProps {
  guide: GuideWithStatus
}

export default function GuideCard({ guide }: GuideCardProps) {
  const isPassed = guide.status === 'passed'
  const hasExam = guide.status !== 'not_started'

  return (
    <Link
      href={`/dashboard/guides/${guide.id}`}
      className={cn(
        'group block bg-brand-card border rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer',
        'hover:border-brand-accent/60 hover:shadow-sm active:scale-[0.99]',
        isPassed ? 'border-brand-success/40' : 'border-brand-border'
      )}
    >
      <div className="relative">
        <GuideCover
          title={guide.title}
          coverImage={guide.cover_image}
          className="h-28 sm:h-32 w-full"
          overlay
        />

        {isPassed && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-brand-success text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shadow-sm">
            <CheckCircle2 className="w-3 h-3" />
            Aprobada
          </span>
        )}

        <h3 className="absolute bottom-3 left-4 right-4 text-white font-bold text-base leading-tight drop-shadow-sm line-clamp-2">
          {guide.title}
        </h3>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-brand-muted text-xs leading-relaxed line-clamp-2">{guide.description}</p>

        <div className="flex items-center gap-2">
          {isPassed && guide.result ? (
            <span className="text-xs font-bold text-brand-success">
              {guide.result.score}% obtenido
            </span>
          ) : hasExam ? (
            <span className="flex items-center gap-1.5 text-xs text-brand-muted">
              <ClipboardList className="w-3.5 h-3.5" />
              Examen pendiente
            </span>
          ) : (
            <span className="text-xs text-brand-muted">Solo lectura</span>
          )}

          <ArrowRight className="w-4 h-4 text-brand-muted ml-auto flex-shrink-0 group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  )
}
