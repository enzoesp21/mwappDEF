import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ListaAsistencia, { type FilaAsistencia } from '@/components/capacitacion/ListaAsistencia'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

/**
 * Una charla para todo el personal (la de la ART): quién se anotó y cómo le
 * fue en el examen. Solo encargados (lo cuida el layout de admin).
 */
export default async function AsistenciaCharlaPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()

  const [guiaRes, examenRes, personalRes, anotadosRes] = await Promise.all([
    supabase.from('guides').select('id, title').eq('id', params.id).maybeSingle(),
    supabase.from('exams').select('id').eq('guide_id', params.id).maybeSingle(),
    supabase.from('profiles').select('id, full_name, puesto, role, status'),
    supabase.from('capacitacion_asistencias').select('user_id, created_at').eq('guide_id', params.id),
  ])
  if (!guiaRes.data) notFound()
  const examen = examenRes.data
  const resultadosRes = examen
    ? await supabase.from('exam_results').select('user_id, score, passed').eq('exam_id', examen.id as string)
    : { data: [] as { user_id: string; score: number; passed: boolean }[], error: null }

  const error = personalRes.error ?? anotadosRes.error ?? resultadosRes.error
  const anotadoEn = new Map((anotadosRes.data ?? []).map((a) => [a.user_id as string, a.created_at as string]))
  // El mejor intento de cada uno: aprobado primero, si no la nota más alta.
  const mejor = new Map<string, { score: number; passed: boolean }>()
  for (const r of resultadosRes.data ?? []) {
    const actual = mejor.get(r.user_id as string)
    const este = { score: Number(r.score), passed: r.passed === true }
    if (!actual || (este.passed && !actual.passed) || (este.passed === actual.passed && este.score > actual.score)) {
      mejor.set(r.user_id as string, este)
    }
  }

  // Todo el personal aprobado (los encargados no rinden desde la app).
  const filas: FilaAsistencia[] = (personalRes.data ?? [])
    .filter((p) => p.status === 'approved' && p.role !== 'admin')
    .map((p) => ({
      id: p.id as string,
      nombre: ((p.full_name as string | null) ?? '').trim() || 'Sin nombre',
      puesto: (p.puesto as string | null) ?? '',
      anotado: anotadoEn.get(p.id as string) ?? null,
      examen: mejor.get(p.id as string) ?? null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">
      <div>
        <Link
          href="/admin/guides"
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Guías
        </Link>
        <h1 className="text-2xl font-semibold text-brand-accent mt-1">{guiaRes.data.title as string}</h1>
        <p className="text-brand-muted text-sm mt-0.5 leading-relaxed">
          Quién se anotó a la charla y cómo le fue en el examen. Cada examen termina con la firma de la persona: la ves
          en Resultados.
        </p>
      </div>

      {error ? (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          {/capacitacion_asistencias|schema cache|does not exist/i.test(error.message)
            ? 'Falta correr el SQL de la charla (supabase/add_charla_art.sql) en Supabase.'
            : 'No se pudo leer la lista: ' + error.message}
        </div>
      ) : (
        <ListaAsistencia filas={filas} />
      )}
    </div>
  )
}
