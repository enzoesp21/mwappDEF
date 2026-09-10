import { createClient } from '@/lib/supabase/server'
import ResultsClient from './ResultsClient'

export default async function ResultsPage() {
  const supabase = await createClient()

  const { data: rawResults } = await supabase
    .from('exam_results')
    .select('id, score, passed, completed_at, signature_data, user_id, exam_id')
    .order('completed_at', { ascending: false })

  const rows = rawResults ?? []
  const userIds = rows.map((r) => r.user_id as string).filter((id, i, a) => a.indexOf(id) === i)
  const examIds = rows
    .map((r) => r.exam_id as string)
    .filter((id, i, a) => Boolean(id) && a.indexOf(id) === i)

  const profileMap: Record<string, { full_name: string; puesto: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, puesto')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { full_name: p.full_name ?? '—', puesto: p.puesto ?? '' }
    }
  }

  const examMap: Record<string, { title: string; passing_score: number; guide_id: string }> = {}
  if (examIds.length > 0) {
    const { data: exams } = await supabase
      .from('exams')
      .select('id, title, passing_score, guide_id')
      .in('id', examIds)
    for (const e of exams ?? []) {
      examMap[e.id] = {
        title: e.title ?? '—',
        passing_score: e.passing_score ?? 70,
        guide_id: e.guide_id ?? '',
      }
    }
  }

  const { data: guides } = await supabase
    .from('guides')
    .select('id, title')
    .order('title', { ascending: true })

  const guideMap: Record<string, string> = {}
  for (const g of guides ?? []) {
    guideMap[g.id] = g.title
  }

  const results = rows.map((r) => {
    const exam = examMap[r.exam_id as string]
    const guideId = exam?.guide_id ?? ''
    return {
      id: r.id as string,
      score: r.score as number,
      passed: r.passed as boolean,
      completed_at: r.completed_at as string,
      signature_data: r.signature_data as string | null,
      user_name: profileMap[r.user_id as string]?.full_name ?? '—',
      user_puesto: profileMap[r.user_id as string]?.puesto ?? '',
      guide_title: guideMap[guideId] ?? exam?.title ?? '—',
      guide_id: guideId,
      passing_score: exam?.passing_score ?? 70,
    }
  })

  const guideOptions = (guides ?? []).map((g) => ({ id: g.id, title: g.title }))

  return <ResultsClient results={results} guideOptions={guideOptions} />
}
