import type { createClient } from '@/lib/supabase/server'

type Client = Awaited<ReturnType<typeof createClient>>

// PostgREST devuelve la consulta entera vacía cuando un join anidado no
// resuelve (por ejemplo exams -> guides). Por eso acá no se usan joins:
// se traen los ids y se arman mapas de lookup aparte.

export function uniqueIds(values: (string | null | undefined)[]): string[] {
  return values.filter((v): v is string => Boolean(v)).filter((v, i, a) => a.indexOf(v) === i)
}

export interface ProfileLite {
  full_name: string
  puesto: string
  avatar_url: string | null
}

export async function fetchProfiles(
  supabase: Client,
  userIds: string[]
): Promise<Record<string, ProfileLite>> {
  const map: Record<string, ProfileLite> = {}
  if (userIds.length === 0) return map

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, puesto, avatar_url')
    .in('id', userIds)

  for (const p of data ?? []) {
    map[p.id as string] = {
      full_name: (p.full_name as string) ?? 'Usuario',
      puesto: (p.puesto as string) ?? '',
      avatar_url: (p.avatar_url as string) ?? null,
    }
  }
  return map
}

export interface ExamLite {
  title: string
  guide_id: string
  guide_title: string
  passing_score: number
}

export async function fetchExams(
  supabase: Client,
  examIds: string[]
): Promise<Record<string, ExamLite>> {
  const map: Record<string, ExamLite> = {}
  if (examIds.length === 0) return map

  const { data: exams } = await supabase
    .from('exams')
    .select('id, title, guide_id, passing_score')
    .in('id', examIds)

  const guideIds = uniqueIds((exams ?? []).map((e) => e.guide_id as string))

  const guideTitles: Record<string, string> = {}
  if (guideIds.length > 0) {
    const { data: guides } = await supabase.from('guides').select('id, title').in('id', guideIds)
    for (const g of guides ?? []) {
      guideTitles[g.id as string] = (g.title as string) ?? ''
    }
  }

  for (const e of exams ?? []) {
    const guideId = (e.guide_id as string) ?? ''
    map[e.id as string] = {
      title: (e.title as string) ?? 'Examen',
      guide_id: guideId,
      guide_title: guideTitles[guideId] ?? (e.title as string) ?? 'Examen',
      passing_score: (e.passing_score as number) ?? 70,
    }
  }
  return map
}
