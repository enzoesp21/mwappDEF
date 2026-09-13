import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClipboardCheck } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { fetchProfiles, fetchExams, uniqueIds } from '@/lib/lookups'
import CorreccionesClient from './CorreccionesClient'

export const dynamic = 'force-dynamic'

export default async function CorreccionesPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: rawResults } = await supabase
    .from('exam_results')
    .select('id, user_id, exam_id, completed_at')
    .eq('review_status', 'pending_review')
    .order('completed_at', { ascending: true })

  const results = rawResults ?? []

  const [profileMap, examMap] = await Promise.all([
    fetchProfiles(supabase, uniqueIds(results.map((r) => r.user_id as string))),
    fetchExams(supabase, uniqueIds(results.map((r) => r.exam_id as string))),
  ])

  const { data: rawAnswers } = await supabase
    .from('exam_answers')
    .select('id, result_id, question_id, answer_text')
    .in('result_id', results.length > 0 ? results.map((r) => r.id as string) : ['none'])
    .is('is_correct', null)

  const answers = rawAnswers ?? []

  const questionMap: Record<string, { question: string; answer_guide: string | null }> = {}
  const questionIds = uniqueIds(answers.map((a) => a.question_id as string))
  if (questionIds.length > 0) {
    const { data: questions } = await supabase
      .from('exam_questions')
      .select('id, question, answer_guide')
      .in('id', questionIds)
    for (const q of questions ?? []) {
      questionMap[q.id as string] = {
        question: (q.question as string) ?? '',
        answer_guide: (q.answer_guide as string) ?? null,
      }
    }
  }

  const pending = results
    .map((r) => ({
      id: r.id as string,
      full_name: profileMap[r.user_id as string]?.full_name ?? 'Usuario',
      puesto: profileMap[r.user_id as string]?.puesto ?? '',
      guide_title: examMap[r.exam_id as string]?.guide_title ?? 'Examen',
      completed_at: formatDateTime(r.completed_at as string),
      answers: answers
        .filter((a) => a.result_id === r.id)
        .map((a) => ({
          id: a.id as string,
          question: questionMap[a.question_id as string]?.question ?? '',
          answer_guide: questionMap[a.question_id as string]?.answer_guide ?? null,
          answer_text: (a.answer_text as string) ?? '',
        })),
    }))
    .filter((r) => r.answers.length > 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-brand-accent" />
          Correcciones
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          {pending.length === 0
            ? 'No hay exámenes esperando corrección.'
            : pending.length + (pending.length === 1 ? ' examen esperando' : ' exámenes esperando') + ' corrección'}
        </p>
      </div>

      <CorreccionesClient pending={pending} />
    </div>
  )
}
