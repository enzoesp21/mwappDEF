import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Users, BookOpen, CheckCircle, TrendingUp } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { PUESTOS } from '@/lib/types'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalUsers },
    { data: profiles },
    { data: guides },
    { data: recentResults },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('puesto'),
    supabase.from('guides').select('id, title'),
    supabase
      .from('exam_results')
      .select(`
        id,
        score,
        passed,
        completed_at,
        profiles ( full_name ),
        exams ( title, guide_id, guides ( title ) )
      `)
      .order('completed_at', { ascending: false })
      .limit(5),
  ])

  const puestoCounts = PUESTOS.map((puesto) => ({
    puesto,
    count: (profiles ?? []).filter((p) => p.puesto === puesto).length,
  })).filter((p) => p.count > 0)

  const guideStats = await Promise.all(
    (guides ?? []).map(async (guide) => {
      const { data: exam } = await supabase
        .from('exams')
        .select('id')
        .eq('guide_id', guide.id)
        .single()

      if (!exam) return { title: guide.title, approved: 0, total: 0, pct: 0 }

      const [{ count: total }, { count: approved }] = await Promise.all([
        supabase
          .from('exam_results')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id),
        supabase
          .from('exam_results')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', exam.id)
          .eq('passed', true),
      ])

      const t = total ?? 0
      const a = approved ?? 0
      return { title: guide.title, approved: a, total: t, pct: t > 0 ? Math.round((a / t) * 100) : 0 }
    })
  )

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">Dashboard</h1>
        <p className="text-sm text-brand-muted mt-1">Resumen de la plataforma de capacitación</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total usuarios"
          value={String(totalUsers ?? 0)}
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Guías activas"
          value={String(guides?.length ?? 0)}
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Aprobaciones"
          value={String(recentResults?.filter((r) => r.passed).length ?? 0)}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Exámenes totales"
          value={String(recentResults?.length ?? 0)}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users by puesto */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-brand-text mb-4">Usuarios por puesto</h2>
          {puestoCounts.length === 0 ? (
            <p className="text-sm text-brand-muted">Sin datos aún.</p>
          ) : (
            <div className="space-y-2">
              {puestoCounts.map(({ puesto, count }) => (
                <div key={puesto} className="flex items-center gap-3">
                  <span className="text-sm text-brand-text flex-1">{puesto}</span>
                  <div className="flex-1 bg-brand-dark rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-brand-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((count / (totalUsers ?? 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-brand-accent w-6 text-right">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval % per guide */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-brand-text mb-4">Aprobación por guía</h2>
          {guideStats.length === 0 ? (
            <p className="text-sm text-brand-muted">Sin guías creadas.</p>
          ) : (
            <div className="space-y-3">
              {guideStats.map((g) => (
                <div key={g.title}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-brand-text truncate flex-1 pr-3">{g.title}</span>
                    <span className="text-xs text-brand-muted flex-shrink-0">
                      {g.approved}/{g.total}
                    </span>
                    <span className="text-sm font-bold text-brand-accent ml-2 w-10 text-right flex-shrink-0">
                      {g.pct}%
                    </span>
                  </div>
                  <div className="bg-brand-dark rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-brand-accent rounded-full transition-all duration-500"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent results */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-5">
        <h2 className="text-base font-semibold text-brand-text mb-4">Últimos resultados</h2>
        {!recentResults || recentResults.length === 0 ? (
          <p className="text-sm text-brand-muted">Sin resultados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left text-xs font-medium text-brand-muted pb-3 pr-4">Usuario</th>
                  <th className="text-left text-xs font-medium text-brand-muted pb-3 pr-4">Guía</th>
                  <th className="text-left text-xs font-medium text-brand-muted pb-3 pr-4">Puntaje</th>
                  <th className="text-left text-xs font-medium text-brand-muted pb-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {recentResults.map((result) => {
                  const profile = result.profiles as { full_name: string } | null
                  const exam = result.exams as { title: string; guides: { title: string } | null } | null
                  return (
                    <tr key={result.id} className="hover:bg-brand-card-hover transition-colors duration-200">
                      <td className="py-3 pr-4 text-brand-text">{profile?.full_name ?? '—'}</td>
                      <td className="py-3 pr-4 text-brand-muted">{exam?.guides?.title ?? exam?.title ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={
                            result.passed
                              ? 'text-brand-success font-semibold'
                              : 'text-brand-error font-semibold'
                          }
                        >
                          {result.score}%
                        </span>
                      </td>
                      <td className="py-3 text-brand-muted text-xs">
                        {formatDateTime(result.completed_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-4 flex flex-col gap-2">
      <div className="text-brand-accent">{icon}</div>
      <div className="text-2xl font-bold text-brand-accent">{value}</div>
      <div className="text-xs text-brand-muted">{label}</div>
    </div>
  )
}
