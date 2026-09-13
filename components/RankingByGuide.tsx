import { Trophy, Medal, Award, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RankingEntry {
  user_id: string
  full_name: string
  puesto: string
  score: number
}

export interface GuideRanking {
  guide_id: string
  guide_title: string
  entries: RankingEntry[]
}

interface Props {
  guides: GuideRanking[]
  currentUserId?: string
}

const PODIUM = [
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' },
  { icon: Award, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
]

export default function RankingByGuide({ guides, currentUserId }: Props) {
  if (guides.length === 0) {
    return (
      <div className="text-center py-10 bg-brand-card border border-brand-border rounded-2xl">
        <BookOpen className="w-8 h-8 text-brand-muted mx-auto mb-2" />
        <p className="text-brand-muted text-sm">Todavía nadie aprobó ninguna guía.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {guides.map((guide) => (
        <div
          key={guide.guide_id}
          className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-brand-border flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-accent flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-brand-text truncate">
                {guide.guide_title}
              </h3>
              <p className="text-xs text-brand-muted">
                {guide.entries.length}{' '}
                {guide.entries.length === 1 ? 'persona aprobó' : 'personas aprobaron'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-brand-border">
            {guide.entries.map((entry, index) => {
              const podium = PODIUM[index]
              const isMe = currentUserId != null && entry.user_id === currentUserId
              return (
                <div
                  key={entry.user_id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5',
                    isMe && 'bg-brand-accent/5'
                  )}
                >
                  <div className="w-7 flex items-center justify-center flex-shrink-0">
                    {podium ? (
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full border flex items-center justify-center',
                          podium.bg
                        )}
                      >
                        <podium.icon className={cn('w-3.5 h-3.5', podium.color)} />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-brand-muted">#{index + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">
                      {entry.full_name}
                      {isMe && (
                        <span className="ml-2 text-[10px] font-medium text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded-full">
                          Vos
                        </span>
                      )}
                    </p>
                    {entry.puesto && (
                      <p className="text-xs text-brand-muted truncate">{entry.puesto}</p>
                    )}
                  </div>

                  <span className="text-sm font-bold text-brand-success flex-shrink-0">
                    {entry.score}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
