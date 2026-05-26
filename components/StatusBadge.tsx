import { cn } from '@/lib/utils'
import { CheckCircle, Clock, BookOpen, Circle } from 'lucide-react'

type Status = 'not_started' | 'reading' | 'exam_pending' | 'passed'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const statusConfig: Record<Status, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  not_started: { label: 'Sin empezar', icon: Circle, className: 'text-brand-muted' },
  reading: { label: 'Leyendo', icon: BookOpen, className: 'text-blue-400' },
  exam_pending: { label: 'Examen pendiente', icon: Clock, className: 'text-yellow-400' },
  passed: { label: 'Aprobado', icon: CheckCircle, className: 'text-brand-success' },
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', config.className, className)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}
