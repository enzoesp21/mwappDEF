import { createClient } from '@/lib/supabase/server'
import ResultsClient from './ResultsClient'

export default async function ResultsPage() {
  const supabase = await createClient()

  const { data: rawResults } = await supabase
    .from('exam_results')
    .select(`
      id,
      score,
      passed,
      completed_at,
      signature_data,
      user_id,
      exam_id,
      profiles ( full_name, puesto ),
      exams ( id, title, passing_score, guide_id, guides ( id, title ) )
    `)
    .order('completed_at', { ascending: false })

  const { data: guides } = await supabase
    .from('guides')
    .select('id, title')
    .order('title', { ascending: true })

  const results = (rawResults ?? []).map((r) => {
    const profile = r.profiles as unknown as { full_name: string; puesto: string } | null
    const exam = r.exams as unknown as {
      id: string
      title: string
      passing_score: number
      guide_id: string
      guides: { id: string; title: string } | null
    } | null

    return {
      id: r.id as string,
      score: r.score as number,
      passed: r.passed as boolean,
      completed_at: r.completed_at as string,
      signature_data: r.signature_data as string | null,
      user_name: profile?.full_name ?? '—',
      user_puesto: profile?.puesto ?? '',
      guide_title: exam?.guides?.title ?? exam?.title ?? '—',
      guide_id: exam?.guides?.id ?? exam?.guide_id ?? '',
      passing_score: exam?.passing_score ?? 70,
    }
  })

  const guideOptions = (guides ?? []).map((g) => ({ id: g.id, title: g.title }))

  return <ResultsClient results={results} guideOptions={guideOptions} />
}
