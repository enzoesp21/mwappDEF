import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GuideCard from '@/components/GuideCard'
import type { GuideWithStatus } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: guides } = await supabase
    .from('guides')
    .select('*')
    .or(`puestos.cs.{"${profile.puesto}"},puestos.cs.{"todos"}`)
    .order('created_at', { ascending: true })

  const { data: exams } = await supabase
    .from('exams')
    .select('*, exam_questions(count)')

  const { data: results } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('passed', true)

  const guidesWithStatus: GuideWithStatus[] = (guides ?? []).map((guide) => {
    const exam = exams?.find((e) => e.guide_id === guide.id)
    const result = results?.find((r) => r.exam_id === exam?.id)
    const status = result
      ? 'passed'
      : exam
      ? 'exam_pending'
      : 'not_started'

    return {
      ...guide,
      exam: exam ? { ...exam, questions_count: exam.exam_questions?.[0]?.count ?? 0 } : undefined,
      result: result ?? undefined,
      status,
    }
  })

  const passedCount = guidesWithStatus.filter((g) => g.status === 'passed').length
  const totalCount = guidesWithStatus.length

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-brand-text">
          Hola, {profile.full_name.split(' ')[0]}
        </h1>
        <p className="text-brand-muted text-sm mt-0.5">{profile.puesto}</p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-5">
        <p className="text-brand-muted text-xs font-medium uppercase tracking-wider mb-3">
          Tu progreso
        </p>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-bold text-brand-accent">{passedCount}</span>
          <span className="text-brand-muted text-sm mb-1">de {totalCount} guías aprobadas</span>
        </div>
        <div className="h-2 bg-brand-border rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-accent rounded-full transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(passedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
        {passedCount === totalCount && totalCount > 0 && (
          <p className="text-brand-success text-xs mt-2 font-medium">
            ¡Completaste todas las guías de tu sector!
          </p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-brand-muted uppercase tracking-wider mb-3">
          Guías disponibles
        </h2>
        {guidesWithStatus.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-brand-muted text-sm">No hay guías disponibles para tu puesto todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {guidesWithStatus.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
