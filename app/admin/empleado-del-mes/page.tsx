import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Trophy, Users } from 'lucide-react'
import { currentPeriod, nextPeriod, formatPeriod } from '@/lib/month-utils'
import { fetchProfiles, uniqueIds } from '@/lib/lookups'
import PublishForm, { type Person } from './PublishForm'

export const dynamic = 'force-dynamic'

export default async function AdminEmpleadoDelMesPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const period = currentPeriod()
  const voting = nextPeriod()

  const [{ data: staff }, { data: votes }, { data: current }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, puesto, avatar_url')
      .eq('status', 'approved')
      .order('full_name'),
    supabase
      .from('employee_votes')
      .select('voter_id, candidate_id, comment, created_at')
      .eq('period', voting)
      .order('created_at', { ascending: false }),
    supabase
      .from('employee_of_month')
      .select('user_id, photo_url, message')
      .eq('period', period)
      .maybeSingle(),
  ])

  const voteRows = votes ?? []
  const tally: Record<string, number> = {}
  for (const v of voteRows) {
    const id = v.candidate_id as string
    tally[id] = (tally[id] ?? 0) + 1
  }

  const people: Person[] = (staff ?? []).map((p) => ({
    id: p.id as string,
    full_name: (p.full_name as string) ?? 'Usuario',
    puesto: (p.puesto as string) ?? '',
    votes: tally[p.id as string] ?? 0,
    avatar_url: (p.avatar_url as string) ?? null,
  }))

  const ranked = [...people].filter((p) => p.votes > 0).sort((a, b) => b.votes - a.votes)

  const voterProfiles = await fetchProfiles(
    supabase,
    uniqueIds(voteRows.flatMap((v) => [v.voter_id as string, v.candidate_id as string]))
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text flex items-center gap-2">
          <Trophy className="w-6 h-6 text-brand-accent" />
          Empleado del mes
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Publicás el de {formatPeriod(period)}. El equipo está votando para{' '}
          {formatPeriod(voting)}.
        </p>
      </div>

      <PublishForm
        period={period}
        periodLabel={formatPeriod(period)}
        people={people}
        current={
          current
            ? {
                user_id: current.user_id as string,
                photo_url: (current.photo_url as string) ?? null,
                message: (current.message as string) ?? null,
              }
            : null
        }
      />

      <div>
        <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Conteo para {formatPeriod(voting)} · {voteRows.length} voto
          {voteRows.length !== 1 ? 's' : ''}
        </h2>

        {ranked.length === 0 ? (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 text-center text-brand-muted text-sm">
            Todavía nadie votó para el mes que viene.
          </div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-brand-border">
              {ranked.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-brand-muted w-5 flex-shrink-0">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-brand-text truncate">{p.full_name}</p>
                    <p className="text-xs text-brand-muted truncate">{p.puesto}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-20 h-1.5 bg-brand-dark rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-brand-accent rounded-full"
                        style={{ width: Math.round((p.votes / ranked[0].votes) * 100) + '%' }}
                      />
                    </div>
                    <span className="text-sm font-bold text-brand-accent w-6 text-right">
                      {p.votes}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {voteRows.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Detalle de los votos
          </h2>
          <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden">
            <div className="divide-y divide-brand-border">
              {voteRows.map((v, i) => (
                <div key={i} className="px-4 py-3 space-y-1">
                  <p className="text-sm text-brand-text">
                    <span className="font-medium">
                      {voterProfiles[v.voter_id as string]?.full_name ?? 'Usuario'}
                    </span>
                    <span className="text-brand-muted"> votó a </span>
                    <span className="font-medium text-brand-accent">
                      {voterProfiles[v.candidate_id as string]?.full_name ?? 'Usuario'}
                    </span>
                  </p>
                  {v.comment && (
                    <p className="text-xs text-brand-muted italic leading-relaxed">
                      &ldquo;{v.comment as string}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
