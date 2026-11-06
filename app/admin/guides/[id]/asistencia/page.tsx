import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ListaAsistencia, { type FilaAsistencia } from '@/components/capacitacion/ListaAsistencia'
import { mejorIntento } from '@/lib/capacitaciones'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

/**
 * Una charla para todo el personal (la de la ART), para los encargados: qué
 * contestó cada uno a "¿Participaste de la charla?" y cómo le fue en el
 * examen. Solo encargados (lo cuida el layout de admin).
 */
export default async function AsistenciaCharlaPage({ params }: Props) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()

  const [guiaRes, examenRes, personalRes, respuestasRes] = await Promise.all([
    supabase.from('guides').select('id, title').eq('id', params.id).maybeSingle(),
    supabase.from('exams').select('id').eq('guide_id', params.id).maybeSingle(),
    supabase.from('profiles').select('id, full_name, puesto, role, status'),
    // '*' por la columna participo, que es más nueva: sin ella, todos dijeron que sí.
    supabase.from('capacitacion_asistencias').select('*').eq('guide_id', params.id),
  ])
  if (!guiaRes.data) notFound()
  const examen = examenRes.data
  const resultadosRes = examen
    ? await supabase.from('exam_results').select('user_id, score, passed, completed_at').eq('exam_id', examen.id as string)
    : { data: [] as { user_id: string; score: number; passed: boolean; completed_at: string }[], error: null }

  const error = personalRes.error ?? respuestasRes.error ?? resultadosRes.error
  const respuestas = new Map(
    (respuestasRes.data ?? []).map((r) => [
      r.user_id as string,
      { participo: r.participo !== false, en: r.created_at as string },
    ])
  )
  // El intento que cuenta de cada uno, con la misma regla que su perfil.
  const intentos = new Map<string, { score: number; passed: boolean; fecha: string }[]>()
  for (const r of resultadosRes.data ?? []) {
    const lista = intentos.get(r.user_id as string) ?? []
    lista.push({ score: Number(r.score), passed: r.passed === true, fecha: (r.completed_at as string) ?? '' })
    intentos.set(r.user_id as string, lista)
  }

  // Todo el personal aprobado (los encargados no rinden desde la app).
  const filas: FilaAsistencia[] = (personalRes.data ?? [])
    .filter((p) => p.status === 'approved' && p.role !== 'admin')
    .map((p) => {
      const mejor = mejorIntento(intentos.get(p.id as string) ?? [])
      return {
        id: p.id as string,
        nombre: ((p.full_name as string | null) ?? '').trim() || 'Sin nombre',
        puesto: (p.puesto as string | null) ?? '',
        respuesta: respuestas.get(p.id as string) ?? null,
        examen: mejor ? { score: mejor.score, passed: mejor.passed } : null,
      }
    })
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
          A cada uno le aparece arriba de todo en Inicio &quot;¿Participaste de la charla?&quot;. Con sí va derecho al
          examen, que termina con su firma (la ves en Resultados); con no, queda registrado y no rinde.
        </p>
        <Link
          href={'/admin/guides/' + params.id + '/edit'}
          className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-brand-accent hover:text-brand-accent-hover transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar las preguntas del examen
        </Link>
      </div>

      {error ? (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-2xl p-4 text-sm text-brand-error">
          {/capacitacion_asistencias|schema cache|does not exist/i.test(error.message)
            ? 'Falta correr el SQL de la charla (supabase/add_charla_art.sql) en Supabase.'
            : 'No se pudo leer la lista: ' + error.message}
        </div>
      ) : (
        <ListaAsistencia filas={filas} guideId={params.id} conExamen={examen !== null} />
      )}
    </div>
  )
}
