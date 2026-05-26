import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { cn } from '@/lib/utils'
import type { GuideWithStatus } from '@/lib/types'

interface GuideCardProps {
  guide: GuideWithStatus
}

export default function GuideCard({ guide }: GuideCardProps) {
  const isPassed = guide.status === 'passed'

  return (
    <Link
      href={`/dashboard/guides/${guide.id}`}
      className={cn(
        'block bg-brand-card border rounded-xl p-4 transition-all duration-200 cursor-pointer',
        'hover:bg-brand-card-hover hover:border-brand-accent/50 active:scale-[0.98]',
        isPassed ? 'border-brand-success/30' : 'border-brand-border'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-brand-text text-sm leading-tight mb-1 line-clamp-2">
            {guide.title}
          </h3>
          <p className="text-brand-muted text-xs leading-relaxed line-clamp-2 mb-2">
            {guide.description}
          </p>
          <StatusBadge status={guide.status} />
        </div>
        <ChevronRight className="w-4 h-4 text-brand-muted flex-shrink-0 mt-1" />
      </div>

      {isPassed && guide.result && (
        <div className="mt-3 pt-3 border-t border-brand-border flex items-center justify-between">
          <span className="text-xs text-brand-muted">Puntaje obtenido</span>
          <span className="text-xs font-bold text-brand-success">{guide.result.score}%</span>
        </div>
      )}
    </Link>
  )
}
