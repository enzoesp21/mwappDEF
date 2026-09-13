import type { createClient } from '@/lib/supabase/server'
import { fetchProfiles, fetchExams, uniqueIds } from '@/lib/lookups'
import type { GuideRanking } from '@/components/RankingByGuide'

type Client = Awaited<ReturnType<typeof createClient>>

export interface OverallStat {
  user_id: string
  full_name: string
  puesto: string
  passed_count: number
  avg_score: number
}

export interface RecentResult {
  id: string
  full_name: string
  guide_title: string
  score: number
  completed_at: string
}

export interface RankingData {
  totalPassed: number
  overall: OverallStat[]
  byGuide: GuideRanking[]
  recent: RecentResult[]
}

export async function buildRanking(supabase: Client): Promise<RankingData> {
  const { data: rawResults } = await supabase
    .from('exam_results')
    .select('id, score, completed_at, user_id, exam_id')
    .eq('passed', true)
    .order('completed_at', { ascending: false })

  const rows = rawResults ?? []

  const [profileMap, examMap] = await Promise.all([
    fetchProfiles(supabase, uniqueIds(rows.map((r) => r.user_id as string))),
    fetchExams(supabase, uniqueIds(rows.map((r) => r.exam_id as string))),
  ])

  const results = rows.map((r) => {
    const exam = examMap[r.exam_id as string]
    return {
      id: r.id as string,
      score: r.score as number,
      completed_at: r.completed_at as string,
      user_id: r.user_id as string,
      full_name: profileMap[r.user_id as string]?.full_name ?? 'Usuario',
      puesto: profileMap[r.user_id as string]?.puesto ?? '',
      guide_id: exam?.guide_id ?? (r.exam_id as string),
      guide_title: exam?.guide_title ?? 'Examen',
    }
  })

  // Ranking general: cuántas guías aprobó cada uno y su promedio.
  const overallMap = new Map<string, OverallStat & { sum: number }>()
  for (const r of results) {
    const existing = overallMap.get(r.user_id)
    if (existing) {
      existing.passed_count++
      existing.sum += r.score
      existing.avg_score = Math.round(existing.sum / existing.passed_count)
    } else {
      overallMap.set(r.user_id, {
        user_id: r.user_id,
        full_name: r.full_name,
        puesto: r.puesto,
        passed_count: 1,
        sum: r.score,
        avg_score: r.score,
      })
    }
  }

  const overall = Array.from(overallMap.values())
    .map(({ sum, ...rest }) => rest)
    .sort((a, b) => b.passed_count - a.passed_count || b.avg_score - a.avg_score)

  // Ranking por guía. Si alguien la rindió más de una vez, vale su mejor nota.
  const guideMap = new Map<
    string,
    { guide_id: string; guide_title: string; best: Map<string, { entry: GuideRanking['entries'][number]; at: string }> }
  >()

  for (const r of results) {
    let g = guideMap.get(r.guide_id)
    if (!g) {
      g = { guide_id: r.guide_id, guide_title: r.guide_title, best: new Map() }
      guideMap.set(r.guide_id, g)
    }
    const prev = g.best.get(r.user_id)
    if (!prev || r.score > prev.entry.score) {
      g.best.set(r.user_id, {
        entry: { user_id: r.user_id, full_name: r.full_name, puesto: r.puesto, score: r.score },
        at: r.completed_at,
      })
    }
  }

  const byGuide: GuideRanking[] = Array.from(guideMap.values())
    .map((g) => ({
      guide_id: g.guide_id,
      guide_title: g.guide_title,
      // Mejor nota primero; a igual nota, gana quien la sacó antes.
      entries: Array.from(g.best.values())
        .sort((a, b) => b.entry.score - a.entry.score || a.at.localeCompare(b.at))
        .map((x) => x.entry),
    }))
    .sort((a, b) => b.entries.length - a.entries.length || a.guide_title.localeCompare(b.guide_title))

  const recent: RecentResult[] = results.slice(0, 15).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    guide_title: r.guide_title,
    score: r.score,
    completed_at: r.completed_at,
  }))

  return { totalPassed: results.length, overall, byGuide, recent }
}
