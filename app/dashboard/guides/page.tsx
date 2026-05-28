import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GuideCard from '@/components/GuideCard'
import type { GuideWithStatus } from '@/lib/types'

export default async function GuidesPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('puesto')
    .eq('id', session.user.id)
    .single()
  if (!profile) redirect('/login')

  const { data: guides } = await supabase
    .from('guides')
    .select('*')
    .or(`puestos.cs.{"${profile.puesto}"},puestos.cs.{"todos"}`)
    .order('created_at', { ascending: true })

  const { data: exams } = await supabase.from('exams').select('*')

  const { data: results } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('passed', true)

  const guidesWithStatus: GuideWithStatus[] = (guides ?? []).map((guide) => {
    const exam = exams?.find((e) => e.guide_id === guide.id)
    const result = results?.find((r) => r.exam_id === exam?.id)
    return {
      ...guide,
      exam,
      result: result ?? undefined,
      status: result ? 'passed' : exam ? 'exam_pending' : 'not_started',
    }
  })

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-brand-text">Guías</h1>
        <p className="text-brand-muted text-sm mt-0.5">
          {guidesWithStatus.length} guía{guidesWithStatus.length !== 1 ? 's' : ''} disponible
          {guidesWithStatus.length !== 1 ? 's' : ''} para tu puesto
        </p>
      </div>

      {guidesWithStatus.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-brand-muted">No hay guías disponibles todavía.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {guidesWithStatus.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      )}
    </div>
  )
}
