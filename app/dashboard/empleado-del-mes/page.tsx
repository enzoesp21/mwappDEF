import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Trophy, History } from 'lucide-react'
import { currentPeriod, nextPeriod, formatPeriod } from '@/lib/month-utils'
import { fetchProfiles, uniqueIds } from '@/lib/lookups'
import EmployeeOfMonthCard from '@/components/EmployeeOfMonthCard'
import VoteForm, { type Candidate } from './VoteForm'

export const dynamic = 'force-dynamic'

export default async function EmpleadoDelMesPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const period = currentPeriod()
  const voting = nextPeriod()

  const [{ data: winners }, { data: staff }, { data: myVote }] = await Promise.all([
    supabase
      .from('employee_of_month')
      .select('period, user_id, photo_url, message')
      .order('period', { ascending: false })
      .limit(6),
    supabase
      .from('profiles')
      .select('id, full_name, puesto')
      .eq('status', 'approved')
      .neq('id', session.user.id)
      .order('full_name'),
    supabase
      .from('employee_votes')
      .select('candidate_id, comment')
      .eq('period', voting)
      .eq('voter_id', session.user.id)
      .maybeSingle(),
  ])

  const rows = winners ?? []
  const winnerProfiles = await fetchProfiles(supabase, uniqueIds(rows.map((r) => r.user_id as string)))

  const current = rows.find((r) => r.period === period)
  const past = rows.filter((r) => r.period !== period)

  const candidates: Candidate[] = (staff ?? []).map((p) => ({
    id: p.id as string,
    full_name: (p.full_name as string) ?? 'Usuario',
    puesto: (p.puesto as string) ?? '',
  }))

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
          <Trophy className="w-6 h-6 text-brand-accent" />
          Empleado del mes
        </h1>
        <p className="text-brand-muted text-sm mt-0.5">
          Reconocemos a quien se destacó, y entre todos elegimos al próximo.
        </p>
      </div>

      {current ? (
        <EmployeeOfMonthCard
          period={current.period as string}
          fullName={winnerProfiles[current.user_id as string]?.full_name ?? 'Usuario'}
          puesto={winnerProfiles[current.user_id as string]?.puesto ?? ''}
          photoUrl={(current.photo_url as string) ?? null}
          message={(current.message as string) ?? null}
        />
      ) : (
        <div className="bg-brand-card border border-brand-border rounded-2xl p-6 text-center space-y-2">
          <Trophy className="w-8 h-8 text-brand-muted mx-auto" />
          <p className="text-brand-text font-medium">Todavía no hay empleado del mes</p>
          <p className="text-brand-muted text-sm">
            Cuando los encargados lo publiquen, va a aparecer acá.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Votá para {formatPeriod(voting)}
        </h2>
        <VoteForm
          candidates={candidates}
          currentVote={
            myVote
              ? {
                  candidate_id: myVote.candidate_id as string,
                  comment: (myVote.comment as string) ?? null,
                }
              : null
          }
          periodLabel={formatPeriod(voting)}
        />
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-3.5 h-3.5" />
            Meses anteriores
          </h2>
          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-brand-border">
              {past.map((w) => {
                const p = winnerProfiles[w.user_id as string]
                return (
                  <div key={w.period as string} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-dark flex-shrink-0">
                      {w.photo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={w.photo_url as string}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand-muted text-sm font-bold">
                          {(p?.full_name ?? 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-text truncate">
                        {p?.full_name ?? 'Usuario'}
                      </p>
                      <p className="text-xs text-brand-muted">{formatPeriod(w.period as string)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
