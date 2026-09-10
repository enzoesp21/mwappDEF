import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Trophy, Medal, Star, CheckCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

type UserStat = {
  user_id: string
  full_name: string
  puesto: string
  passed_count: number
  score_sum: number
  avg_score: number
}

export default async function ResultadosPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: rawResults } = await supabase
    .from('exam_results')
    .select('id, score, completed_at, user_id')
    .eq('passed', true)
    .order('completed_at', { ascending: false })

  const rows = rawResults ?? []

  const userIds = rows
    .map((r) => r.user_id as string)
    .filter((id, i, arr) => arr.indexOf(id) === i)

  const profileMap: Record<string, { full_name: string; puesto: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, puesto')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { full_name: p.full_name ?? 'Usuario', puesto: p.puesto ?? '' }
    }
  }

  const results = rows.map((r) => ({
    id: r.id as string,
    score: r.score as number,
    completed_at: r.completed_at as string,
    user_id: r.user_id as string,
    full_name: profileMap[r.user_id]?.full_name ?? 'Usuario',
    puesto: profileMap[r.user_id]?.puesto ?? '',
  }))

  const userMap = new Map<string, UserStat>()
  for (const r of results) {
    const existing = userMap.get(r.user_id)
    if (existing) {
      existing.passed_count++
      existing.score_sum += r.score
      existing.avg_score = Math.round(existing.score_sum / existing.passed_count)
    } else {
      userMap.set(r.user_id, {
        user_id: r.user_id,
        full_name: r.full_name,
        puesto: r.puesto,
        passed_count: 1,
        score_sum: r.score,
        avg_score: r.score,
      })
    }
  }

  const ranking = Array.from(userMap.values()).sort(
    (a, b) => b.passed_count - a.passed_count || b.avg_score - a.avg_score
  )

  const recentResults = results.slice(0, 20)

  const podiumIcons = [
    { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-200' },
    { icon: Medal, color: 'text-slate-400', bg: 'bg-slate-50 border-slate-200' },
    { icon: Star, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  ]

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Resultados Generales</h1>
        <p className="text-brand-muted text-sm mt-0.5">
          {results.length} examen{results.length !== 1 ? 'es' : ''} aprobado
          {results.length !== 1 ? 's' : ''} en total
        </p>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Ranking del equipo
        </h2>

        {ranking.length === 0 ? (
          <div className="text-center py-10 bg-brand-card border border-brand-border rounded-2xl">
            <Trophy className="w-8 h-8 text-brand-muted mx-auto mb-2" />
            <p className="text-brand-muted text-sm">Todavia no hay resultados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ranking.map((user, index) => {
              const podium = podiumIcons[index]
              const isMe = user.user_id === session.user.id
              return (
                <div
                  key={user.user_id}
                  className={cn(
                    'bg-brand-card border rounded-2xl p-4 flex items-center gap-4',
                    isMe ? 'border-brand-accent/40 ring-1 ring-brand-accent/20' : 'border-brand-border'
                  )}
                >
                  <div className="flex-shrink-0 w-9 flex items-center justify-center">
                    {podium ? (
                      <div className={cn('w-9 h-9 rounded-full border flex items-center justify-center', podium.bg)}>
                        <podium.icon className={cn('w-4 h-4', podium.color)} />
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-brand-muted w-9 text-center">
                        #{index + 1}
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
                      {user.passed_count === 1 ? 'guia' : 'guias'}
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
        )}
      </div>

      {recentResults.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
            Ultimos resultados
          </h2>
          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-brand-border">
              {recentResults.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <CheckCircle className="w-4 h-4 text-brand-success flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-text truncate">{r.full_name}</p>
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
