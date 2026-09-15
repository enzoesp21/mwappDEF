import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Trophy, Medal, Award, CheckCircle } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'
import { buildRanking } from '@/lib/ranking'
import RankingByGuide from '@/components/RankingByGuide'

export const dynamic = 'force-dynamic'

const PODIUM = [
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
  { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' },
  { icon: Award, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
]

export default async function ResultadosPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { totalPassed, overall, byGuide, recent } = await buildRanking(supabase)

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Resultados</h1>
        <p className="text-brand-muted text-sm mt-0.5">
          {totalPassed} examen{totalPassed !== 1 ? 'es' : ''} aprobado{totalPassed !== 1 ? 's' : ''} en total
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Ranking por guía
        </h2>
        <RankingByGuide guides={byGuide} currentUserId={session.user.id} />
      </div>

      {overall.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
            Ranking general
          </h2>
          <div className="space-y-2">
            {overall.map((user, index) => {
              const podium = PODIUM[index]
              const isMe = user.user_id === session.user.id
              return (
                <div
                  key={user.user_id}
                  className={cn(
                    'bg-brand-card border rounded-2xl p-4 flex items-center gap-3',
                    isMe ? 'border-brand-accent/40 ring-1 ring-brand-accent/20' : 'border-brand-border'
                  )}
                >
                  <div className="flex-shrink-0 w-9 flex items-center justify-center">
                    {podium ? (
                      <div className={cn('w-9 h-9 rounded-full border flex items-center justify-center', podium.bg)}>
                        <podium.icon className={cn('w-4 h-4', podium.color)} />
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-brand-muted">#{index + 1}</span>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-dark flex-shrink-0">
                    {user.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-brand-muted text-sm font-bold">
                        {user.full_name.trim().charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-text text-sm truncate">
                      {user.full_name}
                      {isMe && (
                        <span className="ml-2 text-[10px] font-medium text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded-full">
                          Vos
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-brand-muted">{user.puesto}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-brand-accent">{user.passed_count}</p>
                    <p className="text-[10px] text-brand-muted">
                      {user.passed_count === 1 ? 'guía' : 'guías'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-sm font-bold text-brand-success">{user.avg_score}%</p>
                    <p className="text-[10px] text-brand-muted">promedio</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
            Últimos resultados
          </h2>
          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-brand-border">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle className="w-4 h-4 text-brand-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">{r.full_name}</p>
                    <p className="text-xs text-brand-muted truncate">{r.guide_title}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-brand-success">{r.score}%</p>
                    <p className="text-[10px] text-brand-muted">{formatDateTime(r.completed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
